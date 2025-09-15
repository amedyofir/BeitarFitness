-- Create table for storing team match statistics data
CREATE TABLE IF NOT EXISTS team_match_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matchweek INTEGER NOT NULL,
    match_date DATE NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    
    -- Team Information
    team_rank INTEGER,
    team_id VARCHAR(100),
    team_image_id VARCHAR(100),
    team_full_name VARCHAR(255) NOT NULL,
    team_short_name VARCHAR(100),
    team_abbrev_name VARCHAR(50),
    team_color VARCHAR(20),
    opta_team_id VARCHAR(100),
    
    -- League Information
    league_id VARCHAR(100),
    league_name VARCHAR(255),
    
    -- Match Performance Metrics
    goals_scored INTEGER,
    expected_assists DECIMAL(5,2),
    expected_goals_per_shot DECIMAL(5,3),
    expected_goals DECIMAL(5,2),
    ground_duels INTEGER,
    dribbles_successful INTEGER,
    
    -- Positional Play Metrics
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
    
    -- Possession & Passing
    aerial_percentage DECIMAL(5,2),
    ground_percentage DECIMAL(5,2),
    cross_open INTEGER,
    pass_from_assist_to_golden INTEGER,
    pass_assist_zone INTEGER,
    
    -- Shooting Metrics
    shots_on_goal_penalty_area INTEGER,
    shots_on_goal_from_box INTEGER,
    shot_from_golden INTEGER,
    shot_from_box INTEGER,
    shots_on_goal INTEGER,
    shots_including_blocked INTEGER,
    actual_goals DECIMAL(5,2), -- xG
    
    -- Ball Control
    touches INTEGER,
    touch_opponent_box INTEGER,
    drop_forward_up_percentage DECIMAL(5,2),
    possession_won_opponent_half INTEGER,
    
    -- Tactical Metrics
    avg_sequence_time DECIMAL(5,1),
    ppda_40 DECIMAL(5,2), -- Passes per Defensive Action
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(matchweek, team_full_name, season)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_team_match_matchweek ON team_match_statistics(matchweek, season);
CREATE INDEX IF NOT EXISTS idx_team_match_team ON team_match_statistics(team_full_name);
CREATE INDEX IF NOT EXISTS idx_team_match_date ON team_match_statistics(match_date);
CREATE INDEX IF NOT EXISTS idx_team_match_league ON team_match_statistics(league_id);

-- Create table for team match metadata
CREATE TABLE IF NOT EXISTS team_match_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matchweek INTEGER NOT NULL,
    match_date DATE NOT NULL,
    competition VARCHAR(100) DEFAULT 'Ligat Ha''al',
    league_name VARCHAR(255) DEFAULT 'Ligat Ha''al (Israel)',
    match_type VARCHAR(50), -- 'home' or 'away' (if available)
    notes TEXT,
    csv_filename VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),
    season VARCHAR(20) DEFAULT '2025-2026',
    teams_count INTEGER, -- Number of teams in the data
    UNIQUE(matchweek, season)
);

-- Create view for Beitar Jerusalem specific performance
CREATE OR REPLACE VIEW beitar_team_performance AS
SELECT 
    matchweek,
    match_date,
    season,
    team_rank,
    goals_scored,
    expected_goals,
    expected_goals_per_shot,
    shots_on_goal,
    shots_including_blocked,
    touches,
    touch_opponent_box,
    possession_won_opponent_half,
    ground_duels,
    dribbles_successful,
    avg_sequence_time,
    ppda_40,
    aerial_percentage,
    ground_percentage,
    created_at
FROM team_match_statistics
WHERE team_full_name = 'Beitar Jerusalem'
ORDER BY match_date DESC;

-- Create view for league standings/comparison
CREATE OR REPLACE VIEW league_team_standings AS
SELECT 
    matchweek,
    match_date,
    season,
    team_rank,
    team_full_name,
    team_short_name,
    goals_scored,
    expected_goals,
    shots_on_goal,
    touches,
    possession_won_opponent_half,
    ground_duels,
    ppda_40
FROM team_match_statistics
ORDER BY matchweek DESC, team_rank ASC;

-- Add RLS (Row Level Security) policies
ALTER TABLE team_match_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_match_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow read access for all authenticated users" ON team_match_statistics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON team_match_statistics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON team_match_statistics
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON team_match_statistics
    FOR DELETE USING (auth.role() = 'authenticated');

-- Same policies for metadata table
CREATE POLICY "Allow read access for all authenticated users" ON team_match_metadata
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON team_match_metadata
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON team_match_metadata
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON team_match_metadata
    FOR DELETE USING (auth.role() = 'authenticated');