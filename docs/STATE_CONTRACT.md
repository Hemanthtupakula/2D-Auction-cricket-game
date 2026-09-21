# Authoritative Match State

Suggested server states:
- PROPOSED
- ACCEPTED
- XI_SELECTION
- TOSS
- READY
- INNINGS
- PAUSED
- INNINGS_BREAK
- RESULT
- FORFEIT

Suggested events:
MATCH_PROPOSE
MATCH_ACCEPT
MATCH_DECLINE
MATCH_CANCEL
XI_LOCK
TOSS_CALL
TOSS_RESULT
CHOOSE_BAT_BOWL
READY
DELIVERY_INPUT
BAT_INPUT
BALL_RESOLVED
PAUSE_MATCH
RESUME_MATCH
PLAYER_DISCONNECT
PLAYER_RECONNECT
FORFEIT_MATCH
INNINGS_COMPLETE
MATCH_COMPLETE

Persist on every critical transition:
- match status
- format/overs
- owners/franchises
- XI
- toss
- innings
- score/wickets
- ball number
- striker/non-striker
- current bowler
- ball log
- pause state
- last server sequence
- result

Do not trust the browser for final score or winner.
