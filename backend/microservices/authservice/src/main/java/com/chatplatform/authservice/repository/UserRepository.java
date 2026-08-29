package com.chatplatform.authservice.repository;

import com.chatplatform.authservice.entity.PlatformUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class UserRepository {

  private final JdbcTemplate jdbcTemplate;

  public UserRepository(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public Optional<PlatformUser> findByEmail(String email) {
    List<PlatformUser> users =
        jdbcTemplate.query(
            "SELECT id, email, password_hash, tenant_id, enabled, created_at"
                + " FROM users WHERE email = ?",
            (rs, rowNum) -> mapUser(rs),
            email);
    return users.stream().findFirst().map(this::withRoles);
  }

  public Optional<PlatformUser> findById(String id) {
    List<PlatformUser> users =
        jdbcTemplate.query(
            "SELECT id, email, password_hash, tenant_id, enabled, created_at"
                + " FROM users WHERE id = ?",
            (rs, rowNum) -> mapUser(rs),
            id);
    return users.stream().findFirst().map(this::withRoles);
  }

  public boolean existsByEmail(String email) {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, email);
    return count != null && count > 0;
  }

  @Transactional
  public void save(PlatformUser user) {
    jdbcTemplate.update(
        "INSERT INTO users (id, email, password_hash, tenant_id, enabled, created_at)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        user.id(),
        user.email(),
        user.passwordHash(),
        user.tenantId(),
        user.enabled(),
        Timestamp.from(user.createdAt()));
    insertRoles(user.id(), user.roles());
  }

  @Transactional
  public void replaceRoles(String userId, Set<String> roles) {
    jdbcTemplate.update("DELETE FROM user_roles WHERE user_id = ?", userId);
    insertRoles(userId, roles);
  }

  private void insertRoles(String userId, Set<String> roles) {
    for (String role : roles) {
      jdbcTemplate.update("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", userId, role);
    }
  }

  private PlatformUser withRoles(PlatformUser user) {
    Set<String> roles =
        new HashSet<>(
            jdbcTemplate.query(
                "SELECT role FROM user_roles WHERE user_id = ?",
                (rs, rowNum) -> rs.getString("role"),
                user.id()));
    return new PlatformUser(
        user.id(),
        user.email(),
        user.passwordHash(),
        user.tenantId(),
        roles,
        user.enabled(),
        user.createdAt());
  }

  private PlatformUser mapUser(ResultSet rs) throws SQLException {
    return new PlatformUser(
        rs.getString("id"),
        rs.getString("email"),
        rs.getString("password_hash"),
        rs.getString("tenant_id"),
        Set.of(),
        rs.getBoolean("enabled"),
        rs.getTimestamp("created_at").toInstant());
  }
}
