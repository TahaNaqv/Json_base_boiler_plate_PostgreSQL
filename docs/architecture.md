# Architecture

## Goals

- Predictable layout: a developer should know where any code goes within 30 seconds.
- Thin controllers, fat services, dumb models.
- Centralised cross-cutting concerns (auth, validation, response shape, errors).
- Schema flexibility through a `extra_data` JSON column on every table.
- Stateless transport (JWT) with stateful revocation (one DB row per session).

## Layered design

```
HTTP Request
   |
   v
Express middleware pipeline (app.js)
   |
   v
Module router  src/modules/<name>/routes/<name>.js
   |
   v
Validation     src/modules/<name>/validations/<name>.js  (express-validator rules)
                                          + validation.js (translates errors to TypeError)
   |
   v
Auth gate      middleware/auth_checker.js  (role allow-list)
   |
   v
Controller     src/modules/<name>/controllers/<name>.js  (thin: orchestration only)
   |
   v
Service        src/modules/<name>/services/<name>.js     (business logic, never touches req/res)
   |
   v
Repository     new sequelize.db(model)                   (returns [result, err] tuples)
   |
   v
Sequelize Model db/schemas/<name>.js                     (pure schema + hooks)
   |
   v
MySQL
```

Return path: every controller calls `next(data)` (success) or `next(err)` (error). The final `middleware/response_handler.js` turns whichever it received into the standard JSON envelope.

## Request flow (mermaid)

```mermaid
flowchart LR
    Req[Incoming HTTP] --> CORS
    CORS --> RateLimit[express-rate-limit]
    RateLimit --> AllowedMethods[allowed_methods.js]
    AllowedMethods --> Morgan
    Morgan --> RoleHelpers["req.checkUser/isAdmin"]
    RoleHelpers --> Getters["request_getters/parser eb-butler-utils"]
    Getters --> Auth["auth.js verifies JWT"]
    Auth --> Lang[common.languageSet]
    Lang --> Routes["/api/v1/users/* etc"]
    Routes --> Validation[express-validator]
    Validation --> AuthChecker[auth_checker.js]
    AuthChecker --> Controller
    Controller --> Service
    Service --> Repo["new sequelize.db(model)"]
    Repo --> NextData["next(data) or next(err)"]
    NextData --> NotFound[not_found]
    NotFound --> ResponseHandler[response_handler.js]
    ResponseHandler --> Client[JSON envelope]
```

## Folder responsibilities

| Folder | Contains | What it must NOT do |
| --- | --- | --- |
| `config/` | Environment-keyed Sequelize config + global constants. | No code. |
| `db/schemas/` | Pure Sequelize model definitions. Hooks for password hashing live in `db/sequelize/hooks.js`, not here. | No business logic. No imports of services. |
| `db/sequelize/` | Connection, model registration (`sequelize.js`), associations, scopes, hooks, repository wrapper (`instance.js`). | No HTTP code. |
| `helpers/` | Cross-cutting utilities (mailer, pagination, language). Pure functions where possible. | Should not own state. |
| `middleware/` | Express middleware: auth, auth_checker, allowed_methods, response_handler. | No business logic. |
| `utils/` | Response envelope class, custom exception catalogue, optional `uploads/` for static assets you add. | Same as middleware. |
| `src/modules/<name>/` | A feature module. Each one mounts under `/api/v1/<name>`. | Modules must not import each other directly. Share via services in `helpers/` if needed. |
| `tests/` | Jest unit + integration suites. | Tests must not require a running MySQL. They use sqlite in-memory. |
| `docs/` | This folder. Markdown only. | No generated content that drifts from source. |

## Why these choices

- **Modules over a flat `routes/` folder**: each domain owns its routes, controllers, services, and validations. Onboarding a new feature is "create a folder," not "edit ten shared files."
- **Repository wrapper (`new sequelize.db(model)`)**: every DB call returns `[result, err]`. No throwing. Matches the `next(data | err)` Express style. Easy to grep for data-access points.
- **Centralised response envelope**: clients can rely on the same JSON shape for success and error. Adding i18n meant flipping one switch (`req.language`), not editing every controller.
- **JWT + revocation row**: stateless transport, stateful logout. Best of both. See [auth.md](auth.md).
- **`extra_data` everywhere**: ship features without migrations. See [extra-data.md](extra-data.md) for when to promote a key to a real column.

## Boot sequence (app.js)

1. Load `.env` (only if file exists) and validate required vars (fail-fast on missing `JWT_SECRET`, `ALLOWED_ORIGINS`, etc).
2. Set up CORS, rate limit, body parsers, security headers.
3. Set up morgan with custom tokens (date, userId, userRole).
4. Inject role helper functions onto `req` (`isAdmin`, `isUser`).
5. Load `eb-butler-utils` `request_getters` and `request_parser`.
6. Mount `auth.js` (decodes JWT into `req.appUser`, `req.appUserRole`, `req.authorization`).
7. Mount language middleware (`req.language`).
8. Mount each module: `app.use('/api/v1/<name>', require('./src/modules/<name>/app.js')())`.
9. Mount `not_found` then the error-capture and `response_handler`.
10. Authenticate Sequelize connection. Start HTTP server.

## What lives globally

- `console_stamp(console, ...)` patches `console.log` to include a timestamp. This is intentional and global.
- That is the only global side effect. There is no `global.connectedClients` (carried-over from base, not used here).

## Where to add new behaviour

| You want to... | Edit |
| --- | --- |
| Add a new feature module | `src/modules/<new>/` (see [modules.md](modules.md)). Mount it in `app.js`. |
| Change the response shape | `utils/response.js` + update [conventions.md](conventions.md). |
| Add a new role | `db/migrations.sql` seed in `roles` table (or insert) + reference the role name in the route's `auth_checker(...)`. |
| Add a new error message | `utils/custom_exceptions.json` (both `en` and `ar`). Throw `new TypeError('your_error_key')` from a service. |
| Add a new env var | `.env.example` + read at boot in `app.js` with a fail-fast validation. Document in `docs/security.md` if security-relevant. |
| Add a new column | Decide first: real column or `extra_data` key? See [extra-data.md](extra-data.md). |
