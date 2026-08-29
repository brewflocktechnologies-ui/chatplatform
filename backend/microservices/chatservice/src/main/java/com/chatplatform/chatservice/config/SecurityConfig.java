package com.chatplatform.chatservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collection;
import java.util.List;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Resource-server enforcement: every /api/v1/** request needs a platform JWT issued by authservice
 * (decoded and audience-checked by {@link JwtDecoderConfig}). Roles come from the token's {@code
 * roles} claim (mapped to ROLE_*), scopes keep the default SCOPE_* mapping, and {@link
 * TenantClaimFilter} rejects tokens without a {@code tenant_id} — tenancy is mandatory on this API.
 *
 * <p>Three chains, most-specific first: BootUI (dev only, replaces the starter's own headerless
 * chain), actuator, then the catch-all API chain. All three emit the same hardening headers.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
public class SecurityConfig {

  /**
   * No inline/eval scripts or styles, no cross-origin loads, no framing. BootUI's own responses
   * carry BootUI's tailored policy already (its filter sets the header first, and Spring's header
   * writers only fill in when the header is absent), so this is the default for everything else.
   */
  private static final String CONTENT_SECURITY_POLICY =
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
          + "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; "
          + "form-action 'self'; frame-ancestors 'none'";

  /** Browser features a JSON API (and a dev console) never needs. */
  private static final String PERMISSIONS_POLICY =
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), "
          + "microphone=(), payment=(), usb=()";

  /**
   * Replaces BootUI's starter chain (it is {@code @ConditionalOnMissingBean} on exactly this bean
   * name) with a functionally identical one — same path patterns, same permit-all posture behind
   * BootUI's own loopback guard, same SPA-style cookie CSRF — plus the hardening headers the
   * starter's chain doesn't emit. Dev only, matching when BootUI itself is active here.
   */
  @Bean
  @Profile("dev")
  @Order(Ordered.HIGHEST_PRECEDENCE)
  public SecurityFilterChain bootUiSecurityFilterChain(HttpSecurity http) throws Exception {
    http.securityMatcher("/bootui", "/bootui/**", "/bootui/api", "/bootui/api/**")
        .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
        .csrf(
            csrf ->
                csrf.spa()
                    .ignoringRequestMatchers(
                        "/bootui/api/otlp/**",
                        "/bootui/api/mcp",
                        "/bootui/api/mcp/**",
                        "/bootui/api/auth/session"))
        .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
        .headers(SecurityConfig::hardeningHeaders);
    return http.build();
  }

  /**
   * Actuator gets its own chain (on the management port): health and info stay open for container
   * probes and the localrun health wait, everything else — metrics today — needs a platform JWT.
   */
  @Bean
  @Order(1)
  public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
    http.securityMatcher("/actuator/**")
        .authorizeHttpRequests(
            authorize ->
                authorize
                    .requestMatchers(EndpointRequest.to("health", "info"))
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .csrf(AbstractHttpConfigurer::disable)
        .oauth2ResourceServer(resourceServer -> resourceServer.jwt(Customizer.withDefaults()))
        .headers(SecurityConfig::hardeningHeaders);
    return http.build();
  }

  @Bean
  @Order(2)
  public SecurityFilterChain securityFilterChain(HttpSecurity http, Environment environment)
      throws Exception {
    boolean devProfile = environment.acceptsProfiles(Profiles.of("dev"));

    http.authorizeHttpRequests(
            authorize -> {
              if (devProfile) {
                // Same dev-only posture as BootUI: contract browsing stays
                // open locally, locked everywhere else.
                authorize
                    .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
                    .permitAll();
              }
              authorize.anyRequest().authenticated();
            })
        .csrf(AbstractHttpConfigurer::disable)
        .oauth2ResourceServer(resourceServer -> resourceServer.jwt(Customizer.withDefaults()))
        .addFilterAfter(new TenantClaimFilter(), AuthorizationFilter.class)
        .headers(SecurityConfig::hardeningHeaders);
    return http.build();
  }

  /**
   * ROLE_* authorities from the platform {@code roles} claim, plus the default SCOPE_* authorities
   * from {@code scope} — so both user tokens (roles) and service tokens (scopes) authorize.
   */
  @Bean
  public JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> {
          Collection<GrantedAuthority> authorities = new java.util.ArrayList<>(scopes.convert(jwt));
          for (String role : rolesClaim(jwt)) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
          }
          return authorities;
        });
    return converter;
  }

  private static List<String> rolesClaim(Jwt jwt) {
    List<String> roles = jwt.getClaimAsStringList("roles");
    return roles == null ? List.of() : roles;
  }

  /**
   * On top of Spring Security's defaults (nosniff, frame deny, no-cache): a strict CSP,
   * Referrer-Policy, Permissions-Policy, and same-origin COOP — none of which are emitted by
   * default. Writers only set headers the response doesn't already carry.
   */
  private static void hardeningHeaders(HeadersConfigurer<HttpSecurity> headers) {
    headers
        .contentSecurityPolicy(csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY))
        .referrerPolicy(
            referrer ->
                referrer.policy(
                    ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
        .permissionsPolicyHeader(permissions -> permissions.policy(PERMISSIONS_POLICY))
        .crossOriginOpenerPolicy(
            coop ->
                coop.policy(
                    CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy.SAME_ORIGIN));
  }

  /**
   * Forces the deferred CSRF token to load so the XSRF-TOKEN cookie is written on every BootUI
   * response — the SPA reads it back as the X-XSRF-TOKEN header on mutating calls. Mirrors the
   * filter BootUI's own starter chain installs (that class isn't public).
   */
  static final class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
        HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
      CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
      if (csrfToken != null) {
        csrfToken.getToken();
      }
      filterChain.doFilter(request, response);
    }
  }
}
