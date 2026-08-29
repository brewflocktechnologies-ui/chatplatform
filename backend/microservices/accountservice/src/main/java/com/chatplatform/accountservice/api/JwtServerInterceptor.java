package com.chatplatform.accountservice.api;

import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.Status;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.grpc.server.GlobalServerInterceptor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Bearer-token enforcement for every business RPC. Health and reflection stay open by design
 * (probes and tooling), everything else requires a valid platform JWT in the {@code authorization}
 * metadata plus the scope for the method: {@code account.read} for Get/List methods, {@code
 * account.write} for the rest (an ADMIN role passes either). Identity lands in {@link AuthContext}
 * for handlers/audit.
 */
@Component
@GlobalServerInterceptor
public class JwtServerInterceptor implements ServerInterceptor {

  static final Metadata.Key<String> AUTHORIZATION =
      Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
  static final String READ_SCOPE = "account.read";
  static final String WRITE_SCOPE = "account.write";

  private final JwtDecoder jwtDecoder;

  public JwtServerInterceptor(JwtDecoder jwtDecoder) {
    this.jwtDecoder = jwtDecoder;
  }

  @Override
  public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
      ServerCall<ReqT, RespT> call, Metadata headers, ServerCallHandler<ReqT, RespT> next) {
    String fullMethod = call.getMethodDescriptor().getFullMethodName();
    if (isOpenMethod(fullMethod)) {
      return next.startCall(call, headers);
    }

    String header = headers.get(AUTHORIZATION);
    if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
      return closed(call, Status.UNAUTHENTICATED.withDescription("missing bearer token"));
    }

    Jwt jwt;
    try {
      jwt = jwtDecoder.decode(header.substring(7).trim());
    } catch (JwtException e) {
      return closed(call, Status.UNAUTHENTICATED.withDescription("invalid token"));
    }

    Set<String> scopes = scopesOf(jwt);
    String required = requiredScope(fullMethod);
    if (!scopes.contains(required) && !rolesOf(jwt).contains("ADMIN")) {
      return closed(call, Status.PERMISSION_DENIED.withDescription("requires scope " + required));
    }

    Context context =
        Context.current()
            .withValue(AuthContext.SUBJECT, jwt.getSubject())
            .withValue(AuthContext.TENANT_ID, jwt.getClaimAsString("tenant_id"))
            .withValue(AuthContext.SCOPES, scopes);
    return Contexts.interceptCall(context, call, headers, next);
  }

  static boolean isOpenMethod(String fullMethod) {
    return fullMethod.startsWith("grpc.health.v1.Health/")
        || fullMethod.startsWith("grpc.reflection.");
  }

  static String requiredScope(String fullMethod) {
    String method = fullMethod.substring(fullMethod.lastIndexOf('/') + 1).toLowerCase(Locale.ROOT);
    return (method.startsWith("get") || method.startsWith("list")) ? READ_SCOPE : WRITE_SCOPE;
  }

  private static Set<String> scopesOf(Jwt jwt) {
    Object claim = jwt.getClaim("scope");
    if (claim instanceof String scope) {
      return Set.of(scope.split(" "));
    }
    if (claim instanceof List<?> list) {
      Set<String> scopes = new HashSet<>();
      list.forEach(value -> scopes.add(String.valueOf(value)));
      return scopes;
    }
    return Set.of();
  }

  private static List<String> rolesOf(Jwt jwt) {
    List<String> roles = jwt.getClaimAsStringList("roles");
    return roles == null ? List.of() : roles;
  }

  private static <ReqT, RespT> ServerCall.Listener<ReqT> closed(
      ServerCall<ReqT, RespT> call, Status status) {
    call.close(status, new Metadata());
    return new ServerCall.Listener<>() {};
  }
}
