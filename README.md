# Auction XI — 2D T20 Metric MVP

This package is the implementation handoff for the temporary 2D browser cricket mode.

## Locked rules
- Mini Match formats: 2, 5, 10, 20 overs.
- Tournament/Season format is fixed when the tournament is created: 5 or 20 overs.
- Pure owner-vs-owner play: no CPU opponent.
- A match can be proposed by any room owner; the selected opponent must accept.
- Pending/deadlocked proposals can be cancelled/removed.
- Season scheduling is owner-aware: when multiple owner pairs are available, independent matches can run in parallel so owners do not wait for unrelated matches.
- The same owner cannot be in two active matches at once.
- Host's deterministic extra-franchise allocation remains part of the existing Auction XI room logic.
- Pause is server-authoritative. One owner pressing Pause pauses the match for both players.
- Resume is available to either connected owner.
- There is no reset caused by pause/resume or reconnect.
- If a player exits/abandons the match, the connected opponent wins by forfeit.
- Disconnect/reconnect must preserve the authoritative match snapshot; it must never restart a ball or reset the match.
- READY is required for lobby/XI/toss/innings transitions, not before every ball.
- BAT/BOWL remain the only auction source ratings. Runtime form/progression is separate and gradual.

## Important
This is a build specification and starter contract, not a claim that the final production UI is already implemented.
Use the existing Auction XI Spring Boot + Supabase contracts and player/squad data as the integration source of truth.
