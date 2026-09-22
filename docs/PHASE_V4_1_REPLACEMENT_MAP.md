# V4.1 Replacement Map

## Replaced directory
`frontend/src/components/auctionxi25d/playerPresentation/v4/`

## Files
- `types.ts`
- `math.ts`
- `stateMachine.ts`
- `assetAdapter.ts`
- `assetManifest.ts`
- `ProductionCricketPlayerRig.ts`
- `index.ts`

## Protected
Do not modify:
- `backend/`
- `MiniMatchService`
- `RoomStore`
- Supabase/Flyway
- WebSocket/STOMP
- A1/A2 authoritative engine
- auction/franchise systems
- `MatchScreen`
- V3 camera/ball director
- Unity

## Compatibility
`ProductionCricketPlayerRig`, `ProceduralCricketAssetAdapter`, `ProductionPlayerAsset`, and `PlayerAssetAdapter` remain available through the previous V4 integration surface.
