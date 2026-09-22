# Auction XI — Phase V4.4 Skeletal Animation Upgrade

## Baseline
Designed for the existing V4.3 Auction XI project and its current five friend-player GLBs.

Players:
- AJAY #07 — Batter
- AKSHAY #18 — Bowler
- GOKUL #11 — Aggressive Batter
- HEMANTH NAIDU #27 — Swing Bowler
- HKT #17 — Wicketkeeper

## What this phase adds
1. Humanoid bone discovery with tolerant naming aliases.
2. Procedural skeletal pose controller for cricket presentation states.
3. AnimationMixer clip controller when GLBs contain authored clips.
4. State-to-clip aliases and smooth cross-fading.
5. Fallback to skeletal procedural motion when no matching clip exists.
6. Existing transform-level presentation remains intact.
7. No gameplay authority or backend changes.

## Important asset rule
Do not pretend that TypeScript creates motion-captured animation data. If a GLB has no authored clips, the runtime uses the skeletal procedural controller. If authored clips are added later, the same runtime automatically prefers them.

## Installation
Copy the files in this package into:
`frontend/src/components/auctionxi25d/playerPresentation/v4/`

Add the new `skeletalAnimation.ts` and `animationController.ts`.

For the existing `assetAdapter.ts`, integrate the controllers as described in ANTIGRAVITY_V4_4_INTEGRATION.md rather than replacing unrelated V4.3 behavior.

## Required validation
- `npm run build:frontend`
- `npm run test:backend`
- Open the game and verify all five players.
- Verify batter, bowler, fielder and keeper state transitions.
- Verify a missing animation clip does not break the game.
