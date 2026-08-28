package com.chatplatform.chatservice.repository;

import com.chatplatform.chatservice.entity.Tenant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

  boolean existsBySlug(String slug);

  Optional<Tenant> findBySlug(String slug);
}
