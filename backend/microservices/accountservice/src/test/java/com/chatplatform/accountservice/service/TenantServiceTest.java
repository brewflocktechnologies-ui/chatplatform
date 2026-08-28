package com.chatplatform.accountservice.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.chatplatform.accountservice.entity.Tenant;
import com.chatplatform.accountservice.entity.TenantStatus;
import com.chatplatform.accountservice.exception.TenantNotFoundException;
import com.chatplatform.accountservice.exception.TenantSlugConflictException;
import com.chatplatform.accountservice.repository.TenantRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

/**
 * Reactive equivalent of chatservice's TenantControllerTest - same business logic and error mapping
 * covered, one layer down (no server/StreamObserver needed to exercise it, no DB needed either:
 * TenantRepository mocked, verified with StepVerifier not thread-blocking).
 */
@ExtendWith(MockitoExtension.class)
class TenantServiceTest {

  @Mock private TenantRepository tenantRepository;

  private io.micrometer.core.instrument.simple.SimpleMeterRegistry meterRegistry;
  private TenantService tenantService;

  @BeforeEach
  void setUp() {
    meterRegistry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
    tenantService = new TenantService(tenantRepository, meterRegistry);
  }

  @Test
  void createSavesNewTenantWhenSlugIsFree() {
    given(tenantRepository.existsBySlug("acme-corp")).willReturn(Mono.just(false));
    given(tenantRepository.save(any(Tenant.class)))
        .willAnswer(invocation -> Mono.just(invocation.getArgument(0)));

    StepVerifier.create(tenantService.create("acme-corp", "Acme Corp", null))
        .assertNext(
            tenant -> {
              org.assertj.core.api.Assertions.assertThat(tenant.getSlug()).isEqualTo("acme-corp");
              org.assertj.core.api.Assertions.assertThat(tenant.getStatus())
                  .isEqualTo(TenantStatus.ACTIVE);
              org.assertj.core.api.Assertions.assertThat(tenant.getCreatedBy()).isEqualTo("system");
              org.assertj.core.api.Assertions.assertThat(tenant.getTenantId()).isNotNull();
            })
        .verifyComplete();

    org.assertj.core.api.Assertions.assertThat(meterRegistry.counter("tenants.created").count())
        .isEqualTo(1.0);
  }

  @Test
  void createFailsWithConflictWhenSlugTaken() {
    given(tenantRepository.existsBySlug("acme-corp")).willReturn(Mono.just(true));

    StepVerifier.create(tenantService.create("acme-corp", "Acme Corp", null))
        .verifyError(TenantSlugConflictException.class);

    verify(tenantRepository, never()).save(any());
  }

  @Test
  void getReturnsNotFoundForMissingTenant() {
    UUID missing = UUID.randomUUID();
    given(tenantRepository.findById(missing)).willReturn(Mono.empty());

    StepVerifier.create(tenantService.get(missing)).verifyError(TenantNotFoundException.class);
  }

  @Test
  void updateModifiesExistingTenant() {
    UUID id = UUID.randomUUID();
    Tenant existing = new Tenant();
    existing.setTenantId(id);
    existing.setSlug("acme-corp");
    existing.setName("Old Name");
    existing.setStatus(TenantStatus.ACTIVE);
    given(tenantRepository.findById(id)).willReturn(Mono.just(existing));
    given(tenantRepository.save(any(Tenant.class)))
        .willAnswer(invocation -> Mono.just(invocation.getArgument(0)));

    StepVerifier.create(tenantService.update(id, "New Name", TenantStatus.SUSPENDED))
        .assertNext(
            tenant -> {
              org.assertj.core.api.Assertions.assertThat(tenant.getName()).isEqualTo("New Name");
              org.assertj.core.api.Assertions.assertThat(tenant.getStatus())
                  .isEqualTo(TenantStatus.SUSPENDED);
            })
        .verifyComplete();
  }

  @Test
  void listDelegatesToRepository() {
    Tenant tenant = new Tenant();
    tenant.setSlug("acme-corp");
    org.springframework.data.domain.Pageable pageable =
        org.springframework.data.domain.PageRequest.of(0, 20);
    given(tenantRepository.findAllBy(pageable))
        .willReturn(reactor.core.publisher.Flux.just(tenant));

    StepVerifier.create(tenantService.list(pageable)).expectNext(tenant).verifyComplete();
  }

  @Test
  void countDelegatesToRepository() {
    given(tenantRepository.count()).willReturn(Mono.just(7L));

    StepVerifier.create(tenantService.count()).expectNext(7L).verifyComplete();
  }

  @Test
  void deleteRemovesExistingTenant() {
    UUID id = UUID.randomUUID();
    given(tenantRepository.existsById(id)).willReturn(Mono.just(true));
    given(tenantRepository.deleteById(id)).willReturn(Mono.empty());

    StepVerifier.create(tenantService.delete(id)).verifyComplete();

    verify(tenantRepository).deleteById(id);
    org.assertj.core.api.Assertions.assertThat(meterRegistry.counter("tenants.deleted").count())
        .isEqualTo(1.0);
  }

  @Test
  void getReturnsExistingTenant() {
    UUID id = UUID.randomUUID();
    Tenant tenant = new Tenant();
    tenant.setTenantId(id);
    given(tenantRepository.findById(id)).willReturn(Mono.just(tenant));

    StepVerifier.create(tenantService.get(id)).expectNext(tenant).verifyComplete();
  }

  @Test
  void createKeepsExplicitStatus() {
    given(tenantRepository.existsBySlug("acme-corp")).willReturn(Mono.just(false));
    given(tenantRepository.save(any(Tenant.class)))
        .willAnswer(invocation -> Mono.just(invocation.getArgument(0)));

    StepVerifier.create(tenantService.create("acme-corp", "Acme Corp", TenantStatus.SUSPENDED))
        .assertNext(
            tenant ->
                org.assertj.core.api.Assertions.assertThat(tenant.getStatus())
                    .isEqualTo(TenantStatus.SUSPENDED))
        .verifyComplete();
  }

  @Test
  void deleteFailsWithNotFoundWhenTenantMissing() {
    UUID missing = UUID.randomUUID();
    given(tenantRepository.existsById(missing)).willReturn(Mono.just(false));

    StepVerifier.create(tenantService.delete(missing)).verifyError(TenantNotFoundException.class);

    verify(tenantRepository, never()).deleteById(any(UUID.class));
  }
}
