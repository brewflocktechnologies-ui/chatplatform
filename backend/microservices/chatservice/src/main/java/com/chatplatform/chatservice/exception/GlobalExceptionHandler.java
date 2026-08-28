package com.chatplatform.chatservice.exception;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Maps domain/validation failures to RFC 7807 problem+json responses instead of leaking stack
 * traces or Spring's default whitelabel error body.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  @ExceptionHandler(TenantNotFoundException.class)
  public ProblemDetail handleNotFound(TenantNotFoundException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setTitle("Tenant not found");
    return problem;
  }

  @ExceptionHandler(TenantSlugConflictException.class)
  public ProblemDetail handleSlugConflict(TenantSlugConflictException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    problem.setTitle("Tenant slug conflict");
    return problem;
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ProblemDetail handleDataIntegrityViolation(DataIntegrityViolationException ex) {
    // Safety net for the race the app-level uniqueness pre-check can't close:
    // two concurrent creates both pass the pre-check, then the DB's unique
    // index (tenant_slug_uk) rejects the second insert.
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT, "Tenant violates a uniqueness or format constraint");
    problem.setTitle("Constraint violation");
    return problem;
  }

  @Override
  // @Nullable matches ResponseEntityExceptionHandler's own signature (its
  // package is @NullMarked); this override never actually returns null.
  protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException ex,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    Map<String, String> fieldErrors = new HashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(
            fieldError -> fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage()));

    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
    problem.setTitle("Invalid request");
    problem.setType(URI.create("about:blank"));
    problem.setProperty("fieldErrors", fieldErrors);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
  }
}
