package com.chatplatform.chatdashboardbff.dto;

import com.google.protobuf.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/** Same wire shape as chatservice's TenantResponse; built from accountservice's proto Tenant. */
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

  public static TenantResponse from(com.chatplatform.accountservice.grpc.Tenant tenant) {
    return new TenantResponse(
        UUID.fromString(tenant.getTenantId()),
        tenant.getSlug(),
        tenant.getName(),
        TenantStatus.fromProto(tenant.getStatus()),
        toOffsetDateTime(tenant.getCreatedAt()),
        toOffsetDateTime(tenant.getUpdatedAt()),
        tenant.getCreatedBy(),
        tenant.getUpdatedBy(),
        tenant.getVersion());
  }

  private static OffsetDateTime toOffsetDateTime(Timestamp ts) {
    return OffsetDateTime.ofInstant(
        Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos()), ZoneOffset.UTC);
  }
}
