# Auction XI — Phase 2: Database + Supabase PostgreSQL

## 1. Objective

Connect the existing Spring Boot backend to the user's existing Supabase PostgreSQL project
and introduce a durable persistence layer without redesigning the auction engine, current
match gameplay, frontend UI, or Unity gameplay.

Phase 2 is a data/persistence phase only.

## 2. Current known runtime facts

- Backend: Java 21 + Spring Boot 3.3.4 + Maven.
- Frontend: React 18 + TypeScript + Vite.
- Existing room registry is in-memory (`RoomStore`).
- Account persistence currently uses `data/accounts.json`.
- Finished match results currently use `data/results/<ROOM>.json`.
- `schema.sql` exists as a PostgreSQL reference artifact but is not a runtime datasource.
- Phase 1 Unity contracts are already completed and must remain stable.

## 3. Database connection target

Use the user's existing Supabase project.

Preferred application connection for this phase:
- Shared pooler / Session mode
- PostgreSQL port 5432
- JDBC format for Spring Boot
- TLS required (`sslmode=require`)

Known non-secret connection components supplied by the user:
- Project ref: `efmavglmkavnzcfsdacl`
- Project URL: `https://efmavglmkavnzcfsdacl.supabase.co`
- Pooler host: `aws-0-ap-northeast-1.pooler.supabase.com`
- Port: `5432`
- Database: `postgres`
- Pooler username: `postgres.efmavglmkavnzcfsdacl`

The database password is NEVER stored in this package and must be supplied through an
external environment/secret store.

## 4. Runtime architecture

```text
React/Vite
    |
    | REST + existing STOMP/SockJS
    v
Spring Boot services
    |
    +--> in-memory authoritative state for hot live ticks
    |
    +--> persistence services / repositories
              |
              v
       Supabase PostgreSQL
```

The database must not become a 500 ms ticker sink. The live engine remains responsive in
memory. Persist durable business events and snapshots at meaningful state transitions.

## 5. What Phase 2 DOES

- Add PostgreSQL JDBC support.
- Add Spring Data JPA/Hibernate support.
- Add durable repositories and entity mappings for the existing management/game history.
- Establish environment-driven datasource configuration.
- Apply a versioned SQL schema kept in the repository.
- Seed the canonical 369-player dataset idempotently from the existing JSON source.
- Persist accounts, rooms, members, franchise allocations, squads, auction bids/purchases,
  auction events/lots, matches, match events/balls/results, seasons and fixtures.
- Persist match/room snapshots where required for restart/recovery.
- Keep existing API DTO shapes stable unless a compatibility-preserving persistence change
  is necessary.
- Add database connectivity and persistence tests using a deterministic strategy that does
  not require secrets in CI.
- Provide a production-safe local configuration template.

## 6. What Phase 2 DOES NOT DO

- No stadium work.
- No player-rig work.
- No Cinemachine setup.
- No full batting implementation.
- No full bowling implementation.
- No ball physics implementation.
- No fielding AI implementation.
- No animation library integration.
- No replay/crowd/VFX implementation.
- No Unity networking implementation.
- No redesign of the locked master gameplay pipeline.
- No migration to Prisma/Drizzle.
- No browser-to-Postgres direct connection.
- No embedding database secrets into frontend code.

## 7. Persistence strategy

### Hot state
Keep active `RoomStore`, auction timers, WebSocket snapshots and current in-progress match
state in memory for low-latency gameplay.

### Durable state
Persist:
- room lifecycle changes
- member joins/leaves/heartbeats when meaningful
- franchise claims/releases
- auction lot opens/closes
- accepted bids
- sold/unsold purchases
- important auction events
- completed match and ball results
- season/fixture lifecycle and completed standings inputs
- account registration/recovery records
- recovery snapshots at explicit checkpoints

### Idempotency
Use stable domain IDs and unique constraints so reconnects/retries do not duplicate:
- accounts by normalized email
- room codes
- room/franchise allocation pairs
- room/player purchases
- event sequences
- match IDs
- fixture IDs
- delivery sequence per innings

## 8. Money units

Existing auction code uses `Lakhs` internally for bidding and purse calculations, while the
player source data's `basePrice` is represented in rupees. Phase 2 must preserve this existing
behavior and make database column units explicit:
- `*_lakhs` for live auction purse/bid fields.
- `base_price_rupees` / sold price in rupees where the source model uses rupees.
Do not silently convert or rename units in a way that changes auction behavior.

## 9. Canonical player source

Do not create a second hand-maintained roster.

Use the existing canonical `players_369.json` already used by the backend and make the database
seed/upsert idempotent. Preserve player IDs, names, roles, styles, nationality, auction set,
base price, source metadata and relevant JSON statistical maps.

For JSON-heavy player statistics/media/source metadata, use PostgreSQL JSONB where practical;
don't normalize hundreds of fields into premature columns that would make future gameplay
extensions harder.
