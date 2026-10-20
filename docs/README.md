# Documentation Index

This folder is the source of truth for design, conventions, and operational knowledge. Keep it up to date alongside code changes — a PR that adds a new module should update [modules.md](modules.md) and [api.md](api.md).

## Reading order for new developers

| # | Doc | What you learn |
| --- | --- | --- |
| 1 | [architecture.md](architecture.md) | Layered design (route → controller → service → repository), folder responsibilities, full request flow diagram. |
| 2 | [modules.md](modules.md) | Anatomy of a module and a copy-paste recipe to add a new one. |
| 3 | [database.md](database.md) | Every table, every column, sample rows, ERD, migration workflow. |
| 4 | [extra-data.md](extra-data.md) | The `extra_data` JSON column policy, MySQL `JSON_EXTRACT` recipes, when to promote a key to a real column. |
| 5 | [auth.md](auth.md) | JWT (HS256) flow, refresh-token rotation, server-side revocation via `authorizations`, role gate. |
| 6 | [conventions.md](conventions.md) | House style: `next(data)` response pattern, `[result, err]` repo tuples, naming, validations, custom exceptions. |
| 7 | [api.md](api.md) | Endpoint catalog with request/response samples. Links to the Postman collection. |
| 8 | [security.md](security.md) | Posture, known weak spots, secret rotation, GDPR / soft-delete notes. |
| 9 | [changelog.md](changelog.md) | What changed, when, why. Updated on every release. |

## Reference assets

- [postman/starter.postman_collection.json](postman/starter.postman_collection.json) — full API collection. The login request auto-saves `accessToken` and `refreshToken` into the environment.
- [postman/starter.postman_environment.json](postman/starter.postman_environment.json) — `base_url`, `accessToken`, `refreshToken`, `email`, `password`.

## How to use these docs

- **Reading**: open the file in any markdown viewer; mermaid diagrams render in GitHub, GitLab, VS Code preview, and most editors.
- **Editing**: docs live next to code in the same repo. Update them in the same PR as the code change. Do not let docs drift.
- **Generating Postman**: the collection is hand-maintained for now. When `users.refresh-token` or any auth flow changes, update the collection in the same PR.

## Conventions for this folder

- Use sentence case in headings.
- Code blocks must be fenced with a language tag.
- File paths use the `[label](path)` markdown format relative to repo root.
- Keep examples runnable — copy/paste must work.
- One concept per file. New concept that does not fit? Add a new doc and link it from this index.
