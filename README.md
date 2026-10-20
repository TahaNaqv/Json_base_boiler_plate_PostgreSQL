# Starter

A modular Node.js / Express / Sequelize backend boilerplate. Clean layering, JWT auth with server-side revocation, MySQL with a flexible `extra_data` JSON column on every table, and a Jest test suite that runs against an in-memory SQLite database.

This project is a slimmed, restructured derivative of an internal McKinsey project. It keeps the conventions that work and removes the parts you do not need on day one (SIEM, MSSQL, Stripe, Socket.IO, OSS uploads).

## Quickstart

Prerequisites:

- Node.js 18+
- MySQL 8+ (or 5.7+ with JSON support)

```bash
git clone <repo> starter
cd starter
cp .env.example .env          # then edit values, especially JWT_SECRET
npm install
mysql -u <user> -p <db> < db/migrations.sql
npm run dev                   # starts on PORT (default 7000)
```

Run the tests (no DB required, uses sqlite in memory):

```bash
npm test
```

## What you get

- `src/modules/users/` — fully working: register, login (JWT), refresh-token, logout, profile, list, update, remove.
- `src/modules/{admin,common,entity,notify,submission}/` — empty stubs already mounted at `/api/v1/<name>`. Fill them in.
- Every table includes a `extra_data` JSON column for fields you do not want to migrate.
- Centralised response envelope (`status`, `statusCode`, `message`, `messageAr`, `data`, `error`).
- i18n via `utils/custom_exceptions.json` (en/ar).
- Postman collection in [docs/postman/](docs/postman/).

## Where to learn the codebase

Start here: [docs/README.md](docs/README.md). It is the index for everything.

Recommended reading order for new developers:

1. [docs/architecture.md](docs/architecture.md) — the big picture and request flow.
2. [docs/modules.md](docs/modules.md) — how a module is structured + recipe to add a new one.
3. [docs/database.md](docs/database.md) — table-by-table schema and ERD.
4. [docs/extra-data.md](docs/extra-data.md) — when to use the JSON column and when to promote to a real column.
5. [docs/auth.md](docs/auth.md) — JWT flow, refresh, revocation.
6. [docs/conventions.md](docs/conventions.md) — house style.
7. [docs/api.md](docs/api.md) — endpoint catalog.
8. [docs/security.md](docs/security.md) — known weak spots and TODOs.
9. [docs/changelog.md](docs/changelog.md) — what changed and when.

## Scripts

- `npm run dev` — nodemon, MySQL.
- `npm start` — node, MySQL.
- `npm test` — Jest, in-memory SQLite. CI-safe.
- `npm run test:watch` — interactive.
- `npm run test:cov` — coverage report.

## Project layout (top level)

```
starter/
  app.js                 entry: express + middleware + module mounts
  package.json
  .env.example
  config/                config.json, constants.json
  db/                    schemas/, sequelize/, migrations.sql
  helpers/               common.js (mailer, language, encode helpers), pagination.js
  middleware/            auth.js (JWT), auth_checker.js (RBAC), response_handler.js, allowed_methods.js
  utils/                 response.js, custom_exceptions.json, uploads/
  src/modules/<name>/    app.js, routes/, controllers/, services/, validations/
  docs/                  full documentation (read this)
  tests/                 jest unit + integration suites
```

## License

Internal / proprietary. See [docs/security.md](docs/security.md) for handling.
