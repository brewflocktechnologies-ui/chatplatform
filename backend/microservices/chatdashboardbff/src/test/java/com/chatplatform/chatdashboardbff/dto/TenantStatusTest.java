package com.chatplatform.chatdashboardbff.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Both directions of the REST-string-to-proto-enum mapping, including the UNSPECIFIED default. */
class TenantStatusTest {

  @Test
  void toProtoMapsBothValues() {
    assertThat(TenantStatus.ACTIVE.toProto())
        .isEqualTo(com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_ACTIVE);
    assertThat(TenantStatus.SUSPENDED.toProto())
        .isEqualTo(com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_SUSPENDED);
  }

  @Test
  void fromProtoMapsBothValuesAndDefaultsUnspecifiedToActive() {
    assertThat(
            TenantStatus.fromProto(
                com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_ACTIVE))
        .isEqualTo(TenantStatus.ACTIVE);
    assertThat(
            TenantStatus.fromProto(
                com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_SUSPENDED))
        .isEqualTo(TenantStatus.SUSPENDED);
    assertThat(
            TenantStatus.fromProto(
                com.chatplatform.accountservice.grpc.TenantStatus.TENANT_STATUS_UNSPECIFIED))
        .isEqualTo(TenantStatus.ACTIVE);
  }
}
