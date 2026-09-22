# Auction XI Phase V4.1 — Real Cricket Asset Pipeline & Runtime

Upgrades the V4 player animation system with a production asset pipeline:

- `GLTFLoader` pipeline for cricket player models and animation clips.
- `AnimationMixer` cross-fading and clip routing for delivery, batting, fielding, and wicketkeeping states.
- Asset caching and preloading via `GLTFCricketAssetCache`.
- Per-player `assetUrl` overrides with height, kit color, skin tone, and hair customization.
- Hybrid architecture: uses procedural fallback until real GLB assets are placed under `/public/assets/players/`.
- Strict backward compatibility with the existing Phase V4 integration.
- Zero changes to gameplay authority, scoring, wickets, timing, or physics.
