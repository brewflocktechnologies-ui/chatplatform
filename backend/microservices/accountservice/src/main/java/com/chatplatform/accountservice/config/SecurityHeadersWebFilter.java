package com.chatplatform.accountservice.config;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Hardening headers for the small HTTP surface this gRPC service exposes (actuator on the
 * management port, BootUI + springdoc in dev). The business API is gRPC — there is no Spring
 * Security web chain here to emit these, so a plain WebFilter does it. BootUI's paths are skipped:
 * its own filter sets a tailored policy (its UI needs inline styles a strict CSP would break).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersWebFilter implements WebFilter {

  /** No scripts, no embedding, no framing — nothing served here is a browser application. */
  static final String CONTENT_SECURITY_POLICY =
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
          + "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; "
          + "form-action 'self'; frame-ancestors 'none'";

  /** Browser features an API service never needs. */
  static final String PERMISSIONS_POLICY =
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), "
          + "microphone=(), payment=(), usb=()";

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
    if (exchange.getRequest().getPath().value().startsWith("/bootui")) {
      return chain.filter(exchange);
    }
    HttpHeaders headers = exchange.getResponse().getHeaders();
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Permissions-Policy", PERMISSIONS_POLICY);
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    return chain.filter(exchange);
  }
}
