package com.chatplatform.chatservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Tenancy is mandatory on the business API: a valid platform JWT without a {@code tenant_id} claim
 * is authenticated but not authorized here — 403 with an RFC 7807 body, matching the service's
 * error contract. Runs after authorization so permitted paths (actuator, dev swagger) are never
 * affected.
 */
public class TenantClaimFilter extends OncePerRequestFilter {

  static final String TENANT_CLAIM = "tenant_id";

  // Deliberately not the context's ObjectMapper: security filter beans are
  // instantiated ahead of Jackson auto-configuration in web slices, and the
  // body here is a flat ProblemDetail with no custom modules involved.
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !request.getRequestURI().startsWith("/api/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication instanceof JwtAuthenticationToken jwtAuthentication
        && !StringUtils.hasText(jwtAuthentication.getToken().getClaimAsString(TENANT_CLAIM))) {
      ProblemDetail problem =
          ProblemDetail.forStatusAndDetail(
              HttpStatus.FORBIDDEN, "Token carries no tenant_id claim");
      problem.setTitle("Missing tenant");
      response.setStatus(HttpStatus.FORBIDDEN.value());
      response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
      objectMapper.writeValue(response.getOutputStream(), problem);
      return;
    }
    filterChain.doFilter(request, response);
  }
}
