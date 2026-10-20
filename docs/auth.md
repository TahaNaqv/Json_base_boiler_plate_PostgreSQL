# Authentication

JWT (HS256) for transport. One row per active session in `authorizations`. Logout = delete the row. Refresh = rotate the row's `refresh_token_hash` and issue a fresh access JWT.

## Tokens

### Access JWT

- Algorithm: `HS256`.
- Signing key: `process.env.JWT_SECRET` (must be 32+ chars; boot fails otherwise).
- TTL: `process.env.JWT_ACCESS_TTL` (default `15m`).
- Payload:

  ```json
  {
    "sub": 42,        // users.id
    "jti": 1001,      // authorizations.id (used for revocation)
    "role": "user",
    "iat": 1745740800,
    "exp": 1745741700
  }
  ```

- Header:

  ```
  Authorization: Bearer <jwt>
  ```

  For backward compatibility with the source codebase the middleware also accepts `?nekot=<jwt>` as a query parameter.

### Refresh token (opaque)

The refresh value is **not a JWT** in v0.1. It is a string:

```
<authorizations.id>.<randomBase64url>
```

- The first segment is the `jti` used in the access JWT and in `authorizations.id`.
- The second segment is high-entropy random bytes (URL-safe), generated per login/rotation.
- The server stores only `SHA-256(<randomBase64url>)` in `authorizations.refresh_token_hash` (the full string is never stored). Presenting a valid pair proves possession of the current refresh secret; rotation invalidates the previous random segment.
- There is no separate time-based `exp` on the refresh string; the session ends on logout, replay burn, or row delete. A future version may add `expires_at` on `authorizations` or a signed refresh segment.

### Why a `jti` + DB row

Pure JWT is stateless — you cannot revoke tokens before their `exp`. By adding a `jti` claim that points at an `authorizations` row, the server can invalidate any session by deleting the row. The cost is one PK lookup per authenticated request.

## Flows

### Register

```mermaid
sequenceDiagram
    participant C as Client
    participant U as users.register
    participant DB as MySQL
    C->>U: POST /api/v1/users/register {email,password,extraData}
    U->>DB: INSERT users (passWord hashed via beforeCreate hook)
    DB-->>U: created user
    U-->>C: 200 { user (no password) }
```

### Login

```mermaid
sequenceDiagram
    participant C as Client
    participant L as users.login
    participant DB as MySQL
    C->>L: POST /api/v1/users/login {email,password}
    L->>DB: SELECT users WHERE email=?, validatePassword
    L->>DB: INSERT authorizations(user_id, refresh_token_hash, extra_data)
    DB-->>L: row id = 1001
    L->>L: jwt.sign({sub,jti,role}, secret, ttl=access)
    L-->>C: 200 { accessToken, refreshToken, expiresIn, user }
    Note over L,C: refreshToken = jti + "." + random (opaque, not a JWT)
```

### Authenticated request

```mermaid
sequenceDiagram
    participant C as Client
    participant A as middleware/auth.js
    participant DB as MySQL
    participant H as Handler
    C->>A: GET /api/v1/users/profile (Authorization: Bearer ...)
    A->>A: jwt.verify(token, secret)
    A->>DB: authorizations.findByPk(jti)
    alt row missing
        A-->>C: 401 access_token_expired (revoked)
    else row exists
        A->>DB: users.findByPk(sub) include role
        A->>H: req.appUser, req.appUserRole, req.authorization
        H-->>C: 200 { user }
    end
```

### Refresh

```mermaid
sequenceDiagram
    participant C as Client
    participant R as users.refreshToken
    participant DB as MySQL
    C->>R: POST /api/v1/users/refresh-token {refreshToken}
    R->>R: parse jti + random from opaque string
    R->>DB: authorizations.findByPk(jti)
    R->>R: SHA-256(random) === stored.refresh_token_hash ?
    alt mismatch (replay)
        R->>DB: DELETE authorizations WHERE id=jti  // burn the session
        R-->>C: 401 invalid_refresh_token
    else match
        R->>DB: UPDATE authorizations SET refresh_token_hash=SHA256(new random)
        R->>R: sign new access JWT, build new opaque refresh (jti unchanged)
        R-->>C: 200 { accessToken, refreshToken, expiresIn }
    end
```

Rotation defends against refresh-token theft: replay of the old refresh token after a successful rotation triggers session burn.

### Logout

```mermaid
sequenceDiagram
    participant C as Client
    participant O as users.logout
    participant A as middleware/auth.js
    participant DB as MySQL
    C->>A: POST /api/v1/users/logout (Authorization: Bearer ...)
    A->>DB: authorizations.findByPk(jti)
    A->>O: req.authorization
    O->>DB: DELETE FROM authorizations WHERE id=jti
    O-->>C: 200 { message: 'logged_out' }
```

After this, every JWT containing `jti=1001` returns 401 even if its `exp` is still in the future.

## Role gate

`auth_checker.js` is the role authorisation middleware. Mount it after `auth.js` in routes that need a specific role.

```js
// src/modules/users/routes/users.js
const authChecker = require('../../../../middleware/auth_checker');
routes.post('/list', authChecker('admin'), userController.listUsers);
routes.post('/profile', authChecker('admin,user'), userController.getProfile);
```

`authChecker(access)` accepts a comma-separated allow-list. If `req.appUserRole` is not in the list, the request is rejected with 403.

## Password hashing

Passwords are stored as **bcrypt** hashes in `users.passWord` (via `db/sequelize/hooks.js` and `hashPassword` on the model). Cost factor 10; raise in a coordinated release if you need stricter work factors.

For importing legacy **SHA-1** rows from the old base project, see [security.md](security.md) ("Migrating users from a legacy SHA-1 database").

## Env vars

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `JWT_SECRET` | yes | — | 32+ chars. Boot fails fast if missing or short. |
| `JWT_ACCESS_TTL` | no | `15m` | jsonwebtoken-compatible string (e.g. `15m`, `1h`, `3600`). |
| `JWT_ISSUER` | no | `starter` | optional, written into `iss` claim if set. |
| `JWT_AUDIENCE` | no | — | optional, written into `aud` claim if set. |

## Common error responses

| Code | Reason | When |
| --- | --- | --- |
| 401 `access_token_expired` | JWT past `exp`, OR `authorizations` row deleted (revoked / logged out). | every authenticated route |
| 401 `invalid_token` | JWT signature mismatch or malformed. | every authenticated route |
| 401 `invalid_refresh_token` | refresh JWT not of `type=refresh`, or hash mismatch. | `/refresh-token` |
| 403 `forbidden` | role not in `auth_checker(...)` allow-list. | role-gated routes |
| 423 `account_locked` (future) | too many failed login attempts in window. | `/login` |

## Testing the auth flow

The Jest suite in `tests/integration/users.*.test.js` exercises every step:

- `users.register.test.js` — happy path register.
- `users.login.test.js` — login returns valid JWT pair, `authorizations` row exists.
- `users.profile.test.js` — `/profile` requires JWT; rejects malformed / expired tokens.
- `users.refresh.test.js` — refresh rotates, replay of old refresh is rejected.
- `users.logout.test.js` — logout removes `authorizations` row, profile returns 401.

Run: `npm test`.
