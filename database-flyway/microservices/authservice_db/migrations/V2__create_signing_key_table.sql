-- Persisted RSA signing keys (PKCS#8/X.509 PEM). The newest non-retired row
-- signs new tokens; all non-retired rows stay published in the JWKS so tokens
-- signed before a rotation keep validating. Rotation runbook: INSERT a new
-- row, wait out the max token TTL, then UPDATE retired = true on the old row.

CREATE TABLE auth_signing_key (
    id              varchar(64)  NOT NULL,
    private_key_pem text         NOT NULL,
    public_key_pem  text         NOT NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    retired         boolean      NOT NULL DEFAULT false,
    CONSTRAINT auth_signing_key_pk PRIMARY KEY (id)
);

COMMENT ON TABLE auth_signing_key IS
    'RSA keypairs for JWT signing. Newest non-retired row is the active signer.';
