package com.chatplatform.accountservice.service;

import com.chatplatform.accountservice.entity.Tenant;
import com.chatplatform.accountservice.entity.TenantStatus;
import com.chatplatform.accountservice.exception.TenantNotFoundException;
import com.chatplatform.accountservice.exception.TenantSlugConflictException;
import com.chatplatform.accountservice.repository.TenantRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * No {@code @PrePersist}/{@code @PreUpdate} to lean on (R2DBC entities don't have JPA lifecycle
 * callbacks), so id/timestamp/audit-field stamping that chatservice's {@code Tenant} entity does
 * itself happens here instead - same "system" placeholder for {@code createdBy}/{@code updatedBy}
 * until there's a real authenticated principal.
 */
@Service
public class TenantService {

  private static final String SYSTEM_ACTOR = "system";

  private final TenantRepository tenantRepository;

  // Business metrics, exported with everything else over OTLP: JVM/RPC metrics
  // say the service is healthy, these say the *business* is moving. Counters
  // increment only on success - failures are already visible via RPC
  // error-code metrics.
  private final Counter tenantsCreated;
  private final Counter tenantsUpdated;
  private final Counter tenantsDeleted;

  public TenantService(TenantRepository tenantRepository, MeterRegistry meterRegistry) {
    this.tenantRepository = tenantRepository;
    this.tenantsCreated = meterRegistry.counter("tenants.created");
    this.tenantsUpdated = meterRegistry.counter("tenants.updated");
    this.tenantsDeleted = meterRegistry.counter("tenants.deleted");
  }

  @Transactional
  public Mono<Tenant> create(String slug, String name, TenantStatus status) {
    return tenantRepository
        .existsBySlug(slug)
        .flatMap(
            exists -> {
              if (exists) {
                return Mono.error(new TenantSlugConflictException(slug));
              }
              OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
              Tenant tenant = new Tenant();
              tenant.setTenantId(UUID.randomUUID());
              tenant.setSlug(slug);
              tenant.setName(name);
              tenant.setStatus(status != null ? status : TenantStatus.ACTIVE);
              tenant.setCreatedAt(now);
              tenant.setUpdatedAt(now);
              tenant.setCreatedBy(SYSTEM_ACTOR);
              tenant.setUpdatedBy(SYSTEM_ACTOR);
              return tenantRepository.save(tenant).doOnSuccess(saved -> tenantsCreated.increment());
            });
  }

  @Transactional(readOnly = true)
  public Mono<Tenant> get(UUID tenantId) {
    return tenantRepository
        .findById(tenantId)
        .switchIfEmpty(Mono.error(new TenantNotFoundException(tenantId)));
  }

  @Transactional(readOnly = true)
  public Flux<Tenant> list(Pageable pageable) {
    return tenantRepository.findAllBy(pageable);
  }

  @Transactional(readOnly = true)
  public Mono<Long> count() {
    return tenantRepository.count();
  }

  @Transactional
  public Mono<Tenant> update(UUID tenantId, String name, TenantStatus status) {
    return tenantRepository
        .findById(tenantId)
        .switchIfEmpty(Mono.error(new TenantNotFoundException(tenantId)))
        .flatMap(
            tenant -> {
              tenant.setName(name);
              tenant.setStatus(status);
              tenant.setUpdatedAt(OffsetDateTime.now(ZoneOffset.UTC));
              tenant.setUpdatedBy(SYSTEM_ACTOR);
              return tenantRepository.save(tenant).doOnSuccess(saved -> tenantsUpdated.increment());
            });
  }

  @Transactional
  public Mono<Void> delete(UUID tenantId) {
    return tenantRepository
        .existsById(tenantId)
        .flatMap(
            exists -> {
              if (!exists) {
                return Mono.error(new TenantNotFoundException(tenantId));
              }
              // doOnSuccess fires on empty completion too (value is null for
              // a Mono<Void>) - errors skip it.
              return tenantRepository
                  .deleteById(tenantId)
                  .doOnSuccess(v -> tenantsDeleted.increment());
            });
  }
}
