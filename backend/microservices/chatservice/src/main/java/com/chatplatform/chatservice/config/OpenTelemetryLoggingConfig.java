package com.chatplatform.chatservice.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

/**
 * spring-boot-opentelemetry only builds the OTel-side logging SDK (LoggerProvider + OTLP exporter)
 * - it never wires anything into Logback, so without this, log records are built and exported to
 * nowhere (confirmed empty at the OTel Collector's receiver metrics: it's a genuinely separate step
 * from tracing/metrics, both of which Spring Boot fully auto-wires). {@code logback-spring.xml}
 * declares the {@code OpenTelemetryAppender}; this installs the Spring-managed {@link
 * OpenTelemetry} bean into it once it's available (the appender otherwise falls back to the
 * JVM-wide {@code GlobalOpenTelemetry}, which Spring deliberately never sets, so it would just be a
 * no-op).
 */
@Configuration(proxyBeanMethods = false)
public class OpenTelemetryLoggingConfig {

  private final OpenTelemetry openTelemetry;

  public OpenTelemetryLoggingConfig(OpenTelemetry openTelemetry) {
    this.openTelemetry = openTelemetry;
  }

  @PostConstruct
  void installLogbackAppender() {
    OpenTelemetryAppender.install(openTelemetry);
  }
}
