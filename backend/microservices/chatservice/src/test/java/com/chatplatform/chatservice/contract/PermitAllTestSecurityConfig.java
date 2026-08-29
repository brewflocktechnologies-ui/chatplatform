package com.chatplatform.chatservice.contract;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Pact verification replays the recorded consumer interactions, which are unauthenticated by design
 * — the pact documents the API shape, not the auth handshake (that lives in TenantControllerTest's
 * 401/403 cases). This high-precedence chain switches auth off for the provider-verification
 * context only.
 */
@TestConfiguration(proxyBeanMethods = false)
public class PermitAllTestSecurityConfig {

  @Bean
  @Order(0)
  public SecurityFilterChain permitAllChain(HttpSecurity http) throws Exception {
    http.securityMatcher("/**")
        .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
        .csrf(AbstractHttpConfigurer::disable);
    return http.build();
  }
}
