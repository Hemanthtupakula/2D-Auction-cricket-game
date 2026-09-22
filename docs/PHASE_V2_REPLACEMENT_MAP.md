# V2 Replacement Map

1. Add the `playerPresentation` directory under:
`frontend/src/components/auctionxi25d/`
2. In `playerRig.ts`, replace the current simple player visual factory/animation logic with the adapter pattern shown in `ProductionPlayerRig.ts`.
3. In `MiniMatch25DStage.tsx`, pass the authoritative ball/presentation event to the production rig. Keep existing camera, stadium, ball flight, HUD, backend, and WebSocket code unchanged.
4. Existing callers may continue using the old playerRig exports; the adapter preserves the presentation boundary.

### Explicitly protected
- `backend/`
- `MiniMatchService`
- `RoomStore`
- `api.ts`
- `websocket.ts`
- `MatchScreen.tsx`
- Supabase/Flyway
- auction/franchise logic
- A1 authoritative engine
- Unity
