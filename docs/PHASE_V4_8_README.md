# Phase V4.8 — Broadcast / Cinematic Camera Director

## Baseline

`76efd38` — Phase V4.7 fielding / catching / interception / run-out presentation.

## Complete implementation

V4.8 replaces the old static camera presets with an event-aware cinematic director. The camera reads the same resolved ball trajectory and fielding sequence that the V4.6/V4.7 presentation already uses.

### Automatic shot sequence

Normal delivery:

`BOWLER_VIEW -> DELIVERY_TRACK -> CONTACT_VIEW -> BALL_FOLLOW -> FIELDING_VIEW -> RESET_VIEW`

Boundary:

`BOWLER_VIEW -> DELIVERY_TRACK -> CONTACT_VIEW -> BALL_FOLLOW -> BOUNDARY_VIEW -> RESET_VIEW`

Caught/run-out wicket:

`BOWLER_VIEW -> DELIVERY_TRACK -> CONTACT_VIEW -> FIELDING_VIEW -> WICKET_VIEW -> CELEBRATION_VIEW -> RESET_VIEW`

### Player control

The stage's manual camera buttons call `setManual()` so the automatic director does not fight the player. The next authoritative ball calls `beginBall()` and automatically restores the cinematic director.

### Authority boundary

The camera is presentation-only. It does not create or alter cricket outcomes.

## Installed source files

- `frontend/src/components/auctionxi25d/dream/camera/director.ts`
- `frontend/src/components/auctionxi25d/dream/camera/cinematic.ts`
- `frontend/src/components/auctionxi25d/dream/presentation/director.ts`
- `frontend/src/components/auctionxi25d/dream/ball/director.ts`
- `frontend/src/components/auctionxi25d/dream/fielding/FieldingDirector.ts`
- `frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx`

## Verification

The repository verifier runs the V4.7 baseline checks, V4.8 camera/presentation checks, frontend production build and backend tests.
