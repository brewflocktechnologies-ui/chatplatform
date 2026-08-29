package com.chatplatform.accountservice.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Blocking decoder for the gRPC interceptor (gRPC interceptors are not reactive). Keys are fetched
 * from the JWKS endpoint and cached by Nimbus; the issuer validator pins the fixed iss claim with
 * the default 60s clock skew.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AuthProperties.class)
public class JwtDecoderConfig {

  @Bean
  public JwtDecoder jwtDecoder(AuthProperties properties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.jwksUri()).build();
    decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
    return decoder;
  }
}
