package com.chatplatform.chatdashboardbff.controller;

import com.chatplatform.chatdashboardbff.client.TenantGrpcClient;
import com.chatplatform.chatdashboardbff.dto.TenantPageResponse;
import com.chatplatform.chatdashboardbff.dto.TenantRequest;
import com.chatplatform.chatdashboardbff.dto.TenantResponse;
import com.chatplatform.chatdashboardbff.dto.TenantStatus;
import com.chatplatform.chatdashboardbff.dto.TenantUpdateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

/**
 * The BFF surface: same REST contract chatservice exposes (paths, DTO shapes, status codes), backed
 * by accountservice's gRPC API instead of a database. Error translation (StatusRuntimeException to
 * ProblemDetail) lives in GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/api/v1/tenants")
@Tag(name = "Tenants", description = "Tenant CRUD, proxied to accountservice over gRPC")
public class TenantController {

  private final TenantGrpcClient tenantClient;

  public TenantController(TenantGrpcClient tenantClient) {
    this.tenantClient = tenantClient;
  }

  @Operation(summary = "Create a tenant")
  @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public Mono<TenantResponse> create(@Valid @RequestBody TenantRequest request) {
    TenantStatus status = request.status() != null ? request.status() : TenantStatus.ACTIVE;
    return tenantClient
        .create(request.slug(), request.name(), status.toProto())
        .map(TenantResponse::from);
  }

  @Operation(summary = "Get a tenant by id")
  @GetMapping("/{tenantId}")
  public Mono<TenantResponse> get(@PathVariable UUID tenantId) {
    return tenantClient.get(tenantId.toString()).map(TenantResponse::from);
  }

  @Operation(summary = "List tenants (paginated)")
  @GetMapping
  public Mono<TenantPageResponse> list(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return tenantClient.list(page, size).map(TenantPageResponse::from);
  }

  @Operation(summary = "Update a tenant's name/status (slug is immutable)")
  @PutMapping(value = "/{tenantId}", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Mono<TenantResponse> update(
      @PathVariable UUID tenantId, @Valid @RequestBody TenantUpdateRequest request) {
    return tenantClient
        .update(tenantId.toString(), request.name(), request.status().toProto())
        .map(TenantResponse::from);
  }

  @Operation(summary = "Delete a tenant")
  @DeleteMapping("/{tenantId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public Mono<Void> delete(@PathVariable UUID tenantId) {
    return tenantClient.delete(tenantId.toString()).then();
  }
}
