-- Opta League Players Basic Info Schema
-- Table for stable player information that rarely changes
-- This should NOT be cleared on every upload

CREATE TABLE IF NOT EXISTS opta_league_players_basic (
    id SERIAL PRIMARY KEY,

    -- Player Identity (stable info)
    player_id VARCHAR(50) UNIQUE NOT NULL,
    opta_person_id VARCHAR(50),
    player_full_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),

    -- Position & Team (can change but less frequently)
    position VARCHAR(10),
    team VARCHAR(255),
    team_short_name VARCHAR(100),
    team_abbrev VARCHAR(10),
    team_id VARCHAR(50),

    -- League Information
    league_id VARCHAR(50),
    league_name VARCHAR(255),

    -- Basic Demographics
    age INTEGER,

    -- Image (should be preserved!)
    profile_picture_url TEXT,

    -- Metadata
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opta_basic_player_id ON opta_league_players_basic(player_id);
CREATE INDEX IF NOT EXISTS idx_opta_basic_team ON opta_league_players_basic(team);
CREATE INDEX IF NOT EXISTS idx_opta_basic_position ON opta_league_players_basic(position);
CREATE INDEX IF NOT EXISTS idx_opta_basic_name ON opta_league_players_basic(player_full_name);

-- Comments
COMMENT ON TABLE opta_league_players_basic IS 'Stable player information that persists across data uploads';
COMMENT ON COLUMN opta_league_players_basic.player_id IS 'Unique player identifier from Opta - primary key for joining';
COMMENT ON COLUMN opta_league_players_basic.profile_picture_url IS 'Player photo URL - preserved across uploads';
COMMENT ON COLUMN opta_league_players_basic.first_seen IS 'When this player was first added to our system';
COMMENT ON COLUMN opta_league_players_basic.last_updated IS 'When basic info was last updated';