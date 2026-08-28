package com.chatplatform.accountservice.api;

import com.chatplatform.accountservice.exception.TenantNotFoundException;
import com.chatplatform.accountservice.exception.TenantSlugConflictException;
import com.chatplatform.accountservice.grpc.CreateTenantRequest;
import com.chatplatform.accountservice.grpc.DeleteTenantRequest;
import com.chatplatform.accountservice.grpc.GetTenantRequest;
import com.chatplatform.accountservice.grpc.ListTenantsRequest;
import com.chatplatform.accountservice.grpc.ListTenantsResponse;
import com.chatplatform.accountservice.grpc.Tenant;
import com.chatplatform.accountservice.grpc.TenantServiceGrpc;
import com.chatplatform.accountservice.grpc.TenantStatus;
import com.chatplatform.accountservice.grpc.UpdateTenantRequest;
import com.chatplatform.accountservice.service.TenantService;
import com.google.protobuf.Empty;
import com.google.protobuf.Timestamp;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.grpc.server.service.GrpcService;

/**
 * The RPC-vs-domain translation layer, same role chatservice's {@code TenantController} plays for
 * REST: converts protobuf messages to/from the domain {@link
 * com.chatplatform.accountservice.entity.Tenant}, and maps domain exceptions to {@link Status}
 * codes the way chatservice's {@code GlobalExceptionHandler} maps them to HTTP status codes
 * (NOT_FOUND -> 404, ALREADY_EXISTS -> 409, INVALID_ARGUMENT -> 400).
 *
 * <p>Deliberately in {@code api}, not {@code grpc} - that package is 100% protoc-generated code
 * (the {@code Tenant}/{@code *Request}/{@code *Response} builders), excluded from JaCoCo's coverage
 * gate in pom.xml. This class needs to actually be covered, so it can't live there too.
 */
@GrpcService
public class TenantGrpcService extends TenantServiceGrpc.TenantServiceImplBase {

  private final TenantService tenantService;

  public TenantGrpcService(TenantService tenantService) {
    this.tenantService = tenantService;
  }

  @Override
  public void createTenant(CreateTenantRequest request, StreamObserver<Tenant> responseObserver) {
    if (request.getSlug().isBlank() || request.getName().isBlank()) {
      responseObserver.onError(
          Status.INVALID_ARGUMENT
              .withDescription("slug and name are required")
              .asRuntimeException());
      return;
    }
    tenantService
        .create(request.getSlug(), request.getName(), toDomainStatus(request.getStatus()))
        .map(TenantGrpcService::toProto)
        .subscribe(
            tenant -> respondOnce(responseObserver, tenant),
            error -> onError(responseObserver, error));
  }

  @Override
  public void getTenant(GetTenantRequest request, StreamObserver<Tenant> responseObserver) {
    parseTenantId(request.getTenantId(), responseObserver)
        .ifPresent(
            tenantId ->
                tenantService
                    .get(tenantId)
                    .map(TenantGrpcService::toProto)
                    .subscribe(
                        tenant -> respondOnce(responseObserver, tenant),
                        error -> onError(responseObserver, error)));
  }

  @Override
  public void listTenants(
      ListTenantsRequest request, StreamObserver<ListTenantsResponse> responseObserver) {
    int page = Math.max(request.getPage(), 0);
    int size = request.getSize() > 0 ? request.getSize() : 20;
    Pageable pageable = PageRequest.of(page, size);

    tenantService
        .list(pageable)
        .map(TenantGrpcService::toProto)
        .collectList()
        .zipWith(tenantService.count())
        .map(
            tuple -> {
              long totalElements = tuple.getT2();
              int totalPages = size == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
              return ListTenantsResponse.newBuilder()
                  .addAllTenants(tuple.getT1())
                  .setPage(page)
                  .setSize(size)
                  .setTotalElements(totalElements)
                  .setTotalPages(totalPages)
                  .build();
            })
        .subscribe(
            response -> respondOnce(responseObserver, response),
            error -> onError(responseObserver, error));
  }

  @Override
  public void updateTenant(UpdateTenantRequest request, StreamObserver<Tenant> responseObserver) {
    parseTenantId(request.getTenantId(), responseObserver)
        .ifPresent(
            tenantId -> {
              if (request.getName().isBlank()) {
                responseObserver.onError(
                    Status.INVALID_ARGUMENT
                        .withDescription("name is required")
                        .asRuntimeException());
                return;
              }
              tenantService
                  .update(tenantId, request.getName(), toDomainStatus(request.getStatus()))
                  .map(TenantGrpcService::toProto)
                  .subscribe(
                      tenant -> respondOnce(responseObserver, tenant),
                      error -> onError(responseObserver, error));
            });
  }

  @Override
  public void deleteTenant(DeleteTenantRequest request, StreamObserver<Empty> responseObserver) {
    parseTenantId(request.getTenantId(), responseObserver)
        .ifPresent(
            tenantId ->
                tenantService
                    .delete(tenantId)
                    .subscribe(
                        v -> {},
                        error -> onError(responseObserver, error),
                        () -> respondOnce(responseObserver, Empty.getDefaultInstance())));
  }

  private Optional<UUID> parseTenantId(String raw, StreamObserver<?> responseObserver) {
    try {
      return Optional.of(UUID.fromString(raw));
    } catch (IllegalArgumentException e) {
      responseObserver.onError(
          Status.INVALID_ARGUMENT
              .withDescription("tenant_id is not a valid UUID: " + raw)
              .asRuntimeException());
      return Optional.empty();
    }
  }

  private static <T> void respondOnce(StreamObserver<T> responseObserver, T value) {
    responseObserver.onNext(value);
    responseObserver.onCompleted();
  }

  private static void onError(StreamObserver<?> responseObserver, Throwable error) {
    Status status =
        switch (error) {
          case TenantNotFoundException e -> Status.NOT_FOUND.withDescription(e.getMessage());
          case TenantSlugConflictException e ->
              Status.ALREADY_EXISTS.withDescription(e.getMessage());
          // Order matters: OptimisticLockingFailureException IS a
          // TransientDataAccessException, and it deserves the more specific
          // code - ABORTED is gRPC's convention for optimistic-concurrency
          // conflicts (the entity's @Version makes these real under
          // concurrent updates); clients retry at the transaction level.
          case org.springframework.dao.OptimisticLockingFailureException e ->
              Status.ABORTED.withDescription("concurrent update conflict, retry with fresh state");
          // Retryable DB failures map to UNAVAILABLE so clients know to retry;
          // INTERNAL would read as a server bug and suppress client retries.
          // Three distinct hierarchies cover them (found empirically - a dead
          // Postgres surfaces as CannotCreateTransactionException, which is a
          // TransactionException, NOT a DataAccessException):
          // - TransientDataAccessException: query/statement timeouts
          // - DataAccessResourceFailureException: resource failure mid-access
          // - CannotCreateTransactionException: no connection for @Transactional
          case org.springframework.dao.TransientDataAccessException e ->
              Status.UNAVAILABLE.withDescription("database temporarily unavailable");
          case org.springframework.dao.DataAccessResourceFailureException e ->
              Status.UNAVAILABLE.withDescription("database temporarily unavailable");
          case org.springframework.transaction.CannotCreateTransactionException e ->
              Status.UNAVAILABLE.withDescription("database temporarily unavailable");
          default -> Status.INTERNAL.withDescription(error.getMessage()).withCause(error);
        };
    responseObserver.onError(status.asRuntimeException());
  }

  private static com.chatplatform.accountservice.entity.TenantStatus toDomainStatus(
      TenantStatus protoStatus) {
    return switch (protoStatus) {
      case TENANT_STATUS_SUSPENDED -> com.chatplatform.accountservice.entity.TenantStatus.SUSPENDED;
      case TENANT_STATUS_ACTIVE, TENANT_STATUS_UNSPECIFIED, UNRECOGNIZED ->
          com.chatplatform.accountservice.entity.TenantStatus.ACTIVE;
    };
  }

  private static TenantStatus toProtoStatus(
      com.chatplatform.accountservice.entity.TenantStatus status) {
    return switch (status) {
      case ACTIVE -> TenantStatus.TENANT_STATUS_ACTIVE;
      case SUSPENDED -> TenantStatus.TENANT_STATUS_SUSPENDED;
    };
  }

  private static Timestamp toProtoTimestamp(OffsetDateTime dateTime) {
    var instant = dateTime.withOffsetSameInstant(ZoneOffset.UTC).toInstant();
    return Timestamp.newBuilder()
        .setSeconds(instant.getEpochSecond())
        .setNanos(instant.getNano())
        .build();
  }

  private static Tenant toProto(com.chatplatform.accountservice.entity.Tenant tenant) {
    return Tenant.newBuilder()
        .setTenantId(tenant.getTenantId().toString())
        .setSlug(tenant.getSlug())
        .setName(tenant.getName())
        .setStatus(toProtoStatus(tenant.getStatus()))
        .setCreatedAt(toProtoTimestamp(tenant.getCreatedAt()))
        .setUpdatedAt(toProtoTimestamp(tenant.getUpdatedAt()))
        .setCreatedBy(tenant.getCreatedBy())
        .setUpdatedBy(tenant.getUpdatedBy())
        .setVersion(tenant.getVersion())
        .build();
  }
}
