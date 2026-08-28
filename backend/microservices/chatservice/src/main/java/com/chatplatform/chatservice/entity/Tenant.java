package com.chatplatform.chatservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "tenant")
public class Tenant {

  @Id
  @Column(name = "tenant_id", nullable = false)
  private UUID tenantId;

  @Column(nullable = false)
  private String slug;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TenantStatus status;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  // "system" until there's an authenticated principal to stamp instead - has
  // to be set explicitly either way, since an entity-mapped column always
  // gets an explicit value in Hibernate's INSERT; the DB's DEFAULT 'system'
  // only applies to inserts that omit the column entirely.
  static final String SYSTEM_ACTOR = "system";

  @Column(name = "created_by", nullable = false)
  private String createdBy;

  @Column(name = "updated_by", nullable = false)
  private String updatedBy;

  // Also lets Spring Data tell new-vs-existing apart for this assigned
  // (non-generated) id without an extra SELECT-before-INSERT per save().
  @Version
  @Column(nullable = false)
  private Long version;

  public Tenant() {}

  /** For building fixtures (tests, mapping) without going through JPA persist. */
  public Tenant(
      UUID tenantId,
      String slug,
      String name,
      TenantStatus status,
      OffsetDateTime createdAt,
      OffsetDateTime updatedAt,
      String createdBy,
      String updatedBy) {
    this.tenantId = tenantId;
    this.slug = slug;
    this.name = name;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.updatedBy = updatedBy;
  }

  @PrePersist
  void onCreate() {
    if (tenantId == null) {
      tenantId = UUID.randomUUID();
    }
    // UTC, not the server's local offset - otherwise the same instant
    // renders differently depending on which host serves the request.
    OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
    createdAt = now;
    updatedAt = now;
    createdBy = SYSTEM_ACTOR;
    updatedBy = SYSTEM_ACTOR;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    updatedBy = SYSTEM_ACTOR;
  }

  public UUID getTenantId() {
    return tenantId;
  }

  public String getSlug() {
    return slug;
  }

  public void setSlug(String slug) {
    this.slug = slug;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public TenantStatus getStatus() {
    return status;
  }

  public void setStatus(TenantStatus status) {
    this.status = status;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public String getCreatedBy() {
    return createdBy;
  }

  public String getUpdatedBy() {
    return updatedBy;
  }

  public Long getVersion() {
    return version;
  }
}
