-- Update existing data to use the correct 2025-2026 season

-- Update CSV reports
UPDATE csv_reports 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Update matchday running reports
UPDATE matchday_running_reports 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Update matchday reports (raw data)
UPDATE matchday_reports 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Update team match statistics
UPDATE team_match_statistics 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Update team match metadata
UPDATE team_match_metadata 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Update match GPS data
UPDATE match_gps_data 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Update match metadata
UPDATE match_metadata 
SET season = '2025-2026' 
WHERE season = '2024-2025' OR season = '2024/25';

-- Verification queries to check the updates
SELECT 'csv_reports' as table_name, season, COUNT(*) as record_count 
FROM csv_reports 
GROUP BY season
UNION ALL
SELECT 'matchday_running_reports' as table_name, season, COUNT(*) as record_count 
FROM matchday_running_reports 
GROUP BY season
UNION ALL
SELECT 'matchday_reports' as table_name, season, COUNT(*) as record_count 
FROM matchday_reports 
GROUP BY season
UNION ALL
SELECT 'team_match_statistics' as table_name, season, COUNT(*) as record_count 
FROM team_match_statistics 
GROUP BY season
UNION ALL
SELECT 'team_match_metadata' as table_name, season, COUNT(*) as record_count 
FROM team_match_metadata 
GROUP BY season
UNION ALL
SELECT 'match_gps_data' as table_name, season, COUNT(*) as record_count 
FROM match_gps_data 
GROUP BY season
UNION ALL
SELECT 'match_metadata' as table_name, season, COUNT(*) as record_count 
FROM match_metadata 
GROUP BY season
ORDER BY table_name, season;