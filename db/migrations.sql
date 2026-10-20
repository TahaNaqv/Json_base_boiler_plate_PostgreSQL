-- Starter v0.1 schema — PostgreSQL. Forward-only, idempotent.
-- Apply with: psql -U <user> -d <db> -f db/migrations.sql

-- ----------------------------------------------------------------------
-- ENUM types
-- ----------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE attempt_status AS ENUM ('SUCCESS', 'FAILURE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE email_status AS ENUM ('sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    role_name   VARCHAR(64)  NOT NULL,
    extra_data  JSONB        NULL DEFAULT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    deleted_at  TIMESTAMPTZ  NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_name ON roles (role_name);

INSERT INTO roles (id, role_name, extra_data, created_at, updated_at) VALUES
    (1, 'admin', '{"description":"Full administrator","permissions":["users.manage","roles.manage","settings.write"]}'::jsonb, NOW(), NOW()),
    (2, 'user',  '{"description":"Default end user","permissions":["users.self.read","users.self.update"]}'::jsonb,          NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    role_id     INT          NOT NULL DEFAULT 2,
    email       VARCHAR(128) NOT NULL,
    "passWord"  VARCHAR(128) NULL,
    status      user_status  NOT NULL DEFAULT 'pending',
    extra_data  JSONB        NULL DEFAULT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    deleted_at  TIMESTAMPTZ  NULL,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role_id);

-- ----------------------------------------------------------------------
-- authorizations
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS authorizations (
    id                  BIGSERIAL   PRIMARY KEY,
    user_id             BIGINT      NOT NULL,
    refresh_token_hash  CHAR(64)    NULL,
    extra_data          JSONB       NULL DEFAULT NULL,
    created_at          TIMESTAMPTZ NOT NULL,
    updated_at          TIMESTAMPTZ NOT NULL,
    deleted_at          TIMESTAMPTZ NULL,
    CONSTRAINT fk_auth_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_user ON authorizations (user_id);

-- ----------------------------------------------------------------------
-- login_attempts
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
    id              BIGSERIAL      PRIMARY KEY,
    email           VARCHAR(128)   NULL,
    attempt_status  attempt_status NOT NULL,
    extra_data      JSONB          NULL DEFAULT NULL,
    created_at      TIMESTAMPTZ    NOT NULL,
    updated_at      TIMESTAMPTZ    NOT NULL,
    deleted_at      TIMESTAMPTZ    NULL
);

CREATE INDEX IF NOT EXISTS idx_login_email_time ON login_attempts (email, created_at);

-- ----------------------------------------------------------------------
-- otp_verifications
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_verifications (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL,
    otp         INT         NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    extra_data  JSONB       NULL DEFAULT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    deleted_at  TIMESTAMPTZ NULL,
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_verifications (user_id, verified, expires_at);

-- ----------------------------------------------------------------------
-- sent_email_logs
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sent_email_logs (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NULL,
    status      email_status NOT NULL,
    extra_data  JSONB        NULL DEFAULT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    deleted_at  TIMESTAMPTZ  NULL,
    CONSTRAINT fk_email_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_user_time ON sent_email_logs (user_id, created_at);
