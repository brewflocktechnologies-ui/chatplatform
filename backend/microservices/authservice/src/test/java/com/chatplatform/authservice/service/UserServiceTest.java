package com.chatplatform.authservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chatplatform.authservice.dto.UserRequest;
import com.chatplatform.authservice.entity.PlatformUser;
import com.chatplatform.authservice.exception.EmailConflictException;
import com.chatplatform.authservice.exception.UserNotFoundException;
import com.chatplatform.authservice.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @InjectMocks private UserService userService;

  private static PlatformUser existingUser() {
    return new PlatformUser(
        "u1", "a@b.io", "{bcrypt}hash", "t1", Set.of("VIEWER"), true, Instant.EPOCH);
  }

  @Test
  void createHashesPasswordAndSaves() {
    when(userRepository.existsByEmail("a@b.io")).thenReturn(false);
    when(passwordEncoder.encode("password123")).thenReturn("{bcrypt}encoded");

    PlatformUser created =
        userService.create(new UserRequest("a@b.io", "password123", "t1", Set.of("AGENT")));

    assertThat(created.passwordHash()).isEqualTo("{bcrypt}encoded");
    assertThat(created.tenantId()).isEqualTo("t1");
    assertThat(created.roles()).containsExactly("AGENT");
    assertThat(created.enabled()).isTrue();
    verify(userRepository).save(created);
  }

  @Test
  void createRejectsDuplicateEmail() {
    when(userRepository.existsByEmail("a@b.io")).thenReturn(true);

    assertThatThrownBy(
            () ->
                userService.create(new UserRequest("a@b.io", "password123", "t1", Set.of("AGENT"))))
        .isInstanceOf(EmailConflictException.class);
    verify(userRepository, never()).save(any());
  }

  @Test
  void getByIdThrowsWhenMissing() {
    when(userRepository.findById("missing")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.getById("missing"))
        .isInstanceOf(UserNotFoundException.class);
  }

  @Test
  void assignRolesReplacesAndReturnsUpdatedUser() {
    when(userRepository.findById("u1")).thenReturn(Optional.of(existingUser()));

    PlatformUser updated = userService.assignRoles("u1", Set.of("ADMIN", "AGENT"));

    verify(userRepository).replaceRoles("u1", Set.of("ADMIN", "AGENT"));
    assertThat(updated.sortedRoles()).containsExactly("ADMIN", "AGENT");
    assertThat(updated.email()).isEqualTo("a@b.io");
  }
}
