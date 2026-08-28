package com.chatplatform.chatservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;
import org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode;

// PageSerializationMode.VIA_DTO: serialize Page<T> as Spring's PagedModel
// (stable content + page{size,number,totalElements,totalPages}) instead of
// Page's own internal shape, which Spring Data explicitly warns isn't a
// supported wire format.
@EnableSpringDataWebSupport(pageSerializationMode = PageSerializationMode.VIA_DTO)
@SpringBootApplication
public class ChatserviceApplication {

  public static void main(String[] args) {
    SpringApplication.run(ChatserviceApplication.class, args);
  }
}
