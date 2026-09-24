# Auction XI — Phase V4.6 Implementation Package

This is the **actual implementation package**, not a development prompt.

Phase V4.6 adds a deterministic ball-flight/contact presentation layer on top of the completed V4.5 live presentation binding.

## Install

Extract the contents of this ZIP into the root of your current Auction XI repository, then run from that repository root:

```powershell
python .\scripts\apply_v46_ball_physics.py
powershell -ExecutionPolicy Bypass -File .\scripts\verify_v46.ps1
```

The installer uses the current working directory as the repository root. It refuses to run unless it detects the V4.5 `buildPresentationFeed` binding in `MiniMatch2DArena.tsx`. Existing modified files receive a `.v45-backup` copy before replacement.

## Authority model

```text
Authoritative MiniMatch result
        ↓
V4.5 live presentation feed
        ↓
V4.6 deterministic trajectory resolver
        ↓
BallDirector + contact-timed DreamMatchPresentation
        ↓
V4.4 friend GLB / skeletal runtime
```

The trajectory is visual only. It never decides runs, wickets, or scoring.

## Package layout

`payload/` contains the exact production source files that are copied into the repository.

## Verification note

The package has been syntax-checked for the supplied TypeScript sources. A complete repository build must be run in the user's checkout because the full Vite/React/Three.js dependency tree is not mounted in this package.
