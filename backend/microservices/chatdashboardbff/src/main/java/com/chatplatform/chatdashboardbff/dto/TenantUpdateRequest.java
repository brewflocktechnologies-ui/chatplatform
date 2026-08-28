package com.chatplatform.chatdashboardbff.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Slug is immutable after creation (NATS subject segment) — only name/status are updatable. */
@Schema(name = "TenantUpdateRequest")
public record TenantUpdateRequest(
    @Schema(example = "Acme Corp") @NotBlank @Size(max = 255) String name,
    @NotNull TenantStatus status) {}
