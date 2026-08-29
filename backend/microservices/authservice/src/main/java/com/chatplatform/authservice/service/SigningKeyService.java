package com.chatplatform.authservice.service;

import com.chatplatform.authservice.entity.SigningKey;
import com.chatplatform.authservice.repository.SigningKeyRepository;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.RSAKey;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Owns the RSA signing keys. Keys are persisted (PKCS#8/X.509 PEM) so restarts and multiple
 * instances keep issuing/validating the same tokens; if the table is empty a keypair is generated
 * and stored once. Rotation: insert a new row (it becomes the signer, being newest), keep the old
 * row published until the max token TTL has passed, then set retired = true.
 */
@Service
public class SigningKeyService {

  private static final String PRIVATE_HEADER = "-----BEGIN PRIVATE KEY-----";
  private static final String PRIVATE_FOOTER = "-----END PRIVATE KEY-----";
  private static final String PUBLIC_HEADER = "-----BEGIN PUBLIC KEY-----";
  private static final String PUBLIC_FOOTER = "-----END PUBLIC KEY-----";

  private final SigningKeyRepository repository;

  public SigningKeyService(SigningKeyRepository repository) {
    this.repository = repository;
  }

  /**
   * All non-retired keys as JWKs, newest first — index 0 signs, the rest only validate. Generates
   * and persists the first key when none exist.
   */
  public List<RSAKey> loadOrCreateKeys() {
    List<SigningKey> keys = repository.findActiveKeys();
    if (keys.isEmpty()) {
      SigningKey created = generateKey();
      repository.save(created);
      keys = List.of(created);
    }
    return keys.stream().map(this::toRsaKey).toList();
  }

  SigningKey generateKey() {
    try {
      KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
      generator.initialize(2048);
      KeyPair pair = generator.generateKeyPair();
      return new SigningKey(
          UUID.randomUUID().toString(),
          toPem(PRIVATE_HEADER, PRIVATE_FOOTER, pair.getPrivate().getEncoded()),
          toPem(PUBLIC_HEADER, PUBLIC_FOOTER, pair.getPublic().getEncoded()),
          Instant.now(),
          false);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException("RSA key generation unavailable", e);
    }
  }

  RSAKey toRsaKey(SigningKey key) {
    try {
      KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      RSAPublicKey publicKey =
          (RSAPublicKey)
              keyFactory.generatePublic(new X509EncodedKeySpec(fromPem(key.publicKeyPem())));
      RSAPrivateKey privateKey =
          (RSAPrivateKey)
              keyFactory.generatePrivate(new PKCS8EncodedKeySpec(fromPem(key.privateKeyPem())));
      // Publish alg alongside kid: some JWKS consumers (Go's jwx among
      // them) match keys strictly and benefit from the explicit algorithm.
      return new RSAKey.Builder(publicKey)
          .privateKey(privateKey)
          .keyID(key.id())
          .algorithm(JWSAlgorithm.RS256)
          .build();
    } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
      throw new IllegalStateException("Persisted signing key " + key.id() + " is invalid", e);
    }
  }

  private static String toPem(String header, String footer, byte[] der) {
    return header
        + "\n"
        + Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(der)
        + "\n"
        + footer;
  }

  private static byte[] fromPem(String pem) {
    String base64 =
        pem.replace(PRIVATE_HEADER, "")
            .replace(PRIVATE_FOOTER, "")
            .replace(PUBLIC_HEADER, "")
            .replace(PUBLIC_FOOTER, "")
            .replaceAll("\\s", "");
    return Base64.getDecoder().decode(base64);
  }
}
