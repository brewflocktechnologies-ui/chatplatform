package com.chatplatform.chatdashboardbff.dto;

import com.chatplatform.accountservice.grpc.ListTenantsResponse;
import java.util.List;

/**
 * Page envelope built straight from ListTenantsResponse's own page metadata — no Spring Data
 * Pageable machinery needed here, the upstream already paginates.
 */
public record TenantPageResponse(
    List<TenantResponse> content, int page, int size, long totalElements, int totalPages) {

  public static TenantPageResponse from(ListTenantsResponse response) {
    return new TenantPageResponse(
        response.getTenantsList().stream().map(TenantResponse::from).toList(),
        response.getPage(),
        response.getSize(),
        response.getTotalElements(),
        response.getTotalPages());
  }
}
