package com.chatplatform.authservice.config;

import java.util.List;
import org.springframework.boot.security.autoconfigure.actuate.web.servlet.EndpointRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.oauth2.server.authorization.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Two filter chains, ordered: the Spring Authorization Server protocol endpoints first
 * (/oauth2/authorize, /oauth2/token, /oauth2/jwks, OIDC discovery/userinfo), then the default
 * application chain (form login for the authorization-code flow, the user-management API, and
 * dev-only Swagger).
 *
 * <p>The user-management API is protected by the platform's own JWTs: this service is a resource
 * server of itself, so an ADMIN access token (or a client with the users.admin scope) manages
 * users, matching how every other service will consume tokens.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
public class AuthorizationServerConfig {

  @Bean
  @Order(1)
  public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http)
      throws Exception {
    OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
        new OAuth2AuthorizationServerConfigurer();

    http.securityMatcher(authorizationServerConfigurer.getEndpointsMatcher())
        .with(authorizationServerConfigurer, server -> server.oidc(Customizer.withDefaults()))
        .authorizeHttpRequests(authorize -> authorize.anyRequest().authenticated())
        .cors(Customizer.withDefaults())
        // Browser clients hitting /oauth2/authorize unauthenticated get the
        // login page; API clients get a plain 401.
        .exceptionHandling(
            exceptions ->
                exceptions.defaultAuthenticationEntryPointFor(
                    new LoginUrlAuthenticationEntryPoint("/login"),
                    new MediaTypeRequestMatcher(org.springframework.http.MediaType.TEXT_HTML)));

    return http.build();
  }

  @Bean
  @Order(2)
  public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http, Environment environment)
      throws Exception {
    boolean devProfile = environment.acceptsProfiles(Profiles.of("dev"));

    http.authorizeHttpRequests(
            authorize -> {
              // Management runs on a separate loopback-bound port (8111);
              // permitting it here keeps probes working when
              // MANAGEMENT_SERVER_ADDRESS is overridden in containers.
              authorize.requestMatchers(EndpointRequest.toAnyEndpoint()).permitAll();
              authorize.requestMatchers("/login", "/error").permitAll();
              if (devProfile) {
                // Same dev-only posture as BootUI/Swagger in the other services.
                authorize
                    .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**")
                    .permitAll();
              }
              authorize
                  .requestMatchers("/api/v1/users/**")
                  .hasAnyAuthority("SCOPE_users.admin", "ROLE_ADMIN");
              authorize.anyRequest().authenticated();
            })
        // The user-management API is token-based; sessions are only for the
        // form-login half of the authorization-code flow.
        .csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .oauth2ResourceServer(resourceServer -> resourceServer.jwt(Customizer.withDefaults()))
        // The API is token-based: an unauthenticated /api/** request gets a
        // plain 401, not formLogin's 302-to-/login (which is for browsers).
        .exceptionHandling(
            exceptions ->
                exceptions.defaultAuthenticationEntryPointFor(
                    new BearerTokenAuthenticationEntryPoint(),
                    PathPatternRequestMatcher.withDefaults().matcher("/api/**")))
        .formLogin(Customizer.withDefaults());

    return http.build();
  }

  /**
   * The SPA (PKCE public client) POSTs /oauth2/token and fetches /oauth2/jwks and /userinfo
   * cross-origin during local dev; 3000 is the dashboard's default port, 3100 the alternate used
   * when 3000 is occupied.
   */
  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:3100"));
    configuration.setAllowedMethods(
        List.of(HttpMethod.GET.name(), HttpMethod.POST.name(), HttpMethod.OPTIONS.name()));
    configuration.setAllowedHeaders(List.of("*"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/oauth2/**", configuration);
    source.registerCorsConfiguration("/userinfo", configuration);
    source.registerCorsConfiguration("/.well-known/**", configuration);
    return source;
  }
}
