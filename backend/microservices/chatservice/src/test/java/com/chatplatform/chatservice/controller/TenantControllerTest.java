package com.chatplatform.chatservice.controller;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chatplatform.chatservice.config.SecurityConfig;
import com.chatplatform.chatservice.entity.Tenant;
import com.chatplatform.chatservice.entity.TenantStatus;
import com.chatplatform.chatservice.exception.TenantNotFoundException;
import com.chatplatform.chatservice.exception.TenantSlugConflictException;
import com.chatplatform.chatservice.service.TenantService;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Slice test over the REST surface. Mocks TenantService so no DB is needed — this is the CRUD
 * contract's runnable check.
 */
@WebMvcTest(TenantController.class)
@Import(SecurityConfig.class)
class TenantControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockitoBean private TenantService tenantService;

  // The chain needs a decoder bean to build; jwt() post-processors below
  // inject the authentication directly, so it is never invoked.
  @MockitoBean private JwtDecoder jwtDecoder;

  private static org.springframework.security.test.web.servlet.request
          .SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor
      platformJwt() {
    return jwt()
        .jwt(
            token ->
                token.claim("tenant_id", "tenant-1").claim("roles", java.util.List.of("ADMIN")));
  }

  private Tenant sampleTenant() {
    OffsetDateTime now = OffsetDateTime.now();
    return new Tenant(
        UUID.randomUUID(),
        "acme-corp",
        "Acme Corp",
        TenantStatus.ACTIVE,
        now,
        now,
        "system",
        "system");
  }

  @Test
  void createReturns201WithLocationAndBody() throws Exception {
    Tenant created = sampleTenant();
    given(tenantService.create(any())).willReturn(created);

    mockMvc
        .perform(
            post("/api/v1/tenants")
                .with(platformJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                                {"slug":"acme-corp","name":"Acme Corp","status":"ACTIVE"}
                                """))
        .andExpect(status().isCreated())
        .andExpect(header().string("Location", "/api/v1/tenants/" + created.getTenantId()))
        .andExpect(jsonPath("$.slug", is("acme-corp")))
        .andExpect(jsonPath("$.status", is("ACTIVE")))
        .andExpect(jsonPath("$.createdBy", is("system")))
        .andExpect(jsonPath("$.updatedBy", is("system")));
  }

  @Test
  void createRejectsInvalidSlug() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/tenants")
                .with(platformJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                                {"slug":"NOT VALID!","name":"Acme Corp"}
                                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors.slug").exists());
  }

  @Test
  void createReturns409OnDuplicateSlug() throws Exception {
    given(tenantService.create(any())).willThrow(new TenantSlugConflictException("acme-corp"));

    mockMvc
        .perform(
            post("/api/v1/tenants")
                .with(platformJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                                {"slug":"acme-corp","name":"Acme Corp"}
                                """))
        .andExpect(status().isConflict());
  }

  @Test
  void getReturns404WhenMissing() throws Exception {
    UUID missing = UUID.randomUUID();
    given(tenantService.get(missing)).willThrow(new TenantNotFoundException(missing));

    mockMvc
        .perform(get("/api/v1/tenants/{id}", missing).with(platformJwt()))
        .andExpect(status().isNotFound());
  }

  @Test
  void getReturnsTenant() throws Exception {
    Tenant tenant = sampleTenant();
    given(tenantService.get(tenant.getTenantId())).willReturn(tenant);

    mockMvc
        .perform(get("/api/v1/tenants/{id}", tenant.getTenantId()).with(platformJwt()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name", is("Acme Corp")));
  }

  @Test
  void listReturnsPage() throws Exception {
    Tenant tenant = sampleTenant();
    given(tenantService.list(any(Pageable.class)))
        .willReturn(new PageImpl<>(java.util.List.of(tenant)));

    mockMvc
        .perform(get("/api/v1/tenants").with(platformJwt()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].slug", is("acme-corp")));
  }

  @Test
  void updateReturnsUpdatedTenant() throws Exception {
    Tenant tenant = sampleTenant();
    tenant.setName("Acme Corp Renamed");
    tenant.setStatus(TenantStatus.SUSPENDED);
    given(tenantService.update(eq(tenant.getTenantId()), any())).willReturn(tenant);

    mockMvc
        .perform(
            put("/api/v1/tenants/{id}", tenant.getTenantId())
                .with(platformJwt())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                                {"name":"Acme Corp Renamed","status":"SUSPENDED"}
                                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status", is("SUSPENDED")));
  }

  @Test
  void deleteReturns204() throws Exception {
    UUID id = UUID.randomUUID();

    mockMvc
        .perform(delete("/api/v1/tenants/{id}", id).with(platformJwt()))
        .andExpect(status().isNoContent());

    verify(tenantService).delete(id);
  }

  @Test
  void requestWithoutTokenIs401() throws Exception {
    mockMvc.perform(get("/api/v1/tenants")).andExpect(status().isUnauthorized());
  }

  @Test
  void responsesCarryHardeningHeaders() throws Exception {
    mockMvc
        .perform(get("/api/v1/tenants"))
        .andExpect(status().isUnauthorized())
        .andExpect(header().exists("Content-Security-Policy"))
        .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
        .andExpect(header().exists("Permissions-Policy"))
        .andExpect(header().string("Cross-Origin-Opener-Policy", "same-origin"));
  }

  @Test
  void bootUiChainPermitsUnauthenticatedAndWritesCsrfCookie() throws Exception {
    // The point is the request passes the permit-all BootUI chain (never a
    // 401/403 like the API chain would give) and the CsrfCookieFilter forces
    // the XSRF-TOKEN cookie the SPA reads back on mutating calls.
    mockMvc
        .perform(get("/bootui/"))
        .andExpect(
            result -> {
              int status = result.getResponse().getStatus();
              if (status == 401 || status == 403) {
                throw new AssertionError("expected the permit-all BootUI chain, got " + status);
              }
            })
        .andExpect(cookie().exists("XSRF-TOKEN"))
        .andExpect(header().exists("Content-Security-Policy"));
  }

  @Test
  void tokenWithoutTenantClaimIs403() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/tenants")
                .with(jwt().jwt(token -> token.claim("roles", java.util.List.of("ADMIN")))))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.title", is("Missing tenant")));
  }
}
