# Conventions

The "house style" for this codebase. Read this before opening a PR.

## Response envelope

Every endpoint returns the same JSON shape via [middleware/response_handler.js](../middleware/response_handler.js):

```json
{
  "status": "success | error",
  "statusCode": 200,
  "message": "OK",
  "messageAr": "موافق",
  "data": { ... },
  "error": null,
  "errorStack": null
}
```

The handler is the **only** place that calls `res.status().json(...)`. Controllers do not.

## Controller pattern

```js
exports.create = async function (req, res, next) {
  try {
    const [data, err] = await service.create(req.body, req.appUser);
    return next(err || data);
  } catch (e) { next(e); }
};
```

Rules:

- Controllers `next(data)` on success and `next(err)` on failure. They never call `res.send`, `res.json`, or `res.status` directly.
- Wrap the body in `try/catch` and forward unexpected throws via `next(e)`.
- Resolve `req.body`, `req.params`, `req.appUser` here, not in the service.
- Keep controllers under 20 lines. If a controller is doing logic, push it into the service.

## Service pattern

```js
const sequelize = require('../../../../db/sequelize/sequelize');
const { models } = sequelize;

exports.create = async function (body, actor) {
  if (!body.name) return [null, new TypeError('name_required')];

  const repo = new sequelize.db(models.<entity>);
  const [row, err] = await repo.create({
    name: body.name,
    extraData: body.extraData || null
  });
  return [row, err];
};
```

Rules:

- Services are pure JS — they never see `req` or `res`.
- Always return `[result, error]` tuples. Never throw business errors. (Unhandled DB errors propagate, that is fine.)
- Use the repository (`new sequelize.db(model)`). Do not call `model.findOne`, `model.create`, etc directly — you lose the tuple convention.
- Validate business rules first, then hit the DB.

## Repository pattern (`new sequelize.db(model)`)

[db/sequelize/instance.js](../db/sequelize/instance.js) wraps a Sequelize model with a small set of methods that all return `[result, error]`:

| Method | Behaviour |
| --- | --- |
| `find(id)` | `findByPk` |
| `findOne(query)` | `findOne(query)` |
| `fetchOne(where)` | `findOne({ where })` |
| `create(values, options)` | `create` |
| `findAndCountAll(query)` | for pagination |

For other operations (`update`, `destroy`, `findAll`, etc.) use the Sequelize model or instance directly in the service layer, or extend [db/sequelize/instance.js](../db/sequelize/instance.js).

Why this exists: `next(err || data)` requires `err` to be a Truthy/Falsy single value. Tuples make that natural.

## Validation

`express-validator` rules per route, defined in `validations/<module>.js`:

```js
exports.rule = function (key) {
  switch (key) {
    case 'create':
      return [
        body('email').isEmail().withMessage('email_invalid'),
        body('password').isLength({ min: 8 }).withMessage('password_too_short'),
        body('extraData').optional().isObject().withMessage('extra_data_must_be_object')
      ];
    default: return [];
  }
};
```

The shared `validations/validation.js` translates the first error into a `TypeError(<message_key>)` which `response_handler.js` maps via `utils/custom_exceptions.json`.

Rule of thumb: `withMessage` always uses an `lower_snake_case` key, never a sentence. Sentences live in [utils/custom_exceptions.json](../utils/custom_exceptions.json) keyed by language.

## i18n / custom exceptions

[utils/custom_exceptions.json](../utils/custom_exceptions.json) is keyed by language:

```json
{
  "en": {
    "email_invalid": "Please provide a valid email address",
    "password_too_short": "Password must be at least 8 characters",
    "extra_data_must_be_object": "extraData must be an object"
  },
  "ar": {
    "email_invalid": "يرجى تقديم عنوان بريد إلكتروني صالح",
    "password_too_short": "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل",
    "extra_data_must_be_object": "يجب أن يكون extraData كائنًا"
  }
}
```

Adding a new error:

1. Throw `new TypeError('your_key')` from a service or `withMessage('your_key')` from a validator.
2. Add `your_key` under both `en` and `ar` in `custom_exceptions.json`.
3. The response handler picks `req.language` (or default `en`) and returns the right message.

## Naming

- **Database**: `snake_case`. Always lower. Pluralise table names (`users`, `roles`).
- **JS / Sequelize attributes**: `camelCase`. Map to DB columns via `field: 'snake_case_name'`.
- **Endpoints**: `kebab-case` paths, `camelCase` JSON keys (`/forgot-password`, `{ "extraData": {...} }`).
- **Files**: `lower_snake.js` for multi-word, `lowercase.js` for single-word. Module folders match routes (`users/`, `submission/`).
- **Constants**: `UPPER_SNAKE_CASE` only for true constants. Config values live in `config/config.json`, not as JS constants.

## Async / await

Use `async/await` everywhere. Do not return raw promises from services.

```js
// good
const [user, err] = await repo.find(42);
if (err) return [null, err];

// bad
return repo.find(42).then(([user]) => doStuff(user));
```

## Logging

Only `console.*` for now (with `console-stamp` adding timestamps). Do not import `winston` or any logger; that decision is intentional. If you need structured logs in prod, raise it as a `docs/changelog.md` entry first and add it as a dedicated middleware.

## Comments

- Comment **why**, not **what**. The code shows what it does.
- A function name should make the comment unnecessary. If you find yourself writing `// fetches users` above `function fetchUsers()`, delete the comment.
- Keep TODOs in [docs/security.md](security.md) or `docs/changelog.md`, not as scattered `// TODO` strings in code.

## File header

No copyright/license headers. The codebase ships internal-only.

## Linting / formatting

Not enforced by tooling in v0.1. The conventions above are the contract. Future enhancement: ESLint + Prettier — tracked in [security.md](security.md) "Future improvements".

## Tests

- Unit: pure JS, no DB. `tests/unit/*.test.js`.
- Integration: supertest + sqlite memory. `tests/integration/*.test.js`.
- Every new route needs at least one integration test exercising the happy path and a 401/403 path.
- Use the helpers in `tests/setup.js` (`getApp()`, `signedJwtFor(user)`).

Run `npm test` before every PR.

## Git / commits

- Commit messages: present-tense imperative ("Add users.refresh-token", "Fix login when email has uppercase").
- One logical change per PR. If you find yourself updating six modules at once, split.
- Update the relevant doc in `docs/` in the same PR. Drift is the enemy.

## Anti-patterns

- Direct `model.findOne(...)` calls outside of `db/sequelize/instance.js`. Always go through the repository wrapper.
- `res.status(...).json(...)` outside of `response_handler.js`. Use `next(data)` / `next(err)`.
- `throw` from a service for business errors. Return `[null, new TypeError('key')]` instead.
- New columns added without considering `extra_data` first. See [extra-data.md](extra-data.md).
- Hardcoded English strings in errors. Use a key + `custom_exceptions.json`.
- `app.get('/something', handler)` directly in `app.js`. Routes belong inside a module.
