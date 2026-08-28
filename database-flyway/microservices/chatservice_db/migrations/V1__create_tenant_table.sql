CREATE TABLE tenant (
                        tenant_id  uuid        NOT NULL,
                        slug       text        NOT NULL,
                        name       text        NOT NULL,
                        status     text        NOT NULL,
                        created_at timestamptz NOT NULL,
                        updated_at timestamptz NOT NULL,
                        version    bigint      NOT NULL DEFAULT 0,
                        created_by text        NOT NULL DEFAULT 'system',
                        updated_by text        NOT NULL DEFAULT 'system',
                        CONSTRAINT tenant_pk PRIMARY KEY (tenant_id),
                        CONSTRAINT tenant_slug_format CHECK (slug ~ '^[a-z0-9-]{3,32}$'),
    CONSTRAINT tenant_status_valid CHECK (status IN ('ACTIVE', 'SUSPENDED'))
);

CREATE UNIQUE INDEX tenant_slug_uk ON tenant (slug);

COMMENT ON TABLE tenant IS
    'Tenancy root (logical model §4.1). RLS keys on tenant_id = tenant_id (self).';