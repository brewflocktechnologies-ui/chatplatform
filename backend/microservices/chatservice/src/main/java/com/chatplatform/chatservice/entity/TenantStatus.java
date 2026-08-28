package com.chatplatform.chatservice.entity;

/**
 * Mirrors the {@code tenant_status_valid} CHECK constraint in {@code
 * database/microservices/chatservice_db/migrations/V1__create_tenant_table.sql}. Keep these two in
 * sync.
 */
public enum TenantStatus {
  ACTIVE,
  SUSPENDED
}
