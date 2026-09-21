# Auction XI — Agent Instructions

## Commands
- Run commands from the repository root (`auction-xi/`).
- Install frontend dependencies with `npm run install:all` (equivalent to `npm --prefix frontend install`).
- Start backend with `npm run dev:backend` (`mvn -f backend/pom.xml spring-boot:run`); the repo has no Maven wrapper.
- Start frontend with `npm run dev:frontend`; Vite serves on port 5173 and proxies `/api` and `/ws` to `127.0.0.1:8080`.
- Verify frontend with `npm run build:frontend` (`tsc && vite build`).
- Verify backend with `npm run test:backend` (`mvn -f backend/pom.xml test`); focused tests live under `backend/src/test/java/com/auctionxi/service/`.
- The ZIP intentionally omits `node_modules`, `target`, and `dist`; recreate them with the install/build commands instead of treating them as missing source.

## Architecture
- Java 21 + Spring Boot 3.3.4 is the backend; React 18.3.1 + TypeScript 5.6.2 + Vite 6.0.7 + Tailwind 3.4.17 is the frontend.
- `backend/src/main/java/com/auctionxi/service/RoomStore.java` is the live in-memory room registry; active auction and match state is not currently persisted in SQL.
- `LiveAuctionService` is the server-authoritative auction engine and uses a 500 ms deadline ticker; auction timing is 10 s open bidding followed by 5 s GOING_ONCE, 5 s GOING_TWICE, and 5 s THIRD_CALL stages.
- `MiniMatchService` is the server-authoritative match engine; `SeasonService` sequences mini-matches and computes the league table/playoffs while keeping season state in memory.
- `AuthService` persists accounts to `data/accounts.json`; `MatchResultStore` persists finished match results under `data/results/`; player data is loaded from `data/players_369.json` / classpath resources.
- `backend/src/main/resources/db/schema.sql` is a Supabase PostgreSQL schema/migration artifact only. The current `backend/pom.xml` has no PostgreSQL/JPA dependency and `application.yml` has no datasource configuration, so do not assume the running app is connected to Supabase until database integration is explicitly implemented and configured.

## Realtime
- Spring WebSocket/STOMP endpoint is `/ws/auction`; topics are `/topic/room/{CODE}/allocation`, `/state`, `/auction`, `/bids`, and `/alerts`.
- `frontend/src/services/websocket.ts` uses STOMP and falls back to HTTP/state polling when the socket fails; client/server WebSocket heartbeats are deliberately disabled (`0`) for the current Spring simple-broker setup.
- Keep server state authoritative; frontend events are notifications/snapshots, not the source of truth.

## Match-specific gotchas
- The current semantic action API supports batting actions `DEFENCE`, `DRIVE`, `CUT`, `PULL`, `LOFT`, `STRAIGHT` and bowling actions `PACE`, `SWING`, `SEAM`, `CUTTER`, `BOUNCER`, `YORKER`.
- Legacy timing endpoints remain for compatibility, but the current 3D gameplay UI uses semantic action endpoints and action IDs for idempotency.
- `MiniMatchService` broadcasts `MATCH_AWAIT_INPUT`, `MATCH_ACTION_LOCKED`, `MATCH_BALL_RESOLVED`, `MATCH_WICKET`, `MATCH_COMPLETE`, and state updates over the auction topic.
- `MiniMatchService` currently schedules an automatic fallback after 8.5 s (`DECISION_MS` 8 s + 0.5 s): missing batting input becomes `DEFENCE/OKAY`, and missing bowling input becomes `PACE/OKAY`; do not describe the current implementation as strictly no-timeout progression without changing this behavior.

## LOCKED FUTURE GAMEPLAY DIRECTION
- The grand Unity match must be a skill + player-capability + simulation game, not a `shot + delivery = predetermined result` game.
- `PULL` never guarantees a six; `YORKER` never guarantees a wicket. User execution, player ratings/capability, timing, footwork, aim, release precision, contact quality, physics, field placement, fielder ability, conditions, fatigue/form and match situation all contribute to the outcome.
- A real batting timing/precision meter is mandatory in the new Unity match. The old semantic-only/no-timing-meter prototype wording is superseded by `docs/GAMEPLAY_DESIGN_LOCK.md`.
- Player ratings should affect capability, consistency and forgiveness, while user skill remains a major factor; ratings must not automate the user's decisions.
- Bowling must include meaningful line/length/variation and release precision; selecting a delivery type alone must not determine the final ball quality.
- The official result must drive animation/camera/audio/VFX. Animation must never write the official score.
- The full match should support continuous player life: locomotion, stance, breathing/weight shifts, head tracking, bat/glove adjustments, contextual reactions, celebrations, field movement and match-end presentation.
- The target product is PC + Android, developed PC/editor-first and optimized for Android later.
- The Unity match should communicate with Spring Boot through a controlled integration boundary; do not connect Unity directly to PostgreSQL.

## Data and media
- The canonical roster is 369 players; media uses `MediaIngestionService` with ImageKit configuration and local JSON media registries.
- `AzureTtsService` provides optional server-side Azure Speech TTS; it falls back cleanly when unconfigured.
- `scripts/players-*.mjs` and `scripts/media-*.mjs` are data/media maintenance scripts; do not run upload/sync scripts casually because they can contact external services.

## Secrets / environment
- `config/.env` may contain secret-bearing configuration; never commit, print, paste, or expose its values.
- `frontend/.env` may contain Vite client configuration; only public `VITE_*` values belong there.
- Prefer `config/.env.example` as the configuration template and environment variables/secret stores for real credentials.

## Phase workflow
- Work phase-by-phase. Read the phase specification before editing.
- Preserve the working auction, room allocation, player dataset, WebSocket architecture, and season flow unless a phase explicitly requires a compatible extension.
- After each implementation phase: run the relevant build/tests, report exact files changed, and create a clean checkpoint without generated folders or secrets when requested.
