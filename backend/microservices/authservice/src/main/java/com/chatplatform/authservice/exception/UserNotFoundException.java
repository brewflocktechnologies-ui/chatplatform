package com.chatplatform.authservice.exception;

public class UserNotFoundException extends RuntimeException {

  public UserNotFoundException(String id) {
    super("No user with id " + id);
  }
}
