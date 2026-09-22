# Auction XI — Phase V1: 2.5D Broadcast Presentation

## Purpose
Replace the old procedural player-rendering presentation with a real Three.js 2.5D
broadcast stage while preserving the existing match/auction/backend authority.

## Included
- Perspective Three.js cricket world
- Pitch, crease, stumps, outfield, boundary
- Layered stadium/floodlight masses
- Lighting, fog and broadcast vignette
- Independent player sprite objects
- Broadcast camera states
- Curved ball-flight presentation
- Existing authoritative ball metadata can drive presentation

## Does NOT replace
Spring Boot, MiniMatchService, RoomStore, auction, franchises, WebSocket/STOMP,
Supabase/Flyway, score authority, Unity, or match rules.

## Replacement
Replace:
`frontend/src/components/MiniMatch3DCanvas.tsx`

Add:
`frontend/src/components/auctionxi25d/`

If the current repository has no MiniMatch3DCanvas file, integrate MiniMatch25DStage
into the existing gameplay presentation area instead of creating a second match screen.

## Acceptance target
The match view must read as:
STADIUM → PITCH → BOWLER → BALL → BATTER → FIELD
rather than a flat arena diagram with primitive player geometry.
