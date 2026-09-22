# Phase V1 Replacement Map

### Replace
`frontend/src/components/MiniMatch3DCanvas.tsx`

### Add
`frontend/src/components/auctionxi25d/`

### Do not replace
- MatchScreen.tsx
- api.ts
- websocket.ts
- backend
- Supabase/Flyway
- Unity project

### Authority rule
The presentation layer never decides runs, wickets, timing, winner, toss or match completion.
It only renders authoritative match state.

### Important
The fallback player is an SVG sprite object, not an HTML canvas drawing. Production sprite
sheets can later be supplied through `spriteUrl` without changing the stage architecture.
