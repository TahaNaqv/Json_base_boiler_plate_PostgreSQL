# ADR-0001: JSON extra_data Column on Every Table

**Date:** 2026-04-27
**Status:** Accepted

## Context

The McKinsey base project stores infrequently-accessed, highly variable per-record attributes (e.g. user preferences, login context, audit metadata) as ad-hoc nullable columns. This causes frequent migrations for minor feature additions and pollutes the schema with rarely queried fields.

Options considered:
1. Add nullable columns per attribute (current approach in base project)
2. Separate key-value EAV table per entity
3. Single `extra_data JSON NULL` column per table

## Decision

Add a single `extra_data JSON NULL` column (MySQL JSON type) to every table. All schemaless, infrequently-queried attributes are stored here. Core queryable fields remain as first-class columns.

## Consequences — Positive

- Zero migrations for adding minor per-record metadata.
- Services can store arbitrary context (IP, user-agent, timestamps) without schema drift.
- Helpers (`mergeExtraData`) enforce shallow-merge semantics, preventing data loss on update.
- MySQL JSON type supports indexed virtual columns for any field that later requires query performance.

## Consequences — Negative

- Fields inside `extra_data` are not type-enforced at the DB layer; application-level validation is required.
- Payload size must be bounded (enforced via `validateExtraDataSize` in services — max 64 KB).
- ORM-level querying on JSON fields requires explicit `sequelize.json()` or `literal()` syntax.

## Alternatives Considered

- **EAV table**: Rejected — complex joins, no type safety, harder to read.
- **Per-column nullable fields**: Rejected — frequent migrations for trivial additions.

## References

- [docs/extra-data.md](../extra-data.md) — usage policy and MySQL query recipes.
- [db/schemas/users.js](../../db/schemas/users.js) — canonical implementation.
