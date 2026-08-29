package com.chatplatform.accountservice.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.grpc.Metadata;
import io.grpc.MethodDescriptor;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.Status;
import io.grpc.protobuf.ProtoUtils;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

@ExtendWith(MockitoExtension.class)
class JwtServerInterceptorTest {

  @Mock private JwtDecoder jwtDecoder;
  @Mock private ServerCall<com.google.protobuf.Empty, com.google.protobuf.Empty> call;
  @Mock private ServerCallHandler<com.google.protobuf.Empty, com.google.protobuf.Empty> next;

  private JwtServerInterceptor interceptor;

  @BeforeEach
  void setUp() {
    interceptor = new JwtServerInterceptor(jwtDecoder);
  }

  private static MethodDescriptor<com.google.protobuf.Empty, com.google.protobuf.Empty> method(
      String fullName) {
    return MethodDescriptor.<com.google.protobuf.Empty, com.google.protobuf.Empty>newBuilder()
        .setType(MethodDescriptor.MethodType.UNARY)
        .setFullMethodName(fullName)
        .setRequestMarshaller(ProtoUtils.marshaller(com.google.protobuf.Empty.getDefaultInstance()))
        .setResponseMarshaller(
            ProtoUtils.marshaller(com.google.protobuf.Empty.getDefaultInstance()))
        .build();
  }

  private static Jwt jwt(Map<String, Object> claims) {
    return new Jwt(
        "token", Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "RS256"), claims);
  }

  private static Metadata bearer(String token) {
    Metadata metadata = new Metadata();
    metadata.put(JwtServerInterceptor.AUTHORIZATION, "Bearer " + token);
    return metadata;
  }

  @Test
  void healthAndReflectionStayOpen() {
    when(call.getMethodDescriptor()).thenReturn(method("grpc.health.v1.Health/Check"));

    interceptor.interceptCall(call, new Metadata(), next);

    verify(next).startCall(eq(call), any());
    verify(call, never()).close(any(), any());
  }

  @Test
  void missingTokenIsUnauthenticated() {
    when(call.getMethodDescriptor())
        .thenReturn(method("com.chatplatform.accountservice.grpc.TenantService/GetTenant"));

    interceptor.interceptCall(call, new Metadata(), next);

    ArgumentCaptor<Status> status = ArgumentCaptor.forClass(Status.class);
    verify(call).close(status.capture(), any());
    assertThat(status.getValue().getCode()).isEqualTo(Status.Code.UNAUTHENTICATED);
    verify(next, never()).startCall(any(), any());
  }

  @Test
  void invalidTokenIsUnauthenticated() {
    when(call.getMethodDescriptor())
        .thenReturn(method("com.chatplatform.accountservice.grpc.TenantService/GetTenant"));
    when(jwtDecoder.decode("bad")).thenThrow(new JwtException("nope"));

    interceptor.interceptCall(call, bearer("bad"), next);

    ArgumentCaptor<Status> status = ArgumentCaptor.forClass(Status.class);
    verify(call).close(status.capture(), any());
    assertThat(status.getValue().getCode()).isEqualTo(Status.Code.UNAUTHENTICATED);
  }

  @Test
  void wrongScopeIsPermissionDenied() {
    when(call.getMethodDescriptor())
        .thenReturn(method("com.chatplatform.accountservice.grpc.TenantService/CreateTenant"));
    when(jwtDecoder.decode("t"))
        .thenReturn(jwt(Map.of("sub", "cli", "scope", "account.read", "tenant_id", "t1")));

    interceptor.interceptCall(call, bearer("t"), next);

    ArgumentCaptor<Status> status = ArgumentCaptor.forClass(Status.class);
    verify(call).close(status.capture(), any());
    assertThat(status.getValue().getCode()).isEqualTo(Status.Code.PERMISSION_DENIED);
  }

  @Test
  void adminRolePassesWithoutScope() {
    when(call.getMethodDescriptor())
        .thenReturn(method("com.chatplatform.accountservice.grpc.TenantService/CreateTenant"));
    when(jwtDecoder.decode("t"))
        .thenReturn(jwt(Map.of("sub", "admin", "roles", List.of("ADMIN"), "tenant_id", "t1")));

    interceptor.interceptCall(call, bearer("t"), next);

    verify(next).startCall(eq(call), any());
    verify(call, never()).close(any(), any());
  }

  @Test
  void validTokenPopulatesAuthContext() {
    when(call.getMethodDescriptor())
        .thenReturn(method("com.chatplatform.accountservice.grpc.TenantService/GetTenant"));
    when(jwtDecoder.decode("t"))
        .thenReturn(
            jwt(
                Map.of(
                    "sub", "dev-cli",
                    "scope", "account.read account.write",
                    "tenant_id", "tenant-1")));
    AtomicReference<String> seenTenant = new AtomicReference<>();
    AtomicReference<String> seenSubject = new AtomicReference<>();
    when(next.startCall(eq(call), any()))
        .thenAnswer(
            invocation -> {
              seenTenant.set(AuthContext.TENANT_ID.get());
              seenSubject.set(AuthContext.SUBJECT.get());
              return new ServerCall.Listener<com.google.protobuf.Empty>() {};
            });

    interceptor.interceptCall(call, bearer("t"), next);

    assertThat(seenTenant.get()).isEqualTo("tenant-1");
    assertThat(seenSubject.get()).isEqualTo("dev-cli");
  }

  @Test
  void scopeMappingSplitsReadsAndWrites() {
    assertThat(JwtServerInterceptor.requiredScope("pkg.TenantService/GetTenant"))
        .isEqualTo(JwtServerInterceptor.READ_SCOPE);
    assertThat(JwtServerInterceptor.requiredScope("pkg.TenantService/ListTenants"))
        .isEqualTo(JwtServerInterceptor.READ_SCOPE);
    assertThat(JwtServerInterceptor.requiredScope("pkg.TenantService/DeleteTenant"))
        .isEqualTo(JwtServerInterceptor.WRITE_SCOPE);
    assertThat(JwtServerInterceptor.isOpenMethod("grpc.reflection.v1.ServerReflection/Info"))
        .isTrue();
  }
}
