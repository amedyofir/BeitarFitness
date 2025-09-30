-- Opta Performance Data Schema
-- Table for frequently updated performance stats that change with each CSV upload
-- This is separate from the stable player info table

CREATE TABLE IF NOT EXISTS opta_performance_data (
    id SERIAL PRIMARY KEY,

    -- Foreign key to link with opta_league_players
    player_id VARCHAR(50) NOT NULL,
    opta_person_id VARCHAR(50),

    -- Season/Period info
    season VARCHAR(20) DEFAULT '2025-2026',
    data_period VARCHAR(50), -- e.g., "Season 2025-26", "Last 10 games", etc.

    -- Basic match info
    games_played INTEGER,
    minutes_played INTEGER,

    -- Performance Stats (these change frequently)
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

    -- Rankings (these change)
    rank INTEGER,

    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    csv_filename VARCHAR(255),

    -- Ensure we don't have duplicate data for same player/period
    UNIQUE(player_id, season, data_period)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opta_performance_player_id ON opta_performance_data(player_id);
CREATE INDEX IF NOT EXISTS idx_opta_performance_season ON opta_performance_data(season);
CREATE INDEX IF NOT EXISTS idx_opta_performance_period ON opta_performance_data(data_period);

-- Comments
COMMENT ON TABLE opta_performance_data IS 'Frequently updated performance statistics from Opta CSV uploads';
COMMENT ON COLUMN opta_performance_data.player_id IS 'Links to opta_league_players.player_id';
COMMENT ON COLUMN opta_performance_data.data_period IS 'Period these stats cover (e.g., season, last 10 games)';
COMMENT ON COLUMN opta_performance_data.csv_filename IS 'Source CSV file for tracking data provenance';