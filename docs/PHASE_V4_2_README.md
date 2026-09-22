# Auction XI Phase V4.2 — Friend Likeness Player System

## Purpose

V4.2 extends the verified V4.1 production player runtime so Auction XI can use five consented friend-photo references to build consistent in-game player avatars.

### In-game identities

- AJAY — #07
- AKSHAY — #18
- GOKUL — #11
- HEMANTH NAIDU — #27
- HKT — #17

The game identity is independent of the source/reference photograph. Reference photographs are development material and are not loaded by the runtime.

## What this package contains

### Drop-in source replacement

Replace only:

`frontend/src/components/auctionxi25d/playerPresentation/v4/`

with the included `v4/` directory.

### New runtime capabilities

- Friend-likeness profile registry.
- Game-only player names and jersey numbers.
- Automatic matching by likeness ID, game name, or jersey number.
- Per-player GLB URL.
- Per-player UV face texture URL.
- GLTF/GLB loading and caching.
- AnimationMixer state playback and cross-fading.
- Team kit material customization.
- Height scaling.
- Procedural fallback if a production asset is absent.
- Hot replacement from fallback to real GLB after asynchronous load.
- Face texture application only to designated head/face/skin materials.
- No gameplay authority changes.
- Existing V4/V4.1 exports preserved.

## The important limitation

This ZIP cannot turn an arbitrary photograph into a fully rigged 3D GLB by TypeScript alone. It therefore contains the complete runtime pipeline plus the supplied reference photographs, while the actual final likeness assets are represented by the documented GLB + UV-texture contract.

Do not fake this by putting a flat photograph on a 3D head. For the dream-quality result, the face must be created/retopologized/projected onto a UV-mapped head and then rigged with the body.

## Supplied reference mapping

| Game identity | Jersey | Reference file |
|---|---:|---|
| AJAY | 07 | `reference-assets/ajay_07_reference.jpg` |
| AKSHAY | 18 | `reference-assets/akshay_18_reference.jpg` |
| GOKUL | 11 | `reference-assets/gokul_11_reference.jpg` |
| HEMANTH NAIDU | 27 | `reference-assets/hemanth_naidu_27_reference.jpg` |
| HKT | 17 | `reference-assets/hkt_17_reference.jpg` |

## Asset paths expected by the runtime

`frontend/public/assets/players/friends/ajay_07.glb`

`frontend/public/assets/players/friends/ajay_07_face_uv.png`

and the equivalent four remaining IDs.

## Protected systems

Do not replace or modify:

- backend
- MiniMatchService
- RoomStore
- Supabase / Flyway
- WebSocket / STOMP
- A1/A2 authoritative engine
- MatchScreen
- V3 camera / ball director
- auction / franchise systems
- Unity

## Acceptance

1. Existing frontend build remains clean.
2. Existing backend tests remain clean.
3. Existing V4/V4.1 integration compiles without API breakage.
4. Missing friend assets fall back without breaking a match.
5. When a friend GLB exists, the real model replaces the fallback asynchronously.
6. Face texture is applied only when a valid UV face texture exists.
7. UI/scoreboard uses only AJAY, AKSHAY, GOKUL, HEMANTH NAIDU, HKT and jersey numbers.
8. Reference photographs are not referenced from the public runtime manifest.
