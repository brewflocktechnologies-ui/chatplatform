package com.chatplatform.chatservice.exception;

public class TenantSlugConflictException extends RuntimeException {
  public TenantSlugConflictException(String slug) {
    super("Tenant slug already in use: " + slug);
  }
}
