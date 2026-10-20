# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) loosely.

## [Unreleased]

Nothing yet. Add entries here as you build, then move them under a version when you tag a release.

## [0.1.0] - 2026-04-27

Initial scaffold extracted from the McKinsey base project.

### Added

- Modular Express layout: `src/modules/{users,admin,common,entity,notify,submission}/`. Only `users` is implemented; the rest are mounted stubs ready to fill.
- JWT (HS256) authentication with server-side revocation:
  - `POST /api/v1/users/register`
  - `POST /api/v1/users/login`
  - `POST /api/v1/users/refresh-token` (with refresh-token rotation; replay burns the session)
  - `POST /api/v1/users/logout`
  - `POST /api/v1/users/profile`
  - `POST /api/v1/users/list` (admin only)
  - `POST /api/v1/users/update`
  - `POST /api/v1/users/remove` (admin only)
- Six tables: `roles`, `users`, `authorizations`, `login_attempts`, `otp_verifications`, `sent_email_logs`. Each has a `extra_data JSON NULL` column for schemaless overflow fields.
- Repository wrapper (`new sequelize.db(model)`) returning `[result, error]` tuples for every DB operation.
- Centralised response envelope via `middleware/response_handler.js`.
- i18n via `utils/custom_exceptions.json` (`en` + `ar`).
- Flat-file migrations in `db/migrations.sql`.
- Jest test suite:
  - Unit: `auth_checker`, `response_handler`, password hashing.
  - Integration: register, login, profile, refresh, logout — using sqlite::memory: + supertest.
- Postman collection + environment in `docs/postman/`.
- Comprehensive `docs/`:
  - `architecture.md` — layered design + request flow diagram.
  - `database.md` — table-by-table schema, sample rows, ERD.
  - `extra-data.md` — JSON column policy and MySQL query recipes.
  - `auth.md` — JWT flow, refresh, revocation, role gate.
  - `modules.md` — module anatomy + recipe to add a new module.
  - `api.md` — endpoint catalogue.
  - `conventions.md` — house style.
  - `security.md` — posture and known weak spots.
  - `changelog.md` — this file.

### Removed (vs base project)

- SIEM/audit loggers (`middleware/siem/*`, `services/logger/*`).
- Winston, `winston-daily-rotate-file`.
- MSSQL connection support.
- Stripe, Socket.IO, Aliyun OSS, Filenet, DMS integrations.
- Custom 5-part token format (replaced with standard JWT).
- All domain models from base except those needed for auth (`entities`, `data_submissions`, `submission_versions`, `submission_logs`, `hierarchy`, `initiative_codes`, `isco_classifications`, `strategies`, `onboarding_documents`, `attendance_proof`, `configurations`, `spoc_history`, `json_templates`).

### Notes

- Passwords use **bcrypt**; see [auth.md](auth.md). Importing old SHA-1 user rows is optional and covered in [security.md](security.md).
- Migrations are a single flat SQL file (`db/migrations.sql`). For v1.0+, switch to Umzug. Tracked in [security.md](security.md) "Future improvements".

---

## How to update this file

Every PR that ships a behaviour change must add an entry under `[Unreleased]`. When you cut a release, rename `[Unreleased]` to the new version + date and start a fresh `[Unreleased]` block at the top.

Categories (in this order):

- **Added** — new features.
- **Changed** — behaviour changes that are not breaking.
- **Deprecated** — soon-to-be-removed.
- **Removed** — gone.
- **Fixed** — bugs.
- **Security** — vulnerabilities patched.

Keep entries terse. One bullet per change. Link to docs where useful.
