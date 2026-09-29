# Auction XI — Full 3D Runtime Repair

Baseline: `68063ad`

This repair targets the exact runtime problems visible after the post-toss recovery:

- ball not visibly appearing during delivery/result presentation
- stick/procedural player fallback remaining visible instead of the real GLBs
- players flashing/disappearing when authoritative match polling refreshes the snapshot
- batting/fielding presentation targeting a player who is no longer the current striker/bowler after server resolution
- only three camera controls exposed despite the full V4.8 camera director existing
- two bowling-side fielders omitted because only seven field positions were defined

## Changes

The Three.js scene now remains mounted for the life of the match. Player snapshots synchronize into that scene instead of recreating it.

The five friend likeness GLBs/UV face assets are preloaded before the player group becomes visible.

The field now reserves room for striker, non-striker, bowler and keeper plus nine fielders, keeping the full Playing XI represented.

The authoritative ball's `batterId` and `bowlerId` drive presentation participant binding so shots and animations target the actual player who played that ball.

The manual camera UI exposes the complete V4.8 suite: batter, bowler, delivery track, contact, ball follow, fielding, boundary, wicket and celebration.

The cricket ball is enlarged and emissive and its trail is more visible.

## Install

From repository root:

```powershell
python .\scripts\apply_full_3d_runtime_repair.py
powershell -ExecutionPolicy Bypass -File .\scripts\verify_full_3d_runtime_repair.ps1
```

## Acceptance test

Run: toss → BAT/BOWL → openers → bowler → AIM → SPEED → RELEASE.

Expected: the full XI stays visible, real GLBs appear, the 3D aim remains on the pitch, the red ball visibly travels from bowler to batter, the timing meter belongs to that ball's actual batter, and the automatic/manual V4.8 camera suite remains available.
