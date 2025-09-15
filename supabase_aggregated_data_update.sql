-- Additional schema updates for aggregated team statistics functionality
-- This file contains updates to support the new aggregated data upload feature

-- Create a view specifically for aggregated season data
CREATE OR REPLACE VIEW team_season_aggregated AS
SELECT 
    team_rank,
    team_full_name,
    team_short_name,
    team_abbrev_name,
    team_color,
    season,
    
    -- Performance metrics
    goals_scored,
    expected_assists,
    expected_goals_per_shot,
    expected_goals,
    ground_duels,
    dribbles_successful,
    
    -- Positional play
    start_a3_end_box,
    start_a2_end_box,
    pass_completed_to_box,
    start_a2_end_a3,
    start_a1_end_box,
    seq_start_att_3rd,
    seq_start_mid_3rd,
    
    -- Possession & passing
    aerial_percentage,
    ground_percentage,
    cross_open,
    pass_from_assist_to_golden,
    pass_assist_zone,
    
    -- Shooting
    shots_on_goal_penalty_area,
    shots_on_goal_from_box,
    shot_from_golden,
    shots_on_goal,
    shots_including_blocked,
    actual_goals,
    
    -- Ball control
    touches,
    touch_opponent_box,
    drop_forward_up_percentage,
    possession_won_opponent_half,
    
    -- Tactical
    avg_sequence_time,
    ppda_40,
    
    -- Metadata
    match_date AS uploaded_date,
    created_at,
    updated_at
FROM team_match_statistics
WHERE matchweek = 999  -- Special matchweek for aggregated data
ORDER BY team_rank ASC;

-- Create a view to easily check if aggregated data exists for a season
CREATE OR REPLACE VIEW aggregated_data_status AS
SELECT 
    season,
    COUNT(*) as teams_count,
    MAX(match_date) as last_uploaded,
    MAX(created_at) as last_updated
FROM team_match_statistics
WHERE matchweek = 999
GROUP BY season;

-- Add a comment to the metadata table to document the aggregated data convention
COMMENT ON TABLE team_match_metadata IS 'Stores metadata for both individual match data and aggregated season data. Matchweek 999 is reserved for aggregated season statistics.';

-- Add comments to key columns
COMMENT ON COLUMN team_match_statistics.matchweek IS 'Matchweek number (1-36 for individual matches, 999 for aggregated season data)';
COMMENT ON COLUMN team_match_metadata.matchweek IS 'Matchweek number (1-36 for individual matches, 999 for aggregated season data)';

-- Create an index specifically for aggregated data queries
CREATE INDEX IF NOT EXISTS idx_team_match_aggregated ON team_match_statistics(matchweek, season) WHERE matchweek = 999;

-- Create a function to easily check if aggregated data exists
CREATE OR REPLACE FUNCTION check_aggregated_data_exists(season_param VARCHAR DEFAULT '2025-2026')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM team_match_statistics 
        WHERE matchweek = 999 AND season = season_param
    );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get the count of teams in aggregated data
CREATE OR REPLACE FUNCTION get_aggregated_teams_count(season_param VARCHAR DEFAULT '2025-2026')
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM team_match_statistics 
        WHERE matchweek = 999 AND season = season_param
    );
END;
$$ LANGUAGE plpgsql;

-- Insert a sample aggregated metadata entry to ensure the structure works
-- This will help with testing and ensures the views work correctly
INSERT INTO team_match_metadata (
    matchweek, 
    match_date, 
    competition, 
    league_name, 
    match_type, 
    notes, 
    csv_filename, 
    season, 
    teams_count
) VALUES (
    999,
    CURRENT_DATE,
    'Season Summary',
    'Ligat Ha''al (Israel)',
    'home',
    'Aggregated season statistics - placeholder entry',
    'aggregated_season_data.csv',
    '2025-2026',
    0
) ON CONFLICT (matchweek, season) DO NOTHING;

-- Grant necessary permissions for the new views and functions
GRANT SELECT ON team_season_aggregated TO authenticated;
GRANT SELECT ON aggregated_data_status TO authenticated;
GRANT EXECUTE ON FUNCTION check_aggregated_data_exists TO authenticated;
GRANT EXECUTE ON FUNCTION get_aggregated_teams_count TO authenticated;