-- ============================================================================
-- AUCTION XI — SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Database: Supabase PostgreSQL (efmavglmkavnzcfsdacl)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AUCTION ROOMS
CREATE TABLE IF NOT EXISTS auction_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    host_member_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'LOBBY',
    max_franchises INT NOT NULL DEFAULT 10,
    starting_purse BIGINT NOT NULL DEFAULT 1200000000, -- 120 Crore in paise/Rupees
    bid_seconds INT NOT NULL DEFAULT 30,
    bid_reset_seconds INT NOT NULL DEFAULT 15,
    version BIGINT NOT NULL DEFAULT 1,
    rebalance_pending BOOLEAN NOT NULL DEFAULT FALSE,
    rebalance_old_host_max INT DEFAULT 4,
    rebalance_new_host_max INT DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_rooms_code ON auction_rooms(code);
CREATE INDEX IF NOT EXISTS idx_auction_rooms_status ON auction_rooms(status);

-- 2. AUCTION MEMBERS
CREATE TABLE IF NOT EXISTS auction_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT', -- 'HOST', 'PARTICIPANT'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_members_room ON auction_members(room_id);

-- 3. FRANCHISE ALLOCATIONS (ATOMIC CONSTRAINTS)
CREATE TABLE IF NOT EXISTS franchise_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
    franchise_code VARCHAR(10) NOT NULL, -- 'MI', 'CSK', 'RCB', 'KKR', 'SRH', 'RR', 'DC', 'PBKS', 'GT', 'LSG'
    owner_type VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED', -- 'HUMAN', 'AI', 'UNASSIGNED'
    member_id UUID REFERENCES auction_members(id) ON DELETE SET NULL,
    member_display_name VARCHAR(100),
    assigned_at TIMESTAMPTZ,
    CONSTRAINT uq_room_franchise UNIQUE (room_id, franchise_code)
);

CREATE INDEX IF NOT EXISTS idx_franchise_allocations_room ON franchise_allocations(room_id);
CREATE INDEX IF NOT EXISTS idx_franchise_allocations_member ON franchise_allocations(member_id);

-- 4. PLAYERS (369 Pool)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number INT UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    country VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'
    batting_style VARCHAR(50),
    bowling_style VARCHAR(50),
    is_overseas BOOLEAN NOT NULL DEFAULT FALSE,
    is_capped BOOLEAN NOT NULL DEFAULT TRUE,
    base_price BIGINT NOT NULL DEFAULT 20000000, -- in Rupees (2 Crore)
    auction_set VARCHAR(20) NOT NULL, -- 'M1', 'BA1', 'AL1', etc.
    photo_url TEXT,
    source_name VARCHAR(100) DEFAULT 'Official IPL Auction List',
    source_checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_set ON players(auction_set);
CREATE INDEX IF NOT EXISTS idx_players_role ON players(role);

-- 5. SQUADS & PURSES
CREATE TABLE IF NOT EXISTS squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
    franchise_code VARCHAR(10) NOT NULL,
    remaining_purse BIGINT NOT NULL DEFAULT 1200000000,
    total_players INT NOT NULL DEFAULT 0,
    overseas_players INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_squad UNIQUE (room_id, franchise_code)
);

-- 6. IMMUTABLE BIDS LEDGER
CREATE TABLE IF NOT EXISTS bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id),
    franchise_code VARCHAR(10) NOT NULL,
    member_id UUID REFERENCES auction_members(id),
    amount BIGINT NOT NULL,
    sequence BIGINT NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_room_seq ON bids(room_id, sequence);

-- 7. PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id),
    franchise_code VARCHAR(10) NOT NULL,
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_room_player_purchase UNIQUE (room_id, player_id)
);

-- 8. AUDIT / EVENT SOURCING LOG
CREATE TABLE IF NOT EXISTS auction_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES auction_rooms(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    sequence BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_events_room_seq ON auction_events(room_id, sequence);

-- 9. PLAYER MEDIA REGISTRY
CREATE TABLE IF NOT EXISTS player_media (
    id VARCHAR(50) PRIMARY KEY,
    player_id VARCHAR(50) NOT NULL,
    media_type VARCHAR(30) NOT NULL DEFAULT 'PORTRAIT', -- 'PORTRAIT', 'THUMBNAIL', 'HERO', 'ACTION'
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'IMAGEKIT', -- 'IMAGEKIT'
    storage_file_id VARCHAR(100),
    storage_path TEXT, -- e.g. '/auction-xi/players/<id>.webp'
    delivery_url TEXT, -- canonical ImageKit delivery URL
    source_url TEXT,
    source_page_url TEXT,
    source_name VARCHAR(150),
    status VARCHAR(50) NOT NULL DEFAULT 'MISSING', -- 'PENDING', 'UPLOADING', 'VERIFIED_IMAGEKIT', 'SOURCE_FALLBACK', 'MISSING', 'FAILED', 'REVIEW_REQUIRED'
    rights_status VARCHAR(50) NOT NULL DEFAULT 'REVIEW_REQUIRED',
    width INT,
    height INT,
    mime_type VARCHAR(50),
    checksum VARCHAR(64),
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_player_media_player ON player_media(player_id);
CREATE INDEX IF NOT EXISTS idx_player_media_status ON player_media(status);
CREATE INDEX IF NOT EXISTS idx_player_media_provider ON player_media(storage_provider);
