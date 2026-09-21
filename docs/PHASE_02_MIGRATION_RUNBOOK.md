# Phase 2 — Migration Runbook

## A. Before changing code

1. Create a clean git checkpoint or local backup.
2. Confirm Phase 1 remains intact.
3. Confirm `config/.env` contains actual database credentials locally, without printing them.
4. Confirm the Supabase project is healthy.

## B. Implement dependencies/config

Add only the backend dependencies actually needed:
- PostgreSQL JDBC driver
- Spring Data JPA
- selected migration mechanism (one only)

Do not install Prisma/Drizzle/`@supabase/server` in the React frontend for PostgreSQL access.

## C. Apply schema

Apply the repository-tracked Phase 2 SQL migration to the Supabase PostgreSQL database.
The migration must be idempotent or versioned so it can be safely rerun by the documented
migration mechanism.

## D. Seed players

Run an idempotent server-side seed from the existing `players_369.json` canonical source.
Verify the final row count and a handful of deterministic IDs/names/roles.

## E. Verify application

1. Start backend.
2. Run DB connectivity health check or startup verification.
3. Run unit tests.
4. Create room -> verify room row.
5. Join member -> verify member row.
6. Claim/release franchise -> verify allocation row.
7. Place bid -> verify bid ledger row.
8. Complete a sale -> verify purchase + squad row.
9. Complete a test match -> verify match + ball/event/result rows.
10. Start/complete a season fixture -> verify season/fixture persistence.
11. Stop backend and restart it.
12. Verify durable records remain available and documented recovery behavior works.

## F. Rollback principles

- Never delete user data as a shortcut for a failed migration.
- Prefer a backward-compatible migration.
- Preserve the existing JSON stores until the database-backed replacement is verified.
- Remove legacy file persistence only after the corresponding DB flow is proven and tests are
  green.
