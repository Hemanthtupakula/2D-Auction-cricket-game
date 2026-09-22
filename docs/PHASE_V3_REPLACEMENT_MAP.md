# V3 Replacement Map

## Add
`frontend/src/components/auctionxi25d/dream/`

## Modify only
`frontend/src/components/auctionxi25d/MiniMatch25DStage.tsx`

At the existing authoritative ball/presentation event, call:
`dreamPresentation.playBall(authoritativeBall)`

At match reset/next-ball boundary call:
`dreamPresentation.resetForNextBall()`

## Do not modify
backend/
MiniMatchService
RoomStore
Supabase/Flyway
auction/franchise services
WebSocket/STOMP protocol
A1/A2 authority
Unity
MatchScreen orchestration

## Required authoritative input
The adapter accepts a normalized object containing:
- deliveryKind
- speed
- batterIntent
- timingBand
- outcome
- ballId
- over
- ball
- striker/nonStriker/bowler identifiers where available
- target/trajectory data where available

Missing optional fields use visual fallbacks only; no gameplay state is invented.
