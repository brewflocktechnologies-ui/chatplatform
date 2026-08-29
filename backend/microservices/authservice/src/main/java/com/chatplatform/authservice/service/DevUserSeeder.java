package com.chatplatform.authservice.service;

import com.chatplatform.authservice.config.ClientConfig;
import com.chatplatform.authservice.dto.UserRequest;
import com.chatplatform.authservice.repository.UserRepository;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Dev-profile-only seed so the authorization-code flow is testable in a browser with zero setup:
 * log in as admin@local / admin on the built-in login page. Never active outside dev.
 */
@Component
@Profile("dev")
public class DevUserSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DevUserSeeder.class);

  static final String DEV_ADMIN_EMAIL = "admin@local";

  private final UserRepository userRepository;
  private final UserService userService;

  public DevUserSeeder(UserRepository userRepository, UserService userService) {
    this.userRepository = userRepository;
    this.userService = userService;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (userRepository.existsByEmail(DEV_ADMIN_EMAIL)) {
      return;
    }
    userService.create(
        new UserRequest(
            DEV_ADMIN_EMAIL, "admin-dev-password", ClientConfig.DEV_TENANT_ID, Set.of("ADMIN")));
    log.info("Seeded dev admin user {} (dev profile only)", DEV_ADMIN_EMAIL);
  }
}
