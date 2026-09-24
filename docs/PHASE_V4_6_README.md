# Phase V4.6 — Deterministic Ball Flight & Contact Presentation

## Purpose

V4.5 connected the authoritative MiniMatch feed to the production 3D player presentation. V4.6 makes the ball itself deterministic and synchronized with the player/contact timeline.

## What changes

- Replaces the old fixed/reversed ball path with a bowler-to-batter flight.
- Uses a deterministic seed derived from the authoritative ball context.
- Models release, bounce, batter contact, and post-contact travel as separate phases.
- Accounts for delivery type, line/length hints, shot intent, timing band, outcome, and speed.
- Keeps FOUR/SIX/dot/wicket outcomes authoritative; trajectory is presentation only.
- Synchronizes player response timing to the generated ball contact time.
- Keeps the existing V4.4 friend GLB/face/animation runtime intact.

## Determinism rule

The presentation resolver does not roll a fresh random value every frame. The same authoritative ball input produces the same trajectory, which makes replay and debugging reproducible.

## Backend boundary

No changes are required to:

- MiniMatchService
- RoomStore
- LiveAuctionService
- WebSocket/STOMP authority
- scoring logic
- season logic
- database migrations

## Files

- `frontend/src/components/auctionxi25d/dream/ball/trajectory.ts` — deterministic trajectory resolver.
- `frontend/src/components/auctionxi25d/dream/ball/director.ts` — runtime ball mesh/trail and phase sampling.
- `frontend/src/components/auctionxi25d/dream/presentation/director.ts` — aligns player timeline to ball contact.
- `frontend/src/components/auctionxi25d/dream/core/types.ts` — trajectory metadata contract.
- `frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx` — forwards authoritative ball metadata into the presentation event.
- `frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts` — preserves the richer authoritative ball fields needed by the presentation.
- `frontend/src/components/auctionxi25d/types.ts` — presentation ball contract expansion.

## Validation

Run from the repository root:

```powershell
python .\scripts\apply_v46_ball_physics.py
powershell -ExecutionPolicy Bypass -File .\scripts\verify_v46.ps1
```

The verification script runs:

```text
npm run build:frontend
npm run test:backend
```

## Manual QA

Test at least:

1. PACE + NORMAL + DOT
2. SWING + DRIVE + FOUR
3. BOUNCER + LOFT + SIX
4. YORKER + DEFENSIVE + WICKET
5. Cutter + imperfect timing
6. duplicate/replayed identical ball
7. friend batter/bowler/keeper identities

Expected behavior: the same ball result remains authoritative while the 3D ball flight, contact moment, player response, and result camera stay synchronized.
