package com.chatplatform.chatservice.contract;

import static org.assertj.core.api.Assertions.assertThat;

import au.com.dius.pact.consumer.MockServer;
import au.com.dius.pact.consumer.dsl.LambdaDsl;
import au.com.dius.pact.consumer.dsl.PactBuilder;
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt;
import au.com.dius.pact.consumer.junit5.PactTestFor;
import au.com.dius.pact.core.model.V4Pact;
import au.com.dius.pact.core.model.annotations.Pact;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

/**
 * Consumer-side of the Tenant contract, from chatdashboard's perspective. There's no separate
 * consumer service/repo yet (frontend/chatdashboard is unscaffolded), so this stands in for it:
 * it's the same role a real consumer's test suite would play, just living in this module for now.
 * Generates target/pacts/chatdashboard-chatservice.json, verified for real against a live
 * chatservice by TenantPactProviderVerificationIT.
 *
 * <p>Fixed UUIDs (not generated) so the provider's {@code @State} setup can create a row with the
 * exact id these interactions reference - no Pact generators/provider-state-injection needed for
 * that.
 */
@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "chatservice")
class TenantPactConsumerTest {

  private static final String KNOWN_TENANT_ID = "11111111-1111-1111-1111-111111111111";
  private static final String MISSING_TENANT_ID = "22222222-2222-2222-2222-222222222222";
  private static final String EXISTING_TENANT_STATE =
      "a tenant with id " + KNOWN_TENANT_ID + " exists";

  @Pact(consumer = "chatdashboard")
  V4Pact createTenant(PactBuilder builder) {
    return builder
        .given("no tenant with slug acme-corp exists")
        .expectsToReceiveHttpInteraction(
            "a request to create a tenant",
            interaction ->
                interaction
                    .withRequest(
                        request ->
                            request
                                .method("POST")
                                .path("/api/v1/tenants")
                                .header("Content-Type", "application/json")
                                .body("{\"slug\":\"acme-corp\",\"name\":\"Acme Corp\"}"))
                    .willRespondWith(
                        response ->
                            response
                                .status(201)
                                .header("Content-Type", "application/json")
                                .body(
                                    LambdaDsl.newJsonBody(
                                            body -> {
                                              body.uuid("tenantId");
                                              body.stringType("slug", "acme-corp");
                                              body.stringType("name", "Acme Corp");
                                              body.stringMatcher(
                                                  "status", "ACTIVE|SUSPENDED", "ACTIVE");
                                              body.stringType("createdAt");
                                              body.stringType("updatedAt");
                                              body.stringType("createdBy", "system");
                                              body.stringType("updatedBy", "system");
                                              body.numberType("version", 0);
                                            })
                                        .build())))
        .toPact();
  }

  @Test
  @PactTestFor(pactMethod = "createTenant")
  void createsTenant(MockServer mockServer) throws IOException, InterruptedException {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(mockServer.getUrl() + "/api/v1/tenants"))
            .header("Content-Type", "application/json")
            .POST(
                HttpRequest.BodyPublishers.ofString(
                    "{\"slug\":\"acme-corp\",\"name\":\"Acme Corp\"}"))
            .build();
    HttpResponse<String> response =
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(201);
  }

  @Pact(consumer = "chatdashboard")
  V4Pact getTenant(PactBuilder builder) {
    return builder
        .given(EXISTING_TENANT_STATE)
        .expectsToReceiveHttpInteraction(
            "a request for an existing tenant",
            interaction ->
                interaction
                    .withRequest(
                        request -> request.method("GET").path("/api/v1/tenants/" + KNOWN_TENANT_ID))
                    .willRespondWith(
                        response ->
                            response
                                .status(200)
                                .header("Content-Type", "application/json")
                                .body(
                                    LambdaDsl.newJsonBody(
                                            body -> {
                                              body.uuid("tenantId");
                                              body.stringType("slug");
                                              body.stringType("name");
                                              body.stringMatcher(
                                                  "status", "ACTIVE|SUSPENDED", "ACTIVE");
                                              body.stringType("createdAt");
                                              body.stringType("updatedAt");
                                              body.stringType("createdBy", "system");
                                              body.stringType("updatedBy", "system");
                                              body.numberType("version");
                                            })
                                        .build())))
        .toPact();
  }

  @Test
  @PactTestFor(pactMethod = "getTenant")
  void getsExistingTenant(MockServer mockServer) throws IOException, InterruptedException {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(mockServer.getUrl() + "/api/v1/tenants/" + KNOWN_TENANT_ID))
            .GET()
            .build();
    HttpResponse<String> response =
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(200);
  }

  @Pact(consumer = "chatdashboard")
  V4Pact getMissingTenant(PactBuilder builder) {
    return builder
        .expectsToReceiveHttpInteraction(
            "a request for a tenant that does not exist",
            interaction ->
                interaction
                    .withRequest(
                        request ->
                            request.method("GET").path("/api/v1/tenants/" + MISSING_TENANT_ID))
                    .willRespondWith(
                        response ->
                            response
                                .status(404)
                                .header("Content-Type", "application/problem+json")
                                .body(
                                    LambdaDsl.newJsonBody(body -> body.numberType("status", 404))
                                        .build())))
        .toPact();
  }

  @Test
  @PactTestFor(pactMethod = "getMissingTenant")
  void getMissingTenantReturns404(MockServer mockServer) throws IOException, InterruptedException {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(mockServer.getUrl() + "/api/v1/tenants/" + MISSING_TENANT_ID))
            .GET()
            .build();
    HttpResponse<String> response =
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(404);
  }

  @Pact(consumer = "chatdashboard")
  V4Pact updateTenant(PactBuilder builder) {
    return builder
        .given(EXISTING_TENANT_STATE)
        .expectsToReceiveHttpInteraction(
            "a request to update a tenant",
            interaction ->
                interaction
                    .withRequest(
                        request ->
                            request
                                .method("PUT")
                                .path("/api/v1/tenants/" + KNOWN_TENANT_ID)
                                .header("Content-Type", "application/json")
                                .body("{\"name\":\"Acme Corp Renamed\",\"status\":\"SUSPENDED\"}"))
                    .willRespondWith(
                        response ->
                            response
                                .status(200)
                                .header("Content-Type", "application/json")
                                .body(
                                    LambdaDsl.newJsonBody(
                                            body -> {
                                              body.uuid("tenantId");
                                              body.stringType("slug");
                                              body.stringType("name", "Acme Corp Renamed");
                                              body.stringMatcher(
                                                  "status", "ACTIVE|SUSPENDED", "SUSPENDED");
                                              body.stringType("createdAt");
                                              body.stringType("updatedAt");
                                              body.stringType("createdBy", "system");
                                              body.stringType("updatedBy", "system");
                                              body.numberType("version");
                                            })
                                        .build())))
        .toPact();
  }

  @Test
  @PactTestFor(pactMethod = "updateTenant")
  void updatesTenant(MockServer mockServer) throws IOException, InterruptedException {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(mockServer.getUrl() + "/api/v1/tenants/" + KNOWN_TENANT_ID))
            .header("Content-Type", "application/json")
            .PUT(
                HttpRequest.BodyPublishers.ofString(
                    "{\"name\":\"Acme Corp Renamed\",\"status\":\"SUSPENDED\"}"))
            .build();
    HttpResponse<String> response =
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(200);
  }

  @Pact(consumer = "chatdashboard")
  V4Pact deleteTenant(PactBuilder builder) {
    return builder
        .given(EXISTING_TENANT_STATE)
        .expectsToReceiveHttpInteraction(
            "a request to delete a tenant",
            interaction ->
                interaction
                    .withRequest(
                        request ->
                            request.method("DELETE").path("/api/v1/tenants/" + KNOWN_TENANT_ID))
                    .willRespondWith(response -> response.status(204)))
        .toPact();
  }

  @Test
  @PactTestFor(pactMethod = "deleteTenant")
  void deletesTenant(MockServer mockServer) throws IOException, InterruptedException {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(mockServer.getUrl() + "/api/v1/tenants/" + KNOWN_TENANT_ID))
            .DELETE()
            .build();
    HttpResponse<String> response =
        HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
    assertThat(response.statusCode()).isEqualTo(204);
  }
}
