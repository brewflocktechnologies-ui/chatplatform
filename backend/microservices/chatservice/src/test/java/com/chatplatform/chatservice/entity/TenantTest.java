package com.chatplatform.chatservice.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The JPA lifecycle callbacks are plain methods - no EntityManager needed to verify the stamping
 * rules (UUID assignment, UTC timestamps, "system" audit actor) they're responsible for.
 */
class TenantTest {

  @Test
  void onCreateStampsIdTimestampsAndAuditFields() {
    Tenant tenant = new Tenant();
    tenant.setSlug("acme-corp");

    tenant.onCreate();

    assertThat(tenant.getTenantId()).isNotNull();
    assertThat(tenant.getCreatedAt()).isNotNull();
    assertThat(tenant.getUpdatedAt()).isEqualTo(tenant.getCreatedAt());
    assertThat(tenant.getCreatedAt().getOffset()).isEqualTo(ZoneOffset.UTC);
    assertThat(tenant.getCreatedBy()).isEqualTo(Tenant.SYSTEM_ACTOR);
    assertThat(tenant.getUpdatedBy()).isEqualTo(Tenant.SYSTEM_ACTOR);
  }

  @Test
  void onCreateKeepsPreAssignedId() {
    UUID preset = UUID.randomUUID();
    OffsetDateTime before = OffsetDateTime.now(ZoneOffset.UTC);
    Tenant tenant =
        new Tenant(preset, "acme-corp", "Acme Corp", TenantStatus.ACTIVE, before, before, "x", "x");

    tenant.onCreate();

    assertThat(tenant.getTenantId()).isEqualTo(preset);
  }

  @Test
  void onUpdateRestampsOnlyUpdateFields() {
    Tenant tenant = new Tenant();
    tenant.onCreate();
    OffsetDateTime createdAt = tenant.getCreatedAt();

    tenant.onUpdate();

    assertThat(tenant.getCreatedAt()).isEqualTo(createdAt);
    assertThat(tenant.getUpdatedAt()).isAfterOrEqualTo(createdAt);
    assertThat(tenant.getUpdatedBy()).isEqualTo(Tenant.SYSTEM_ACTOR);
  }

  @Test
  void fixtureConstructorAndAccessorsRoundTrip() {
    UUID id = UUID.randomUUID();
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    Tenant tenant =
        new Tenant(id, "acme-corp", "Acme Corp", TenantStatus.SUSPENDED, now, now, "a", "b");

    assertThat(tenant.getTenantId()).isEqualTo(id);
    assertThat(tenant.getSlug()).isEqualTo("acme-corp");
    assertThat(tenant.getName()).isEqualTo("Acme Corp");
    assertThat(tenant.getStatus()).isEqualTo(TenantStatus.SUSPENDED);
    assertThat(tenant.getCreatedAt()).isEqualTo(now);
    assertThat(tenant.getUpdatedAt()).isEqualTo(now);
    assertThat(tenant.getCreatedBy()).isEqualTo("a");
    assertThat(tenant.getUpdatedBy()).isEqualTo("b");
    assertThat(tenant.getVersion()).isNull();
  }
}
