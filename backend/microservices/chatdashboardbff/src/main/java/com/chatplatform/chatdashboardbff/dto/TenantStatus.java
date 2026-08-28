package com.chatplatform.chatdashboardbff.dto;

/**
 * REST-facing status values, same strings chatservice's REST API uses (ACTIVE/SUSPENDED) — the
 * proto's TENANT_STATUS_* prefix is a protobuf enum-naming convention, not part of the REST
 * contract. Mapping to/from the proto enum lives here so controllers stay mapping-free.
 */
public enum TenantStatus {
  ACTIVE,
  SUSPENDED;

  public com.chatplatform.accountservice.grpc.TenantStatus toProto() {
    return switch (this) {
      case ACTIVE -> com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_ACTIVE;
      case SUSPENDED -> com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_SUSPENDED;
    };
  }

  public static TenantStatus fromProto(com.chatplatform.accountservice.grpc.TenantStatus proto) {
    return switch (proto) {
      case TENANT_STATUS_SUSPENDED -> SUSPENDED;
      case TENANT_STATUS_ACTIVE, TENANT_STATUS_UNSPECIFIED, UNRECOGNIZED -> ACTIVE;
    };
  }
}
