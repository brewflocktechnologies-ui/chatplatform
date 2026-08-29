package com.chatplatform.authservice;

import static org.assertj.core.api.Assertions.assertThat;

import com.chatplatform.authservice.config.ClientConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/**
 * Full-stack tests against a live server (random port) on H2: token issuance with the platform
 * claims, JWKS/discovery, and the admin-token-protected user-management API. Runs with the dev
 * profile so the seeded dev-cli client and admin user are exercised too.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@ActiveProfiles({"dev", "test"})
class AuthorizationServerIntegrationTest {

  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Autowired private TestRestTemplate restTemplate;

  private String fetchToken(String scope) throws Exception {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    headers.setBasicAuth("dev-cli", "dev-secret");
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");
    form.add("scope", scope);
    ResponseEntity<String> response =
        restTemplate.postForEntity("/oauth2/token", new HttpEntity<>(form, headers), String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    return MAPPER.readTree(response.getBody()).get("access_token").asText();
  }

  private JsonNode decodePayload(String jwt) throws Exception {
    String payload = jwt.split("\\.")[1];
    return MAPPER.readTree(Base64.getUrlDecoder().decode(payload));
  }

  @Test
  void clientCredentialsTokenCarriesPlatformClaims() throws Exception {
    String token = fetchToken("chat.read chat.write");
    JsonNode claims = decodePayload(token);

    assertThat(claims.get("iss").asText()).isEqualTo("http://localhost:8110");
    assertThat(claims.get("tenant_id").asText()).isEqualTo(ClientConfig.DEV_TENANT_ID);
    assertThat(claims.get("scope").toString()).contains("chat.read");
    assertThat(claims.has("roles")).isTrue();
  }

  @Test
  void wrongClientSecretIsRejected() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
    headers.setBasicAuth("dev-cli", "wrong-secret");
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("grant_type", "client_credentials");
    ResponseEntity<String> response =
        restTemplate.postForEntity("/oauth2/token", new HttpEntity<>(form, headers), String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void jwksPublishesPersistedKey() throws Exception {
    ResponseEntity<String> response = restTemplate.getForEntity("/oauth2/jwks", String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode keys = MAPPER.readTree(response.getBody()).get("keys");
    assertThat(keys.size()).isGreaterThanOrEqualTo(1);
    assertThat(keys.get(0).get("kid").asText()).isNotBlank();
    assertThat(keys.get(0).get("kty").asText()).isEqualTo("RSA");
  }

  @Test
  void discoveryDocumentAdvertisesIssuer() throws Exception {
    ResponseEntity<String> response =
        restTemplate.getForEntity("/.well-known/openid-configuration", String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    JsonNode body = MAPPER.readTree(response.getBody());
    assertThat(body.get("issuer").asText()).isEqualTo("http://localhost:8110");
    assertThat(body.get("token_endpoint").asText()).endsWith("/oauth2/token");
  }

  @Test
  void loginPageIsPublic() {
    ResponseEntity<String> response = restTemplate.getForEntity("/login", String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
  }

  @Test
  void userApiRequiresToken() {
    ResponseEntity<String> response =
        restTemplate.postForEntity(
            "/api/v1/users", new HttpEntity<>(Map.of(), jsonHeaders(null)), String.class);
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
  }

  @Test
  void userLifecycleWithAdminToken() throws Exception {
    String token = fetchToken("users.admin");

    Map<String, Object> createBody =
        Map.of(
            "email",
            "agent1@chatplatform.local",
            "password",
            "agent1-password",
            "tenantId",
            ClientConfig.DEV_TENANT_ID,
            "roles",
            java.util.List.of("AGENT"));
    ResponseEntity<String> created =
        restTemplate.postForEntity(
            "/api/v1/users", new HttpEntity<>(createBody, jsonHeaders(token)), String.class);
    assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    JsonNode createdJson = MAPPER.readTree(created.getBody());
    String userId = createdJson.get("id").asText();
    assertThat(createdJson.get("roles").get(0).asText()).isEqualTo("AGENT");

    ResponseEntity<String> fetched =
        restTemplate.exchange(
            "/api/v1/users/" + userId,
            HttpMethod.GET,
            new HttpEntity<>(jsonHeaders(token)),
            String.class);
    assertThat(fetched.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(MAPPER.readTree(fetched.getBody()).get("email").asText())
        .isEqualTo("agent1@chatplatform.local");

    ResponseEntity<String> updated =
        restTemplate.exchange(
            "/api/v1/users/" + userId + "/roles",
            HttpMethod.PUT,
            new HttpEntity<>(
                Map.of("roles", java.util.List.of("ADMIN", "AGENT")), jsonHeaders(token)),
            String.class);
    assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(MAPPER.readTree(updated.getBody()).get("roles").size()).isEqualTo(2);

    // Duplicate email -> RFC 7807 conflict.
    ResponseEntity<String> conflict =
        restTemplate.postForEntity(
            "/api/v1/users", new HttpEntity<>(createBody, jsonHeaders(token)), String.class);
    assertThat(conflict.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

    // Unknown id -> 404.
    ResponseEntity<String> missing =
        restTemplate.exchange(
            "/api/v1/users/does-not-exist",
            HttpMethod.GET,
            new HttpEntity<>(jsonHeaders(token)),
            String.class);
    assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

    // Invalid body -> 400 with fieldErrors.
    ResponseEntity<String> invalid =
        restTemplate.postForEntity(
            "/api/v1/users",
            new HttpEntity<>(Map.of("email", "not-an-email"), jsonHeaders(token)),
            String.class);
    assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(invalid.getBody()).contains("fieldErrors");
  }

  private static HttpHeaders jsonHeaders(String bearer) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    if (bearer != null) {
      headers.setBearerAuth(bearer);
    }
    return headers;
  }
}
