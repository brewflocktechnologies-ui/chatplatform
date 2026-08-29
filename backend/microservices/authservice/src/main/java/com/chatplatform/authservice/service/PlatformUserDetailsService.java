package com.chatplatform.authservice.service;

import com.chatplatform.authservice.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Bridges the users table into Spring Security's form-login for the authorization-code flow. */
@Service
public class PlatformUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  public PlatformUserDetailsService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  public UserDetails loadUserByUsername(String username) {
    return userRepository
        .findByEmail(username)
        .orElseThrow(() -> new UsernameNotFoundException("No user with email " + username));
  }
}
