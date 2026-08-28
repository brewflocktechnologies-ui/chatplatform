package com.chatplatform.accountservice.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.chatplatform.accountservice.entity.TenantStatus;
import com.chatplatform.accountservice.exception.TenantNotFoundException;
import com.chatplatform.accountservice.exception.TenantSlugConflictException;
import com.chatplatform.accountservice.grpc.CreateTenantRequest;
import com.chatplatform.accountservice.grpc.DeleteTenantRequest;
import com.chatplatform.accountservice.grpc.GetTenantRequest;
import com.chatplatform.accountservice.grpc.ListTenantsRequest;
import com.chatplatform.accountservice.grpc.ListTenantsResponse;
import com.chatplatform.accountservice.grpc.Tenant;
import com.chatplatform.accountservice.grpc.UpdateTenantRequest;
import com.chatplatform.accountservice.service.TenantService;
import com.google.protobuf.Empty;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Same role chatservice's TenantControllerTest plays: exercises the RPC-vs-domain translation layer
 * with TenantService mocked, verifying proto mapping and gRPC {@link Status} codes for both success
 * and error paths - no server, no DB, no network.
 */
@ExtendWith(MockitoExtension.class)
class TenantGrpcServiceTest {

  @Mock private TenantService tenantService;
  @Mock private StreamObserver<Tenant> tenantObserver;
  @Mock private StreamObserver<Empty> emptyObserver;

  private TenantGrpcService grpcService;

  @BeforeEach
  void setUp() {
    grpcService = new TenantGrpcService(tenantService);
  }

  private static com.chatplatform.accountservice.entity.Tenant sampleTenant(UUID id) {
    OffsetDateTime now = OffsetDateTime.now();
    return new com.chatplatform.accountservice.entity.Tenant(
        id, "acme-corp", "Acme Corp", TenantStatus.ACTIVE, now, now, "system", "system", 0L);
  }

  @Test
  void createTenantRespondsWithMappedProto() {
    UUID id = UUID.randomUUID();
    given(tenantService.create("acme-corp", "Acme Corp", TenantStatus.ACTIVE))
        .willReturn(Mono.just(sampleTenant(id)));

    grpcService.createTenant(
        CreateTenantRequest.newBuilder()
            .setSlug("acme-corp")
            .setName("Acme Corp")
            .setStatus(com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_ACTIVE)
            .build(),
        tenantObserver);

    ArgumentCaptor<Tenant> captor = ArgumentCaptor.forClass(Tenant.class);
    verify(tenantObserver).onNext(captor.capture());
    verify(tenantObserver).onCompleted();
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getTenantId())
        .isEqualTo(id.toString());
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getSlug()).isEqualTo("acme-corp");
  }

  @Test
  void createTenantRejectsBlankSlugWithoutCallingService() {
    grpcService.createTenant(
        CreateTenantRequest.newBuilder().setSlug("").setName("Acme Corp").build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.INVALID_ARGUMENT);
    verify(tenantService, never()).create(any(), any(), any());
  }

  @Test
  void createTenantMapsSlugConflictToAlreadyExists() {
    given(tenantService.create(any(), any(), any()))
        .willReturn(Mono.error(new TenantSlugConflictException("acme-corp")));

    grpcService.createTenant(
        CreateTenantRequest.newBuilder().setSlug("acme-corp").setName("Acme Corp").build(),
        tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.ALREADY_EXISTS);
  }

  @Test
  void getTenantReturnsMappedProto() {
    UUID id = UUID.randomUUID();
    given(tenantService.get(id)).willReturn(Mono.just(sampleTenant(id)));

    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId(id.toString()).build(), tenantObserver);

    ArgumentCaptor<Tenant> captor = ArgumentCaptor.forClass(Tenant.class);
    verify(tenantObserver).onNext(captor.capture());
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getVersion()).isZero();
  }

  @Test
  void getTenantMapsNotFoundToNotFoundStatus() {
    UUID id = UUID.randomUUID();
    given(tenantService.get(id)).willReturn(Mono.error(new TenantNotFoundException(id)));

    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId(id.toString()).build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.NOT_FOUND);
  }

  @Test
  void getTenantRejectsMalformedUuid() {
    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId("not-a-uuid").build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.INVALID_ARGUMENT);
  }

  @Test
  void deleteTenantRespondsWithEmpty() {
    UUID id = UUID.randomUUID();
    given(tenantService.delete(id)).willReturn(Mono.empty());

    grpcService.deleteTenant(
        DeleteTenantRequest.newBuilder().setTenantId(id.toString()).build(), emptyObserver);

    verify(emptyObserver).onNext(Empty.getDefaultInstance());
    verify(emptyObserver).onCompleted();
  }

  @Test
  void listTenantsReturnsPageEnvelopeWithTotals() {
    UUID id = UUID.randomUUID();
    given(tenantService.list(any())).willReturn(Flux.just(sampleTenant(id)));
    given(tenantService.count()).willReturn(Mono.just(41L));
    @SuppressWarnings("unchecked")
    StreamObserver<ListTenantsResponse> listObserver =
        org.mockito.Mockito.mock(StreamObserver.class);

    grpcService.listTenants(
        ListTenantsRequest.newBuilder().setPage(0).setSize(20).build(), listObserver);

    ArgumentCaptor<ListTenantsResponse> captor = ArgumentCaptor.forClass(ListTenantsResponse.class);
    verify(listObserver).onNext(captor.capture());
    verify(listObserver).onCompleted();
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getTenantsCount()).isEqualTo(1);
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getTotalElements()).isEqualTo(41);
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getTotalPages()).isEqualTo(3);
  }

  @Test
  void listTenantsDefaultsSizeAndClampsNegativePage() {
    given(tenantService.list(any())).willReturn(Flux.empty());
    given(tenantService.count()).willReturn(Mono.just(0L));
    @SuppressWarnings("unchecked")
    StreamObserver<ListTenantsResponse> listObserver =
        org.mockito.Mockito.mock(StreamObserver.class);

    grpcService.listTenants(
        ListTenantsRequest.newBuilder().setPage(-3).setSize(0).build(), listObserver);

    ArgumentCaptor<ListTenantsResponse> captor = ArgumentCaptor.forClass(ListTenantsResponse.class);
    verify(listObserver).onNext(captor.capture());
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getPage()).isZero();
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getSize()).isEqualTo(20);
  }

  @Test
  void listTenantsMapsUpstreamErrorToInternal() {
    given(tenantService.list(any())).willReturn(Flux.error(new IllegalStateException("db down")));
    given(tenantService.count()).willReturn(Mono.just(0L));
    @SuppressWarnings("unchecked")
    StreamObserver<ListTenantsResponse> listObserver =
        org.mockito.Mockito.mock(StreamObserver.class);

    grpcService.listTenants(ListTenantsRequest.newBuilder().build(), listObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(listObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.INTERNAL);
  }

  @Test
  void updateTenantRespondsWithMappedProtoIncludingSuspendedStatus() {
    UUID id = UUID.randomUUID();
    com.chatplatform.accountservice.entity.Tenant suspended = sampleTenant(id);
    suspended.setStatus(TenantStatus.SUSPENDED);
    given(tenantService.update(id, "Renamed", TenantStatus.SUSPENDED))
        .willReturn(Mono.just(suspended));

    grpcService.updateTenant(
        UpdateTenantRequest.newBuilder()
            .setTenantId(id.toString())
            .setName("Renamed")
            .setStatus(com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_SUSPENDED)
            .build(),
        tenantObserver);

    ArgumentCaptor<Tenant> captor = ArgumentCaptor.forClass(Tenant.class);
    verify(tenantObserver).onNext(captor.capture());
    org.assertj.core.api.Assertions.assertThat(captor.getValue().getStatus())
        .isEqualTo(com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_SUSPENDED);
  }

  @Test
  void updateTenantRejectsBlankNameWithoutCallingService() {
    UUID id = UUID.randomUUID();

    grpcService.updateTenant(
        UpdateTenantRequest.newBuilder().setTenantId(id.toString()).setName("").build(),
        tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.INVALID_ARGUMENT);
    verify(tenantService, never()).update(any(), any(), any());
  }

  @Test
  void updateTenantMapsNotFoundToNotFoundStatus() {
    UUID id = UUID.randomUUID();
    given(tenantService.update(any(), any(), any()))
        .willReturn(Mono.error(new TenantNotFoundException(id)));

    grpcService.updateTenant(
        UpdateTenantRequest.newBuilder().setTenantId(id.toString()).setName("Renamed").build(),
        tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.NOT_FOUND);
  }

  @Test
  void deleteTenantMapsNotFoundToNotFoundStatus() {
    UUID id = UUID.randomUUID();
    given(tenantService.delete(id)).willReturn(Mono.error(new TenantNotFoundException(id)));

    grpcService.deleteTenant(
        DeleteTenantRequest.newBuilder().setTenantId(id.toString()).build(), emptyObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(emptyObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.NOT_FOUND);
  }

  @Test
  void deleteTenantRejectsMalformedUuid() {
    grpcService.deleteTenant(
        DeleteTenantRequest.newBuilder().setTenantId("nope").build(), emptyObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(emptyObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.INVALID_ARGUMENT);
    verify(tenantService, never()).delete(any());
  }

  @Test
  void optimisticLockConflictMapsToAborted() {
    UUID id = UUID.randomUUID();
    given(tenantService.update(any(), any(), any()))
        .willReturn(
            Mono.error(
                new org.springframework.dao.OptimisticLockingFailureException("version mismatch")));

    grpcService.updateTenant(
        UpdateTenantRequest.newBuilder().setTenantId(id.toString()).setName("Renamed").build(),
        tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.ABORTED);
  }

  @Test
  void transientDbFailureMapsToUnavailable() {
    UUID id = UUID.randomUUID();
    given(tenantService.get(id))
        .willReturn(
            Mono.error(new org.springframework.dao.QueryTimeoutException("statement timeout")));

    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId(id.toString()).build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.UNAVAILABLE);
  }

  @Test
  void connectionFailureForTransactionMapsToUnavailable() {
    // The exception a dead Postgres actually produces (found live): a
    // TransactionException, not a DataAccessException.
    UUID id = UUID.randomUUID();
    given(tenantService.get(id))
        .willReturn(
            Mono.error(
                new org.springframework.transaction.CannotCreateTransactionException(
                    "Could not open R2DBC Connection for transaction")));

    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId(id.toString()).build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.UNAVAILABLE);
  }

  @Test
  void resourceFailureMapsToUnavailable() {
    UUID id = UUID.randomUUID();
    given(tenantService.get(id))
        .willReturn(
            Mono.error(
                new org.springframework.dao.DataAccessResourceFailureException(
                    "connection lost mid-query")));

    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId(id.toString()).build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.UNAVAILABLE);
  }

  @Test
  void unexpectedErrorMapsToInternal() {
    UUID id = UUID.randomUUID();
    given(tenantService.get(id)).willReturn(Mono.error(new IllegalStateException("boom")));

    grpcService.getTenant(
        GetTenantRequest.newBuilder().setTenantId(id.toString()).build(), tenantObserver);

    ArgumentCaptor<Throwable> captor = ArgumentCaptor.forClass(Throwable.class);
    verify(tenantObserver).onError(captor.capture());
    assertStatus(captor.getValue(), Status.Code.INTERNAL);
  }

  private static void assertStatus(Throwable error, Status.Code expected) {
    org.assertj.core.api.Assertions.assertThat(error).isInstanceOf(StatusRuntimeException.class);
    org.assertj.core.api.Assertions.assertThat(
            ((StatusRuntimeException) error).getStatus().getCode())
        .isEqualTo(expected);
  }
}
