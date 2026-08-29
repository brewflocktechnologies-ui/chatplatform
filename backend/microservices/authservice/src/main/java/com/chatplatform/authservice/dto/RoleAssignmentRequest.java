package com.chatplatform.authservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import java.util.Set;

public record RoleAssignmentRequest(
    @NotEmpty Set<@Pattern(regexp = "ADMIN|AGENT|VIEWER") String> roles) {}
