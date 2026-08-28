package com.chatplatform.chatservice.contract;

import au.com.dius.pact.provider.junit5.HttpTestTarget;
import au.com.dius.pact.provider.junit5.PactVerificationContext;
import au.com.dius.pact.provider.junit5.PactVerificationInvocationContextProvider;
import au.com.dius.pact.provider.junitsupport.Provider;
import au.com.dius.pact.provider.junitsupport.State;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import com.chatplatform.chatservice.entity.Tenant;
import com.chatplatform.chatservice.entity.TenantStatus;
import com.chatplatform.chatservice.repository.TenantRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Provider side: replays every interaction in target/pacts/ against a real, fully-booted
 * chatservice (real DB, real Postgres) and fails if a response doesn't match what
 * TenantPactConsumerTest promised. An *IT (not *Test) class name so Failsafe, not Surefire, runs it
 * - strictly in the integration-test/verify phases, after Surefire's test phase has already
 * generated the pact file this reads. Needs chatplatform-postgres up, same as
 * ChatserviceApplicationTests.
 */
@Provider("chatservice")
@PactFolder("target/pacts")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TenantPactProviderVerificationIT {

  private static final UUID KNOWN_TENANT_ID =
      UUID.fromString("11111111-1111-1111-1111-111111111111");

  @LocalServerPort private int port;

  @Autowired private TenantRepository tenantRepository;

  @BeforeEach
  void setTarget(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", port));
  }

  @State("no tenant with slug acme-corp exists")
  void noTenantWithSlugAcmeCorp() {
    tenantRepository.findBySlug("acme-corp").ifPresent(tenantRepository::delete);
  }

  @State("a tenant with id 11111111-1111-1111-1111-111111111111 exists")
  void tenantWithKnownIdExists() {
    // Not deleteById: throws EmptyResultDataAccessException if the row isn't
    // there yet (the common case, first run) - this needs to be idempotent.
    tenantRepository.findById(KNOWN_TENANT_ID).ifPresent(tenantRepository::delete);
    OffsetDateTime now = OffsetDateTime.now();
    tenantRepository.save(
        new Tenant(
            KNOWN_TENANT_ID,
            "known-tenant",
            "Known Tenant",
            TenantStatus.ACTIVE,
            now,
            now,
            "system",
            "system"));
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void pactVerificationTestTemplate(PactVerificationContext context) {
    context.verifyInteraction();
  }
}
