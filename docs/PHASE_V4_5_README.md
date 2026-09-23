# Phase V4.5 — Live Match Presentation Binding

## Baseline

Verified V4.4 commit:

`2c522cf2b2fe5c60552b1de8dfbe4ce9d29ada37`

## Problem addressed

The V4.4 player runtime was present, but the live `MiniMatch2DArena` path was still rendering the presentation facade without passing the authoritative ball history and active XI identity data into the V4.4 presentation layer.

## Implementation

The new `buildPresentationFeed()` bridge:

1. Reads the authoritative `MiniMatch`.
2. Builds the current presentation roster.
3. Identifies striker/non-striker/bowler/keeper.
4. Places seven additional bowling-team fielders.
5. Normalizes `shot` and `deliveryType` into the current V4 presentation contract.
6. Supplies the latest authoritative ball to the stage.

Friend player identities are mapped to the display names already configured in `AUCTION_XI_FRIEND_PROFILES`.

## Existing V4.4 systems preserved

- `ProductionCricketPlayerRig`
- `AnimationStateController`
- `SkeletalAnimationController`
- GLB async loading
- UV face textures
- `SkeletonUtils.clone`
- authored clip detection
- procedural skeletal fallback
- existing camera/presentation timeline

## Backend boundaries preserved

- `MiniMatchService`
- `RoomStore`
- scoring
- WebSocket/STOMP
- season engine
- database migrations
- auction authority

## Validation

Required:

```text
npm run build:frontend
npm run test:backend
```

Runtime:

- normal ball
- FOUR
- SIX
- WICKET
- friend identity
- no-authored-clip fallback
- duplicate ball render
