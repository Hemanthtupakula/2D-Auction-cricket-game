# Phase V4.9 — Stadium / Crowd / Umpire / Match Atmosphere

## Presentation flow

`authoritative ball -> V4.6 trajectory -> V4.7 fielding -> V4.8 camera -> V4.9 stadium + officials`

The presentation pipeline receives the same `AuthoritativeBallEvent` used by the existing V4.x runtime.

## Stadium behaviour

The stadium is procedural and requires no external environment asset. It contains:

- night sky dome and deterministic stars
- layered stadium bowl and roof
- pitch, creases and wickets
- boundary rope + LED ring
- four presentation screens
- six floodlight towers
- deterministic crowd actors
- reactive crowd movement and lighting pulses

Crowd positions and appearance use deterministic seeded values so the visual layout does not change randomly between renders.

## Umpire behaviour

Two lightweight procedural officials are attached to the presentation scene. They do not participate in gameplay state.

Signals are driven only from the already-resolved outcome:

| Outcome | Visual signal |
|---|---|
| FOUR | square-leg arm signal |
| SIX | both arms raised |
| WICKET | raised-arm dismissal signal |
| RUN_OUT | square-leg raised-arm signal |
| WIDE | bowler-end side signal |
| NO_BALL | bowler-end arm signal |

These are broadcast-style visual cues rather than a replacement for cricket rules or scoring logic.

## Player architecture remains locked

The auction roster remains the source of player identity, statistics, price, franchise ownership and match capability.

The V4 face/model/animation profiles remain presentation references only. V4.9 does not insert the friend likenesses into the auction roster.
