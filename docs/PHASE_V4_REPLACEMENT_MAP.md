# V4 Integration

ADD `frontend/src/components/auctionxi25d/playerPresentation/v4/`.

In existing `playerRig.ts`:
1. Import `ProductionCricketPlayerRig`.
2. Register the active XI with `addPlayer`.
3. Route the existing authoritative ball event to `playBall`.
4. Route V3 timeline phases to `setPhase`.
5. Call `update(dt)` from the existing Three.js loop.
6. Call `resetForNextBall()` at the existing reset boundary.

Do not replace backend, MiniMatchService, RoomStore, WebSocket/STOMP, Supabase/Flyway, A1/A2, MatchScreen, auction/franchise systems or Unity.
