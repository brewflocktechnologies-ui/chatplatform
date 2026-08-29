package com.chatplatform.chatdashboardbff.client;

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
import io.grpc.Metadata;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.MetadataUtils;
import io.grpc.stub.StreamObserver;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.function.BiConsumer;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

/**
 * Reactive wrapper over accountservice's async gRPC stub: each unary call becomes a Mono via a
 * StreamObserver-to-sink bridge — the exact mirror of accountservice's server-side Mono-to-observer
 * bridge. Returns raw proto types; REST mapping is the controller's job.
 *
 * <p>Resiliency: every call carries a {@link #DEADLINE} (gRPC's default is unlimited — a hung
 * upstream would hang the dashboard request forever; DEADLINE_EXCEEDED maps to 504 in
 * GlobalExceptionHandler). The deadline is applied PER CALL, never on the stub bean: a gRPC {@code
 * Deadline} is an absolute timestamp, so {@code withDeadlineAfter} at bean-creation time would make
 * every call after the first few seconds of uptime instantly DEADLINE_EXCEEDED.
 *
 * <p>Reads (get/list) additionally retry once on UNAVAILABLE — accountservice's signal for a
 * transient DB failure, safe to repeat. Writes deliberately do NOT retry: after an ambiguous
 * failure a retried create can surface as a confusing ALREADY_EXISTS and a retried delete as
 * NOT_FOUND, so the caller decides.
 */
@Component
public class TenantGrpcClient {

  private static final Duration DEADLINE = Duration.ofSeconds(5);
  private static final Metadata.Key<String> AUTHORIZATION_METADATA =
      Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
  private static final Retry READ_RETRY =
      Retry.backoff(1, Duration.ofMillis(200))
          .filter(TenantGrpcClient::isRetryable)
          // Propagate the original StatusRuntimeException, not Reactor's
          // RetryExhaustedException - GlobalExceptionHandler maps on it.
          .onRetryExhaustedThrow((spec, signal) -> signal.failure());

  private final TenantServiceGrpc.TenantServiceStub stub;

  public TenantGrpcClient(TenantServiceGrpc.TenantServiceStub stub) {
    this.stub = stub;
  }

  public Mono<Tenant> create(String slug, String name, TenantStatus status) {
    CreateTenantRequest request =
        CreateTenantRequest.newBuilder().setSlug(slug).setName(name).setStatus(status).build();
    return unary((s, observer) -> s.createTenant(request, observer));
  }

  public Mono<Tenant> get(String tenantId) {
    GetTenantRequest request = GetTenantRequest.newBuilder().setTenantId(tenantId).build();
    return this.<Tenant>unary((s, observer) -> s.getTenant(request, observer))
        .retryWhen(READ_RETRY);
  }

  public Mono<ListTenantsResponse> list(int page, int size) {
    ListTenantsRequest request =
        ListTenantsRequest.newBuilder().setPage(page).setSize(size).build();
    return this.<ListTenantsResponse>unary((s, observer) -> s.listTenants(request, observer))
        .retryWhen(READ_RETRY);
  }

  public Mono<Tenant> update(String tenantId, String name, TenantStatus status) {
    UpdateTenantRequest request =
        UpdateTenantRequest.newBuilder()
            .setTenantId(tenantId)
            .setName(name)
            .setStatus(status)
            .build();
    return unary((s, observer) -> s.updateTenant(request, observer));
  }

  public Mono<Empty> delete(String tenantId) {
    DeleteTenantRequest request = DeleteTenantRequest.newBuilder().setTenantId(tenantId).build();
    return unary((s, observer) -> s.deleteTenant(request, observer));
  }

  private static boolean isRetryable(Throwable error) {
    return error instanceof StatusRuntimeException sre
        && sre.getStatus().getCode() == Status.Code.UNAVAILABLE;
  }

  /**
   * Adapts one unary gRPC call (callback-based) into a Mono (single value or error), stamping the
   * per-call deadline. Mono.defer so each retry attempt gets a fresh deadline and a fresh call.
   *
   * <p>The caller's platform JWT (validated by SecurityConfig) is forwarded verbatim as {@code
   * authorization: Bearer} gRPC metadata — accountservice re-validates it against the same JWKS
   * (zero-trust hop, exercising the seam the platform designed for). When no authentication is in
   * the reactive context (tests, permitted paths) the call goes out bare and accountservice rejects
   * it — never a silently-trusted identity.
   */
  private <T> Mono<T> unary(
      BiConsumer<TenantServiceGrpc.TenantServiceStub, StreamObserver<T>> call) {
    return Mono.defer(
        () ->
            currentBearerToken()
                .map(this::stubWithBearer)
                .defaultIfEmpty(stub)
                .flatMap(callStub -> callOnce(callStub, call)));
  }

  private static Mono<String> currentBearerToken() {
    return ReactiveSecurityContextHolder.getContext()
        .map(SecurityContext::getAuthentication)
        .filter(JwtAuthenticationToken.class::isInstance)
        .map(
            authentication -> ((JwtAuthenticationToken) authentication).getToken().getTokenValue());
  }

  private TenantServiceGrpc.TenantServiceStub stubWithBearer(String token) {
    Metadata metadata = new Metadata();
    metadata.put(AUTHORIZATION_METADATA, "Bearer " + token);
    return stub.withInterceptors(MetadataUtils.newAttachHeadersInterceptor(metadata));
  }

  private <T> Mono<T> callOnce(
      TenantServiceGrpc.TenantServiceStub callStub,
      BiConsumer<TenantServiceGrpc.TenantServiceStub, StreamObserver<T>> call) {
    return Mono.create(
        sink ->
            call.accept(
                callStub.withDeadlineAfter(DEADLINE.toMillis(), TimeUnit.MILLISECONDS),
                new StreamObserver<T>() {
                  @Override
                  public void onNext(T value) {
                    sink.success(value);
                  }

                  @Override
                  public void onError(Throwable t) {
                    sink.error(t);
                  }

                  @Override
                  public void onCompleted() {
                    sink.success(); // no-op if onNext already completed the sink
                  }
                }));
  }
}
