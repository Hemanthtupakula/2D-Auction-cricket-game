# Phase 2 — Acceptance Checklist

## Build / test
- [ ] Backend compiles.
- [ ] All existing backend tests pass (no regression from Phase 1 baseline).
- [ ] Frontend production build passes.
- [ ] Unity Phase 1 contracts remain compilable.

## Supabase
- [ ] Spring Boot connects to the user's existing Supabase PostgreSQL project.
- [ ] TLS is enforced.
- [ ] Shared/session pooler 5432 is used unless a documented IPv6 direct-connection decision is made.
- [ ] No database password is committed or printed.

## Schema
- [ ] Core tables exist.
- [ ] Foreign keys and uniqueness constraints are enforced.
- [ ] Monetary units are explicit.
- [ ] Canonical player IDs are preserved.
- [ ] JSONB is used only where extensibility is useful.
- [ ] Query indexes exist for room, player, match, sequence and status access patterns.

## Persistence
- [ ] Account registration survives backend restart.
- [ ] Room/member/allocation data survives backend restart.
- [ ] Bid ledger and purchases are durable and idempotent.
- [ ] Match completion and ball/event history are durable.
- [ ] Season and fixture results are durable.
- [ ] Existing public REST/WebSocket behavior remains compatible.

## Scope guard
- [ ] No stadium/player rig work is included.
- [ ] No batting/bowling/physics implementation is included.
- [ ] No fielding/animation/camera/audio work is included.
- [ ] No change to the master gameplay pipeline.
- [ ] No frontend direct database access.
