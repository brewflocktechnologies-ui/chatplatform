package com.chatplatform.chatservice.controller;

import com.chatplatform.chatservice.dto.TenantRequest;
import com.chatplatform.chatservice.dto.TenantResponse;
import com.chatplatform.chatservice.dto.TenantUpdateRequest;
import com.chatplatform.chatservice.service.TenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/v1/tenants", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(
    name = "Tenants",
    description = "Tenant lifecycle: the tenancy root every other resource keys off of")
public class TenantController {

  private final TenantService tenantService;

  public TenantController(TenantService tenantService) {
    this.tenantService = tenantService;
  }

  @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
  @Operation(summary = "Create a tenant")
  @ApiResponse(
      responseCode = "201",
      description = "Created",
      content = @Content(schema = @Schema(implementation = TenantResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Validation failed",
      content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
  @ApiResponse(
      responseCode = "409",
      description = "Slug already in use",
      content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
  public ResponseEntity<TenantResponse> create(@Valid @RequestBody TenantRequest request) {
    TenantResponse body = TenantResponse.from(tenantService.create(request));
    return ResponseEntity.created(URI.create("/api/v1/tenants/" + body.tenantId())).body(body);
  }

  @GetMapping("/{tenantId}")
  @Operation(summary = "Get a tenant by id")
  @ApiResponse(responseCode = "200", description = "OK")
  @ApiResponse(
      responseCode = "404",
      description = "Tenant not found",
      content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
  public TenantResponse get(@PathVariable UUID tenantId) {
    return TenantResponse.from(tenantService.get(tenantId));
  }

  @GetMapping
  @Operation(summary = "List tenants (paginated)")
  @ApiResponse(responseCode = "200", description = "OK")
  public Page<TenantResponse> list(
      @Parameter(hidden = true) @PageableDefault(size = 20) Pageable pageable) {
    return tenantService.list(pageable).map(TenantResponse::from);
  }

  @PutMapping(path = "/{tenantId}", consumes = MediaType.APPLICATION_JSON_VALUE)
  @Operation(summary = "Update a tenant's name/status (slug is immutable)")
  @ApiResponse(responseCode = "200", description = "OK")
  @ApiResponse(
      responseCode = "400",
      description = "Validation failed",
      content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
  @ApiResponse(
      responseCode = "404",
      description = "Tenant not found",
      content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
  public TenantResponse update(
      @PathVariable UUID tenantId, @Valid @RequestBody TenantUpdateRequest request) {
    return TenantResponse.from(tenantService.update(tenantId, request));
  }

  @DeleteMapping("/{tenantId}")
  @Operation(summary = "Delete a tenant")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(
      responseCode = "404",
      description = "Tenant not found",
      content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
  public ResponseEntity<Void> delete(@PathVariable UUID tenantId) {
    tenantService.delete(tenantId);
    return ResponseEntity.noContent().build();
  }
}
