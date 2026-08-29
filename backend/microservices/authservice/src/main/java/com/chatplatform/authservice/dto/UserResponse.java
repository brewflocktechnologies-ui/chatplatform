package com.chatplatform.authservice.dto;

import com.chatplatform.authservice.entity.PlatformUser;
import java.time.Instant;
import java.util.List;

public record UserResponse(
    String id,
    String email,
    String tenantId,
    List<String> roles,
    boolean enabled,
    Instant createdAt) {

  public static UserResponse from(PlatformUser user) {
    return new UserResponse(
        user.id(),
        user.email(),
        user.tenantId(),
        user.sortedRoles(),
        user.enabled(),
        user.createdAt());
  }
}
