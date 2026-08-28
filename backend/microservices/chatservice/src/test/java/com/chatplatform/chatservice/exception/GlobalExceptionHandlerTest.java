package com.chatplatform.chatservice.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ProblemDetail;

/**
 * Direct handler tests for the mappings the controller slice test doesn't reach - notably the
 * DataIntegrityViolationException safety net, which only fires on the create-create race the
 * app-level slug pre-check can't close (hard to provoke through MockMvc).
 */
class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @Test
  void notFoundMapsTo404() {
    UUID id = UUID.randomUUID();
    ProblemDetail problem = handler.handleNotFound(new TenantNotFoundException(id));

    assertThat(problem.getStatus()).isEqualTo(404);
    assertThat(problem.getTitle()).isEqualTo("Tenant not found");
    assertThat(problem.getDetail()).contains(id.toString());
  }

  @Test
  void slugConflictMapsTo409() {
    ProblemDetail problem = handler.handleSlugConflict(new TenantSlugConflictException("acme"));

    assertThat(problem.getStatus()).isEqualTo(409);
    assertThat(problem.getTitle()).isEqualTo("Tenant slug conflict");
  }

  @Test
  void dataIntegrityViolationMapsTo409WithoutLeakingDbDetail() {
    ProblemDetail problem =
        handler.handleDataIntegrityViolation(
            new DataIntegrityViolationException("duplicate key value violates tenant_slug_uk"));

    assertThat(problem.getStatus()).isEqualTo(409);
    assertThat(problem.getTitle()).isEqualTo("Constraint violation");
    // The raw DB message must not surface - it can leak schema/index names.
    assertThat(problem.getDetail()).doesNotContain("tenant_slug_uk");
  }
}
