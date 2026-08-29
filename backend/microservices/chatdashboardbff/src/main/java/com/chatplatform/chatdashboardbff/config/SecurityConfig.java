package com.chatplatform.chatdashboardbff.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import org.springframework.boot.security.autoconfigure.actuate.web.reactive.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.csrf.CookieServerCsrfTokenRepository;
import org.springframework.security.web.server.csrf.CsrfToken;
import org.springframework.security.web.server.csrf.CsrfWebFilter;
import org.springframework.security.web.server.csrf.ServerCsrfTokenRequestAttributeHandler;
import org.springframework.security.web.server.util.matcher.AndServerWebExchangeMatcher;
import org.springframework.security.web.server.util.matcher.NegatedServerWebExchangeMatcher;
import org.springframework.security.web.server.util.matcher.ServerWebExchangeMatchers;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Resource-server enforcement for the dashboard-facing REST surface: every /api/** request needs a
 * platform JWT issued by authservice. Same claims mapping as chatservice — ROLE_* from the {@code
 * roles} claim plus the default SCOPE_* authorities. The validated token is then forwarded as-is to
 * accountservice by {@code TenantGrpcClient}, which re-validates it (zero-trust hop).
 */
@Configuration(proxyBeanMethods = false)
@EnableWebFluxSecurity
public class SecurityConfig {

  /**
   * No inline/eval scripts or styles, no cross-origin loads, no framing. BootUI's own responses
   * carry BootUI's tailored policy already (its filter sets the header itself), so this is the
   * default for everything else.
   */
  private static final String CONTENT_SECURITY_POLICY =
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
          + "font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; "
          + "form-action 'self'; frame-ancestors 'none'";

  /**
   * Replaces BootUI's reactive starter chain (it is {@code @ConditionalOnMissingBean} on exactly
   * this bean name) with a functionally identical one — same path patterns, same permit-all posture
   * behind BootUI's own loopback guard, same SPA-style cookie CSRF — plus the Content-Security-
   * Policy the starter's chain doesn't emit. Dev only, matching when BootUI itself is active here.
   */
  @Bean
  @Profile("dev")
  @Order(Ordered.HIGHEST_PRECEDENCE)
  public SecurityWebFilterChain bootUiReactiveSecurityWebFilterChain(ServerHttpSecurity http) {
    http.securityMatcher(
            ServerWebExchangeMatchers.pathMatchers(
                "/bootui", "/bootui/**", "/bootui/api", "/bootui/api/**"))
        .authorizeExchange(exchanges -> exchanges.anyExchange().permitAll())
        .csrf(
            csrf ->
                csrf.csrfTokenRepository(CookieServerCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new ServerCsrfTokenRequestAttributeHandler())
                    .requireCsrfProtectionMatcher(
                        new AndServerWebExchangeMatcher(
                            CsrfWebFilter.DEFAULT_CSRF_MATCHER,
                            new NegatedServerWebExchangeMatcher(
                                ServerWebExchangeMatchers.pathMatchers(
                                    "/bootui/api/otlp/**",
                                    "/bootui/api/mcp",
                                    "/bootui/api/mcp/**",
                                    "/bootui/api/auth/session")))))
        .addFilterAfter(new CsrfCookieWebFilter(), SecurityWebFiltersOrder.CSRF)
        .headers(
            headers ->
                headers.contentSecurityPolicy(
                    csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY)));
    return http.build();
  }

  @Bean
  public SecurityWebFilterChain securityWebFilterChain(
      ServerHttpSecurity http, Environment environment) {
    boolean devProfile = environment.acceptsProfiles(Profiles.of("dev"));

    http.authorizeExchange(
            exchanges -> {
              exchanges.matchers(EndpointRequest.toAnyEndpoint()).permitAll();
              if (devProfile) {
                // Same dev-only posture as BootUI: contract browsing stays
                // open locally, locked everywhere else.
                exchanges
                    .pathMatchers(
                        "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**", "/webjars/**")
                    .permitAll();
              }
              exchanges.anyExchange().authenticated();
            })
        .csrf(ServerHttpSecurity.CsrfSpec::disable)
        .oauth2ResourceServer(
            resourceServer ->
                resourceServer.jwt(
                    jwt ->
                        jwt.jwtAuthenticationConverter(
                            new ReactiveJwtAuthenticationConverterAdapter(platformJwtConverter()))))
        .headers(
            headers ->
                headers.contentSecurityPolicy(
                    csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY)));

    return http.build();
  }

  /**
   * Forces the deferred CSRF token to resolve so the XSRF-TOKEN cookie is written on every BootUI
   * response — the SPA reads it back as the X-XSRF-TOKEN header on mutating calls. Mirrors the
   * filter BootUI's own starter chain installs (that class isn't public).
   */
  static final class CsrfCookieWebFilter implements WebFilter {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
      Mono<CsrfToken> csrfToken = exchange.getAttribute(CsrfToken.class.getName());
      if (csrfToken == null) {
        return chain.filter(exchange);
      }
      return csrfToken.then(chain.filter(exchange));
    }
  }

  /**
   * ROLE_* authorities from the platform {@code roles} claim, plus the default SCOPE_* authorities
   * from {@code scope} — so both user tokens (roles) and service tokens (scopes) authorize.
   */
  static JwtAuthenticationConverter platformJwtConverter() {
    JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> {
          Collection<GrantedAuthority> authorities = new ArrayList<>(scopes.convert(jwt));
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
}
