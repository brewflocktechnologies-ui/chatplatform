package com.chatplatform.authservice.controller;

import com.chatplatform.authservice.dto.RoleAssignmentRequest;
import com.chatplatform.authservice.dto.UserRequest;
import com.chatplatform.authservice.dto.UserResponse;
import com.chatplatform.authservice.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Minimal user management. Locked to ROLE_ADMIN tokens or clients with the users.admin scope by the
 * default security chain — this service is a resource server of its own tokens.
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users", description = "Platform user management (admin only)")
public class UserController {

  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  public UserResponse create(@Valid @RequestBody UserRequest request) {
    return UserResponse.from(userService.create(request));
  }

  @GetMapping("/{id}")
  public UserResponse get(@PathVariable String id) {
    return UserResponse.from(userService.getById(id));
  }

  @PutMapping(value = "/{id}/roles", consumes = MediaType.APPLICATION_JSON_VALUE)
  public UserResponse assignRoles(
      @PathVariable String id, @Valid @RequestBody RoleAssignmentRequest request) {
    return UserResponse.from(userService.assignRoles(id, request.roles()));
  }
}
