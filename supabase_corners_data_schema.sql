-- Drop existing tables if they exist
DROP TABLE IF EXISTS corners_statistics CASCADE;
DROP TABLE IF EXISTS corners_metadata CASCADE;

-- Create corners_metadata table to track uploads
CREATE TABLE corners_metadata (
    id SERIAL PRIMARY KEY,
    matchday_number VARCHAR(50) NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    csv_filename VARCHAR(255),
    total_teams INTEGER,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(matchday_number, season)
);

-- Create corners_statistics table to store the actual data
CREATE TABLE corners_statistics (
    id SERIAL PRIMARY KEY,
    matchday_number VARCHAR(50) NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    team_id VARCHAR(100),
    team_image_id VARCHAR(100),
    team_full_name VARCHAR(255) NOT NULL,
    team VARCHAR(255),
    team_abbrev_name VARCHAR(100),
    team_short_name VARCHAR(100),
    newest_team_color VARCHAR(50),
    league_id VARCHAR(100),
    league_name VARCHAR(255),
    gm INTEGER DEFAULT 0,
    xgcornopp DECIMAL(10,4) DEFAULT 0,
    xgcorn DECIMAL(10,4) DEFAULT 0,
    goaloppfromcorner INTEGER DEFAULT 0,
    goalfromcorner INTEGER DEFAULT 0,
    shotoppfromcorner INTEGER DEFAULT 0,
    shotfromcorner INTEGER DEFAULT 0,
    oppcorners INTEGER DEFAULT 0,
    corners INTEGER DEFAULT 0,
    opta_team_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matchday_number, season, team_full_name)
);

-- Add indexes for better performance
CREATE INDEX idx_corners_statistics_matchday ON corners_statistics(matchday_number, season);
CREATE INDEX idx_corners_statistics_team ON corners_statistics(team_full_name);
CREATE INDEX idx_corners_metadata_matchday ON corners_metadata(matchday_number, season);

-- Add foreign key relationship
ALTER TABLE corners_statistics
ADD CONSTRAINT fk_corners_matchday
FOREIGN KEY (matchday_number, season)
REFERENCES corners_metadata(matchday_number, season)
ON DELETE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE corners_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE corners_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on corners_metadata" ON corners_metadata FOR ALL USING (true);
CREATE POLICY "Allow all operations on corners_statistics" ON corners_statistics FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON corners_metadata TO authenticated;
GRANT ALL ON corners_statistics TO authenticated;
GRANT ALL ON corners_metadata TO anon;
GRANT ALL ON corners_statistics TO anon;
GRANT USAGE ON SEQUENCE corners_metadata_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE corners_statistics_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE corners_metadata_id_seq TO anon;
GRANT USAGE ON SEQUENCE corners_statistics_id_seq TO anon;