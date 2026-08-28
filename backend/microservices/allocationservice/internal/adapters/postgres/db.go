// Package postgres is the persistence adapter: pgxpool + sqlc-generated
// queries implementing the ports. All SQL, pgx and mapping detail stays here.
package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PoolConfig is the tunable subset of pgxpool settings. Sizing guidance:
// max_conns should stay below Postgres max_connections / replica count;
// start with ~4x CPU cores of the DATABASE server shared across replicas,
// and size DOWN as replicas scale out (10 replicas x 20 conns = 200 server
// connections). MinConns keeps warm connections for latency-sensitive paths.
type PoolConfig struct {
	URL               string
	MinConns          int32
	MaxConns          int32
	MaxConnLifetime   time.Duration
	MaxConnIdleTime   time.Duration
	HealthCheckPeriod time.Duration
	// QueryTimeout caps every individual repository call as a safety net
	// under the caller's own context deadline.
	QueryTimeout time.Duration
}

// NewPool builds a configured, verified pgx pool.
func NewPool(ctx context.Context, cfg PoolConfig) (*pgxpool.Pool, error) {
	pc, err := pgxpool.ParseConfig(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	if cfg.MinConns > 0 {
		pc.MinConns = cfg.MinConns
	}
	if cfg.MaxConns > 0 {
		pc.MaxConns = cfg.MaxConns
	}
	if cfg.MaxConnLifetime > 0 {
		pc.MaxConnLifetime = cfg.MaxConnLifetime
	}
	if cfg.MaxConnIdleTime > 0 {
		pc.MaxConnIdleTime = cfg.MaxConnIdleTime
	}
	if cfg.HealthCheckPeriod > 0 {
		pc.HealthCheckPeriod = cfg.HealthCheckPeriod
	}
	pool, err := pgxpool.NewWithConfig(ctx, pc)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// txKey carries the active pgx.Tx through context so repository methods
// transparently join a transaction opened by TxManager.
type txKey struct{}

// TxManager implements ports.TxManager over pgx transactions.
type TxManager struct {
	pool *pgxpool.Pool
	// timeout bounds the whole transaction; 0 = rely on caller deadline only.
	timeout time.Duration
}

// NewTxManager wires the transaction boundary adapter.
func NewTxManager(pool *pgxpool.Pool, timeout time.Duration) *TxManager {
	return &TxManager{pool: pool, timeout: timeout}
}

// WithinTx opens a transaction, runs fn with it in context, and commits or
// rolls back. Nested calls join the outer transaction.
func (m *TxManager) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	if _, ok := ctx.Value(txKey{}).(pgx.Tx); ok {
		return fn(ctx) // already inside a transaction
	}
	if m.timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, m.timeout)
		defer cancel()
	}
	tx, err := m.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }() // no-op after commit

	if err := fn(context.WithValue(ctx, txKey{}, tx)); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
