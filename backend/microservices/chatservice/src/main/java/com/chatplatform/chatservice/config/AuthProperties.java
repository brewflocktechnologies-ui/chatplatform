package com.chatplatform.chatservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where platform JWTs come from and who they must be minted for. The issuer is the fixed string
 * every token carries (http://localhost:8110 in dev — see authservice's application.yaml); the JWKS
 * URI is the only value that changes per network (compose overrides it to
 * http://authservice:8110/oauth2/jwks). The audience pins tokens to this platform's resource
 * servers — authservice mints {@code aud: chatplatform-api} on every access token, so tokens minted
 * by anything else (or for another audience) are rejected even when the signature checks out.
 */
@ConfigurationProperties(prefix = "authservice.auth")
public record AuthProperties(String issuer, String jwksUri, String audience) {}
