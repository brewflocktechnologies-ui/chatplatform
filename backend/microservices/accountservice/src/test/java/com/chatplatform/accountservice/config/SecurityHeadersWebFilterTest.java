package com.chatplatform.accountservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;

class SecurityHeadersWebFilterTest {

  private final SecurityHeadersWebFilter filter = new SecurityHeadersWebFilter();

  @Test
  void setsHardeningHeadersOnHttpResponses() {
    MockServerWebExchange exchange =
        MockServerWebExchange.from(MockServerHttpRequest.get("/actuator/health"));

    filter.filter(exchange, e -> reactor.core.publisher.Mono.empty()).block();

    HttpHeaders headers = exchange.getResponse().getHeaders();
    assertThat(headers.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
    assertThat(headers.getFirst("X-Frame-Options")).isEqualTo("DENY");
    assertThat(headers.getFirst("Content-Security-Policy"))
        .isEqualTo(SecurityHeadersWebFilter.CONTENT_SECURITY_POLICY);
    assertThat(headers.getFirst("Referrer-Policy")).isEqualTo("strict-origin-when-cross-origin");
    assertThat(headers.getFirst("Permissions-Policy"))
        .isEqualTo(SecurityHeadersWebFilter.PERMISSIONS_POLICY);
    assertThat(headers.getFirst("Cross-Origin-Opener-Policy")).isEqualTo("same-origin");
    assertThat(headers.getFirst("Cross-Origin-Resource-Policy")).isEqualTo("same-origin");
    assertThat(headers.getFirst("Cross-Origin-Embedder-Policy")).isEqualTo("require-corp");
  }

  @Test
  void leavesBootUiResponsesToBootUisOwnHeaders() {
    ServerWebExchange exchange =
        MockServerWebExchange.from(MockServerHttpRequest.get("/bootui/api/panels"));

    filter.filter(exchange, e -> reactor.core.publisher.Mono.empty()).block();

    assertThat(exchange.getResponse().getHeaders().getFirst("Content-Security-Policy")).isNull();
  }
}
