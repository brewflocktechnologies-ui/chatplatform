package com.chatplatform.chatservice.service;

import com.chatplatform.chatservice.dto.TenantRequest;
import com.chatplatform.chatservice.dto.TenantUpdateRequest;
import com.chatplatform.chatservice.entity.Tenant;
import com.chatplatform.chatservice.entity.TenantStatus;
import com.chatplatform.chatservice.exception.TenantNotFoundException;
import com.chatplatform.chatservice.exception.TenantSlugConflictException;
import com.chatplatform.chatservice.repository.TenantRepository;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TenantService {

  private final TenantRepository tenantRepository;

  public TenantService(TenantRepository tenantRepository) {
    this.tenantRepository = tenantRepository;
  }

  public Tenant create(TenantRequest request) {
    if (tenantRepository.existsBySlug(request.slug())) {
      throw new TenantSlugConflictException(request.slug());
    }
    Tenant tenant = new Tenant();
    tenant.setSlug(request.slug());
    tenant.setName(request.name());
    tenant.setStatus(request.status() != null ? request.status() : TenantStatus.ACTIVE);
    return tenantRepository.save(tenant);
  }

  @Transactional(readOnly = true)
  public Tenant get(UUID tenantId) {
    return tenantRepository
        .findById(tenantId)
        .orElseThrow(() -> new TenantNotFoundException(tenantId));
  }

  @Transactional(readOnly = true)
  public Page<Tenant> list(Pageable pageable) {
    return tenantRepository.findAll(pageable);
  }

  public Tenant update(UUID tenantId, TenantUpdateRequest request) {
    // Not get(tenantId): that's a self-invocation of a @Transactional-annotated
    // method on this same bean, which bypasses the proxy and silently drops its
    // readOnly=true override - harmless in effect today, but fragile if get()
    // ever grows real proxy behavior (e.g. @Cacheable).
    Tenant tenant =
        tenantRepository
            .findById(tenantId)
            .orElseThrow(() -> new TenantNotFoundException(tenantId));
    tenant.setName(request.name());
    tenant.setStatus(request.status());
    return tenantRepository.save(tenant);
  }

  public void delete(UUID tenantId) {
    if (!tenantRepository.existsById(tenantId)) {
      throw new TenantNotFoundException(tenantId);
    }
    tenantRepository.deleteById(tenantId);
  }
}
