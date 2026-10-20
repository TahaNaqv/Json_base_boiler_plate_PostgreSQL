# Security

A practical, honest summary of what this scaffold does well and what should be hardened before production. Read this before every release.

## Posture

- **Transport auth**: JWT (HS256) for access; opaque refresh string with server-side hash + rotation.
- **Server-side revocation**: every session has a row in `authorizations`. Logout = delete the row. Compromised session = delete the row.
- **Password storage**: bcrypt (`bcryptjs`, via model hooks) for `users.passWord`.
- **Rate limiting**: `express-rate-limit` is mounted globally (30 requests / second / IP; tune per route in production).
- **CORS**: explicit allow-list via `ALLOWED_ORIGINS` env var; no wildcard.
- **Headers**: `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'self'` set in `middleware/allowed_methods.js`.
- **Method allow-list**: only `POST`, `GET`, `OPTIONS` — anything else returns 405.
- **Soft delete by default**: `paranoid: true` everywhere; deletes set `deleted_at` instead of removing rows.

## Secrets

| Var | Purpose | Rotation |
| --- | --- | --- |
| `JWT_SECRET` | signs JWTs (access + refresh) | rotate when leaked, when staff with access leaves, or every 6 months. Rotation invalidates all live tokens. To rotate without forcing logout, support an old + new secret window in `auth.js` for one access TTL. |
| `DATABASE_PASS` | MySQL connection | rotate per company password policy. |
| `SMTP_PASSWORD` | future mailer (not wired in v0.1) | rotate when the mail account changes. |
| `SESSION_SECRET` (n/a) | not used. JWT replaces session cookies in this scaffold. | — |

Storage:

- Local dev: `.env` (git-ignored).
- Staging / prod: secrets manager (AWS SM, Vault, Doppler, etc), injected at boot. Never in `.env` in a deployed image.

`JWT_SECRET` minimum length: **32 random characters**. The boot fail-fasts if shorter — this is intentional. Use:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Known weak spots (TODO list)

### 1. Migrating users from a legacy SHA-1 database

The **McKinsey base** project used SHA-1. This starter **does not**; new installs store bcrypt only.

If you need to import rows from a legacy system:

1. Keep `bcrypt` + store `passwordAlg` in `users.extra_data` (`'bcrypt'`, `'sha1'`, or `'migrated'`).
2. In `login`, if `passwordAlg` is `sha1`, verify with the legacy `crypto.createHash('sha1')` and then re-hash to bcrypt and flip `passwordAlg` to `bcrypt`.
3. After a cutover window, drop SHA-1 verification and force password reset for stragglers.

### 2. Custom token format → JWT (DONE in v0.1)

Replaced the source codebase's 5-part custom token. JWT is the standard and integrates with audit/SSO tooling.

### 3. No env validation

Status: partial. Boot checks `JWT_SECRET` and `ALLOWED_ORIGINS` only.

Plan: add `zod` (or `joi`) at the top of `app.js` with the full schema; fail-fast on any missing/malformed var.

### 4. No request body size limit per route

Status: a global `50mb` limit is set on JSON parsing. Some routes (login) only need a few KB.

Plan: scope `express.json` / `express.urlencoded` per route once a path needs a larger limit (e.g. file uploads with a dedicated middleware).

### 5. No automated security scanning

Plan: GitHub Dependabot + `npm audit` in CI. `npm-audit-resolver` for false positives. Add to CI before tagging v1.0.

### 6. No 2FA / OTP enforcement

`otp_verifications` table exists, but the user module does not enforce 2FA on login. The scaffolding (table, virtual fields) is in place. Plan: add `requires_2fa` flag in `users.extra_data` and a `/users/verify-otp` route to complete login.

### 7. Refresh token rotation does not yet detect parallel sessions across devices

Status: rotation works per-session. If user A has tokens on iPhone and Mac, both sessions live; that is by design (one `authorizations` row per device). But there is no admin UI to list / nuke sessions.

Plan: add `GET /users/sessions` (list of rows with device info) and `POST /users/sessions/revoke` (delete by id).

### 8. Soft delete + GDPR

`paranoid: true` keeps rows. GDPR's "right to be forgotten" requires hard delete or anonymisation.

Plan: per-table `gdprErase(userId)` service that:

- Hard-deletes `authorizations`, `login_attempts`, `otp_verifications`, `sent_email_logs` for that user.
- Anonymises `users` row (`email = 'erased+<id>@deleted.local'`, `passWord = NULL`, `extra_data = JSON_OBJECT('erasedAt', NOW())`).

### 9. SQL injection — protected, but...

Sequelize parameterises everything. Direct `connection.query(rawSql, ...)` is the only risk; grep for it before each release.

### 10. JSON `extra_data` query risk

A poorly-parameterised JSON path can lead to incorrect data exposure. Always parameterise both the path and the value:

```js
// good
await connection.query(
  `SELECT * FROM users WHERE extra_data->>? = ?`,
  { replacements: ['$.preferences.language', lang] }
);

// bad
await connection.query(
  `SELECT * FROM users WHERE extra_data->>'$.preferences.language' = '${lang}'`
);
```

## Defaults that should be reviewed in production

| Setting | Default | Production recommendation |
| --- | --- | --- |
| `JWT_ACCESS_TTL` | 15m | 5–15m, depending on UX vs security tradeoff. |
| Rate limit | `30 req / 1s / IP` (global) | per-route tuning for hot endpoints. |
| CORS | `ALLOWED_ORIGINS` | be exact about origins; no wildcards. Add staging vs prod hostnames. |
| `paranoid: true` | true on all models | review per-table; some logs may want hard delete after retention period. |
| Cookies | not used | if you switch from `Authorization` header to cookies, set `SameSite=Strict`, `Secure`, `HttpOnly`. |

## Reporting a vulnerability

Internal team: file a private issue or contact the security channel directly. Do not discuss in public PRs.

## Update this doc

Every release notes the security-related changes in [changelog.md](changelog.md). Major changes update this file in the same PR.
