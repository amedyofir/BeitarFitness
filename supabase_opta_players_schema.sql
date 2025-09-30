-- Opta League Players Schema
-- Table for storing player data from Opta CSV exports

CREATE TABLE IF NOT EXISTS opta_league_players (
    id SERIAL PRIMARY KEY,

    -- Player Identity
    player_id VARCHAR(50),
    player_full_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    opta_person_id VARCHAR(50),

    -- Position & Team
    position VARCHAR(10),
    team VARCHAR(255),
    team_short_name VARCHAR(100),
    team_abbrev VARCHAR(10),
    team_id VARCHAR(50),

    -- League Information
    league_id VARCHAR(50),
    league_name VARCHAR(255),

    -- Basic Stats
    age INTEGER,
    games_played INTEGER,
    minutes_played INTEGER,
    rank INTEGER,

    -- Performance Stats
    goals INTEGER,
    assists INTEGER,
    xg DECIMAL(10,3),
    xa DECIMAL(10,3),
    shots INTEGER,
    shots_on_goal INTEGER,
    pass_accuracy DECIMAL(5,2),
    touches INTEGER,

    -- Defensive Stats
    tackles INTEGER,
    interceptions INTEGER,
    clearances INTEGER,
    aerial_duels_won INTEGER,
    ground_duels_won INTEGER,

    -- Physical Stats
    intensity_percentage DECIMAL(5,2),
    distance_per_game INTEGER,
    max_speed DECIMAL(5,2),

    -- Image
    profile_picture_url TEXT,

    -- Metadata
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opta_players_player_id ON opta_league_players(player_id);
CREATE INDEX IF NOT EXISTS idx_opta_players_team ON opta_league_players(team);
CREATE INDEX IF NOT EXISTS idx_opta_players_position ON opta_league_players(position);
CREATE INDEX IF NOT EXISTS idx_opta_players_name ON opta_league_players(player_full_name);

-- Comments
COMMENT ON TABLE opta_league_players IS 'Player data from Opta CSV exports for league analysis';
COMMENT ON COLUMN opta_league_players.player_id IS 'Unique player identifier from Opta';
COMMENT ON COLUMN opta_league_players.opta_person_id IS 'Opta person ID for cross-referencing';
COMMENT ON COLUMN opta_league_players.xg IS 'Expected Goals';
COMMENT ON COLUMN opta_league_players.xa IS 'Expected Assists';