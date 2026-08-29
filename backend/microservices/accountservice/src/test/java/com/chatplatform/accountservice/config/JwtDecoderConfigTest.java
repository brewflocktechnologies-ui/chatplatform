package com.chatplatform.accountservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;

class JwtDecoderConfigTest {

  @Test
  void buildsDecoderFromProperties() {
    AuthProperties properties =
        new AuthProperties("http://localhost:8110", "http://localhost:8110/oauth2/jwks");

    JwtDecoder decoder = new JwtDecoderConfig().jwtDecoder(properties);

    // Construction is lazy - no JWKS fetch until the first decode - so the
    // bean must build fine with authservice down.
    assertThat(decoder).isNotNull();
    assertThat(properties.issuer()).isEqualTo("http://localhost:8110");
    assertThat(properties.jwksUri()).endsWith("/oauth2/jwks");
  }
}
