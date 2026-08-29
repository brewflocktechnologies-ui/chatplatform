package com.chatplatform.chatdashboardbff.config;

import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

/**
 * Explicit decoder instead of the spring.security.oauth2.resourceserver.jwt.* properties (same
 * pattern as chatservice and accountservice): keys are fetched from the JWKS endpoint and cached by
 * Nimbus, the issuer validator pins the fixed iss claim with the default 60s clock skew, and the
 * audience validator rejects tokens minted for anything but this platform's resource servers.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties.class)
public class ReactiveJwtDecoderConfig {

  @Bean
  public OAuth2TokenValidator<Jwt> audienceValidator(AuthProperties properties) {
    return new JwtClaimValidator<List<String>>(
        JwtClaimNames.AUD, aud -> aud != null && aud.contains(properties.audience()));
  }

  @Bean
  public ReactiveJwtDecoder reactiveJwtDecoder(
      AuthProperties properties, OAuth2TokenValidator<Jwt> audienceValidator) {
    NimbusReactiveJwtDecoder decoder =
        NimbusReactiveJwtDecoder.withJwkSetUri(properties.jwksUri()).build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(properties.issuer()), audienceValidator));
    return decoder;
  }
}
