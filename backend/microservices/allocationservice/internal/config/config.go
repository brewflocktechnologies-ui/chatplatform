// Package config loads and validates strongly typed configuration from
// environment variables. Mandatory settings fail fast at startup; secrets
// are never hard-coded (DATABASE_URL carries credentials and comes from the
// environment/secret store).
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config is the full service configuration.
type Config struct {
	ServiceName string
	Environment string

	GRPC struct {
		// Address the gRPC server listens on, e.g. ":9096".
		Address string
	}

	// HTTP serves /metrics, /healthz and /readyz.
	HTTP struct {
		Address string
	}

	Database struct {
		URL               string
		MinConns          int32
		MaxConns          int32
		MaxConnLifetime   time.Duration
		MaxConnIdleTime   time.Duration
		HealthCheckPeriod time.Duration
		QueryTimeout      time.Duration
		TxTimeout         time.Duration
		// MigrateOnStart runs embedded goose migrations before serving -
		// convenient locally/compose; production typically migrates in a
		// deploy step instead.
		MigrateOnStart bool
	}

	Telemetry struct {
		Enabled     bool
		OTLPAddress string
	}

	Logging struct {
		Level  string
		Format string
	}

	// ShutdownTimeout bounds the graceful-drain window on SIGTERM/SIGINT.
	ShutdownTimeout time.Duration
}

// Load reads configuration, applying defaults and validating mandatory
// values.
func Load() (Config, error) {
	var cfg Config
	cfg.ServiceName = getEnv("SERVICE_NAME", "allocationservice")
	cfg.Environment = getEnv("ENVIRONMENT", "dev")
	cfg.GRPC.Address = getEnv("GRPC_ADDRESS", ":9096")
	cfg.HTTP.Address = getEnv("HTTP_ADDRESS", ":9097")

	cfg.Database.URL = os.Getenv("DATABASE_URL")
	if cfg.Database.URL == "" {
		return cfg, errors.New("DATABASE_URL is required")
	}

	var err error
	if cfg.Database.MinConns, err = getEnvInt32("DB_MIN_CONNS", 2); err != nil {
		return cfg, err
	}
	if cfg.Database.MaxConns, err = getEnvInt32("DB_MAX_CONNS", 10); err != nil {
		return cfg, err
	}
	if cfg.Database.MinConns > cfg.Database.MaxConns {
		return cfg, fmt.Errorf("DB_MIN_CONNS (%d) exceeds DB_MAX_CONNS (%d)", cfg.Database.MinConns, cfg.Database.MaxConns)
	}
	if cfg.Database.MaxConnLifetime, err = getEnvDuration("DB_MAX_CONN_LIFETIME", time.Hour); err != nil {
		return cfg, err
	}
	if cfg.Database.MaxConnIdleTime, err = getEnvDuration("DB_MAX_CONN_IDLE_TIME", 30*time.Minute); err != nil {
		return cfg, err
	}
	if cfg.Database.HealthCheckPeriod, err = getEnvDuration("DB_HEALTH_CHECK_PERIOD", time.Minute); err != nil {
		return cfg, err
	}
	if cfg.Database.QueryTimeout, err = getEnvDuration("DB_QUERY_TIMEOUT", 5*time.Second); err != nil {
		return cfg, err
	}
	if cfg.Database.TxTimeout, err = getEnvDuration("DB_TX_TIMEOUT", 10*time.Second); err != nil {
		return cfg, err
	}
	cfg.Database.MigrateOnStart = getEnvBool("DB_MIGRATE_ON_START", false)

	cfg.Telemetry.Enabled = getEnvBool("TELEMETRY_ENABLED", false)
	cfg.Telemetry.OTLPAddress = getEnv("OTLP_ADDRESS", "localhost:4317")
	if cfg.Telemetry.Enabled && cfg.Telemetry.OTLPAddress == "" {
		return cfg, errors.New("OTLP_ADDRESS is required when TELEMETRY_ENABLED=true")
	}

	cfg.Logging.Level = getEnv("LOG_LEVEL", "info")
	cfg.Logging.Format = getEnv("LOG_FORMAT", "json")

	if cfg.ShutdownTimeout, err = getEnvDuration("SHUTDOWN_TIMEOUT", 20*time.Second); err != nil {
		return cfg, err
	}
	return cfg, nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvBool(key string, def bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func getEnvInt32(key string, def int32) (int32, error) {
	v := os.Getenv(key)
	if v == "" {
		return def, nil
	}
	n, err := strconv.ParseInt(v, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return int32(n), nil
}

func getEnvDuration(key string, def time.Duration) (time.Duration, error) {
	v := os.Getenv(key)
	if v == "" {
		return def, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return d, nil
}
