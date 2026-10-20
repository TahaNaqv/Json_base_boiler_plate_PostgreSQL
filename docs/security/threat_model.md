# Threat Model — Starter Boilerplate

**Last Updated:** 2026-04-27
**Reviewed By:** Tech Lead (required before first production deployment)
**Status:** Draft — must be signed off before proceeding to production

---

## 1. Scope

This threat model covers the authentication flows, data access patterns, and third-party integrations in the starter boilerplate backend service.

---

## 2. Data Classification

| Data Type | Classification | Notes |
|---|---|---|
| User email | PII | Stored in `users.email` (indexed) |
| Password | Restricted | bcrypt-hashed; never logged or returned |
| JWT access token | Restricted | 15-min TTL; validated via `authorizations` table |
| Refresh token (raw) | Restricted | Never stored; only SHA-256 hash persisted |
| `extra_data` JSON | PII (conditional) | May contain PII — sanitize before logging |
| Login attempt IP | PII | Stored in `login_attempts.extra_data` |

---

## 3. Authentication Flow Threats

| Threat | Mitigation |
|---|---|
| Brute-force login | Rate limiting (30 req/s global); `login_attempts` table audit trail |
| JWT token theft | Short 15-min TTL; server-side revocation via `authorizations.jti` |
| Refresh token replay | Refresh token rotation — replay burns the session (auth row destroyed) |
| JWT secret exposure | Secret loaded from env only; never logged; 32-char minimum enforced at startup |
| Session fixation | New `jti` issued on every login; old sessions not invalidated (user must logout) |

---

## 4. Data Access Threats

| Threat | Mitigation |
|---|---|
| Horizontal privilege escalation | `authChecker` middleware enforces role allow-list per route |
| SQL injection | All DB access via Sequelize ORM; no raw query strings |
| Mass assignment | Services explicitly whitelist fields before `create`/`update` |
| Oversized payload | `express.json({ limit: '10mb' })`; `extra_data` capped at 64 KB |

---

## 5. Third-Party Integration Threats

| Integration | Threat | Mitigation |
|---|---|---|
| SMTP (email) | Credential exposure | Loaded from env; never committed |
| MySQL | Connection string exposure | Loaded from env; never committed |

---

## 6. Known Gaps (Future Improvements)

- [ ] OTP brute-force protection (rate limit + lockout on `otp_verifications`)
- [ ] File upload MIME-type validation (`utils/uploader.js` not yet implemented — required by §8 before file upload endpoints are added)
- [ ] HTTPS enforcement (handled at load balancer level — document in deployment runbook)
- [ ] `extra_data` PII scrubbing before logging
- [ ] Redis-backed revocation for high-throughput deployments

---

## 7. Sign-Off

| Role | Name | Date |
|---|---|---|
| Tech Lead | _______________ | _______________ |
| Security Champion | _______________ | _______________ |
