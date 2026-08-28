# Observability

One open-source, OTel-native observability stack for the whole monorepo — every
service exports traces, metrics, and logs here over OTLP; nothing is per-service.

## Start it

```bash
docker compose -f observability/docker-compose.yml up -d
```

- Grafana: http://localhost:3000 (default login `admin`/`admin`, change on first login — pre-provisioned with Prometheus/Tempo/Loki datasources and JVM + RED-metrics dashboards)
- OTLP receiver: `localhost:4317` (gRPC), `localhost:4318` (HTTP)

It's [`grafana/otel-lgtm`](https://github.com/grafana/docker-otel-lgtm) — Grafana Labs' official all-in-one bundle: an OpenTelemetry Collector receiving OTLP, fanning out to Prometheus (metrics), Tempo (traces), and Loki (logs), all wired as Grafana datasources already. One container instead of five, which is the point for a monorepo-wide dev/demo stack. Swap in split services (their own Collector + Prometheus + Tempo + Loki + Grafana containers, each independently scaled) if this ever needs to run past one host or outlive a container restart for real production retention.

## Wiring a service in (Maven/Java — see chatservice)

Three separate things, not one flag:

1. **Traces + logs** — `io.opentelemetry:opentelemetry-exporter-otlp`, activates Spring Boot's `OtlpTracingAutoConfiguration` / `OtlpLoggingAutoConfiguration`. Point them at the collector with `management.opentelemetry.tracing.export.otlp.endpoint` and `management.opentelemetry.logging.export.otlp.endpoint` — **not** the shorter `management.otlp.tracing.*` / `management.otlp.logging.*` names Spring Boot 4.0.8's own config metadata also documents. Those are silently a no-op: the `ConnectionDetails` beans behind both auto-configurations are `@ConditionalOnProperty` on the longer `management.opentelemetry.*` names only. Confirmed the hard way, via `--debug`'s condition evaluation report and the OTel Collector's own `otelcol_receiver_accepted_spans_total` sitting at zero.
2. **Metrics** — `io.micrometer:micrometer-registry-otlp`, activates `OtlpMetricsExportAutoConfiguration`, configured via `management.otlp.metrics.export.url` — this one genuinely is the short name, it's a different Spring Boot module (`spring-boot-micrometer-metrics`) without the `ConnectionDetails` indirection tracing/logging have. Pushes on a 60s interval by default; don't expect data before then.
3. **Logs, part two** — `spring-boot-opentelemetry` only builds the OTel-side logging SDK (a `LoggerProvider` + the OTLP exporter). It does **not** bridge Logback into it — that's `io.opentelemetry.instrumentation:opentelemetry-logback-appender-1.0` (a separate project/artifact family, versioned independently of the core SDK), wired via `logback-spring.xml`'s `<appender class="io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender">`, plus a `@PostConstruct` that calls `OpenTelemetryAppender.install(openTelemetry)` on the Spring-managed `OpenTelemetry` bean (the appender otherwise looks for the JVM-wide `GlobalOpenTelemetry`, which Spring deliberately never sets — so without the explicit install call, it's a silent no-op, same failure shape as (1)). See `chatservice`'s `config/OpenTelemetryLoggingConfig.java` and `logback-spring.xml`.

Every one of the three pillars was verified end-to-end against a live stack, not just wired and assumed — real spans in Tempo (`GET /api/v1/tenants`, actual durations), real per-endpoint HTTP metrics in Prometheus, real log lines in Loki with `service_name`, source file/line, and severity attached.

## Convention for future services

Point at the same collector (`localhost:4317`/`4318`), same three dependency+config groups above, `service.name` comes from `spring.application.name` automatically (no extra config). A non-Java service uses its own ecosystem's OTel SDK against the same collector.
