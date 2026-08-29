package com.chatplatform.accountservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where platform JWTs come from. The issuer is the fixed string every token carries
 * (http://localhost:8110 in dev — see authservice's application.yaml); the JWKS URI is the only
 * value that changes per network (compose overrides it to http://authservice:8110/oauth2/jwks).
 */
@ConfigurationProperties(prefix = "authservice.auth")
public record AuthProperties(String issuer, String jwksUri) {}
