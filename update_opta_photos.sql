-- Update opta_league_players with photos from squad_players table
-- This script matches players by name and updates their profile pictures

-- First, let's see what we have in both tables
SELECT 'opta_league_players' as source, player_full_name, profile_picture_url
FROM opta_league_players
WHERE team ILIKE '%beitar%'
ORDER BY player_full_name;

SELECT 'squad_players' as source,
       CONCAT(first_name, ' ', last_name) as full_name,
       profile_picture_url
FROM squad_players
WHERE profile_picture_url IS NOT NULL
ORDER BY first_name, last_name;

-- Update opta_league_players with photos from squad_players
-- Match by full name (case insensitive)
UPDATE opta_league_players
SET profile_picture_url = sq.profile_picture_url
FROM squad_players sq
WHERE LOWER(opta_league_players.player_full_name) = LOWER(CONCAT(sq.first_name, ' ', sq.last_name))
  AND opta_league_players.team ILIKE '%beitar%'
  AND sq.profile_picture_url IS NOT NULL;

-- Alternative matching - try first name + last name separately
UPDATE opta_league_players
SET profile_picture_url = sq.profile_picture_url
FROM squad_players sq
WHERE LOWER(opta_league_players.first_name) = LOWER(sq.first_name)
  AND LOWER(opta_league_players.last_name) = LOWER(sq.last_name)
  AND opta_league_players.team ILIKE '%beitar%'
  AND sq.profile_picture_url IS NOT NULL
  AND opta_league_players.profile_picture_url IS NULL; -- Only update if not already set

-- Show results after update
SELECT
    opta_league_players.player_full_name,
    opta_league_players.first_name,
    opta_league_players.last_name,
    opta_league_players.profile_picture_url as opta_photo,
    sq.profile_picture_url as squad_photo,
    CASE
        WHEN opta_league_players.profile_picture_url IS NOT NULL THEN '✅ Has Photo'
        ELSE '❌ No Photo'
    END as status
FROM opta_league_players
LEFT JOIN squad_players sq
    ON LOWER(opta_league_players.player_full_name) = LOWER(CONCAT(sq.first_name, ' ', sq.last_name))
WHERE opta_league_players.team ILIKE '%beitar%'
ORDER BY opta_league_players.player_full_name;