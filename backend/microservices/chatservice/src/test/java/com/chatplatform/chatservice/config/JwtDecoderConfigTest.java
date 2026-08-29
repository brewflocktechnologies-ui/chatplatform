package com.chatplatform.chatservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * The audience validator is the reason the decoder is hand-built instead of property-configured —
 * these tests pin its accept/reject behavior. The decoder bean itself is exercised against live
 * tokens end-to-end; here we only prove it wires up without touching the network.
 */
class JwtDecoderConfigTest {

  private final JwtDecoderConfig config = new JwtDecoderConfig();
  private final AuthProperties properties =
      new AuthProperties(
          "http://localhost:8110", "http://localhost:8110/oauth2/jwks", "chatplatform-api");

  private static Jwt jwt(List<String> audience) {
    Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "RS256").subject("dev-cli");
    if (audience != null) {
      builder.audience(audience);
    }
    return builder.build();
  }

  @Test
  void acceptsTokenMintedForThePlatformAudience() {
    OAuth2TokenValidator<Jwt> validator = config.audienceValidator(properties);

    assertThat(validator.validate(jwt(List.of("chatplatform-api"))).hasErrors()).isFalse();
  }

  @Test
  void rejectsTokenMintedForAnotherAudience() {
    OAuth2TokenValidator<Jwt> validator = config.audienceValidator(properties);

    assertThat(validator.validate(jwt(List.of("some-other-api"))).hasErrors()).isTrue();
  }

  @Test
  void rejectsTokenWithoutAnAudience() {
    OAuth2TokenValidator<Jwt> validator = config.audienceValidator(properties);

    assertThat(validator.validate(jwt(null)).hasErrors()).isTrue();
  }

  @Test
  void buildsDecoderWithoutFetchingKeys() {
    assertThat(config.jwtDecoder(properties, config.audienceValidator(properties))).isNotNull();
  }
}
