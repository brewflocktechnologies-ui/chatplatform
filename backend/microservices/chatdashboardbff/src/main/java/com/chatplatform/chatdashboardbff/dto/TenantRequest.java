package com.chatplatform.chatdashboardbff.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Same shape and validation as chatservice's TenantRequest — one REST contract, two backends. */
@Schema(name = "TenantRequest")
public record TenantRequest(
    @Schema(
            example = "acme-corp",
            description = "Globally unique, lowercase, becomes a NATS subject segment")
        @NotBlank
        @Pattern(
            regexp = "^[a-z0-9-]{3,32}$",
            message = "must be 3-32 lowercase letters, digits or hyphens")
        String slug,
    @Schema(example = "Acme Corp") @NotBlank @Size(max = 255) String name,
    @Schema(description = "Defaults to ACTIVE when omitted") TenantStatus status) {}
