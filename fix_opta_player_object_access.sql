-- Fix access to opta_player_object table
-- Add RLS policies or disable RLS

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'opta_player_object';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'opta_player_object';

-- Option 1: Disable RLS (Quick fix for development)
ALTER TABLE opta_player_object DISABLE ROW LEVEL SECURITY;

-- Option 2: Or create policies to allow access (more secure)
-- Uncomment these if you want to use RLS instead:

-- -- Enable RLS
-- ALTER TABLE opta_player_object ENABLE ROW LEVEL SECURITY;

-- -- Allow all operations for authenticated users
-- CREATE POLICY "Allow all operations for authenticated users" ON opta_player_object
--     FOR ALL USING (auth.role() = 'authenticated');

-- -- Or allow public read access
-- CREATE POLICY "Allow public read access" ON opta_player_object
--     FOR SELECT USING (true);

-- -- Allow public insert/update for uploads
-- CREATE POLICY "Allow public write access" ON opta_player_object
--     FOR ALL USING (true);

-- Test the access
SELECT COUNT(*) as total_players FROM opta_player_object;
SELECT "playerId", "FullName", "Team" FROM opta_player_object LIMIT 3;