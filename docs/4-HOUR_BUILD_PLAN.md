# 4-Hour Build Plan

## Hour 0–1 — Shell + match flow
- Add a dedicated 2D Mini Match route/module without touching Unity.
- Lobby: room owners, proposal, accept/decline/cancel.
- Format picker: 2/5/10/20 overs.
- Playing XI: select 11 from auction squad, captain/WK where valid.
- Toss: call heads/tails, server flips, winner chooses bat/bowl.
- Match-ready gate.

## Hour 1–2 — Core playable ball loop
- Full-screen laptop-first arena.
- Bowler selects line/length/delivery intent.
- Batter uses timing meter + direction/shot input.
- Server resolves outcome from delivery, timing, shot, BAT/BOWL and controlled variance.
- Update score, wickets, balls, striker/non-striker, bowler figures.
- Six/four/wicket presentation and concise commentary.
- No per-ball READY.

## Hour 2–3 — Multiplayer + season scheduling
- WebSocket match channel.
- Server-authoritative state machine:
  LOBBY -> XI -> TOSS -> INNINGS -> PAUSED/RESUMED -> INNINGS_BREAK -> RESULT.
- Match proposal accept/decline/cancel.
- Owner-aware season scheduler:
  create all legal owner pairings; run non-conflicting matches in parallel.
- Constraint: one owner may have only one active match at a time.
- Match lock prevents the same owner entering another active match.
- Pause/resume snapshot persistence.
- Exit/forfeit endpoint/event: opponent wins, match closes.
- Reconnect restores the last authoritative snapshot.

## Hour 3–4 — Presentation + stats + QA
- Live compact score strip.
- Batter/bowler panels.
- This-over strip.
- Commentary preview + drawer.
- Scorecard drawer.
- Innings break and full-time summary.
- Post-match batting/bowling/fielding stats.
- Gradual performance/form update.
- Tournament points/table update.
- Rematch / return-to-auction actions.
- Desktop keyboard/mouse controls.
- Smoke tests for proposal, XI, toss, pause, resume, reconnect, exit, parallel owner scheduling and result persistence.

## Scope protection
Do not add:
- Unity/3D assets
- CPU opponents
- complex fielding AI
- full physics
- replay system
- mobile-first layout
- 10 stadium models
- IK/animation systems
