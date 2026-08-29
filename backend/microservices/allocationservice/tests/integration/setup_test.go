// Package integration tests the real stack: goose-migrated PostgreSQL, the
// pgx/sqlc repository, the application service, and the full gRPC server
// over an in-process bufconn listener.
//
// Requires TEST_DATABASE_URL (a database safe to create tables in - the
// suite migrates itself and truncates between tests). Unset => skipped, so
// `go test ./...` stays green without infrastructure.
package integration

import (
	"context"
	"log/slog"
	"net"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/test/bufconn"

	allocationv1 "github.com/chatplatform/allocationservice/gen/proto/allocation/v1"
	grpcadapter "github.com/chatplatform/allocationservice/internal/adapters/grpc"
	"github.com/chatplatform/allocationservice/internal/adapters/grpc/interceptors"
	"github.com/chatplatform/allocationservice/internal/adapters/postgres"
	app "github.com/chatplatform/allocationservice/internal/application/allocation"
	"github.com/chatplatform/allocationservice/internal/observability"
	"github.com/chatplatform/allocationservice/internal/ports"
	"github.com/chatplatform/allocationservice/migrations"
)

var (
	pool *pgxpool.Pool
	repo *postgres.AllocationRepository
	tx   *postgres.TxManager
	svc  *app.Service
)

func TestMain(m *testing.M) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		os.Exit(m.Run()) // every test checks pool == nil and skips
	}
	ctx := context.Background()

	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		panic(err)
	}
	db := stdlib.OpenDB(*cfg.ConnConfig)
	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		panic(err)
	}
	if err := goose.Up(db, "."); err != nil {
		panic(err)
	}
	_ = db.Close()

	if pool, err = pgxpool.New(ctx, url); err != nil {
		panic(err)
	}
	repo = postgres.NewAllocationRepository(pool, 5*time.Second)
	tx = postgres.NewTxManager(pool, 10*time.Second)
	svc = app.NewService(repo, tx, ports.SystemClock, ports.NopMetrics{})

	code := m.Run()
	pool.Close()
	os.Exit(code)
}

func requireDB(t *testing.T) {
	t.Helper()
	if pool == nil {
		t.Skip("TEST_DATABASE_URL not set")
	}
	if _, err := pool.Exec(context.Background(), "TRUNCATE allocations"); err != nil {
		t.Fatalf("truncate: %v", err)
	}
}

// newGRPCClient boots the REAL server (handler + interceptors + health) on
// bufconn and returns a connected client.
func newGRPCClient(t *testing.T) allocationv1.AllocationServiceClient {
	t.Helper()
	logger := slog.New(slog.DiscardHandler)
	handler, err := grpcadapter.NewAllocationHandler(svc, logger)
	if err != nil {
		t.Fatal(err)
	}
	// trusted-header mode, matching what the integration suite exercises
	// (JWT mode is covered by the interceptor's own tests).
	server, _ := grpcadapter.NewServer(handler, observability.NewMetrics(), logger, interceptors.AuthContext())

	lis := bufconn.Listen(1 << 20)
	go func() { _ = server.Serve(lis) }()
	t.Cleanup(server.Stop)

	conn, err := grpc.NewClient("passthrough:///bufconn",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	return allocationv1.NewAllocationServiceClient(conn)
}

// tenantCtx attaches the authenticated-tenant metadata the platform edge
// would provide.
func tenantCtx(tenant string) context.Context {
	return metadata.AppendToOutgoingContext(context.Background(), "x-tenant-id", tenant)
}
