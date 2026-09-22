# Auction XI V4.2 Friend Face Asset Specification

## Goal

Create five in-game cricket avatars whose facial likenesses are based on the supplied reference photos, while the game exposes only the chosen in-game identities:

- AJAY #07
- AKSHAY #18
- GOKUL #11
- HEMANTH NAIDU #27
- HKT #17

The reference person's original name is not part of the runtime identity contract.

## Asset pair per player

`frontend/public/assets/players/friends/<id>.glb`

`frontend/public/assets/players/friends/<id>_face_uv.png`

IDs:

- `ajay_07`
- `akshay_18`
- `gokul_11`
- `hemanth_naidu_27`
- `hkt_17`

## GLB requirements

- Humanoid skeleton.
- Neutral/rest pose at import.
- Realistic human proportions.
- Cricket clothing and equipment.
- Separate or clearly named head/face mesh/material.
- Team kit materials named with `primary` / `secondary` where possible.
- Skin material name containing `skin`, `face`, or `head`.
- Hair material name containing `hair` where possible.
- Origin at feet/ground.
- Forward axis consistent across all five models.
- Scale normalized so a typical player is approximately 1.8m before `heightScale`.

## Animation clips

Use explicit clips where possible:

### Batter
`READY`, `READ`, `DEFENSIVE`, `DRIVE`, `CUT`, `PULL`, `FLICK`, `SWEEP`, `LOFT`, `LEAVE`, `MISS`, `EDGE`, `DISMISS`, `CELEBRATE`

### Bowler
`RUNUP`, `GATHER`, `RELEASE_PACE`, `RELEASE_SWING`, `RELEASE_CUTTER`, `RELEASE_SLOWER`, `RELEASE_YORKER`, `RELEASE_BOUNCER`, `FOLLOW_THROUGH`, `REACT`, `CELEBRATE`

### Fielder
`READY`, `REACT`, `SPRINT`, `DIVE`, `PICKUP`, `THROW`, `CATCH`, `MISS`, `CELEBRATE`

### Keeper
`CROUCH`, `READY`, `SHIFT_LEFT`, `SHIFT_RIGHT`, `COLLECT`, `CATCH`, `APPEAL`, `CELEBRATE`

## Face texture

A normal front-facing photograph is a **reference**, not a UV texture. Do not point `faceTextureUrl` at the supplied reference photo.

The `_face_uv.png` file must be a texture painted/projected onto the actual head UV layout of the GLB. This prevents stretching a rectangular portrait over a spherical head.

## Runtime behavior

V4.2 tries the real GLB first. If the asset is absent or fails to load, the procedural V4.1-compatible player remains visible. A failed friend asset must never break the match or authoritative gameplay.

Gameplay authority, scores, timing, physics, networking, auction logic, and match rules remain outside this subsystem.
