-- Simplified Supabase Schema for Raw Running Report Data
-- This stores the CSV data exactly as-is for maximum flexibility

-- Main table for matchday metadata
CREATE TABLE IF NOT EXISTS matchday_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday_number VARCHAR(10) NOT NULL,
  opponent_team VARCHAR(100) NOT NULL,
  match_date DATE,
  season VARCHAR(20) DEFAULT '2025-2026',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by VARCHAR(100),
  
  -- Simple metadata
  total_records INTEGER,
  csv_filename VARCHAR(255),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Unique constraint
  UNIQUE(matchday_number, opponent_team, season)
);

-- Table to store raw CSV data exactly as received
CREATE TABLE IF NOT EXISTS raw_player_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday_report_id UUID REFERENCES matchday_reports(id) ON DELETE CASCADE,
  
  -- Store ALL CSV columns as-is (using original field names)
  player VARCHAR(150) NOT NULL,
  player_full_name VARCHAR(200),
  position VARCHAR(50),
  team_name VARCHAR(100),
  newest_team VARCHAR(100),
  min_field DECIMAL(6,2), -- "Min" is reserved keyword, so using min_field
  min_inc_et DECIMAL(6,2),
  distance_run_first_half DECIMAL(8,2),
  distance_run_scnd_half DECIMAL(8,2),
  first_half_dist_sprint DECIMAL(8,2),
  scnd_half_dist_sprint DECIMAL(8,2),
  first_half_dist_hs_run DECIMAL(8,2),
  scnd_half_dist_hs_run DECIMAL(8,2),
  top_speed DECIMAL(5,2),
  kmh_speed VARCHAR(20), -- Keep as VARCHAR since it can be string or number
  in_poss_dist_sprint DECIMAL(8,2),
  out_poss_dist_sprint DECIMAL(8,2),
  in_poss_dist_hs_run DECIMAL(8,2),
  out_poss_dist_hs_run DECIMAL(8,2),
  distance_run_in_poss DECIMAL(8,2),
  distance_run_out_poss DECIMAL(8,2),
  gs INTEGER,
  pos VARCHAR(20),
  
  -- Store any additional CSV columns as JSON for maximum flexibility
  additional_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_matchday_reports_matchday ON matchday_reports(matchday_number);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_opponent ON matchday_reports(opponent_team);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_season ON matchday_reports(season);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_date ON matchday_reports(match_date);

CREATE INDEX IF NOT EXISTS idx_raw_player_data_report ON raw_player_data(matchday_report_id);
CREATE INDEX IF NOT EXISTS idx_raw_player_data_player ON raw_player_data(player);
CREATE INDEX IF NOT EXISTS idx_raw_player_data_team ON raw_player_data(team_name);
CREATE INDEX IF NOT EXISTS idx_raw_player_data_season_player ON raw_player_data(matchday_report_id, player);

-- Enable RLS
ALTER TABLE matchday_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_player_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on matchday_reports" ON matchday_reports
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on raw_player_data" ON raw_player_data
    FOR ALL USING (true) WITH CHECK (true);

-- View for easy report listing
CREATE OR REPLACE VIEW matchday_reports_list AS
SELECT 
    r.id,
    r.matchday_number,
    r.opponent_team,
    r.match_date,
    r.season,
    r.uploaded_at,
    r.total_records,
    r.csv_filename,
    
    -- Count players by team
    COUNT(CASE WHEN (p.team_name ILIKE '%beitar%' OR p.newest_team ILIKE '%beitar%') THEN 1 END) as beitar_players,
    COUNT(CASE WHEN NOT (p.team_name ILIKE '%beitar%' OR p.newest_team ILIKE '%beitar%') THEN 1 END) as opponent_players
    
FROM matchday_reports r
LEFT JOIN raw_player_data p ON r.id = p.matchday_report_id
WHERE r.is_active = true
GROUP BY r.id, r.matchday_number, r.opponent_team, r.match_date, r.season, r.uploaded_at, r.total_records, r.csv_filename
ORDER BY r.match_date DESC, r.matchday_number DESC;

-- View for player aggregation across all matchdays
CREATE OR REPLACE VIEW player_season_aggregation AS
SELECT 
    p.player,
    p.team_name,
    r.season,
    COUNT(*) as games_played,
    
    -- Distance aggregations
    AVG(p.distance_run_first_half + p.distance_run_scnd_half) as avg_total_distance,
    SUM(p.distance_run_first_half + p.distance_run_scnd_half) as total_distance_season,
    MAX(p.distance_run_first_half + p.distance_run_scnd_half) as max_game_distance,
    MIN(p.distance_run_first_half + p.distance_run_scnd_half) as min_game_distance,
    
    -- Sprint aggregations
    AVG(p.first_half_dist_sprint + p.scnd_half_dist_sprint) as avg_sprint_distance,
    SUM(p.first_half_dist_sprint + p.scnd_half_dist_sprint) as total_sprint_season,
    
    -- High speed running
    AVG(p.first_half_dist_hs_run + p.scnd_half_dist_hs_run) as avg_hsr_distance,
    SUM(p.first_half_dist_hs_run + p.scnd_half_dist_hs_run) as total_hsr_season,
    
    -- Speed
    AVG(CASE WHEN p.kmh_speed ~ '^[0-9]+\.?[0-9]*$' THEN p.kmh_speed::DECIMAL ELSE p.top_speed END) as avg_speed,
    MAX(CASE WHEN p.kmh_speed ~ '^[0-9]+\.?[0-9]*$' THEN p.kmh_speed::DECIMAL ELSE p.top_speed END) as max_speed,
    
    -- Playing time
    AVG(COALESCE(p.min_inc_et, p.min_field)) as avg_minutes,
    SUM(COALESCE(p.min_inc_et, p.min_field)) as total_minutes_season,
    
    -- Calculate avg meters per minute
    AVG(
        CASE 
            WHEN COALESCE(p.min_inc_et, p.min_field) > 0 
            THEN (p.distance_run_first_half + p.distance_run_scnd_half) / COALESCE(p.min_inc_et, p.min_field)
            ELSE 0 
        END
    ) as avg_meters_per_minute,
    
    -- Game dates for reference
    MIN(r.match_date) as first_game,
    MAX(r.match_date) as last_game,
    
    -- List of opponents faced
    STRING_AGG(DISTINCT r.opponent_team, ', ' ORDER BY r.opponent_team) as opponents_faced

FROM raw_player_data p
JOIN matchday_reports r ON p.matchday_report_id = r.id
WHERE r.is_active = true 
  AND COALESCE(p.min_inc_et, p.min_field, 0) > 0  -- Only players who actually played
GROUP BY p.player, p.team_name, r.season;

-- View for player performance vs specific opponents
CREATE OR REPLACE VIEW player_vs_opponent AS
SELECT 
    p.player,
    p.team_name,
    r.opponent_team,
    r.season,
    COUNT(*) as games_vs_opponent,
    
    AVG(p.distance_run_first_half + p.distance_run_scnd_half) as avg_distance_vs_opponent,
    AVG(p.first_half_dist_sprint + p.scnd_half_dist_sprint) as avg_sprint_vs_opponent,
    AVG(CASE WHEN p.kmh_speed ~ '^[0-9]+\.?[0-9]*$' THEN p.kmh_speed::DECIMAL ELSE p.top_speed END) as avg_speed_vs_opponent,
    AVG(COALESCE(p.min_inc_et, p.min_field)) as avg_minutes_vs_opponent,
    
    -- Latest game stats for reference
    MAX(r.match_date) as last_game_date,
    MAX(r.matchday_number) as last_matchday

FROM raw_player_data p
JOIN matchday_reports r ON p.matchday_report_id = r.id
WHERE r.is_active = true 
  AND COALESCE(p.min_inc_et, p.min_field, 0) > 0
GROUP BY p.player, p.team_name, r.opponent_team, r.season;

-- Comments
COMMENT ON TABLE matchday_reports IS 'Stores metadata for each matchday report upload';
COMMENT ON TABLE raw_player_data IS 'Stores raw CSV player data exactly as received for maximum flexibility';
COMMENT ON VIEW player_season_aggregation IS 'Aggregates player performance across all games in a season';
COMMENT ON VIEW player_vs_opponent IS 'Shows player performance against specific opponents';