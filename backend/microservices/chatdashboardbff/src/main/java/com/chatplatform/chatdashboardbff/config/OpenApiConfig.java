package com.chatplatform.chatdashboardbff.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// proxyBeanMethods = false: same rationale as chatservice's OpenApiConfig -
// no @Bean-to-@Bean calls, so no CGLIB subclassing needed.
@Configuration(proxyBeanMethods = false)
public class OpenApiConfig {

  @Bean
  public OpenAPI chatdashboardbffOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Chatdashboard BFF API")
                .description(
                    "REST facade for the chat dashboard, backed by accountservice's gRPC API")
                .version("v1"));
  }
}
