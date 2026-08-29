package com.chatplatform.authservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.chatplatform.authservice.entity.PlatformUser;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;

class TokenConfigTest {

  private final OAuth2TokenCustomizer<JwtEncodingContext> customizer =
      new TokenConfig().tokenCustomizer();

  private static RegisteredClient client(ClientSettings settings) {
    return RegisteredClient.withId("id")
        .clientId("client")
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
        .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
        .scope("chat.read")
        .clientSettings(settings)
        .build();
  }

  private static JwtEncodingContext.Builder context(RegisteredClient registeredClient) {
    return JwtEncodingContext.with(
            JwsHeader.with(SignatureAlgorithm.RS256), JwtClaimsSet.builder().claim("sub", "s"))
        .registeredClient(registeredClient);
  }

  @Test
  void userPrincipalGetsTenantAndRoles() {
    PlatformUser user =
        new PlatformUser(
            "u1", "a@b.io", "hash", "tenant-1", Set.of("AGENT", "ADMIN"), true, Instant.EPOCH);
    JwtEncodingContext ctx =
        context(client(ClientSettings.builder().build()))
            .tokenType(OAuth2TokenType.ACCESS_TOKEN)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .principal(new UsernamePasswordAuthenticationToken(user, "n/a", user.getAuthorities()))
            .build();

    customizer.customize(ctx);

    JwtClaimsSet claims = ctx.getClaims().build();
    assertThat(claims.getClaim(TokenConfig.TENANT_CLAIM).toString()).isEqualTo("tenant-1");
    assertThat(claims.<List<String>>getClaim(TokenConfig.ROLES_CLAIM))
        .containsExactly("ADMIN", "AGENT");
  }

  @Test
  void clientCredentialsGetsTenantFromClientSettings() {
    RegisteredClient registeredClient =
        client(ClientSettings.builder().setting(TokenConfig.TENANT_SETTING, "tenant-9").build());
    JwtEncodingContext ctx =
        context(registeredClient)
            .tokenType(OAuth2TokenType.ACCESS_TOKEN)
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .principal(new TestingAuthenticationToken("client", "n/a"))
            .build();

    customizer.customize(ctx);

    JwtClaimsSet claims = ctx.getClaims().build();
    assertThat(claims.getClaim(TokenConfig.TENANT_CLAIM).toString()).isEqualTo("tenant-9");
    assertThat(claims.<List<String>>getClaim(TokenConfig.ROLES_CLAIM)).isEmpty();
  }

  @Test
  void clientCredentialsRolesComeFromPrincipalRoleAuthorities() {
    RegisteredClient registeredClient = client(ClientSettings.builder().build());
    TestingAuthenticationToken principal =
        new TestingAuthenticationToken(
            "client",
            "n/a",
            List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("other")));
    JwtEncodingContext ctx =
        context(registeredClient)
            .tokenType(OAuth2TokenType.ACCESS_TOKEN)
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .principal(principal)
            .build();

    customizer.customize(ctx);

    JwtClaimsSet claims = ctx.getClaims().build();
    assertThat(claims.getClaimAsString(TokenConfig.TENANT_CLAIM)).isNull();
    assertThat(claims.<List<String>>getClaim(TokenConfig.ROLES_CLAIM)).containsExactly("ADMIN");
  }

  @Test
  void nonAccessTokensAreLeftUntouched() {
    JwtEncodingContext ctx =
        context(client(ClientSettings.builder().build()))
            .tokenType(new OAuth2TokenType("id_token"))
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .principal(new TestingAuthenticationToken("client", "n/a"))
            .build();

    customizer.customize(ctx);

    assertThat(ctx.getClaims().build().hasClaim(TokenConfig.TENANT_CLAIM)).isFalse();
  }
}
