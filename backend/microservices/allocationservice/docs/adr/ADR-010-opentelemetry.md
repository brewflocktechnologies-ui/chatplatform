# ADR-010: Vendor-neutral observability

**Status**: accepted

Traces: OTel SDK -> OTLP/gRPC to any collector (address via OTLP_ADDRESS;
tested against grafana/otel-lgtm). Metrics: Prometheus registry scraped at
/metrics - technical (grpc_*, db_pool_*, process_*) and business
(allocation_*_total) counters, all low-cardinality (no tenant/id labels).
Logs: JSON slog to stdout with trace_id/span_id stamped from span context -
collectors ship them; the service assumes no vendor. Request/correlation ids
propagate via metadata and appear in every RPC log record.
