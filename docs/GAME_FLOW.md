# Game Flow

AUCTION
  -> PAUSE AUCTION
  -> MINI MATCH / TOURNAMENT
  -> MATCH REQUEST
  -> OPPONENT ACCEPTS
  -> PLAYING XI
  -> TOSS
  -> BOTH READY
  -> FULL-SCREEN 2D MATCH
  -> OPTIONAL PAUSE
  -> INNINGS BREAK
  -> SECOND INNINGS
  -> RESULT
  -> FULL SCORECARD
  -> PLAYER PERFORMANCE / FORM
  -> TOURNAMENT TABLE
  -> RETURN TO AUCTION

## Pause
- Either owner may press Pause.
- Server changes state to PAUSED.
- Both clients stop ball input immediately.
- Current ball/match snapshot is retained.
- Either owner may Resume.
- Resume continues from the exact authoritative state.
- No reset, reroll, or loss of progress.

## Exit
- Explicit Exit/Abandon is a forfeit.
- Connected opponent receives WIN_BY_FORFEIT.
- The match is finalized.
- The exiting owner cannot rejoin that completed match.

## Reconnect
- Temporary disconnect is not an exit.
- Reconnecting owner receives the server snapshot.
- Current score, ball, over, timer/state and match metadata are restored.
