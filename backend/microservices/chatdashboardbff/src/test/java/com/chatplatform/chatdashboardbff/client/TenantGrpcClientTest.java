package com.chatplatform.chatdashboardbff.client;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

import com.chatplatform.accountservice.grpc.CreateTenantRequest;
import com.chatplatform.accountservice.grpc.DeleteTenantRequest;
import com.chatplatform.accountservice.grpc.GetTenantRequest;
import com.chatplatform.accountservice.grpc.ListTenantsRequest;
import com.chatplatform.accountservice.grpc.ListTenantsResponse;
import com.chatplatform.accountservice.grpc.Tenant;
import com.chatplatform.accountservice.grpc.TenantServiceGrpc;
import com.chatplatform.accountservice.grpc.TenantStatus;
import com.chatplatform.accountservice.grpc.UpdateTenantRequest;
import com.google.protobuf.Empty;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import reactor.test.StepVerifier;

/**
 * Exercises the StreamObserver-to-Mono bridge: the stub (a final class - Mockito's inline mock
 * maker handles it) is stubbed to invoke the captured observer's callbacks, and StepVerifier
 * asserts the resulting Mono's signals.
 */
class TenantGrpcClientTest {

  private TenantServiceGrpc.TenantServiceStub stub;
  private TenantGrpcClient client;

  @BeforeEach
  void setUp() {
    stub = mock(TenantServiceGrpc.TenantServiceStub.class);
    // The client stamps a per-call deadline; the deadline-stamped stub a real
    // AbstractStub would return is just this mock again.
    org.mockito.BDDMockito.given(
            stub.withDeadlineAfter(org.mockito.ArgumentMatchers.anyLong(), any()))
        .willReturn(stub);
    client = new TenantGrpcClient(stub);
  }

  @Test
  void unarySuccessEmitsValueAndCompletes() {
    Tenant tenant = Tenant.newBuilder().setSlug("acme-corp").build();
    doAnswer(
            invocation -> {
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onNext(tenant);
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .getTenant(any(GetTenantRequest.class), any());

    StepVerifier.create(client.get("some-id")).expectNext(tenant).verifyComplete();
  }

  @Test
  void createBridgesRequestFieldsAndResponse() {
    Tenant tenant = Tenant.newBuilder().setSlug("acme-corp").build();
    doAnswer(
            invocation -> {
              CreateTenantRequest request = invocation.getArgument(0);
              org.assertj.core.api.Assertions.assertThat(request.getSlug()).isEqualTo("acme-corp");
              org.assertj.core.api.Assertions.assertThat(request.getStatus())
                  .isEqualTo(TenantStatus.TENANT_STATUS_ACTIVE);
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onNext(tenant);
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .createTenant(any(CreateTenantRequest.class), any());

    StepVerifier.create(client.create("acme-corp", "Acme Corp", TenantStatus.TENANT_STATUS_ACTIVE))
        .expectNext(tenant)
        .verifyComplete();
  }

  @Test
  void listBridgesPageParams() {
    ListTenantsResponse response = ListTenantsResponse.newBuilder().setTotalElements(5).build();
    doAnswer(
            invocation -> {
              ListTenantsRequest request = invocation.getArgument(0);
              org.assertj.core.api.Assertions.assertThat(request.getPage()).isEqualTo(2);
              org.assertj.core.api.Assertions.assertThat(request.getSize()).isEqualTo(10);
              StreamObserver<ListTenantsResponse> observer = invocation.getArgument(1);
              observer.onNext(response);
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .listTenants(any(ListTenantsRequest.class), any());

    StepVerifier.create(client.list(2, 10)).expectNext(response).verifyComplete();
  }

  @Test
  void updateBridgesRequestFieldsAndResponse() {
    Tenant tenant = Tenant.newBuilder().setName("Renamed").build();
    doAnswer(
            invocation -> {
              UpdateTenantRequest request = invocation.getArgument(0);
              org.assertj.core.api.Assertions.assertThat(request.getName()).isEqualTo("Renamed");
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onNext(tenant);
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .updateTenant(any(UpdateTenantRequest.class), any());

    StepVerifier.create(client.update("some-id", "Renamed", TenantStatus.TENANT_STATUS_SUSPENDED))
        .expectNext(tenant)
        .verifyComplete();
  }

  @Test
  void deleteBridgesToEmptyResponse() {
    doAnswer(
            invocation -> {
              StreamObserver<Empty> observer = invocation.getArgument(1);
              observer.onNext(Empty.getDefaultInstance());
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .deleteTenant(any(DeleteTenantRequest.class), any());

    StepVerifier.create(client.delete("some-id"))
        .expectNext(Empty.getDefaultInstance())
        .verifyComplete();
  }

  @Test
  void everyCallCarriesTheDeadline() {
    doAnswer(
            invocation -> {
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onNext(Tenant.getDefaultInstance());
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .getTenant(any(GetTenantRequest.class), any());

    StepVerifier.create(client.get("some-id")).expectNextCount(1).verifyComplete();

    org.mockito.Mockito.verify(stub)
        .withDeadlineAfter(5000L, java.util.concurrent.TimeUnit.MILLISECONDS);
  }

  @Test
  void readRetriesOnceOnUnavailableThenSucceeds() {
    Tenant tenant = Tenant.newBuilder().setSlug("acme-corp").build();
    java.util.concurrent.atomic.AtomicInteger attempts =
        new java.util.concurrent.atomic.AtomicInteger();
    doAnswer(
            invocation -> {
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              if (attempts.incrementAndGet() == 1) {
                observer.onError(Status.UNAVAILABLE.asRuntimeException());
              } else {
                observer.onNext(tenant);
                observer.onCompleted();
              }
              return null;
            })
        .when(stub)
        .getTenant(any(GetTenantRequest.class), any());

    StepVerifier.create(client.get("some-id")).expectNext(tenant).verifyComplete();
    org.assertj.core.api.Assertions.assertThat(attempts.get()).isEqualTo(2);
  }

  @Test
  void readRetryExhaustionPropagatesOriginalStatusException() {
    java.util.concurrent.atomic.AtomicInteger attempts =
        new java.util.concurrent.atomic.AtomicInteger();
    doAnswer(
            invocation -> {
              attempts.incrementAndGet();
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onError(Status.UNAVAILABLE.asRuntimeException());
              return null;
            })
        .when(stub)
        .getTenant(any(GetTenantRequest.class), any());

    StepVerifier.create(client.get("some-id"))
        .expectErrorMatches(
            error ->
                error instanceof StatusRuntimeException sre
                    && sre.getStatus().getCode() == Status.Code.UNAVAILABLE)
        .verify();
    // original attempt + exactly one retry
    org.assertj.core.api.Assertions.assertThat(attempts.get()).isEqualTo(2);
  }

  @Test
  void nonRetryableCodeIsNotRetried() {
    java.util.concurrent.atomic.AtomicInteger attempts =
        new java.util.concurrent.atomic.AtomicInteger();
    doAnswer(
            invocation -> {
              attempts.incrementAndGet();
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onError(Status.NOT_FOUND.asRuntimeException());
              return null;
            })
        .when(stub)
        .getTenant(any(GetTenantRequest.class), any());

    StepVerifier.create(client.get("some-id")).expectError(StatusRuntimeException.class).verify();
    org.assertj.core.api.Assertions.assertThat(attempts.get()).isEqualTo(1);
  }

  @Test
  void writesDoNotRetryEvenOnUnavailable() {
    java.util.concurrent.atomic.AtomicInteger attempts =
        new java.util.concurrent.atomic.AtomicInteger();
    doAnswer(
            invocation -> {
              attempts.incrementAndGet();
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onError(Status.UNAVAILABLE.asRuntimeException());
              return null;
            })
        .when(stub)
        .createTenant(any(CreateTenantRequest.class), any());

    StepVerifier.create(client.create("acme-corp", "Acme Corp", TenantStatus.TENANT_STATUS_ACTIVE))
        .expectErrorMatches(
            error ->
                error instanceof StatusRuntimeException sre
                    && sre.getStatus().getCode() == Status.Code.UNAVAILABLE)
        .verify();
    org.assertj.core.api.Assertions.assertThat(attempts.get()).isEqualTo(1);
  }

  @Test
  void unaryErrorPropagatesStatusRuntimeException() {
    doAnswer(
            invocation -> {
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onError(Status.NOT_FOUND.asRuntimeException());
              return null;
            })
        .when(stub)
        .getTenant(any(GetTenantRequest.class), any());

    StepVerifier.create(client.get("some-id"))
        .expectErrorMatches(
            error ->
                error instanceof StatusRuntimeException sre
                    && sre.getStatus().getCode() == Status.Code.NOT_FOUND)
        .verify();
  }

  @Test
  void forwardsCallerJwtAsBearerMetadata() {
    // With an authenticated reactive context, the client must derive a
    // metadata-attaching stub (withInterceptors) before stamping the deadline.
    org.mockito.BDDMockito.given(stub.withInterceptors(any())).willReturn(stub);
    Tenant tenant = Tenant.newBuilder().setSlug("acme-corp").build();
    doAnswer(
            invocation -> {
              StreamObserver<Tenant> observer = invocation.getArgument(1);
              observer.onNext(tenant);
              observer.onCompleted();
              return null;
            })
        .when(stub)
        .getTenant(any(), any());

    org.springframework.security.oauth2.jwt.Jwt jwt =
        new org.springframework.security.oauth2.jwt.Jwt(
            "raw-token",
            java.time.Instant.now(),
            java.time.Instant.now().plusSeconds(60),
            java.util.Map.of("alg", "RS256"),
            java.util.Map.of("sub", "user", "tenant_id", "t1"));
    org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
        authentication =
            new org.springframework.security.oauth2.server.resource.authentication
                .JwtAuthenticationToken(jwt);

    reactor.test.StepVerifier.create(
            client
                .get("id")
                .contextWrite(
                    org.springframework.security.core.context.ReactiveSecurityContextHolder
                        .withAuthentication(authentication)))
        .expectNextMatches(t -> t.getSlug().equals("acme-corp"))
        .verifyComplete();

    org.mockito.Mockito.verify(stub).withInterceptors(any());
  }
}
