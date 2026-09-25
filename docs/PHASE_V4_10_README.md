# Auction XI — V4.10 Visual Reality Pass

Baseline: `8a5035e` — Phase V4.8 Broadcast / Cinematic Camera.

## Why this exists

The current V4.8 screen can fall back to primitive procedural player bodies because the live presentation feed only carries authoritative player IDs and the existing likeness profiles were not being selected for those original players. This package fixes that without changing auction or match identity.

## Core rule

`authoritative player id/name/role` remains unchanged.

`visualProfileId` is presentation-only and selects one of the existing friend GLB + face UV assets.

The original player data is therefore still the source of truth for:
- auction
- squad
- XI
- statistics
- gameplay outcomes
- commentary
- scorecard

## Visual upgrades

- Deterministic role-aware likeness resolver using the existing five friend GLBs.
- Explicit visual-profile field added to the presentation layer.
- Existing original player IDs are preserved instead of being aliased to friend names.
- Preload of friend GLBs/face textures at presentation startup.
- Wider / higher broadcast camera framing.
- ACES tone mapping, soft shadows and fog.
- Rebuilt stadium bowl, tiered stands, seats/crowd, roof ring, floodlights, presentation screens and boundary LED ring.
- Two on-field umpires with event-driven signals.
- Crowd/light/LED reaction driven by the same authoritative ball result.

## Existing assets reused

The package does not replace the assets already in:
`frontend/public/assets/players/friends/`

It uses:
- `ajay_07.glb` + `ajay_07_face_uv.png`
- `akshay_18.glb` + `akshay_18_face_uv.png`
- `gokul_11.glb` + `gokul_11_face_uv.png`
- `hemanth_naidu_27.glb` + `hemanth_naidu_27_face_uv.png`
- `hkt_17.glb` + `hkt_17_face_uv.png`

## Apply

From the repository root:

`python .\\scripts\\apply_v410_visual_reality.py`

Then:

`powershell -ExecutionPolicy Bypass -File .\\scripts\\verify_v410.ps1`

Normal production checks:

`npm run build:frontend`

`npm run test:backend`

## Backups

Every replaced file is copied to `.v410-backup` before replacement.

## Important

This package does NOT add AJAY / AKSHAY / GOKUL / HEMANTH NAIDU / HKT to the auction database. They remain visual likeness profiles only.
