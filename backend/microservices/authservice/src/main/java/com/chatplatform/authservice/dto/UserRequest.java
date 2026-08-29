package com.chatplatform.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record UserRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 128) String password,
    @NotBlank String tenantId,
    @NotEmpty Set<@Pattern(regexp = "ADMIN|AGENT|VIEWER") String> roles) {}
