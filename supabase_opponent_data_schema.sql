-- Opponent Analysis Database Schema
-- Similar to team_match_statistics but for opponent data analysis

-- Table for opponent statistics (aggregated across all matchdays)
CREATE TABLE IF NOT EXISTS opponent_statistics (
    id SERIAL PRIMARY KEY,
    
    -- Opponent Information
    opponent_name VARCHAR(255) NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    
    -- Team Information (same structure as team_match_statistics)
    team_rank INTEGER,
    team_id VARCHAR(50),
    team_image_id VARCHAR(50),
    team_full_name VARCHAR(255) NOT NULL,
    team_short_name VARCHAR(100),
    team_abbrev_name VARCHAR(10),
    team_color VARCHAR(7),
    opta_team_id VARCHAR(50),
    
    -- League Information
    league_id VARCHAR(50),
    league_name VARCHAR(255),
    
    -- Match Performance Metrics (aggregated)
    goals_scored DECIMAL(10,2),
    expected_assists DECIMAL(10,2),
    expected_goals_per_shot DECIMAL(10,2),
    expected_goals DECIMAL(10,2),
    ground_duels DECIMAL(10,2),
    dribbles_successful INTEGER,
    
    -- Positional Play Metrics (aggregated)
    start_a3_end_box INTEGER,
    start_a2_end_box INTEGER,
    pass_completed_to_box INTEGER,
    end_box_using_corner INTEGER,
    start_a2_end_a3 INTEGER,
    start_a1_end_box INTEGER,
    start_a2_end_a3_alt INTEGER,
    start_a1_end_a3 INTEGER,
    start_a1_end_a2 INTEGER,
    seq_start_att_3rd INTEGER,
    seq_start_mid_3rd INTEGER,
    seq_start_a1 INTEGER,
    
    -- Possession & Passing (averaged)
    aerial_percentage DECIMAL(5,2),
    ground_percentage DECIMAL(5,2),
    cross_open INTEGER,
    pass_from_assist_to_golden INTEGER,
    pass_assist_zone INTEGER,
    
    -- Shooting Metrics (aggregated)
    shots_on_goal_penalty_area INTEGER,
    shots_on_goal_from_box INTEGER,
    shot_from_golden INTEGER,
    shot_from_box INTEGER,
    shots_on_goal INTEGER,
    shots_including_blocked INTEGER,
    actual_goals DECIMAL(10,2),
    
    -- Ball Control (aggregated)
    touches INTEGER,
    touch_opponent_box INTEGER,
    drop_forward_up_percentage DECIMAL(5,2),
    possession_won_opponent_half INTEGER,
    
    -- Tactical Metrics (averaged)
    avg_sequence_time DECIMAL(10,2),
    ppda_40 DECIMAL(10,2),
    
    -- Metadata
    total_matchdays INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    csv_filename VARCHAR(255),
    notes TEXT,
    
    -- Unique constraint per opponent per season
    UNIQUE(opponent_name, season)
);

-- Table for opponent metadata
CREATE TABLE IF NOT EXISTS opponent_metadata (
    id SERIAL PRIMARY KEY,
    opponent_name VARCHAR(255) NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    total_teams INTEGER DEFAULT 0,
    total_matchdays INTEGER DEFAULT 0,
    csv_filename VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),
    notes TEXT,
    
    -- Unique constraint per opponent per season
    UNIQUE(opponent_name, season)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opponent_statistics_opponent_season ON opponent_statistics(opponent_name, season);
CREATE INDEX IF NOT EXISTS idx_opponent_statistics_team_name ON opponent_statistics(team_full_name);
CREATE INDEX IF NOT EXISTS idx_opponent_metadata_opponent_season ON opponent_metadata(opponent_name, season);

-- Comments
COMMENT ON TABLE opponent_statistics IS 'Aggregated opponent team statistics across all matchdays for analysis';
COMMENT ON TABLE opponent_metadata IS 'Metadata for opponent analysis uploads';
COMMENT ON COLUMN opponent_statistics.opponent_name IS 'Name of the opponent we are analyzing (e.g., Hapoel Tel Aviv)';
COMMENT ON COLUMN opponent_statistics.total_matchdays IS 'Number of matchdays included in this aggregated data';