package com.chatplatform.authservice.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// proxyBeanMethods = false: same rationale as the other services' OpenApiConfig -
// no @Bean-to-@Bean calls, so no CGLIB subclassing needed.
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

  @Bean
  public OpenAPI authserviceOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Authservice API")
                .description(
                    "User management for the platform OAuth2 authorization server. The"
                        + " OAuth2/OIDC protocol endpoints (/oauth2/*, /.well-known/*) are"
                        + " standard and not part of this contract.")
                .version("v1"));
  }
}
