# ANTIGRAVITY — AUCTION XI V4.5 IMPLEMENTATION

## This is an implementation package, not a design prompt.

Apply the included Python installer to the existing V4.4 repository.

### Modified existing file

`frontend/src/components/MiniMatch2DArena.tsx`

The installer adds:

- V4.5 presentation-feed import
- memoized presentation feed construction
- authoritative ball history into the 3D stage
- authoritative latest ball into the 3D stage
- active XI presentation roster into the 3D stage

### New source

`frontend/src/components/auctionxi25d/livePresentation/buildPresentationFeed.ts`

### Design rule

Presentation consumes authoritative results.

Animation never writes official gameplay state.

### Rollback

The installer makes:

`frontend/src/components/MiniMatch2DArena.tsx.v44-backup`

Restore that file and remove the new `livePresentation` directory to roll back the phase.
