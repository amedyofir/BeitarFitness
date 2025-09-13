-- Create body_composition table
CREATE TABLE IF NOT EXISTS body_composition (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(255) NOT NULL,
  height DECIMAL(5,2) NOT NULL DEFAULT 0,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  fat DECIMAL(4,2) NOT NULL DEFAULT 0,
  fat_mass DECIMAL(5,2) NOT NULL DEFAULT 0,
  lean_mass DECIMAL(5,2) NOT NULL DEFAULT 0,
  measurement_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_body_composition_player_date ON body_composition(player_name, measurement_date);
CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition(measurement_date);

-- Enable Row Level Security (RLS)
ALTER TABLE body_composition ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Enable all operations for body_composition" ON body_composition
FOR ALL USING (true);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_body_composition_updated_at 
    BEFORE UPDATE ON body_composition 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE body_composition IS 'Body composition measurements for players including fat percentage, weight, and lean mass data';