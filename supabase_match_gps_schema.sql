-- Create table for storing match GPS data
CREATE TABLE IF NOT EXISTS match_gps_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matchweek INTEGER NOT NULL,
    match_date DATE NOT NULL,
    opponent VARCHAR(255) NOT NULL,
    match_type VARCHAR(50) NOT NULL, -- 'home' or 'away'
    player_name VARCHAR(255) NOT NULL,
    position VARCHAR(50),
    minutes_played DECIMAL(5,2),
    total_distance DECIMAL(10,2),
    hsr_distance DECIMAL(10,2), -- High Speed Running
    sprint_distance DECIMAL(10,2),
    accelerations INTEGER,
    decelerations INTEGER,
    max_speed DECIMAL(5,2),
    avg_speed DECIMAL(5,2),
    sprints INTEGER,
    top_speed_percentage DECIMAL(5,2),
    metabolic_power DECIMAL(10,2),
    hmld DECIMAL(10,2), -- High Metabolic Load Distance
    dynamic_stress_load DECIMAL(10,2),
    total_loading DECIMAL(10,2),
    fatigue_index DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    season VARCHAR(20) DEFAULT '2025-2026',
    UNIQUE(matchweek, player_name, season)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_match_gps_matchweek ON match_gps_data(matchweek, season);
CREATE INDEX IF NOT EXISTS idx_match_gps_player ON match_gps_data(player_name);
CREATE INDEX IF NOT EXISTS idx_match_gps_date ON match_gps_data(match_date);

-- Create table for match metadata
CREATE TABLE IF NOT EXISTS match_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matchweek INTEGER NOT NULL,
    match_date DATE NOT NULL,
    opponent VARCHAR(255) NOT NULL,
    match_type VARCHAR(50) NOT NULL,
    competition VARCHAR(100),
    result VARCHAR(20), -- e.g., '2-1 W'
    formation VARCHAR(20), -- e.g., '4-3-3'
    weather_conditions VARCHAR(100),
    notes TEXT,
    csv_filename VARCHAR(255),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255),
    season VARCHAR(20) DEFAULT '2025-2026',
    UNIQUE(matchweek, season)
);

-- Create view for latest match data per player
CREATE OR REPLACE VIEW latest_match_performance AS
SELECT DISTINCT ON (player_name)
    player_name,
    matchweek,
    match_date,
    opponent,
    total_distance,
    hsr_distance,
    sprint_distance,
    max_speed,
    minutes_played
FROM match_gps_data
ORDER BY player_name, match_date DESC;

-- Create view for season averages per player
CREATE OR REPLACE VIEW season_averages AS
SELECT 
    player_name,
    COUNT(*) as matches_played,
    AVG(minutes_played) as avg_minutes,
    AVG(total_distance) as avg_distance,
    AVG(hsr_distance) as avg_hsr,
    AVG(sprint_distance) as avg_sprint,
    AVG(max_speed) as avg_max_speed,
    MAX(max_speed) as top_speed,
    AVG(accelerations) as avg_accelerations,
    AVG(decelerations) as avg_decelerations
FROM match_gps_data
WHERE minutes_played > 0
GROUP BY player_name;

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE match_gps_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow read access for all authenticated users" ON match_gps_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON match_gps_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON match_gps_data
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON match_gps_data
    FOR DELETE USING (auth.role() = 'authenticated');

-- Same policies for metadata table
CREATE POLICY "Allow read access for all authenticated users" ON match_metadata
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert for authenticated users" ON match_metadata
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON match_metadata
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON match_metadata
    FOR DELETE USING (auth.role() = 'authenticated');