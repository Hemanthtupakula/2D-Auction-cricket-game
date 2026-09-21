# Auction XI — Phase 2 Data Model

## Principle

Keep the database relational for identity, ownership, money, lifecycle and queryable history.
Use JSONB for extensible payloads and future gameplay data that should not be locked into a
rigid Phase 2 column design.

## Core entities

### Accounts
`accounts`
- account_id (stable application account/member ID)
- normalized_email (unique)
- display_name
- password_hash
- salt
- security_question
- security_answer_hash
- created_at
- updated_at

Do not persist active raw login tokens as plaintext.

### Auction rooms
`auction_rooms`
- room_id
- code (unique)
- name
- host_member_id
- status
- starting_purse_lakhs
- max_franchises
- version
- created_at / updated_at

### Members
`auction_members`
- member_id
- room_id
- account_id (nullable for guest members)
- display_name
- role
- requested_quota
- joined_at
- last_heartbeat

### Franchise ownership
`franchise_allocations`
- room_id
- franchise_code
- owner_type
- member_id
- display name snapshot
- assigned/released timestamps

Unique `(room_id, franchise_code)`.

### Players
`players`
- player_id (preserve source ID; do not replace with an unrelated generated UUID)
- lot_number
- full_name
- country/nationality
- role
- batting_style
- bowling_style
- capped/overseas flags
- auction_set
- base_price_rupees
- source metadata
- IPL/international/domestic/over-graph/source/media JSONB fields as needed
- lifecycle timestamps

### Squads
`squads`
- room_id
- franchise_code
- remaining_purse_lakhs
- total_players
- overseas_players
- timestamps

Unique `(room_id, franchise_code)`.

`squad_players`
- room_id
- franchise_code
- player_id
- purchase_id
- price_lakhs
- acquired_at

Unique `(room_id, player_id)`.

### Auctions
`auction_sessions`
One durable auction lifecycle record per room/auction execution.

`auction_lots`
- lot_id
- auction_session_id
- player_id
- sequence
- category/set
- base_price_lakhs
- current_bid_lakhs
- highest_bidder_franchise
- status
- opened_at / closed_at

`auction_bids`
- bid_id
- room_id
- lot_id/player_id
- franchise_code
- member_id
- amount_lakhs
- sequence
- server_timestamp

`auction_purchases`
- purchase_id
- room_id
- player_id
- franchise_code
- amount_lakhs
- sold/unsold status
- created_at

`auction_events`
- event_id
- room_id
- sequence
- event_type
- payload JSONB
- created_at

### Match history
`matches`
- match_id
- room_id
- season_fixture_id (nullable)
- home/away franchise
- overs
- status
- winner / result text
- authoritative summary counters
- state_snapshot JSONB (optional recovery checkpoint)
- seed
- created_at / completed_at

`match_players`
- match_id
- player_id
- franchise_code
- XI/batting-order/bowler-order metadata JSONB or explicit fields

`match_balls`
- match_id
- delivery_sequence
- innings
- over_number
- ball_in_over
- batter_id
- bowler_id
- outcome
- runs
- wicket/extra flags
- running score counters
- commentary
- shot_intent / bowl_plan where current model supplies them
- simulation_payload JSONB for future richer physics fields
- created_at

This `simulation_payload` is deliberately extensible so future phases can add delivery quality,
timing, contact point, sweet spot, ball movement, trajectory, fielding vectors, etc., without
forcing Phase 2 to redesign the database.

`match_events`
- event_id
- match_id
- sequence
- event_type
- payload JSONB
- created_at

`player_match_stats`
- match_id
- player_id
- franchise_code
- batting/bowling/fielding aggregate fields

### Seasons
`seasons`
- season_id
- room_id
- overs
- double_round_robin
- stage
- champion/runner-up
- awards JSONB
- started_at / completed_at

`season_teams`
- season_id
- franchise_code
- seed_order

`season_fixtures`
- fixture_id
- season_id
- label
- stage
- home/away franchise
- status
- match_id
- winner/loser
- score/result summaries

### Media
`player_media`
- existing registry fields retained
- player ID remains compatible with the existing media JSON registry

## Relationship summary

```text
ACCOUNT 1---N MEMBER N---1 ROOM
ROOM 1---N FRANCHISE_ALLOCATION
ROOM 1---N SQUAD 1---N SQUAD_PLAYER N---1 PLAYER
ROOM 1---1 AUCTION_SESSION 1---N AUCTION_LOT 1---N BID
PLAYER 1---N PURCHASE
ROOM 1---N MATCH
MATCH 1---N MATCH_BALL
MATCH 1---N MATCH_EVENT
MATCH N---1 SEASON_FIXTURE N---1 SEASON
MATCH_PLAYER joins MATCH <-> PLAYER
SEASON 1---N SEASON_TEAM
PLAYER 1---N PLAYER_MEDIA
```

## Important modeling rule

Do not make the Phase 2 database design determine the future cricket simulation. The Phase 2
schema must be capable of storing richer simulation output later while leaving the actual
simulation contracts from Phase 1 authoritative.
