package com.chatplatform.authservice.config;

import java.time.Duration;
import java.util.UUID;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.JdbcRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;

/**
 * JDBC-backed client/authorization stores (survive restarts, shared across instances) plus
 * idempotent seeding of the platform's registered clients.
 *
 * <p>Clients:
 *
 * <ul>
 *   <li><b>chatdashboard</b> — the Next.js dashboard. Public client: authorization_code + PKCE +
 *       refresh_token, no secret.
 *   <li><b>chatwidget</b> — placeholder for the embeddable widget's future visitor-token flow.
 *       Registered now so the client id is reserved; unused this phase.
 *   <li><b>dev-cli</b> — dev profile only. Confidential client_credentials client so a curl can
 *       mint a token for manual testing (the password grant no longer exists in Spring
 *       Authorization Server).
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
public class ClientConfig {

  /** Fixed tenant id the dev-cli client acts for; matches the seeded dev tenant/user. */
  public static final String DEV_TENANT_ID = "10000000-0000-0000-0000-000000000001";

  private static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(15);
  private static final Duration REFRESH_TOKEN_TTL = Duration.ofHours(8);

  @Bean
  public RegisteredClientRepository registeredClientRepository(JdbcTemplate jdbcTemplate) {
    return new JdbcRegisteredClientRepository(jdbcTemplate);
  }

  @Bean
  public OAuth2AuthorizationService authorizationService(
      JdbcTemplate jdbcTemplate, RegisteredClientRepository registeredClientRepository) {
    return new JdbcOAuth2AuthorizationService(jdbcTemplate, registeredClientRepository);
  }

  @Bean
  public OAuth2AuthorizationConsentService authorizationConsentService(
      JdbcTemplate jdbcTemplate, RegisteredClientRepository registeredClientRepository) {
    return new JdbcOAuth2AuthorizationConsentService(jdbcTemplate, registeredClientRepository);
  }

  @Bean
  public ApplicationRunner clientSeeder(
      RegisteredClientRepository repository, PasswordEncoder passwordEncoder) {
    return args -> {
      seedIfAbsent(repository, dashboardClient());
      seedIfAbsent(repository, widgetClient(passwordEncoder));
    };
  }

  @Bean
  @Profile("dev")
  public ApplicationRunner devClientSeeder(
      RegisteredClientRepository repository, PasswordEncoder passwordEncoder) {
    return args ->
        seedIfAbsent(
            repository,
            RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId("dev-cli")
                .clientSecret(passwordEncoder.encode("dev-secret"))
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
                .scope("chat.read")
                .scope("chat.write")
                .scope("account.read")
                .scope("account.write")
                .scope("allocation.write")
                .scope("users.admin")
                .clientSettings(
                    ClientSettings.builder()
                        .setting(TokenConfig.TENANT_SETTING, DEV_TENANT_ID)
                        .build())
                .tokenSettings(tokenSettings())
                .build());
  }

  private static void seedIfAbsent(RegisteredClientRepository repository, RegisteredClient client) {
    if (repository.findByClientId(client.getClientId()) == null) {
      repository.save(client);
    }
  }

  private static RegisteredClient dashboardClient() {
    return RegisteredClient.withId(UUID.randomUUID().toString())
        .clientId("chatdashboard")
        .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
        .redirectUri("http://localhost:3000/auth/callback")
        .redirectUri("http://localhost:3100/auth/callback")
        .postLogoutRedirectUri("http://localhost:3000/auth/sign-in")
        .postLogoutRedirectUri("http://localhost:3100/auth/sign-in")
        .scope(OidcScopes.OPENID)
        .scope(OidcScopes.PROFILE)
        .scope("chat.read")
        .scope("chat.write")
        .scope("account.read")
        .scope("account.write")
        .clientSettings(
            ClientSettings.builder()
                .requireProofKey(true)
                // First-party app: skip the consent screen.
                .requireAuthorizationConsent(false)
                .build())
        .tokenSettings(tokenSettings())
        .build();
  }

  private static RegisteredClient widgetClient(PasswordEncoder passwordEncoder) {
    return RegisteredClient.withId(UUID.randomUUID().toString())
        .clientId("chatwidget")
        // Reserved client id for the future visitor-token flow. The secret is
        // random and thrown away at seed time, so the client is unusable until
        // a real secret is provisioned deliberately.
        .clientSecret(passwordEncoder.encode(UUID.randomUUID().toString()))
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
        .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
        .scope("widget.visitor")
        .clientSettings(ClientSettings.builder().build())
        .tokenSettings(tokenSettings())
        .build();
  }

  private static TokenSettings tokenSettings() {
    return TokenSettings.builder()
        .accessTokenTimeToLive(ACCESS_TOKEN_TTL)
        .refreshTokenTimeToLive(REFRESH_TOKEN_TTL)
        .reuseRefreshTokens(false)
        .build();
  }
}
