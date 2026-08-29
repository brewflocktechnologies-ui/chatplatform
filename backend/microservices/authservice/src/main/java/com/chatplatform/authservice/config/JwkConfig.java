package com.chatplatform.authservice.config;

import com.chatplatform.authservice.service.SigningKeyService;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.OAuth2AuthorizationServerConfiguration;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Publishes the persisted keys as the server's JWK source. All non-retired keys are in the set
 * (JWKS consumers pick by kid), and SAS signs with the first/newest.
 */
@Configuration(proxyBeanMethods = false)
public class JwkConfig {

  @Bean
  public JWKSource<SecurityContext> jwkSource(SigningKeyService signingKeyService) {
    List<RSAKey> keys = signingKeyService.loadOrCreateKeys();
    return new ImmutableJWKSet<>(new JWKSet(List.copyOf(keys)));
  }

  /**
   * The default chain's resource-server support (protecting /api/v1/users with our own tokens)
   * decodes against the same key set — no HTTP round trip to ourselves.
   */
  @Bean
  public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
    return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
  }
}
