-- Simplified Opponent Analysis Database Schema
-- Create tables with basic structure first

-- Drop existing tables if they exist
DROP TABLE IF EXISTS opponent_statistics CASCADE;
DROP TABLE IF EXISTS opponent_metadata CASCADE;

-- Simple opponent statistics table
CREATE TABLE opponent_statistics (
    id SERIAL PRIMARY KEY,
    
    -- Basic Information
    opponent_name VARCHAR(255) NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    team_full_name VARCHAR(255) NOT NULL,
    
    -- Basic Stats (making all optional)
    goals_scored DECIMAL(10,2),
    shots_on_goal INTEGER,
    touches INTEGER,
    
    -- Metadata
    total_matchdays INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per opponent per season
    UNIQUE(opponent_name, season, team_full_name)
);

-- Simple opponent metadata table
CREATE TABLE opponent_metadata (
    id SERIAL PRIMARY KEY,
    opponent_name VARCHAR(255) NOT NULL,
    season VARCHAR(20) DEFAULT '2025-2026',
    total_teams INTEGER DEFAULT 0,
    total_matchdays INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint per opponent per season
    UNIQUE(opponent_name, season)
);

-- Create indexes
CREATE INDEX idx_opponent_statistics_opponent_season ON opponent_statistics(opponent_name, season);
CREATE INDEX idx_opponent_metadata_opponent_season ON opponent_metadata(opponent_name, season);

-- Disable RLS for now to avoid permission issues
ALTER TABLE opponent_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE opponent_metadata ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing
CREATE POLICY "Allow all operations on opponent_statistics" ON opponent_statistics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on opponent_metadata" ON opponent_metadata FOR ALL USING (true) WITH CHECK (true);