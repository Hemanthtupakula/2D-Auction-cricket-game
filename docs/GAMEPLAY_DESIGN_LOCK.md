# Auction XI — Gameplay Design Lock

This document is a design lock for the match experience and must be treated as higher priority than the older semantic-action-only prototype descriptions.

## Core principle

**A player action starts the contest; it does not predetermine the result.**

Examples:

- `PULL` is a batting intent, not a guaranteed boundary.
- `YORKER` is a bowling intent, not a guaranteed wicket.
- A high-rated batter is not an automatic winner.
- Excellent user execution must be able to outperform a lower-rated player's raw capability.
- High ratings should primarily influence capability, consistency and forgiveness.

## Full ball lifecycle

```text
Bowler strategy
    ↓
Line + length + variation
    ↓
Bowling precision / release
    ↓
Run-up + delivery animation
    ↓
Ball flight / movement
    ↓
Batter reads ball
    ↓
Footwork + shot selection + aim
    ↓
Batting timing / precision
    ↓
Contact point / sweet spot
    ↓
Bat velocity + angle + transfer
    ↓
Ball trajectory / bounce / roll
    ↓
Fielding AI + field placement
    ↓
Cricket rules
    ↓
Official outcome
    ↓
Animation + camera + audio + VFX + commentary
```

## User skill dimensions

- timing
- release precision
- line/length targeting
- shot selection
- aim
- footwork
- risk management
- field placement
- tactical reading

## Player capability dimensions

### Batting
Timing, power, shot range, defence, pace handling, spin handling, yorker handling, short-ball handling, footwork, aggression.

### Bowling
Pace, accuracy, swing, seam, spin, variation, yorker, bouncer, slower-ball ability, stamina.

### Fielding
Reaction, speed, catching, throwing, ground fielding, agility.

### Match state
Form, confidence, fatigue, conditions and situation.

## Animation lock

Animation never writes the official score.

The authoritative result drives presentation:

```text
Simulation/result
      ↓
Presentation director
      ├── animation
      ├── camera
      ├── audio
      ├── VFX
      └── crowd
```

## Quality target

Players should remain alive between major events through layered locomotion and secondary animation: breathing, weight shifts, head tracking, bat/glove adjustments, field communication, stance preparation and contextual reactions.

Major events should support distinct presentation: boundaries, wickets, catches, run-outs, innings breaks, match-winning moments and trophy presentation.
