package com.chatplatform.authservice.config;

import com.chatplatform.authservice.entity.PlatformUser;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;

/**
 * Adds the platform claims to every access token: {@code tenant_id} (the replacement for the
 * unverified x-tenant-id header downstream services used to trust) and {@code roles} (mapped to
 * ROLE_* authorities by resource servers).
 *
 * <p>User flows (authorization_code) read both off the authenticated {@link PlatformUser}
 * principal; client_credentials clients carry their tenant in a registered-client setting written
 * by {@code ClientConfig}.
 */
@Configuration(proxyBeanMethods = false)
public class TokenConfig {

  /** Registered-client setting key holding the tenant a service client acts for. */
  public static final String TENANT_SETTING = "com.chatplatform.tenant_id";

  public static final String TENANT_CLAIM = "tenant_id";
  public static final String ROLES_CLAIM = "roles";

  /**
   * The aud claim minted on every access token. Resource servers that validate audience
   * (chatservice does) reject tokens minted for anything else; ID tokens keep their OIDC client-id
   * audience.
   */
  public static final String ACCESS_TOKEN_AUDIENCE = "chatplatform-api";

  @Bean
  public OAuth2TokenCustomizer<JwtEncodingContext> tokenCustomizer() {
    return context -> {
      if (!"access_token".equals(context.getTokenType().getValue())) {
        return;
      }
      context.getClaims().audience(java.util.List.of(ACCESS_TOKEN_AUDIENCE));
      Authentication principal = context.getPrincipal();
      if (principal != null && principal.getPrincipal() instanceof PlatformUser user) {
        context.getClaims().claim(TENANT_CLAIM, user.tenantId());
        context.getClaims().claim(ROLES_CLAIM, user.sortedRoles());
        return;
      }
      if (AuthorizationGrantType.CLIENT_CREDENTIALS.equals(context.getAuthorizationGrantType())) {
        RegisteredClient client = context.getRegisteredClient();
        Object tenantId = client.getClientSettings().getSetting(TENANT_SETTING);
        if (tenantId != null) {
          context.getClaims().claim(TENANT_CLAIM, tenantId.toString());
        }
        context
            .getClaims()
            .claim(
                ROLES_CLAIM,
                principal == null
                    ? java.util.List.<String>of()
                    : principal.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .filter(authority -> authority.startsWith("ROLE_"))
                        .map(authority -> authority.substring("ROLE_".length()))
                        .sorted()
                        .toList());
      }
    };
  }
}
