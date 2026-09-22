# ANTIGRAVITY — AUCTION XI V4.4 IMPLEMENTATION

You are modifying the existing Auction XI repository.

CURRENT BASELINE:
- V4.3 is the verified baseline.
- Do NOT rebuild the project.
- Do NOT replace working systems unnecessarily.
- Inspect the existing V4.3 code before editing.

PRIMARY OBJECTIVE:
Implement Phase V4.4 — Production Skeletal Animation Runtime.

SCOPE:
Only modify the player-presentation V4 runtime and closely related frontend presentation files required for integration.

DO NOT MODIFY:
- backend/
- MiniMatchService
- RoomStore
- LiveAuctionService
- Supabase/Flyway
- WebSockets/STOMP
- MatchScreen.tsx
- Unity systems
- auction/franchise authority
- scoring/gameplay authority

FIVE PLAYER IDENTITIES:
AJAY #07 — Batter / Technical
AKSHAY #18 — Bowler / Fast
GOKUL #11 — Batter / Aggressive
HEMANTH NAIDU #27 — Bowler / Swing
HKT #17 — Wicketkeeper

IMPLEMENT:
1. Add skeletalAnimation.ts.
2. Add animationController.ts.
3. Integrate them into assetAdapter.ts.
4. Keep SkeletonUtils.clone.
5. Keep AnimationMixer.
6. Detect whether each GLB has authored animation clips.
7. Prefer authored clips when a matching clip exists.
8. Cross-fade clips.
9. If a matching clip does not exist, use the skeletal procedural controller.
10. Preserve existing transform pose behavior.
11. Preserve face UV application.
12. Preserve friend profile mapping.
13. Preserve asynchronous real-asset replacement.
14. Preserve procedural whole-player fallback.

SKELETAL STATES:
BATTER:
READY, READ, TRIGGER, DEFENSIVE, DRIVE, CUT, PULL, FLICK, SWEEP, LOFT, LEAVE, MISS, EDGE, RUN, CELEBRATE, DISMISS

BOWLER:
IDLE, READY, RUNUP, GATHER, RELEASE_PACE, RELEASE_SWING, RELEASE_CUTTER, RELEASE_SLOWER, RELEASE_YORKER, RELEASE_BOUNCER, FOLLOW_THROUGH, REACT, CELEBRATE

FIELDER:
IDLE, READY, REACT, SPRINT, DIVE, PICKUP, THROW, CATCH, MISS, CELEBRATE

KEEPER:
CROUCH, READY, SHIFT_LEFT, SHIFT_RIGHT, COLLECT, CATCH, APPEAL, CELEBRATE

BONE DISCOVERY:
Support common humanoid naming variations for:
pelvis, spine, chest, neck, head, left/right upper arm, forearm, hand, thigh, shin and foot.

QUALITY RULE:
Do not fabricate that a GLB contains animation clips. Read `gltf.animations`. If zero or no matching clip exists, use the procedural skeletal controller.

PERFORMANCE:
Do not create a new AnimationMixer every frame.
Do not traverse the whole scene every frame.
Cache bone mappings.
Reuse cloned materials/textures as the existing runtime does.
Keep state transitions deterministic.

VALIDATION:
Run:
npm run build:frontend
npm run test:backend

Then run the frontend and inspect:
- AJAY batting
- GOKUL aggressive batting
- AKSHAY bowling
- HEMANTH NAIDU swing bowling
- HKT wicketkeeping
- fielding transitions
- celebration/dismissal

If TypeScript errors appear, fix only V4 presentation integration errors.

FINAL REPORT:
Give:
1. Files changed
2. What each file does
3. Frontend build exact result
4. Backend test exact result
5. Runtime observations
6. Any GLBs that contain authored clips
7. Any GLBs that rely on procedural skeletal fallback

Do not claim V4.4 complete unless the build and tests actually pass.
