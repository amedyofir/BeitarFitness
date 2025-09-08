-- Supabase Table Schema for Running Report Datasets
-- This will store complete running report data for each matchday

-- Main table to store matchday running reports
CREATE TABLE IF NOT EXISTS matchday_running_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday_number VARCHAR(10) NOT NULL,
  opponent_team VARCHAR(100) NOT NULL,
  match_date DATE,
  season VARCHAR(20) DEFAULT '2024-2025',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- Metadata
  total_players INTEGER,
  beitar_players_count INTEGER,
  opponent_players_count INTEGER,
  
  -- Match summary data (aggregated team stats)
  beitar_total_distance DECIMAL(10,2),
  beitar_avg_mpm DECIMAL(6,2),
  beitar_avg_intensity DECIMAL(5,2),
  beitar_avg_speed DECIMAL(5,2),
  beitar_almog_score DECIMAL(5,2),
  
  opponent_total_distance DECIMAL(10,2),
  opponent_avg_mpm DECIMAL(6,2),
  opponent_avg_intensity DECIMAL(5,2),
  opponent_avg_speed DECIMAL(5,2),
  opponent_almog_score DECIMAL(5,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Unique constraint to prevent duplicates
  UNIQUE(matchday_number, opponent_team, season)
);

-- Table to store individual player data for each report
CREATE TABLE IF NOT EXISTS matchday_player_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES matchday_running_reports(id) ON DELETE CASCADE,
  
  -- Player identification
  player_name VARCHAR(100) NOT NULL,
  player_full_name VARCHAR(150),
  position VARCHAR(50),
  team_name VARCHAR(100) NOT NULL,
  newest_team VARCHAR(100),
  
  -- Playing time
  minutes DECIMAL(5,2),
  minutes_including_et DECIMAL(5,2),
  
  -- Distance metrics
  distance_run_first_half DECIMAL(8,2),
  distance_run_second_half DECIMAL(8,2),
  total_distance DECIMAL(8,2), -- Calculated field
  
  -- Sprint distances
  first_half_dist_sprint DECIMAL(8,2),
  second_half_dist_sprint DECIMAL(8,2),
  total_sprint_distance DECIMAL(8,2), -- Calculated field
  
  -- High speed running distances
  first_half_dist_hsr DECIMAL(8,2),
  second_half_dist_hsr DECIMAL(8,2),
  total_hsr_distance DECIMAL(8,2), -- Calculated field
  
  -- Speed metrics
  top_speed DECIMAL(5,2),
  kmh_speed DECIMAL(5,2),
  
  -- Possession-based metrics
  in_poss_dist_sprint DECIMAL(8,2),
  out_poss_dist_sprint DECIMAL(8,2),
  in_poss_dist_hsr DECIMAL(8,2),
  out_poss_dist_hsr DECIMAL(8,2),
  distance_run_in_poss DECIMAL(8,2),
  distance_run_out_poss DECIMAL(8,2),
  
  -- Calculated performance metrics
  meters_per_minute DECIMAL(6,2),
  intensity_percentage DECIMAL(5,2),
  almog_score DECIMAL(5,2),
  
  -- Additional fields
  gs_number INTEGER,
  position_code VARCHAR(10),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index on report_id for fast queries
  CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES matchday_running_reports(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matchday_reports_matchday ON matchday_running_reports(matchday_number);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_opponent ON matchday_running_reports(opponent_team);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_season ON matchday_running_reports(season);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_date ON matchday_running_reports(match_date);
CREATE INDEX IF NOT EXISTS idx_matchday_reports_active ON matchday_running_reports(is_active);

CREATE INDEX IF NOT EXISTS idx_player_data_report ON matchday_player_data(report_id);
CREATE INDEX IF NOT EXISTS idx_player_data_team ON matchday_player_data(team_name);
CREATE INDEX IF NOT EXISTS idx_player_data_player ON matchday_player_data(player_name);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_matchday_reports_updated_at 
    BEFORE UPDATE ON matchday_running_reports 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE matchday_running_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchday_player_data ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- For now, allowing all operations - you can restrict later
CREATE POLICY "Allow all operations on matchday_running_reports" ON matchday_running_reports
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on matchday_player_data" ON matchday_player_data
    FOR ALL USING (true) WITH CHECK (true);

-- Create a view for easy data retrieval with calculated fields
CREATE OR REPLACE VIEW matchday_reports_summary AS
SELECT 
    r.id,
    r.matchday_number,
    r.opponent_team,
    r.match_date,
    r.season,
    r.created_at,
    r.total_players,
    r.beitar_players_count,
    r.opponent_players_count,
    
    -- Team comparison
    r.beitar_total_distance,
    r.opponent_total_distance,
    (r.beitar_total_distance - r.opponent_total_distance) as distance_difference,
    
    r.beitar_avg_speed,
    r.opponent_avg_speed,
    (r.beitar_avg_speed - r.opponent_avg_speed) as speed_difference,
    
    r.beitar_avg_intensity,
    r.opponent_avg_intensity,
    (r.beitar_avg_intensity - r.opponent_avg_intensity) as intensity_difference,
    
    r.beitar_almog_score,
    r.opponent_almog_score,
    (r.beitar_almog_score - r.opponent_almog_score) as almog_difference,
    
    -- Determine winner
    CASE 
        WHEN r.beitar_almog_score > r.opponent_almog_score THEN 'Beitar'
        WHEN r.opponent_almog_score > r.beitar_almog_score THEN r.opponent_team
        ELSE 'Draw'
    END as almog_winner
    
FROM matchday_running_reports r
WHERE r.is_active = true
ORDER BY r.match_date DESC, r.matchday_number DESC;

-- Comments for documentation
COMMENT ON TABLE matchday_running_reports IS 'Stores metadata and summary statistics for each matchday running report';
COMMENT ON TABLE matchday_player_data IS 'Stores detailed running data for each player in each matchday report';
COMMENT ON VIEW matchday_reports_summary IS 'Provides a summary view with calculated differences and winner determination';