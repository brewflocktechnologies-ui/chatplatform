package com.chatplatform.accountservice.repository;

import com.chatplatform.accountservice.entity.Tenant;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface TenantRepository extends ReactiveCrudRepository<Tenant, UUID> {

  Mono<Boolean> existsBySlug(String slug);

  Mono<Tenant> findBySlug(String slug);

  Flux<Tenant> findAllBy(Pageable pageable);
}
