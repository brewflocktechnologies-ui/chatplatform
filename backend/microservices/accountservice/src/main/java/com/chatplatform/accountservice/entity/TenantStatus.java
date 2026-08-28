package com.chatplatform.accountservice.entity;

/**
 * Mirrors the {@code tenant_status_valid} CHECK constraint in {@code
 * database-flyway/microservices/chatservice_db/migrations/V1__create_tenant_table.sql} - the same
 * table chatservice's {@code TenantStatus} maps, duplicated here rather than a shared module
 * dependency for a two-value enum. Keep all three in sync.
 */
public enum TenantStatus {
  ACTIVE,
  SUSPENDED
}
