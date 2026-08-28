// Command allocationservice runs the gRPC service. `allocationservice
// migrate` applies embedded migrations and exits (the deploy-step path).
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"

	grpcadapter "github.com/chatplatform/allocationservice/internal/adapters/grpc"
	"github.com/chatplatform/allocationservice/internal/adapters/postgres"
	app "github.com/chatplatform/allocationservice/internal/application/allocation"
	"github.com/chatplatform/allocationservice/internal/config"
	"github.com/chatplatform/allocationservice/internal/observability"
	"github.com/chatplatform/allocationservice/internal/ports"
	"github.com/chatplatform/allocationservice/migrations"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "fatal:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	logger := observability.NewLogger(cfg.ServiceName, cfg.Environment, cfg.Logging.Level, cfg.Logging.Format)
	slog.SetDefault(logger)

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		return migrate(cfg, logger)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	// Telemetry first so everything after is traced.
	shutdownTracing := func(context.Context) error { return nil }
	if cfg.Telemetry.Enabled {
		shutdownTracing, err = observability.SetupTracing(ctx, cfg.ServiceName, cfg.Environment, cfg.Telemetry.OTLPAddress)
		if err != nil {
			return fmt.Errorf("tracing: %w", err)
		}
	}

	if cfg.Database.MigrateOnStart {
		if err := migrate(cfg, logger); err != nil {
			return err
		}
	}

	pool, err := postgres.NewPool(ctx, postgres.PoolConfig{
		URL:               cfg.Database.URL,
		MinConns:          cfg.Database.MinConns,
		MaxConns:          cfg.Database.MaxConns,
		MaxConnLifetime:   cfg.Database.MaxConnLifetime,
		MaxConnIdleTime:   cfg.Database.MaxConnIdleTime,
		HealthCheckPeriod: cfg.Database.HealthCheckPeriod,
	})
	if err != nil {
		return err
	}

	metrics := observability.NewMetrics()
	metrics.RegisterPool(pool)

	repo := postgres.NewAllocationRepository(pool, cfg.Database.QueryTimeout)
	txManager := postgres.NewTxManager(pool, cfg.Database.TxTimeout)
	service := app.NewService(repo, txManager, ports.SystemClock, metrics)

	handler, err := grpcadapter.NewAllocationHandler(service, logger)
	if err != nil {
		return err
	}
	server, healthServer := grpcadapter.NewServer(handler, metrics, logger)

	// HTTP sidecar port: Prometheus scrape + K8s-style probes. Liveness is
	// process-alive only; readiness pings the database (a dead DB must fail
	// readiness, never liveness).
	httpMux := http.NewServeMux()
	httpMux.Handle("/metrics", metrics.Handler())
	httpMux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	httpMux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		pingCtx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(pingCtx); err != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})
	httpServer := &http.Server{Addr: cfg.HTTP.Address, Handler: httpMux, ReadHeaderTimeout: 5 * time.Second}

	listener, err := net.Listen("tcp", cfg.GRPC.Address)
	if err != nil {
		return fmt.Errorf("listen %s: %w", cfg.GRPC.Address, err)
	}

	errCh := make(chan error, 2)
	go func() {
		logger.Info("grpc server starting", slog.String("address", cfg.GRPC.Address))
		errCh <- server.Serve(listener)
	}()
	go func() {
		logger.Info("http server starting", slog.String("address", cfg.HTTP.Address))
		if err := httpServer.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)
	logger.Info("service ready")

	select {
	case <-ctx.Done():
		// Graceful shutdown: mark not-ready first so LBs/K8s stop routing,
		// then drain in-flight RPCs, flush telemetry, close the pool.
		logger.Info("shutdown signal received")
	case err := <-errCh:
		return fmt.Errorf("server failed: %w", err)
	}

	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)
	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	done := make(chan struct{})
	go func() {
		server.GracefulStop() // stops accepting, waits for in-flight RPCs
		close(done)
	}()
	select {
	case <-done:
	case <-shutdownCtx.Done():
		logger.Warn("graceful drain timed out; forcing stop")
		server.Stop()
	}
	_ = httpServer.Shutdown(shutdownCtx)
	if err := shutdownTracing(shutdownCtx); err != nil {
		logger.Warn("tracing shutdown", slog.String("error", err.Error()))
	}
	pool.Close()
	logger.Info("shutdown complete")
	return nil
}

// migrate applies embedded goose migrations. goose needs database/sql; the
// pgx stdlib driver bridges without a second driver dependency.
func migrate(cfg config.Config, logger *slog.Logger) error {
	poolCfg, err := pgxpool.ParseConfig(cfg.Database.URL)
	if err != nil {
		return fmt.Errorf("parse database url: %w", err)
	}
	db := stdlib.OpenDB(*poolCfg.ConnConfig)
	defer func() { _ = db.Close() }()

	goose.SetBaseFS(migrations.FS)
	goose.SetLogger(gooseSlog{logger})
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	if err := goose.Up(db, "."); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	logger.Info("migrations up to date")
	return nil
}

type gooseSlog struct{ l *slog.Logger }

func (g gooseSlog) Fatalf(format string, v ...any) { g.l.Error(fmt.Sprintf(format, v...)) }
func (g gooseSlog) Printf(format string, v ...any) { g.l.Info(fmt.Sprintf(format, v...)) }
