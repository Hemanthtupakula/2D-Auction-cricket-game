# V3 Architecture

```text
Authoritative Match Event
        |
        v
DreamMatchPresentation
        |
        +--> PresentationTimeline
        +--> PlayerDirector
        |      +--> BatterActor
        |      +--> BowlerActor
        |      +--> FielderActors
        |      +--> KeeperActor
        |
        +--> BallDirector
        +--> CameraDirector
        +--> StadiumDirector
        +--> Crowd/Light FX
        +--> Broadcast HUD hooks
```

The presentation clock is local and deterministic from event timestamps. It never changes the authoritative state.
