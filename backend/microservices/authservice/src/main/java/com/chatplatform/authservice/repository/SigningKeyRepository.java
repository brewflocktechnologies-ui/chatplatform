package com.chatplatform.authservice.repository;

import com.chatplatform.authservice.entity.SigningKey;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class SigningKeyRepository {

  private static final RowMapper<SigningKey> ROW_MAPPER =
      (rs, rowNum) ->
          new SigningKey(
              rs.getString("id"),
              rs.getString("private_key_pem"),
              rs.getString("public_key_pem"),
              rs.getTimestamp("created_at").toInstant(),
              rs.getBoolean("retired"));

  private final JdbcTemplate jdbcTemplate;

  public SigningKeyRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  /** Newest first, so the first row is the active signing key. */
  public List<SigningKey> findActiveKeys() {
    return jdbcTemplate.query(
        "SELECT id, private_key_pem, public_key_pem, created_at, retired"
            + " FROM auth_signing_key WHERE retired = false ORDER BY created_at DESC",
        ROW_MAPPER);
  }

  public void save(SigningKey key) {
    jdbcTemplate.update(
        "INSERT INTO auth_signing_key (id, private_key_pem, public_key_pem, created_at, retired)"
            + " VALUES (?, ?, ?, ?, ?)",
        key.id(),
        key.privateKeyPem(),
        key.publicKeyPem(),
        Timestamp.from(key.createdAt() == null ? Instant.now() : key.createdAt()),
        key.retired());
  }
}
