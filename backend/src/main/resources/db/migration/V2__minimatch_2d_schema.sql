-- Flyway migration V2: 2D Mini Match schema extensions
-- Target: Supabase PostgreSQL / H2 in-memory test compatibility

CREATE TABLE IF NOT EXISTS auction_rooms (
    room_id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    host_member_id VARCHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL,
    max_franchises INTEGER NOT NULL DEFAULT 10,
    starting_purse_lakhs BIGINT NOT NULL DEFAULT 10000,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
    player_id VARCHAR(64) PRIMARY KEY,
    lot_number INTEGER UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    short_name VARCHAR(50),
    country VARCHAR(50),
    nationality VARCHAR(50),
    age INTEGER,
    role VARCHAR(50) NOT NULL,
    batting_style VARCHAR(50),
    bowling_style VARCHAR(50),
    is_overseas BOOLEAN NOT NULL DEFAULT FALSE,
    is_capped BOOLEAN NOT NULL DEFAULT TRUE,
    auction_set VARCHAR(50),
    base_price_lakhs BIGINT NOT NULL DEFAULT 200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mini_match_proposals (
    proposal_id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL REFERENCES auction_rooms(room_id) ON DELETE CASCADE,
    creator_owner_id VARCHAR(64) NOT NULL,
    opponent_owner_id VARCHAR(64) NOT NULL,
    franchise_a VARCHAR(10) NOT NULL,
    franchise_b VARCHAR(10) NOT NULL,
    overs INTEGER NOT NULL DEFAULT 5,
    status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mini_match_proposals_room ON mini_match_proposals(room_id);
CREATE INDEX IF NOT EXISTS idx_mini_match_proposals_status ON mini_match_proposals(status);

CREATE TABLE IF NOT EXISTS mini_matches_2d (
    match_id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL REFERENCES auction_rooms(room_id) ON DELETE CASCADE,
    proposal_id VARCHAR(64) REFERENCES mini_match_proposals(proposal_id) ON DELETE SET NULL,
    creator_owner_id VARCHAR(64) NOT NULL,
    opponent_owner_id VARCHAR(64) NOT NULL,
    franchise_a VARCHAR(10) NOT NULL,
    franchise_b VARCHAR(10) NOT NULL,
    overs INTEGER NOT NULL DEFAULT 5,
    state VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
    toss_winner_owner_id VARCHAR(64),
    toss_choice VARCHAR(10),
    paused_by_owner_id VARCHAR(64),
    winner_owner_id VARCHAR(64),
    result_text TEXT,
    snapshot_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mini_matches_2d_room ON mini_matches_2d(room_id);
CREATE INDEX IF NOT EXISTS idx_mini_matches_2d_state ON mini_matches_2d(state);

CREATE TABLE IF NOT EXISTS mini_match_xi (
    xi_id VARCHAR(64) PRIMARY KEY,
    match_id VARCHAR(64) NOT NULL REFERENCES mini_matches_2d(match_id) ON DELETE CASCADE,
    owner_id VARCHAR(64) NOT NULL,
    franchise_code VARCHAR(10) NOT NULL,
    player_ids TEXT NOT NULL,
    captain_id VARCHAR(64),
    wicketkeeper_id VARCHAR(64),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    UNIQUE (match_id, owner_id)
);

CREATE TABLE IF NOT EXISTS mini_match_player_stats (
    stat_id VARCHAR(64) PRIMARY KEY,
    match_id VARCHAR(64) NOT NULL REFERENCES mini_matches_2d(match_id) ON DELETE CASCADE,
    player_id VARCHAR(64) NOT NULL REFERENCES players(player_id),
    owner_id VARCHAR(64) NOT NULL,
    franchise_code VARCHAR(10) NOT NULL,
    runs INTEGER NOT NULL DEFAULT 0,
    balls_faced INTEGER NOT NULL DEFAULT 0,
    fours INTEGER NOT NULL DEFAULT 0,
    sixes INTEGER NOT NULL DEFAULT 0,
    wickets INTEGER NOT NULL DEFAULT 0,
    overs_bowled DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    runs_conceded INTEGER NOT NULL DEFAULT 0,
    dots_bowled INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
