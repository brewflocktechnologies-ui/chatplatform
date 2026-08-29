package com.chatplatform.authservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.chatplatform.authservice.entity.PlatformUser;
import com.chatplatform.authservice.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class PlatformUserDetailsServiceTest {

  @Mock private UserRepository userRepository;
  @InjectMocks private PlatformUserDetailsService service;

  @Test
  void loadsUserWithRoleAuthorities() {
    PlatformUser user =
        new PlatformUser(
            "u1", "a@b.io", "{bcrypt}hash", "t1", Set.of("ADMIN"), true, Instant.EPOCH);
    when(userRepository.findByEmail("a@b.io")).thenReturn(Optional.of(user));

    UserDetails details = service.loadUserByUsername("a@b.io");

    assertThat(details.getUsername()).isEqualTo("a@b.io");
    assertThat(details.getPassword()).isEqualTo("{bcrypt}hash");
    assertThat(details.getAuthorities())
        .extracting(a -> a.getAuthority())
        .containsExactly("ROLE_ADMIN");
    assertThat(details.isEnabled()).isTrue();
  }

  @Test
  void unknownEmailThrows() {
    when(userRepository.findByEmail("nobody@b.io")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.loadUserByUsername("nobody@b.io"))
        .isInstanceOf(UsernameNotFoundException.class);
  }
}
