package observability

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Metrics owns the Prometheus registry: technical gRPC/pool metrics plus the
// allocation business counters. Labels are low-cardinality by design - no
// tenant/allocation/request ids ever become label values.
type Metrics struct {
	Registry *prometheus.Registry

	GRPCRequests *prometheus.CounterVec
	GRPCDuration *prometheus.HistogramVec

	allocationCreated   prometheus.Counter
	allocationAllocated prometheus.Counter
	allocationReleased  prometheus.Counter
	allocationCompleted prometheus.Counter
	allocationConflict  prometheus.Counter
	allocationReplay    prometheus.Counter
	AllocationLatency   *prometheus.HistogramVec
}

// NewMetrics builds and registers everything, including Go process/runtime
// collectors (process_cpu, process_memory, goroutines...).
func NewMetrics() *Metrics {
	reg := prometheus.NewRegistry()
	reg.MustRegister(
		collectors.NewGoCollector(),
		collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}),
	)
	m := &Metrics{
		Registry: reg,
		GRPCRequests: prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "grpc_requests_total",
			Help: "gRPC requests by full method and status code.",
		}, []string{"method", "code"}),
		GRPCDuration: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "grpc_request_duration_seconds",
			Help:    "gRPC request latency by full method.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method"}),
		allocationCreated: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "allocation_created_total", Help: "Allocations created (non-replay)."}),
		allocationAllocated: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "allocation_allocated_total", Help: "PENDING->ALLOCATED transitions."}),
		allocationReleased: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "allocation_released_total", Help: "ALLOCATED->RELEASED transitions."}),
		allocationCompleted: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "allocation_completed_total", Help: "ALLOCATED->COMPLETED transitions."}),
		allocationConflict: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "allocation_conflict_total", Help: "Optimistic-concurrency conflicts."}),
		allocationReplay: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "allocation_idempotency_replay_total", Help: "Creates answered by idempotent replay."}),
		AllocationLatency: prometheus.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "allocation_latency_seconds",
			Help:    "Application-operation latency by operation.",
			Buckets: prometheus.DefBuckets,
		}, []string{"operation"}),
	}
	reg.MustRegister(
		m.GRPCRequests, m.GRPCDuration,
		m.allocationCreated, m.allocationAllocated, m.allocationReleased,
		m.allocationCompleted, m.allocationConflict, m.allocationReplay,
		m.AllocationLatency,
	)
	return m
}

// Business metrics implement ports.BusinessMetrics.
func (m *Metrics) IncCreated()           { m.allocationCreated.Inc() }
func (m *Metrics) IncAllocated()         { m.allocationAllocated.Inc() }
func (m *Metrics) IncReleased()          { m.allocationReleased.Inc() }
func (m *Metrics) IncCompleted()         { m.allocationCompleted.Inc() }
func (m *Metrics) IncConflict()          { m.allocationConflict.Inc() }
func (m *Metrics) IncIdempotencyReplay() { m.allocationReplay.Inc() }

// RegisterPool exposes pgxpool statistics as gauges scraped on demand.
func (m *Metrics) RegisterPool(pool *pgxpool.Pool) {
	m.Registry.MustRegister(poolCollector{pool: pool})
}

// Handler serves /metrics for Prometheus scrapes.
func (m *Metrics) Handler() http.Handler {
	return promhttp.HandlerFor(m.Registry, promhttp.HandlerOpts{})
}

type poolCollector struct{ pool *pgxpool.Pool }

var (
	poolConnsDesc        = prometheus.NewDesc("db_pool_connections", "Total connections in the pool.", nil, nil)
	poolIdleDesc         = prometheus.NewDesc("db_pool_idle_connections", "Idle connections in the pool.", nil, nil)
	poolAcquireDurDesc   = prometheus.NewDesc("db_pool_acquire_duration_seconds_total", "Cumulative time spent acquiring connections.", nil, nil)
	poolAcquireCountDesc = prometheus.NewDesc("db_pool_acquires_total", "Cumulative successful acquires.", nil, nil)
)

func (c poolCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- poolConnsDesc
	ch <- poolIdleDesc
	ch <- poolAcquireDurDesc
	ch <- poolAcquireCountDesc
}

func (c poolCollector) Collect(ch chan<- prometheus.Metric) {
	s := c.pool.Stat()
	ch <- prometheus.MustNewConstMetric(poolConnsDesc, prometheus.GaugeValue, float64(s.TotalConns()))
	ch <- prometheus.MustNewConstMetric(poolIdleDesc, prometheus.GaugeValue, float64(s.IdleConns()))
	ch <- prometheus.MustNewConstMetric(poolAcquireDurDesc, prometheus.CounterValue, s.AcquireDuration().Seconds())
	ch <- prometheus.MustNewConstMetric(poolAcquireCountDesc, prometheus.CounterValue, float64(s.AcquireCount()))
}

// ObserveOperation records one application-operation latency sample.
func (m *Metrics) ObserveOperation(operation string, d time.Duration) {
	m.AllocationLatency.WithLabelValues(operation).Observe(d.Seconds())
}
