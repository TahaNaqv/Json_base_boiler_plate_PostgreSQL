# `extra_data` JSON column

Every table has a `extra_data JSON NULL DEFAULT NULL` column. It is the project's "soft schema" — a place to store fields that are not yet stable enough to deserve their own column.

## Why this exists

Schema migrations are expensive — they require coordination between code, DBAs, and rollouts. Most product features start with one field that nobody knows the final shape of. `extra_data` lets you ship that field today and decide later whether it belongs as a real column.

## When to use `extra_data`

Use it for:

- Display fields rarely used in `WHERE` clauses (`name`, `phoneNumber`, `profileImage`, `address`).
- Per-record metadata that varies between records (`preferences`, `clientFlags`, `featureToggles`).
- Audit / context info on log tables (`ip`, `userAgent`, `reason`).
- Anything you suspect will be deleted or renamed within 3 months.

## When to NOT use `extra_data`

Promote a field to a real column the moment any of these are true:

1. **It is queried in 3+ places** — the "rule of three". Repeated `JSON_EXTRACT` is slow and ugly.
2. **It needs `UNIQUE`, `NOT NULL`, `FOREIGN KEY`, or `CHECK` constraints**.
3. **It is part of an index** that the optimiser must use frequently.
4. **It is a foreign key** — never put `entity_id` in `extra_data`.
5. **It is the login key** (e.g. `email`) — must be a UNIQUE column.
6. **It is sensitive** and needs separate column-level encryption / redaction.

## Conventions

- Keys are camelCase: `firstName`, `phoneNumber`, `requestIp`.
- Top level is always an object, never an array.
- Do not nest more than 3 levels deep — debugging deeply nested JSON in a SQL client is painful.
- Default value is `NULL`, not `{}`. The API serialiser returns `null` if absent; clients should treat `null` and `{}` as equivalent.
- Maximum payload size: enforce 64 KB at the service layer (`JSON.stringify(extraData).length <= 65536`). MySQL allows much more, but big blobs slow every read.

## Update semantics — merge, do not replace

When a controller receives `extraData` in a request body, the service merges it into the existing column. It does not overwrite the whole blob.

```js
// inside src/modules/users/services/users.js
async function updateUser(id, body) {
  const [user, err] = await new sequelize.db(models.users).find(id);
  if (err) return [null, err];
  if (!user) return [null, new TypeError('user_not_found')];

  const merged = Object.assign(
    {},
    user.extraData || {},
    body.extraData || {}
  );

  const [updated, uerr] = await new sequelize.db(user).update({
    ...body,
    extraData: merged
  });
  return [updated, uerr];
}
```

Result: a `PATCH` of `{ extraData: { phoneNumber: '+1...' } }` does not erase the existing `address` key.

To delete a key, send it explicitly as `null`: `{ extraData: { phoneNumber: null } }`. The service strips `null` keys after merging, depending on policy. (Default in this scaffold: keep `null`s so consumers can see the field was cleared.)

## MySQL query recipes

### Extract a key

```sql
SELECT id, JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.name')) AS name
FROM users
WHERE id = 42;
```

Or with the shorthand:

```sql
SELECT id, extra_data->>'$.name' AS name
FROM users
WHERE id = 42;
```

### Filter by a JSON key

```sql
SELECT *
FROM users
WHERE extra_data->>'$.preferences.language' = 'en';
```

### Filter by array containment

```sql
SELECT *
FROM roles
WHERE JSON_CONTAINS(extra_data->'$.permissions', '"users.manage"');
```

### Functional index for a hot key

If you query `extra_data->>'$.preferences.language'` a lot, add a generated column + index instead of a raw JSON expression index (more portable):

```sql
ALTER TABLE users
  ADD COLUMN pref_language VARCHAR(8) AS (extra_data->>'$.preferences.language') STORED,
  ADD INDEX idx_users_pref_lang (pref_language);
```

This is the canary that the field has earned a promotion to a real column. When you see a generated column appear in code review, plan the next migration to make it a regular column and remove the JSON read path.

### Aggregate a JSON field

```sql
SELECT extra_data->>'$.preferences.theme' AS theme, COUNT(*) AS n
FROM users
GROUP BY theme;
```

## Sequelize patterns

Reading is automatic — `user.extraData` is already a parsed JS object.

Writing always assigns the full object. Sequelize cannot do partial JSON updates safely; merge in the service layer first.

```js
user.extraData = Object.assign({}, user.extraData || {}, { lastLogin: new Date() });
await user.save();
```

For a write that should not bump `updated_at`, use `silent: true`:

```js
await user.update({ extraData: merged }, { silent: true });
```

## Validation

Every endpoint that accepts `extraData` must validate it as an optional object via `express-validator`:

```js
body('extraData').optional().isObject().withMessage('extraData must be an object'),
```

Field-level validation inside `extraData` is the service's responsibility — the validator only checks the outer shape.

## Migration when promoting a JSON key

Pattern when a key earns its own column:

1. Add the new column (NULLable to start) and a generated/derived value:

   ```sql
   ALTER TABLE users ADD COLUMN phone_number VARCHAR(32) NULL;
   UPDATE users SET phone_number = extra_data->>'$.phoneNumber' WHERE phone_number IS NULL;
   ```

2. Update the Sequelize model to include the new column.

3. Update the service: write to BOTH `phoneNumber` and `extraData.phoneNumber` for one release (dual-write).

4. Update reads to prefer the column, fall back to JSON.

5. Next release: stop writing to JSON, drop the JSON key in a backfill migration.

6. Optionally tighten constraints: add `NOT NULL`, `UNIQUE`, etc.

This staged approach prevents a single deploy from breaking older clients or ongoing transactions.
