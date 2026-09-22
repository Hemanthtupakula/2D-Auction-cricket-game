# Phase V2 Acceptance

- Player presentation has explicit Batter/Bowler/Fielder/Wicketkeeper states.
- Delivery-specific bowler release variants exist for PACE, SWING, CUTTER, SLOWER, YORKER, BOUNCER.
- Batter intent maps to presentation states only.
- Outcomes map to miss/edge/dismissal/celebration states only after authoritative result arrives.
- No presentation function returns or mutates a cricket score/result.
- No CPU gameplay decision is introduced.
- Existing V1 stage remains the renderer/orchestrator.
