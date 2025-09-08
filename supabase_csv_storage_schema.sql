-- Ultra-Simple CSV Storage Schema
-- Just store the CSV file content and metadata

-- Main table for storing CSV files
CREATE TABLE IF NOT EXISTS csv_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic metadata
  matchday_number VARCHAR(10) NOT NULL,
  opponent_team VARCHAR(100) NOT NULL,
  match_date DATE,
  season VARCHAR(20) DEFAULT '2024-2025',
  
  -- File information
  filename VARCHAR(255),
  original_filename VARCHAR(255),
  
  -- Store the entire CSV content as text
  csv_content TEXT NOT NULL,
  csv_headers TEXT[], -- Array of column headers
  total_rows INTEGER,
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  -- Unique constraint
  UNIQUE(matchday_number, opponent_team, season)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_csv_reports_matchday ON csv_reports(matchday_number);
CREATE INDEX IF NOT EXISTS idx_csv_reports_opponent ON csv_reports(opponent_team);
CREATE INDEX IF NOT EXISTS idx_csv_reports_season ON csv_reports(season);
CREATE INDEX IF NOT EXISTS idx_csv_reports_date ON csv_reports(match_date);
CREATE INDEX IF NOT EXISTS idx_csv_reports_active ON csv_reports(is_active);

-- Enable RLS
ALTER TABLE csv_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on csv_reports" ON csv_reports
    FOR ALL USING (true) WITH CHECK (true);

-- Simple view for listing reports
CREATE OR REPLACE VIEW csv_reports_list AS
SELECT 
    id,
    matchday_number,
    opponent_team,
    match_date,
    season,
    filename,
    original_filename,
    total_rows,
    uploaded_at,
    uploaded_by,
    notes
FROM csv_reports
WHERE is_active = true
ORDER BY uploaded_at DESC, matchday_number DESC;

-- Comments
COMMENT ON TABLE csv_reports IS 'Stores CSV files as plain text with metadata for maximum flexibility';
COMMENT ON COLUMN csv_reports.csv_content IS 'Complete CSV file content as text - can be parsed on demand';
COMMENT ON COLUMN csv_reports.csv_headers IS 'Array of CSV column headers for quick reference';