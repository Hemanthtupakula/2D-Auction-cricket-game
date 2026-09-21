# Unity Integration Contracts — Phase 1

## Protocol

`AuctionXI.UnityMatch` with protocol version `1.0.0-phase1`.

Payloads include a protocol name/version so future Unity and backend iterations can reject incompatible messages cleanly.

## Session

`MatchSessionPayload` is the Unity-side representation of the match connection context: room, match, fixture, teams, owners, XI, innings, over/ball, striker, non-striker, bowler, overs, target, phase and seed.

## Gameplay inputs

`BattingExecutionPayload` represents the eventual batting execution input:

- shot
- footwork
- aim
- timing normalized value + grade
- power intent
- action ID
- match/striker identity
- client timestamp

`BowlingExecutionPayload` represents:

- delivery type
- line
- length
- target
- release precision
- intended pace
- action ID
- match/bowler identity
- client timestamp

The fields are intentionally broader than the current backend semantic action API. Later phases can introduce server endpoints/events without redesigning the Unity model layer.

## Result

`BallResultPayload` separates the authoritative result from its physical presentation. It can carry:

- official score/extras/wicket
- striker/non-striker/bowler
- contact quality
- timing grade
- trajectory
- contact data
- fielding event
- commentary
- result version

## Networking boundary

The interfaces are intentionally transport-agnostic. Phase 4 can supply the concrete REST/STOMP implementation against the existing Spring Boot `/api/rooms/...` endpoints and `/ws/auction` topic architecture.

## Serialization

Phase 1 uses plain `[Serializable]` data classes and does not require a new JSON dependency. The eventual networking layer may choose a robust serializer when the real transport is implemented.
