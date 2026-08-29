-- Platform users and their roles. tenant_id aligns with the tenant table in
-- the public schema (chatservice/accountservice) but is deliberately NOT a
-- cross-schema FK - the auth schema stays self-contained.

CREATE TABLE users (
    id            varchar(64)  NOT NULL,
    email         text         NOT NULL,
    password_hash text         NOT NULL,
    tenant_id     varchar(64)  NOT NULL,
    enabled       boolean      NOT NULL DEFAULT true,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT users_pk PRIMARY KEY (id),
    CONSTRAINT users_email_format CHECK (position('@' in email) > 1)
);

CREATE UNIQUE INDEX users_email_uk ON users (lower(email));

CREATE TABLE user_roles (
    user_id varchar(64) NOT NULL,
    role    text        NOT NULL,
    CONSTRAINT user_roles_pk PRIMARY KEY (user_id, role),
    CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT user_roles_role_valid CHECK (role IN ('ADMIN', 'AGENT', 'VIEWER'))
);
