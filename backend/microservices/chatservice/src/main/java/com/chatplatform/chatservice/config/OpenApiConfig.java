package com.chatplatform.chatservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// proxyBeanMethods = false: this @Bean method never calls another @Bean method
// on this class, so it doesn't need CGLIB subclassing to preserve singleton
// semantics between them - lite mode, and no CGLIB-injected fields either.
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

  @Bean
  public OpenAPI chatserviceOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Chatservice API")
                .description("Tenant management for the chat platform")
                .version("v1"));
  }
}
