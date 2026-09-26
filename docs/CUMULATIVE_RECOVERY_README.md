# Auction XI — Cumulative Integration Recovery

## Baseline

Designed for the current GitHub `main` after Phase V4.9:

`858987a` — `feat(presentation): integrate Phase V4.9 procedural stadium, crowd, floodlights, and umpire atmosphere`

This is **not a new gameplay phase**. It is a cumulative integration repair so the existing Phase 1 → V4.9 systems operate together instead of being disconnected at the 2D/3D boundary.

## What this repairs

### 1. 3D bowling aim is real again
`MiniMatch25DStage` now consumes the existing `aimX`, `aimZ`, `canAim`, `onAimChange`, and `onAimLock` props from `MiniMatch2DArena`.

- Drag on the actual 3D pitch raycasts into the pitch plane.
- The cyan target ring follows the same coordinates later sent to `submitBowlAction`.
- A visible guide line shows the intended delivery path.
- A small `LOCK AIM` control is available in the 3D stage.

### 2. Ball moves immediately after the bowler commits
Before the backend publishes the authoritative result, the client starts a **delivery-only preview** using the existing deterministic trajectory solver.

The preview travels from the bowler toward the batter and stops at contact. It does not invent runs/wickets.

When the authoritative `ballLog` result arrives, the existing V4.6 full trajectory takes over.

### 3. Existing gameplay UI is preserved
No backend action endpoints, score logic, auction data, squad data, or 2D decision system is replaced.

The repair specifically bridges the existing:

`AIM → SPEED → RELEASE → submitBowlAction → delivery preview → batting timing → authoritative result`

### 4. Original player identity is preserved
The live presentation feed no longer replaces a real auction player's ID with `AJAY`, `AKSHAY`, `GOKUL`, `HEMANTH NAIDU`, or `HKT`.

Those identities are now **presentation-only visual profiles**.

Example:

`Rohit Sharma (authoritative player ID)`

→ deterministic visual resolver

→ one of the custom likeness GLBs

The auction/match identity stays untouched.

### 5. Real GLB path is preferred
`PlayerDirector` supplies a deterministic `visualProfileId` and `ProductionCricketPlayerRig` resolves that profile to the existing friend GLB + UV face assets.

The GLB loader remains asynchronous and keeps the existing procedural fallback only as a temporary load fallback.

## Files replaced

- `frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx`
- `frontend/src/components/auctionxi25d/types.ts`
- `frontend/src/components/auctionxi25d/dream/ball/director.ts`
- `frontend/src/components/auctionxi25d/dream/presentation/director.ts`
- `frontend/src/components/auctionxi25d/dream/players/rig.ts`
- `frontend/src/components/auctionxi25d/playerPresentation/v4/types.ts`
- `frontend/src/components/auctionxi25d/playerPresentation/v4/ProductionCricketPlayerRig.ts`
- `frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts`

## Apply

From the repository root:

```powershell
python .\scripts\apply_cumulative_integration_repair.py
powershell -ExecutionPolicy Bypass -File .\scripts\verify_cumulative_integration_repair.ps1
```

The installer creates a `.cumulative-repair-backup` directory before replacing any existing file.

## Verification expectation

The important verification is functional, not just compilation:

1. Bowling turn displays a 3D aim target.
2. Dragging changes the target and derived line/length.
3. Lock/speed/release still uses the existing 2D controls.
4. Releasing starts a visible moving ball immediately.
5. The ball reaches the batter and stops for the batting response.
6. Batting timing still submits through the existing API.
7. The authoritative result then runs the full V4.6/V4.7/V4.8/V4.9 presentation.
8. Original player names/IDs remain unchanged while visual likenesses are presentation-only.
9. Score/HUD/turn state continue to come from the existing match state.

## Important

This package does **not** claim the whole game is “finished.” It repairs the cumulative runtime wiring that was missing. Do not move to another presentation phase until the browser shows the above chain working end-to-end.
