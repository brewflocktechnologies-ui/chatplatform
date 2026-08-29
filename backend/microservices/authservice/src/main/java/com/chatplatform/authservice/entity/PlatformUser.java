package com.chatplatform.authservice.entity;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * A platform user. Doubles as the Spring Security principal so the token customizer can read
 * tenantId/roles straight off the authenticated principal during the authorization-code flow.
 */
public record PlatformUser(
    String id,
    String email,
    String passwordHash,
    String tenantId,
    Set<String> roles,
    boolean enabled,
    Instant createdAt)
    implements UserDetails {

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();
  }

  @Override
  public String getPassword() {
    return passwordHash;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isEnabled() {
    return enabled;
  }

  public List<String> sortedRoles() {
    return roles.stream().sorted().toList();
  }
}
