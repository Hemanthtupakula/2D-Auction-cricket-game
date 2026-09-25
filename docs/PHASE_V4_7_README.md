# Auction XI Phase V4.7 — Fielding, Catching, Interception & Run-Out Presentation

## Scope

V4.7 makes the V4.6 deterministic ball flight drive the live fielding presentation layer.

The backend remains authoritative. V4.7 never decides whether a catch, run-out, boundary, single, double, triple, or wicket actually occurred.

## Added runtime

- `dream/fielding/FieldingDirector.ts`
- deterministic field target selection
- nearest-fielder interception
- catch choreography
- run-out pickup/throw/keeper receive choreography
- boundary pursuit
- normal fielding/pickup presentation
- presentation-only return-to-home offsets

## Integration changes

- `dream/ball/director.ts` exposes the resolved V4.6 trajectory.
- `dream/presentation/director.ts` starts and updates the fielding director.
- `dream/players/rig.ts` exposes presentation offsets.
- `playerPresentation/v4/ProductionCricketPlayerRig.ts` applies offsets relative to each player's real home position so fielders can move without destroying their base formation.

## Authority rule

```text
MiniMatchService -> official result
               |
               v
        V4.5 presentation feed
               |
               v
       V4.6 ball trajectory
               |
               v
       V4.7 fielding director
               |
               v
   visual sprint / dive / catch / throw
```

## Expected presentation

### Catch

```text
Contact -> closest fielder reacts -> sprint/dive -> catch -> celebration
```

### Run-out

```text
Ball -> fielder pickup -> throw -> keeper receive -> wicket reaction
```

### Boundary

```text
Contact -> nearest outfielder sprints -> reaches boundary line -> reacts
```

### Normal ball

```text
Contact -> nearest fielder moves to projected ball position -> pickup/react -> resets
```

## No backend changes

This phase intentionally does not change `MiniMatchService`, scoring, WebSockets, season logic, or persistence.
