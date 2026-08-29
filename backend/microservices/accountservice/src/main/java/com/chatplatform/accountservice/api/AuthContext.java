package com.chatplatform.accountservice.api;

import io.grpc.Context;
import java.util.Set;

/**
 * gRPC context keys populated by {@link JwtServerInterceptor} from the validated platform JWT.
 * Handlers read identity from here — never from request fields, so a client can't act as another
 * principal by editing a message.
 */
public final class AuthContext {

  public static final Context.Key<String> SUBJECT = Context.key("auth-subject");
  public static final Context.Key<String> TENANT_ID = Context.key("auth-tenant-id");
  public static final Context.Key<Set<String>> SCOPES = Context.key("auth-scopes");

  private AuthContext() {}
}
