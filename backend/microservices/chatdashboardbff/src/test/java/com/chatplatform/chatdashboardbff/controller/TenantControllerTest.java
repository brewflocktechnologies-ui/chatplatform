package com.chatplatform.chatdashboardbff.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.chatplatform.accountservice.grpc.ListTenantsResponse;
import com.chatplatform.accountservice.grpc.Tenant;
import com.chatplatform.accountservice.grpc.TenantStatus;
import com.chatplatform.chatdashboardbff.client.TenantGrpcClient;
import com.google.protobuf.Empty;
import com.google.protobuf.Timestamp;
import io.grpc.Status;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webflux.test.autoconfigure.WebFluxTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

/**
 * Same role chatservice's TenantControllerTest plays: slice test of the REST surface with the
 * backend (here the gRPC client, there the JPA service) mocked - verifies DTO mapping, status
 * codes, validation, and the gRPC-Status-to-ProblemDetail translation, no server/network/upstream.
 */
@WebFluxTest(TenantController.class)
class TenantControllerTest {

  private static final UUID TENANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

  @Autowired private WebTestClient webTestClient;

  @MockitoBean private TenantGrpcClient tenantClient;

  private static Tenant sampleProtoTenant() {
    Timestamp now = Timestamp.newBuilder().setSeconds(1735689600).build();
    return Tenant.newBuilder()
        .setTenantId(TENANT_ID.toString())
        .setSlug("acme-corp")
        .setName("Acme Corp")
        .setStatus(TenantStatus.TENANT_STATUS_ACTIVE)
        .setCreatedAt(now)
        .setUpdatedAt(now)
        .setCreatedBy("system")
        .setUpdatedBy("system")
        .setVersion(0)
        .build();
  }

  @Test
  void createReturns201WithMappedBody() {
    given(tenantClient.create(anyString(), anyString(), any()))
        .willReturn(Mono.just(sampleProtoTenant()));

    webTestClient
        .post()
        .uri("/api/v1/tenants")
        .header("Content-Type", "application/json")
        .bodyValue("{\"slug\":\"acme-corp\",\"name\":\"Acme Corp\"}")
        .exchange()
        .expectStatus()
        .isCreated()
        .expectBody()
        .jsonPath("$.tenantId")
        .isEqualTo(TENANT_ID.toString())
        .jsonPath("$.slug")
        .isEqualTo("acme-corp")
        .jsonPath("$.status")
        .isEqualTo("ACTIVE")
        .jsonPath("$.version")
        .isEqualTo(0);
  }

  @Test
  void createRejectsInvalidSlugWith400FieldErrors() {
    webTestClient
        .post()
        .uri("/api/v1/tenants")
        .header("Content-Type", "application/json")
        .bodyValue("{\"slug\":\"NOT VALID\",\"name\":\"Acme Corp\"}")
        .exchange()
        .expectStatus()
        .isBadRequest()
        .expectBody()
        .jsonPath("$.fieldErrors.slug")
        .exists();
  }

  @Test
  void createWithBlankSlugMergesDuplicateFieldErrors() {
    // "" fails @NotBlank AND @Pattern - two errors on one field, exercising
    // the toMap merge function in the validation handler.
    webTestClient
        .post()
        .uri("/api/v1/tenants")
        .header("Content-Type", "application/json")
        .bodyValue("{\"slug\":\"\",\"name\":\"Acme Corp\"}")
        .exchange()
        .expectStatus()
        .isBadRequest()
        .expectBody()
        .jsonPath("$.fieldErrors.slug")
        .exists();
  }

  @Test
  void createMapsAlreadyExistsTo409() {
    given(tenantClient.create(anyString(), anyString(), any()))
        .willReturn(
            Mono.error(
                Status.ALREADY_EXISTS
                    .withDescription("tenant with slug 'acme-corp' already exists")
                    .asRuntimeException()));

    webTestClient
        .post()
        .uri("/api/v1/tenants")
        .header("Content-Type", "application/json")
        .bodyValue("{\"slug\":\"acme-corp\",\"name\":\"Acme Corp\"}")
        .exchange()
        .expectStatus()
        .isEqualTo(409)
        .expectBody()
        .jsonPath("$.detail")
        .isEqualTo("tenant with slug 'acme-corp' already exists");
  }

  @Test
  void getMapsNotFoundTo404() {
    given(tenantClient.get(TENANT_ID.toString()))
        .willReturn(
            Mono.error(Status.NOT_FOUND.withDescription("no such tenant").asRuntimeException()));

    webTestClient
        .get()
        .uri("/api/v1/tenants/{id}", TENANT_ID)
        .exchange()
        .expectStatus()
        .isNotFound();
  }

  @Test
  void getMapsUnavailableTo503() {
    given(tenantClient.get(TENANT_ID.toString()))
        .willReturn(
            Mono.error(
                Status.UNAVAILABLE.withDescription("connection refused").asRuntimeException()));

    webTestClient
        .get()
        .uri("/api/v1/tenants/{id}", TENANT_ID)
        .exchange()
        .expectStatus()
        .isEqualTo(503);
  }

  @Test
  void listReturnsPageEnvelope() {
    given(tenantClient.list(anyInt(), anyInt()))
        .willReturn(
            Mono.just(
                ListTenantsResponse.newBuilder()
                    .addTenants(sampleProtoTenant())
                    .setPage(0)
                    .setSize(20)
                    .setTotalElements(1)
                    .setTotalPages(1)
                    .build()));

    webTestClient
        .get()
        .uri("/api/v1/tenants")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.content[0].slug")
        .isEqualTo("acme-corp")
        .jsonPath("$.totalElements")
        .isEqualTo(1);
  }

  @Test
  void updateReturnsMappedBody() {
    given(tenantClient.update(anyString(), anyString(), any()))
        .willReturn(Mono.just(sampleProtoTenant()));

    webTestClient
        .put()
        .uri("/api/v1/tenants/{id}", TENANT_ID)
        .header("Content-Type", "application/json")
        .bodyValue("{\"name\":\"Renamed\",\"status\":\"SUSPENDED\"}")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.tenantId")
        .isEqualTo(TENANT_ID.toString());
  }

  @Test
  void deleteReturns204() {
    given(tenantClient.delete(TENANT_ID.toString()))
        .willReturn(Mono.just(Empty.getDefaultInstance()));

    webTestClient
        .delete()
        .uri("/api/v1/tenants/{id}", TENANT_ID)
        .exchange()
        .expectStatus()
        .isNoContent();
  }
}
