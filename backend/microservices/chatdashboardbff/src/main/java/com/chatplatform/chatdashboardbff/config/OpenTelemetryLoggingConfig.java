package com.chatplatform.chatdashboardbff.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

/**
 * Same gap chatservice and accountservice hit: {@code spring-boot-starter-opentelemetry} builds the
 * OTel-side logging SDK but never bridges Logback into it. {@code logback-spring.xml} declares the
 * {@code OpenTelemetryAppender}; this installs the Spring-managed {@link OpenTelemetry} bean into
 * it (the appender otherwise looks for {@code GlobalOpenTelemetry}, which Spring deliberately never
 * sets - a silent no-op without this).
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
