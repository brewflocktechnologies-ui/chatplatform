package com.chatplatform.chatdashboardbff.config;

import com.chatplatform.chatdashboardbff.controller.TenantController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webflux.test.autoconfigure.WebFluxTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.test.web.reactive.server.SecurityMockServerConfigurers;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;

/**
 * The dev-only BootUI chain replaces the starter's own (headerless) chain — this pins the parts
 * that matter: unauthenticated requests pass (BootUI's loopback guard is the real gate), the
 * XSRF-TOKEN cookie is written for the SPA, and the hardening CSP is emitted.
 */
@WebFluxTest(TenantController.class)
@Import(SecurityConfig.class)
class BootUiSecurityChainTest {

  @Autowired private ApplicationContext applicationContext;

  @MockitoBean private com.chatplatform.chatdashboardbff.client.TenantGrpcClient tenantClient;
  @MockitoBean private ReactiveJwtDecoder reactiveJwtDecoder;

  @Test
  void bootUiChainPermitsUnauthenticatedAndWritesCsrfCookie() {
    WebTestClient unauthenticated =
        WebTestClient.bindToApplicationContext(applicationContext)
            .apply(SecurityMockServerConfigurers.springSecurity())
            .configureClient()
            .build();

    unauthenticated
        .get()
        .uri("/bootui/")
        .exchange()
        .expectStatus()
        .value(
            status -> {
              if (status == 401 || status == 403) {
                throw new AssertionError("expected the permit-all BootUI chain, got " + status);
              }
            })
        .expectHeader()
        .exists("Content-Security-Policy")
        .expectCookie()
        .exists("XSRF-TOKEN");
  }
}
