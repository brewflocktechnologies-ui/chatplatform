package com.chatplatform.chatservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.chatplatform.chatservice.dto.TenantRequest;
import com.chatplatform.chatservice.dto.TenantUpdateRequest;
import com.chatplatform.chatservice.entity.Tenant;
import com.chatplatform.chatservice.entity.TenantStatus;
import com.chatplatform.chatservice.exception.TenantNotFoundException;
import com.chatplatform.chatservice.exception.TenantSlugConflictException;
import com.chatplatform.chatservice.repository.TenantRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * Unit-level coverage of the business rules the controller test only sees through a mock: slug
 * uniqueness, status defaulting, not-found on every id-addressed operation. Repository mocked - the
 * Pact provider IT covers the same flows against a real DB, but Failsafe runs after the JaCoCo
 * report is built, so only Surefire tests count toward the coverage gate.
 */
@ExtendWith(MockitoExtension.class)
class TenantServiceTest {

  @Mock private TenantRepository tenantRepository;

  private TenantService tenantService;

  @BeforeEach
  void setUp() {
    tenantService = new TenantService(tenantRepository);
  }

  @Test
  void createSavesWithDefaultActiveStatusWhenOmitted() {
    given(tenantRepository.existsBySlug("acme-corp")).willReturn(false);
    given(tenantRepository.save(any(Tenant.class))).willAnswer(inv -> inv.getArgument(0));

    Tenant saved = tenantService.create(new TenantRequest("acme-corp", "Acme Corp", null));

    assertThat(saved.getSlug()).isEqualTo("acme-corp");
    assertThat(saved.getName()).isEqualTo("Acme Corp");
    assertThat(saved.getStatus()).isEqualTo(TenantStatus.ACTIVE);
  }

  @Test
  void createKeepsExplicitStatus() {
    given(tenantRepository.existsBySlug("acme-corp")).willReturn(false);
    given(tenantRepository.save(any(Tenant.class))).willAnswer(inv -> inv.getArgument(0));

    Tenant saved =
        tenantService.create(new TenantRequest("acme-corp", "Acme Corp", TenantStatus.SUSPENDED));

    assertThat(saved.getStatus()).isEqualTo(TenantStatus.SUSPENDED);
  }

  @Test
  void createThrowsConflictWhenSlugTaken() {
    given(tenantRepository.existsBySlug("acme-corp")).willReturn(true);

    assertThatThrownBy(
            () -> tenantService.create(new TenantRequest("acme-corp", "Acme Corp", null)))
        .isInstanceOf(TenantSlugConflictException.class);
    verify(tenantRepository, never()).save(any());
  }

  @Test
  void getReturnsExistingTenant() {
    UUID id = UUID.randomUUID();
    Tenant tenant = new Tenant();
    tenant.setSlug("acme-corp");
    given(tenantRepository.findById(id)).willReturn(Optional.of(tenant));

    assertThat(tenantService.get(id)).isSameAs(tenant);
  }

  @Test
  void getThrowsNotFoundForMissingTenant() {
    UUID id = UUID.randomUUID();
    given(tenantRepository.findById(id)).willReturn(Optional.empty());

    assertThatThrownBy(() -> tenantService.get(id)).isInstanceOf(TenantNotFoundException.class);
  }

  @Test
  void listDelegatesToRepository() {
    Pageable pageable = PageRequest.of(0, 20);
    Page<Tenant> page = new PageImpl<>(java.util.List.of(new Tenant()));
    given(tenantRepository.findAll(pageable)).willReturn(page);

    assertThat(tenantService.list(pageable)).isSameAs(page);
  }

  @Test
  void updateModifiesNameAndStatus() {
    UUID id = UUID.randomUUID();
    Tenant existing = new Tenant();
    existing.setSlug("acme-corp");
    existing.setName("Old Name");
    existing.setStatus(TenantStatus.ACTIVE);
    given(tenantRepository.findById(id)).willReturn(Optional.of(existing));
    given(tenantRepository.save(any(Tenant.class))).willAnswer(inv -> inv.getArgument(0));

    Tenant updated =
        tenantService.update(id, new TenantUpdateRequest("New Name", TenantStatus.SUSPENDED));

    assertThat(updated.getName()).isEqualTo("New Name");
    assertThat(updated.getStatus()).isEqualTo(TenantStatus.SUSPENDED);
  }

  @Test
  void updateThrowsNotFoundForMissingTenant() {
    UUID id = UUID.randomUUID();
    given(tenantRepository.findById(id)).willReturn(Optional.empty());

    assertThatThrownBy(
            () ->
                tenantService.update(id, new TenantUpdateRequest("New Name", TenantStatus.ACTIVE)))
        .isInstanceOf(TenantNotFoundException.class);
    verify(tenantRepository, never()).save(any());
  }

  @Test
  void deleteRemovesExistingTenant() {
    UUID id = UUID.randomUUID();
    given(tenantRepository.existsById(id)).willReturn(true);

    tenantService.delete(id);

    verify(tenantRepository).deleteById(id);
  }

  @Test
  void deleteThrowsNotFoundForMissingTenant() {
    UUID id = UUID.randomUUID();
    given(tenantRepository.existsById(id)).willReturn(false);

    assertThatThrownBy(() -> tenantService.delete(id)).isInstanceOf(TenantNotFoundException.class);
    ArgumentCaptor<UUID> captor = ArgumentCaptor.forClass(UUID.class);
    verify(tenantRepository, never()).deleteById(captor.capture());
  }
}
