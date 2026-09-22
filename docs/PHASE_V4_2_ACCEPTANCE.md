# V4.2 Acceptance Checklist

## Integration
- [ ] Replace only `frontend/src/components/auctionxi25d/playerPresentation/v4/`.
- [ ] `npm run build:frontend` passes.
- [ ] `npm run test:backend` passes.

## Identity
- [ ] AJAY #07
- [ ] AKSHAY #18
- [ ] GOKUL #11
- [ ] HEMANTH NAIDU #27
- [ ] HKT #17
- [ ] No reference-photo/source names exposed in gameplay UI.

## Asset behavior
- [ ] Missing GLB -> procedural fallback.
- [ ] Present GLB -> asynchronous real-player replacement.
- [ ] Missing face UV texture -> GLB still renders.
- [ ] Present UV face texture -> applied to head/face material.
- [ ] Animation clips cross-fade through authoritative presentation states.

## Gameplay boundary
- [ ] No client-side result decisions.
- [ ] No timing changes.
- [ ] No score changes.
- [ ] No auction changes.
- [ ] No networking changes.
- [ ] No Unity changes.
