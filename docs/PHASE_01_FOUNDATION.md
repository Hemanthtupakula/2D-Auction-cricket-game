# Auction XI — Phase 1 Foundation

## Purpose

Phase 1 establishes the contract boundary between the existing Auction XI platform and the future Unity cricket game. It deliberately avoids changing the working auction/match backend and does not implement the full cricket simulator yet.

## Locked gameplay direction

The final match is a skill-and-simulation game, not a semantic-button randomizer.

`PULL + YORKER` must never directly determine `SIX` or `WICKET`.

A ball outcome will eventually emerge from:

- user execution
- player capability/rating
- shot or delivery choice
- aim and footwork
- batting timing
- bowling release precision
- bat contact/sweet spot
- ball physics
- field placement
- fielder capability
- pitch/ball/match conditions
- match situation

The simulation determines the official result. Animation, camera, audio and VFX present that result.

## Timing requirement

A real batting timing/precision system is mandatory for the future match. The timing meter is not cosmetic: timing quality must influence contact, transfer of energy, shot direction, launch angle and mistime/edge probability.

Bowling also needs a precision/release system so selecting a YORKER does not guarantee a perfect yorker.

## Responsibility boundary

### Spring Boot
- authentication/ownership
- room/match authority
- official cricket state
- validation
- anti-cheat/anti-tamper decisions
- official score and result
- season/statistics persistence

### Unity
- local player input capture
- visual/physical presentation
- animation
- camera
- audio/VFX/crowd
- fielding presentation and future AI execution
- replay
- platform-specific input/rendering

Later phases will define which simulation computations remain server-authoritative and which high-frequency visual computations are deterministic client-side projections.

## Existing Auction XI compatibility

Current backend data already contains player identity, role, style, ownership/value, aggregate ratings, playing XI data and match identifiers. Phase 1 mirrors these concepts without inventing current player values.

## Files added

The Unity-side contract package contains:

- protocol/version constants
- match phase and gameplay enums
- player/team/session/state payloads
- player gameplay profile
- batting/bowling execution payloads
- ball/contact/trajectory payloads
- fielding and match result payloads
- networking abstractions
- match-state store
- Unity bootstrap
- EditMode contract tests

## Intentionally deferred

- Supabase/PostgreSQL migration
- real HTTP implementation
- real STOMP implementation
- final cricket simulation
- timing meter UI
- bat/ball physics solver
- player animation library
- fielding AI
- Cinemachine integration
- Addressables
- production multiplayer transport changes

These belong to later implementation phases.
