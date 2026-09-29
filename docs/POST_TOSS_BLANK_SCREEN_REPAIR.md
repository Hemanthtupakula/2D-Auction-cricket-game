# Auction XI — Post-Toss Blank Screen Repair

Baseline: GitHub `eea6e68` (cumulative recovery)

This patch targets the blank screen reported immediately after the toss.

It hardens the post-toss Stage 5 render path, polls the authoritative match state briefly during toss-to-BALL_READY transitions, and puts a visible React error boundary around the match screen so a runtime exception cannot silently leave the whole viewport black.

## Install

From the repository root:

```powershell
python .\scripts\apply_post_toss_blank_screen_repair.py
powershell -ExecutionPolicy Bypass -File .\scripts\verify_post_toss_blank_screen_repair.ps1
```

Then rebuild/restart the frontend and backend normally.

## Acceptance path

Create/open match → lock Playing XI → toss → BAT/BOWL decision → Stage 5 openers/bowler selection → BALL_READY → match arena.

The page must remain visible at every transition. A real render exception must produce a recovery panel with its error message instead of a black screen.
