package com.chatplatform.authservice.service;

import com.chatplatform.authservice.dto.UserRequest;
import com.chatplatform.authservice.entity.PlatformUser;
import com.chatplatform.authservice.exception.EmailConflictException;
import com.chatplatform.authservice.exception.UserNotFoundException;
import com.chatplatform.authservice.repository.UserRepository;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public PlatformUser create(UserRequest request) {
    if (userRepository.existsByEmail(request.email())) {
      throw new EmailConflictException(request.email());
    }
    PlatformUser user =
        new PlatformUser(
            UUID.randomUUID().toString(),
            request.email(),
            passwordEncoder.encode(request.password()),
            request.tenantId(),
            Set.copyOf(request.roles()),
            true,
            Instant.now());
    userRepository.save(user);
    return user;
  }

  public PlatformUser getById(String id) {
    return userRepository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
  }

  public PlatformUser assignRoles(String id, Set<String> roles) {
    PlatformUser user = getById(id);
    userRepository.replaceRoles(id, roles);
    return new PlatformUser(
        user.id(),
        user.email(),
        user.passwordHash(),
        user.tenantId(),
        Set.copyOf(roles),
        user.enabled(),
        user.createdAt());
  }
}
