package com.chatplatform.authservice.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @Test
  void notFoundMapsTo404() {
    ProblemDetail problem = handler.handleNotFound(new UserNotFoundException("u-404"));

    assertThat(problem.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
    assertThat(problem.getTitle()).isEqualTo("User not found");
    assertThat(problem.getDetail()).contains("u-404");
  }

  @Test
  void emailConflictMapsTo409() {
    ProblemDetail problem = handler.handleEmailConflict(new EmailConflictException("a@b.io"));

    assertThat(problem.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
    assertThat(problem.getTitle()).isEqualTo("Email conflict");
    assertThat(problem.getDetail()).contains("a@b.io");
  }
}
