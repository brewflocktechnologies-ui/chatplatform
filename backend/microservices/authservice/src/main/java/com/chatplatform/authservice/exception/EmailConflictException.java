package com.chatplatform.authservice.exception;

public class EmailConflictException extends RuntimeException {

  public EmailConflictException(String email) {
    super("A user with email " + email + " already exists");
  }
}
