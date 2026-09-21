-- Auction XI Phase 2 reference migration
-- Target: Supabase PostgreSQL
-- No credentials are stored here.

create extension if not exists pgcrypto;

create table if not exists accounts (
    account_id varchar(64) primary key,
    normalized_email varchar(255) not null unique,
    display_name varchar(100) not null,
    password_hash varchar(255) not null,
    salt varchar(255) not null,
    security_question varchar(255),
    security_answer_hash varchar(255),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists auction_rooms (
    room_id varchar(64) primary key,
    code varchar(10) not null unique,
    name varchar(100) not null,
    host_member_id varchar(64) not null,
    status varchar(40) not null,
    max_franchises integer not null default 10,
    starting_purse_lakhs bigint not null default 10000,
    version bigint not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_auction_rooms_status on auction_rooms(status);

create table if not exists auction_members (
    member_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    account_id varchar(64) references accounts(account_id) on delete set null,
    display_name varchar(100) not null,
    role varchar(30) not null default 'PARTICIPANT',
    requested_quota integer not null default 1,
    joined_at timestamptz not null default now(),
    last_heartbeat timestamptz not null default now()
);
create index if not exists idx_auction_members_room on auction_members(room_id);

create table if not exists franchise_allocations (
    allocation_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    franchise_code varchar(10) not null,
    owner_type varchar(20) not null default 'UNASSIGNED',
    member_id varchar(64) references auction_members(member_id) on delete set null,
    member_display_name varchar(100),
    assigned_at timestamptz,
    released_at timestamptz,
    unique (room_id, franchise_code)
);
create index if not exists idx_franchise_alloc_room on franchise_allocations(room_id);
create index if not exists idx_franchise_alloc_member on franchise_allocations(member_id);

create table if not exists players (
    player_id varchar(64) primary key,
    lot_number integer unique,
    full_name varchar(150) not null,
    country varchar(100),
    nationality varchar(100),
    age integer,
    role varchar(50),
    batting_style varchar(50),
    bowling_style varchar(50),
    is_overseas boolean not null default false,
    is_capped boolean not null default true,
    auction_set varchar(30),
    base_price_rupees bigint,
    source_name varchar(150),
    source_url text,
    source_checked_at timestamptz,
    photo_url text,
    ipl_stats jsonb,
    international_stats jsonb,
    recent_stats jsonb,
    domestic_stats jsonb,
    over_graph jsonb,
    media jsonb,
    status varchar(40),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists idx_players_auction_set on players(auction_set);
create index if not exists idx_players_role on players(role);
create index if not exists idx_players_overseas on players(is_overseas);

create table if not exists squads (
    squad_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    franchise_code varchar(10) not null,
    remaining_purse_lakhs bigint not null default 10000,
    total_players integer not null default 0,
    overseas_players integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (room_id, franchise_code)
);

create table if not exists auction_sessions (
    auction_session_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    status varchar(40) not null,
    started_at timestamptz,
    completed_at timestamptz,
    version bigint not null default 1,
    unique (room_id)
);

create table if not exists auction_lots (
    lot_id varchar(64) primary key,
    auction_session_id varchar(64) not null references auction_sessions(auction_session_id) on delete cascade,
    player_id varchar(64) not null references players(player_id),
    sequence_no bigint not null,
    category varchar(30),
    category_name varchar(100),
    base_price_lakhs bigint not null,
    current_bid_lakhs bigint not null,
    highest_bidder_franchise varchar(10),
    status varchar(30) not null,
    opened_at timestamptz,
    closed_at timestamptz,
    unique (auction_session_id, sequence_no)
);
create index if not exists idx_auction_lots_player on auction_lots(player_id);

create table if not exists auction_bids (
    bid_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    lot_id varchar(64) references auction_lots(lot_id) on delete set null,
    player_id varchar(64) not null references players(player_id),
    franchise_code varchar(10) not null,
    member_id varchar(64) references auction_members(member_id) on delete set null,
    amount_lakhs bigint not null,
    sequence_no bigint not null,
    server_timestamp timestamptz not null default now(),
    unique (room_id, sequence_no)
);
create index if not exists idx_auction_bids_room_seq on auction_bids(room_id, sequence_no);

create table if not exists auction_purchases (
    purchase_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    player_id varchar(64) not null references players(player_id),
    franchise_code varchar(10) not null,
    amount_lakhs bigint not null,
    status varchar(20) not null default 'SOLD',
    created_at timestamptz not null default now(),
    unique (room_id, player_id)
);

create table if not exists squad_players (
    squad_player_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    franchise_code varchar(10) not null,
    player_id varchar(64) not null references players(player_id),
    purchase_id varchar(64) references auction_purchases(purchase_id) on delete set null,
    price_lakhs bigint,
    acquired_at timestamptz not null default now(),
    unique (room_id, player_id)
);
create index if not exists idx_squad_players_franchise on squad_players(room_id, franchise_code);

create table if not exists auction_events (
    event_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    sequence_no bigint not null,
    event_type varchar(60) not null,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    unique (room_id, sequence_no)
);
create index if not exists idx_auction_events_type on auction_events(event_type);

create table if not exists seasons (
    season_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    overs integer not null default 2,
    double_round_robin boolean not null default false,
    stage varchar(30) not null,
    champion_franchise varchar(10),
    runner_up_franchise varchar(10),
    awards jsonb,
    started_at timestamptz not null default now(),
    completed_at timestamptz
);
create index if not exists idx_seasons_room on seasons(room_id);

create table if not exists season_teams (
    season_team_id varchar(64) primary key,
    season_id varchar(64) not null references seasons(season_id) on delete cascade,
    franchise_code varchar(10) not null,
    seed_order integer,
    unique (season_id, franchise_code)
);

create table if not exists season_fixtures (
    fixture_id varchar(64) primary key,
    season_id varchar(64) not null references seasons(season_id) on delete cascade,
    label varchar(120) not null,
    stage varchar(30) not null,
    home_franchise varchar(10) not null,
    away_franchise varchar(10) not null,
    status varchar(30) not null,
    match_id varchar(64),
    winner_franchise varchar(10),
    loser_franchise varchar(10),
    home_runs integer not null default 0,
    home_balls integer not null default 0,
    away_runs integer not null default 0,
    away_balls integer not null default 0,
    result_text text
);
create index if not exists idx_season_fixtures_season on season_fixtures(season_id);
create index if not exists idx_season_fixtures_status on season_fixtures(status);

create table if not exists matches (
    match_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    season_fixture_id varchar(64),
    home_franchise varchar(10) not null,
    away_franchise varchar(10) not null,
    overs integer not null,
    status varchar(40) not null,
    winner_franchise varchar(10),
    result_text text,
    home_runs integer not null default 0,
    home_wickets integer not null default 0,
    home_balls integer not null default 0,
    away_runs integer not null default 0,
    away_wickets integer not null default 0,
    away_balls integer not null default 0,
    seed bigint not null,
    state_snapshot jsonb,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);
create index if not exists idx_matches_room on matches(room_id);
create index if not exists idx_matches_fixture on matches(season_fixture_id);
create index if not exists idx_matches_status on matches(status);

create table if not exists match_players (
    match_player_id varchar(64) primary key,
    match_id varchar(64) not null references matches(match_id) on delete cascade,
    player_id varchar(64) not null references players(player_id),
    franchise_code varchar(10) not null,
    role_in_match varchar(30),
    metadata jsonb,
    unique (match_id, player_id)
);

create table if not exists match_balls (
    match_ball_id varchar(64) primary key,
    match_id varchar(64) not null references matches(match_id) on delete cascade,
    delivery_sequence bigint not null,
    innings integer not null,
    over_number integer not null,
    ball_in_over integer not null,
    batting_franchise varchar(10),
    bowling_franchise varchar(10),
    batter_id varchar(64) references players(player_id),
    bowler_id varchar(64) references players(player_id),
    outcome varchar(30),
    runs integer not null default 0,
    wicket boolean not null default false,
    extra boolean not null default false,
    score_runs integer not null default 0,
    score_wickets integer not null default 0,
    score_balls integer not null default 0,
    target integer,
    commentary text,
    shot_intent varchar(20),
    bowl_plan varchar(20),
    simulation_payload jsonb,
    created_at timestamptz not null default now(),
    unique (match_id, delivery_sequence)
);
create index if not exists idx_match_balls_match on match_balls(match_id, delivery_sequence);

create table if not exists match_events (
    event_id varchar(64) primary key,
    match_id varchar(64) not null references matches(match_id) on delete cascade,
    sequence_no bigint not null,
    event_type varchar(60) not null,
    payload jsonb not null,
    created_at timestamptz not null default now(),
    unique (match_id, sequence_no)
);

create table if not exists player_match_stats (
    player_match_stat_id varchar(64) primary key,
    match_id varchar(64) not null references matches(match_id) on delete cascade,
    player_id varchar(64) not null references players(player_id),
    franchise_code varchar(10) not null,
    runs integer not null default 0,
    balls_faced integer not null default 0,
    fours integer not null default 0,
    sixes integer not null default 0,
    wickets integer not null default 0,
    balls_bowled integer not null default 0,
    runs_conceded integer not null default 0,
    unique (match_id, player_id)
);

create table if not exists player_media (
    id varchar(64) primary key,
    player_id varchar(64) not null references players(player_id) on delete cascade,
    media_type varchar(30) not null default 'PORTRAIT',
    storage_provider varchar(50) not null default 'IMAGEKIT',
    storage_file_id varchar(100),
    storage_path text,
    delivery_url text,
    source_url text,
    source_page_url text,
    source_name varchar(150),
    status varchar(50) not null default 'MISSING',
    rights_status varchar(50) not null default 'REVIEW_REQUIRED',
    width integer,
    height integer,
    mime_type varchar(50),
    checksum varchar(64),
    is_primary boolean not null default true,
    sort_order integer not null default 0,
    retrieved_at timestamptz,
    updated_at timestamptz not null default now(),
    error_message text
);
create index if not exists idx_player_media_player on player_media(player_id);
create index if not exists idx_player_media_status on player_media(status);

-- Recovery checkpoints for hot room state without writing every timer tick.
create table if not exists room_state_snapshots (
    snapshot_id varchar(64) primary key,
    room_id varchar(64) not null references auction_rooms(room_id) on delete cascade,
    version bigint not null,
    state jsonb not null,
    created_at timestamptz not null default now(),
    unique (room_id, version)
);
create index if not exists idx_room_snapshots_latest on room_state_snapshots(room_id, version desc);
