package com.chatplatform.chatservice.dto;

import com.chatplatform.chatservice.entity.TenantStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Update payload. Slug is intentionally absent — it's immutable after creation (see the comment on
 * tenant_slug_format in the V1 migration).
 */
@Schema(name = "TenantUpdateRequest")
public record TenantUpdateRequest(
    @Schema(example = "Acme Corp") @NotBlank @Size(max = 255) String name,
    @NotNull TenantStatus status) {}
