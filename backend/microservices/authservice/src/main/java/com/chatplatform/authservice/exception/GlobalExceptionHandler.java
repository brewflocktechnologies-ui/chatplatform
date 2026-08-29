package com.chatplatform.authservice.exception;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.jspecify.annotations.Nullable;
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
 * traces or Spring's default whitelabel error body — same shape as the other services.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

  @ExceptionHandler(UserNotFoundException.class)
  public ProblemDetail handleNotFound(UserNotFoundException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problem.setTitle("User not found");
    return problem;
  }

  @ExceptionHandler(EmailConflictException.class)
  public ProblemDetail handleEmailConflict(EmailConflictException ex) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
    problem.setTitle("Email conflict");
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
