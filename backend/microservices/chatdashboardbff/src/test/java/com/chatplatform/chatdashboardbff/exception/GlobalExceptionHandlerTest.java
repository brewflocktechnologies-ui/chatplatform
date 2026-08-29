package com.chatplatform.chatdashboardbff.exception;

import static org.assertj.core.api.Assertions.assertThat;

import io.grpc.Status;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;

/**
 * Direct handler tests for the Status branches the controller slice test doesn't provoke
 * (DEADLINE_EXCEEDED, the default-to-500 fallback, and the null-description fallback detail).
 */
class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @Test
  void invalidArgumentMapsTo400() {
    ProblemDetail problem =
        handler.handleGrpcStatus(
            Status.INVALID_ARGUMENT.withDescription("bad tenant_id").asRuntimeException());

    assertThat(problem.getStatus()).isEqualTo(400);
    assertThat(problem.getDetail()).isEqualTo("bad tenant_id");
  }

  @Test
  void unauthenticatedMapsTo401() {
    ProblemDetail problem =
        handler.handleGrpcStatus(
            Status.UNAUTHENTICATED.withDescription("invalid token").asRuntimeException());

    assertThat(problem.getStatus()).isEqualTo(401);
  }

  @Test
  void permissionDeniedMapsTo403() {
    ProblemDetail problem =
        handler.handleGrpcStatus(
            Status.PERMISSION_DENIED
                .withDescription("requires scope account.write")
                .asRuntimeException());

    assertThat(problem.getStatus()).isEqualTo(403);
  }

  @Test
  void deadlineExceededMapsTo504() {
    ProblemDetail problem = handler.handleGrpcStatus(Status.DEADLINE_EXCEEDED.asRuntimeException());

    assertThat(problem.getStatus()).isEqualTo(504);
  }

  @Test
  void unknownStatusMapsTo500WithFallbackDetail() {
    // No description set - exercises the fallback detail too.
    ProblemDetail problem = handler.handleGrpcStatus(Status.INTERNAL.asRuntimeException());

    assertThat(problem.getStatus()).isEqualTo(500);
    assertThat(problem.getDetail()).isEqualTo("upstream accountservice error");
  }
}
