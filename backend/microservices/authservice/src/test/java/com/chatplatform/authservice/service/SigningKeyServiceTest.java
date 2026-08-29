package com.chatplatform.authservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.chatplatform.authservice.entity.SigningKey;
import com.chatplatform.authservice.repository.SigningKeyRepository;
import com.nimbusds.jose.jwk.RSAKey;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SigningKeyServiceTest {

  @Mock private SigningKeyRepository repository;
  @InjectMocks private SigningKeyService service;

  @Test
  void generatesAndPersistsWhenNoKeysExist() {
    when(repository.findActiveKeys()).thenReturn(List.of());

    List<RSAKey> keys = service.loadOrCreateKeys();

    assertThat(keys).hasSize(1);
    assertThat(keys.getFirst().getKeyID()).isNotBlank();
    assertThat(keys.getFirst().isPrivate()).isTrue();
    verify(repository).save(any(SigningKey.class));
  }

  @Test
  void reusesPersistedKeysWithoutGenerating() {
    SigningKey persisted = service.generateKey();
    when(repository.findActiveKeys()).thenReturn(List.of(persisted));

    List<RSAKey> keys = service.loadOrCreateKeys();

    assertThat(keys).hasSize(1);
    assertThat(keys.getFirst().getKeyID()).isEqualTo(persisted.id());
    verify(repository, never()).save(any());
  }

  @Test
  void pemRoundTripPreservesTheKeyPair() {
    SigningKey generated = service.generateKey();

    RSAKey rsaKey = service.toRsaKey(generated);

    assertThat(rsaKey.getKeyID()).isEqualTo(generated.id());
    assertThat(rsaKey.isPrivate()).isTrue();
    assertThat(generated.privateKeyPem()).startsWith("-----BEGIN PRIVATE KEY-----");
    assertThat(generated.publicKeyPem()).startsWith("-----BEGIN PUBLIC KEY-----");
    assertThat(generated.retired()).isFalse();
  }

  @Test
  void invalidPersistedPemFailsFast() {
    SigningKey corrupt =
        new SigningKey(
            "corrupt",
            "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----",
            "-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----",
            Instant.now(),
            false);

    assertThatThrownBy(() -> service.toRsaKey(corrupt))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("corrupt");
  }
}
