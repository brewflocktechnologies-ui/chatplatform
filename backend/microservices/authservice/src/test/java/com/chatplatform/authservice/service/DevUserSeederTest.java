package com.chatplatform.authservice.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chatplatform.authservice.dto.UserRequest;
import com.chatplatform.authservice.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DevUserSeederTest {

  @Mock private UserRepository userRepository;
  @Mock private UserService userService;
  @InjectMocks private DevUserSeeder seeder;

  @Test
  void seedsAdminWhenAbsent() {
    when(userRepository.existsByEmail(DevUserSeeder.DEV_ADMIN_EMAIL)).thenReturn(false);

    seeder.run(null);

    verify(userService).create(any(UserRequest.class));
  }

  @Test
  void skipsWhenAdminAlreadyExists() {
    when(userRepository.existsByEmail(DevUserSeeder.DEV_ADMIN_EMAIL)).thenReturn(true);

    seeder.run(null);

    verify(userService, never()).create(any());
  }
}
