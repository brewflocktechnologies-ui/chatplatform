package com.chatplatform.authservice.entity;

import java.time.Instant;

/**
 * One persisted RSA signing keypair. The newest non-retired row signs new tokens; every non-retired
 * row stays published in the JWKS so tokens signed by a previous key keep validating during
 * rotation (rotate = insert a new row; retire the old one after the max token TTL).
 */
public record SigningKey(
    String id, String privateKeyPem, String publicKeyPem, Instant createdAt, boolean retired) {}
