package com.chatplatform.chatservice.dto;

import com.chatplatform.chatservice.entity.Tenant;
import com.chatplatform.chatservice.entity.TenantStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record TenantResponse(
    UUID tenantId,
    String slug,
    String name,
    TenantStatus status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    String createdBy,
    String updatedBy,
    Long version) {

  public static TenantResponse from(Tenant tenant) {
    return new TenantResponse(
        tenant.getTenantId(),
        tenant.getSlug(),
        tenant.getName(),
        tenant.getStatus(),
        tenant.getCreatedAt(),
        tenant.getUpdatedAt(),
        tenant.getCreatedBy(),
        tenant.getUpdatedBy(),
        tenant.getVersion());
  }
}
