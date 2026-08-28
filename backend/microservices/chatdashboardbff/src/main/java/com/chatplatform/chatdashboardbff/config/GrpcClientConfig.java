package com.chatplatform.chatdashboardbff.config;

import com.chatplatform.accountservice.grpc.TenantServiceGrpc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.grpc.client.GrpcChannelFactory;

/**
 * Wires the async (StreamObserver-based) stub — the reactive-friendly flavor: non-blocking, bridged
 * to Mono in TenantGrpcClient. The blocking stub would defeat the whole WebFlux stack by parking
 * event-loop threads on network calls. Channel target comes from
 * spring.grpc.client.channel.accountservice.target in application.yaml.
 */
@Configuration(proxyBeanMethods = false)
public class GrpcClientConfig {

  @Bean
  TenantServiceGrpc.TenantServiceStub tenantServiceStub(GrpcChannelFactory channels) {
    return TenantServiceGrpc.newStub(channels.createChannel("accountservice"));
  }
}
