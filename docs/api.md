# API Reference

Base URL: `http://localhost:7000/api/v1`

All requests and responses are JSON. Authenticated routes require an `Authorization: Bearer <jwt>` header.

A Postman collection that mirrors this document is available at [postman/starter.postman_collection.json](postman/starter.postman_collection.json) with environment variables in [postman/starter.postman_environment.json](postman/starter.postman_environment.json). Importing both into Postman, hitting `Auth > login` once, and you are set up to call every other endpoint.

## Response envelope

Every endpoint returns:

```json
{
  "status": "success | error",
  "statusCode": 200,
  "message": "OK",
  "messageAr": "موافق",
  "data": { },
  "error": null,
  "errorStack": null
}
```

`messageAr` is always present so the client can pick a language without a second call.

## Authentication

### POST /users/register

Public. Creates a new user.

Request:

```json
{
  "email": "john.doe@example.com",
  "password": "SecretP@ss1",
  "extraData": {
    "name": "John Doe",
    "phoneNumber": "+966501234567",
    "preferences": { "language": "en" }
  }
}
```

Success `200`:

```json
{
  "status": "success",
  "statusCode": 200,
  "message": "OK",
  "data": {
    "id": 42,
    "email": "john.doe@example.com",
    "role_id": 2,
    "status": "pending",
    "extraData": { "name": "John Doe", "...": "..." }
  }
}
```

Errors:

- `422 duplicate_email` — email already in use.
- `422 password_too_weak` — password fails complexity rule.

### POST /users/login

Public. Validates credentials, creates an `authorizations` row, returns a JWT access token and an **opaque** refresh string (`<jti>.<random>`; not a JWT).

Request:

```json
{ "email": "john.doe@example.com", "password": "SecretP@ss1" }
```

Success `200`:

```json
{
  "status": "success",
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiI...",
    "refreshToken": "1001.xYz9...opaqueRandom...",
    "expiresIn": 900,
    "user": {
      "id": 42,
      "email": "john.doe@example.com",
      "role": "user",
      "extraData": { "name": "John Doe" }
    }
  }
}
```

Errors:

- `401 invalid_credentials` — bad email/password combo.
- `401 account_inactive` — `status != 'active'`.

### POST /users/refresh-token

Public, but requires a valid refresh token.

Request:

```json
{ "refreshToken": "1001.xYz9...opaqueRandom..." }
```

Success `200`: identical shape to `/login` minus the `user` block. The previous refresh token is invalidated; reusing it returns 401 and burns the session.

Errors:

- `401 invalid_refresh_token` — token expired, malformed, of wrong type, or hash mismatch (replay).

### POST /users/logout

Authenticated. Deletes the current `authorizations` row.

Success `200`:

```json
{ "status": "success", "statusCode": 200, "message": "logged_out", "data": {} }
```

After logout, every request with the same access JWT returns `401 access_token_expired`.

## Users

All routes require `Authorization: Bearer <jwt>`.

### POST /users/profile

Returns the authenticated user with merged `extraData`.

Success `200`:

```json
{
  "status": "success",
  "data": {
    "id": 42,
    "email": "john.doe@example.com",
    "role": "user",
    "status": "active",
    "extraData": { "name": "John Doe", "preferences": {"language":"en"} }
  }
}
```

### POST /users/list

Role: `admin`. Returns paginated list.

Request:

```json
{ "page": 1, "limit": 20, "filter": { "status": "active" } }
```

Success `200`:

```json
{
  "status": "success",
  "data": {
    "rows": [ { "id": 42, "email": "john.doe@example.com", "...": "..." } ],
    "count": 1,
    "page": 1,
    "limit": 20
  }
}
```

### POST /users/update

Role: `admin` or self. Merge-updates the user.

Request:

```json
{
  "id": 42,
  "status": "active",
  "extraData": { "preferences": { "theme": "dark" } }
}
```

Note that `extraData.preferences.theme` is merged with whatever else lives under `extraData`. See [extra-data.md](extra-data.md) for merge semantics.

Success `200`: returns the updated user.

### POST /users/remove

Role: `admin`. Soft-deletes the user (`paranoid: true`).

Request: `{ "id": 42 }`

Success `200`: `{ "data": { "id": 42, "deleted": true } }`.

## Stub modules (TBD)

These URL spaces are reserved but not yet implemented:

| Path | Status |
| --- | --- |
| `/api/v1/admin/*` | empty router; all requests return `404 not_found` |
| `/api/v1/common/*` | same |
| `/api/v1/entity/*` | same |
| `/api/v1/notify/*` | same |
| `/api/v1/submission/*` | same |

See [modules.md](modules.md) for the recipe to fill them in.

## Common error codes

| Code | Meaning |
| --- | --- |
| 400 | Validation error (`express-validator`) — message names which field. |
| 401 | Missing/invalid/expired JWT, or revoked session. |
| 403 | Authenticated but role not allowed by `auth_checker`. |
| 404 | Path not matched, or resource not found. |
| 405 | Method not in the allow-list (`POST`, `GET`). |
| 409 | Conflict (rare; mostly UNIQUE constraint via Sequelize). |
| 422 | Sequelize validation error or business-rule violation. |
| 500 | Unhandled exception — `errorStack` is included in non-prod envs. |

## Health check

`GET /health` is unauthenticated and returns `{ "status": "ok" }`. Use it for liveness/readiness probes.
