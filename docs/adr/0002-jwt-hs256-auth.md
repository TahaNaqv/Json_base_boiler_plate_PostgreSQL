# ADR-0002: JWT HS256 with Server-Side Revocation

**Date:** 2026-04-27
**Status:** Accepted

## Context

The boilerplate requires stateless-compatible authentication with the ability to revoke sessions (logout, account deactivation). Options considered:

1. Opaque session tokens stored in DB
2. JWT RS256 (asymmetric)
3. JWT HS256 with server-side `authorizations` table for revocation

## Decision

Use JWT HS256 for access tokens (short TTL: 15 min) paired with a server-side `authorizations` table that stores the `jti` (JWT ID). Every authenticated request validates the `jti` exists in the table. Logout destroys the row. Refresh tokens are stored as a SHA-256 hash in the same row and rotated on every use (refresh token rotation with replay detection).

## Consequences — Positive

- Sessions are fully revocable without a cache layer (Redis not required for v1).
- Refresh token rotation with replay detection burns the session on token theft.
- Single shared `JWT_SECRET` is sufficient; no key-pair infrastructure needed.

## Consequences — Negative

- Every authenticated request incurs one DB read (`authorizations` table). Acceptable at current scale; migrate to Redis for high-throughput if needed.
- HS256 requires the secret to be kept strictly confidential; compromise requires immediate rotation of all tokens.

## Alternatives Considered

- **Opaque tokens only**: Rejected — harder to carry claims (role, jti) without a second DB lookup.
- **RS256**: Rejected — adds key-pair management overhead with no benefit at single-service scale.

## References

- [middleware/auth.js](../../middleware/auth.js)
- [docs/auth.md](../auth.md)
