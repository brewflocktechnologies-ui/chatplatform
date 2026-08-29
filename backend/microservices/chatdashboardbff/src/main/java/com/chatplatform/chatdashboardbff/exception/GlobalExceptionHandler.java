package com.chatplatform.chatdashboardbff.exception;

import io.grpc.StatusRuntimeException;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;

/**
 * The reverse of accountservice's error mapping: it turned domain exceptions into gRPC Status
 * codes; this turns those Status codes back into the same RFC 7807 ProblemDetail responses
 * chatservice's REST API produces (NOT_FOUND -> 404, ALREADY_EXISTS -> 409, INVALID_ARGUMENT ->
 * 400), plus BFF-specific upstream-failure codes (UNAVAILABLE -> 503, DEADLINE_EXCEEDED -> 504).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(StatusRuntimeException.class)
  public ProblemDetail handleGrpcStatus(StatusRuntimeException e) {
    HttpStatus status =
        switch (e.getStatus().getCode()) {
          case NOT_FOUND -> HttpStatus.NOT_FOUND;
          case ALREADY_EXISTS -> HttpStatus.CONFLICT;
          case INVALID_ARGUMENT -> HttpStatus.BAD_REQUEST;
          // accountservice's JWT interceptor: token invalid/missing on the
          // forwarded hop -> 401; valid token but missing scope -> 403.
          case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
          case PERMISSION_DENIED -> HttpStatus.FORBIDDEN;
          case UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
          case DEADLINE_EXCEEDED -> HttpStatus.GATEWAY_TIMEOUT;
          default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    String detail = e.getStatus().getDescription();
    return ProblemDetail.forStatusAndDetail(
        status, detail != null ? detail : "upstream accountservice error");
  }

  @ExceptionHandler(WebExchangeBindException.class)
  public ProblemDetail handleValidation(WebExchangeBindException e) {
    ProblemDetail problem =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
    Map<String, String> fieldErrors =
        e.getBindingResult().getFieldErrors().stream()
            .collect(
                Collectors.toMap(
                    FieldError::getField,
                    error -> String.valueOf(error.getDefaultMessage()),
                    (first, second) -> first));
    problem.setProperty("fieldErrors", fieldErrors);
    return problem;
  }
}
