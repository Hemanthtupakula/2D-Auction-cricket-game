# Auction XI Phase V4 — Production Cricket Players & Animation

Presentation-only upgrade for the V3 Dream presentation layer.

Adds event-driven batter, bowler, fielder and wicketkeeper states, delivery-specific bowling releases, batting/footwork states, smooth procedural pose blending, player archetypes, team kit data, deterministic presentation behavior, and an asset-adapter boundary for future GLTF/GLB characters.

The authoritative match engine remains responsible for score, wickets, timing, physics and official outcomes.

ADD this package under `frontend/src/components/auctionxi25d/playerPresentation/v4/` and connect `ProductionCricketPlayerRig` from the existing `playerRig.ts`.

Do NOT replace backend, MiniMatchService, RoomStore, WebSocket/STOMP, Supabase/Flyway, A1/A2, MatchScreen or Unity.

The included procedural character is a runnable fallback. It is deliberately an adapter, not a claim of photorealistic art. Production GLTF/GLB assets can later implement the same adapter contract without changing gameplay authority.
