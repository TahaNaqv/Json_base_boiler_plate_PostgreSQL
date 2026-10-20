# Security Release Checklist

**Project:** Starter Boilerplate
**Standard:** Backend Standards Guidelines v4 — Section 13 (SSDLC Phase 6)

This checklist MUST be completed in full before any production release. Sign-off must be committed to the repository as evidence. Verbal approval is NOT sufficient.

---

## Pre-Release Security Gates

| # | Check | Owner | Status |
|---|---|---|---|
| 1 | ESLint security plugin reports zero errors (`npm run lint`) | Developer | [ ] |
| 2 | `npm audit` — no unresolved High/Critical vulnerabilities | Developer | [ ] |
| 3 | `git-secrets` scan passes — no hardcoded credentials in diff | Developer | [ ] |
| 4 | All environment variables documented in `.env.example` | Developer | [ ] |
| 5 | No `console.log` statements in production code paths | Developer | [ ] |
| 6 | JWT_SECRET is ≥ 32 chars and rotated from any previous value | Developer | [ ] |
| 7 | SMTP credentials confirmed loaded from env (not hardcoded) | Developer | [ ] |
| 8 | DB credentials confirmed loaded from env (not hardcoded) | Developer | [ ] |
| 9 | Threat model (`docs/security/threat_model.md`) reviewed and current | Tech Lead | [ ] |
| 10 | All new endpoints have input validation in `validations/` layer | Tech Lead | [ ] |
| 11 | All new file upload endpoints validate MIME type + size | Tech Lead | [ ] |
| 12 | No PII or tokens appear in any log output | Security Champion | [ ] |
| 13 | `CHANGELOG.md` updated with security-relevant changes | Developer | [ ] |
| 14 | All unit and integration tests pass (`npm test`) | CI | [ ] |
| 15 | Node version matches `.nvmrc` in CI pipeline | CI | [ ] |

---

## Sign-Off

| Role | Name | Date | Signature |
|---|---|---|---|
| Developer | | | |
| Tech Lead | | | |
| Security Champion | | | |

**Release approved:** [ ] YES [ ] NO

_Any release without a completed, committed sign-off MUST NOT proceed to production (§13 Phase 6)._
