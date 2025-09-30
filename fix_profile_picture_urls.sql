-- Fix profile picture URLs in opta_player_object
-- Convert signed URLs to public URLs

-- First, let's see what we have
SELECT
    "playerId",
    "FullName",
    profile_pic_supabase_url
FROM opta_player_object
WHERE profile_pic_supabase_url IS NOT NULL
LIMIT 5;

-- Update signed URLs to public URLs
-- This converts:
-- FROM: https://qvktvgqvjlxopejtupnl.supabase.co/storage/v1/object/sign/opta_pics/...?token=...
-- TO:   https://qvktvgqvjlxopejtupnl.supabase.co/storage/v1/object/public/opta_pics/...

UPDATE opta_player_object
SET profile_pic_supabase_url =
    REPLACE(
        SPLIT_PART(profile_pic_supabase_url, '?token=', 1),  -- Remove token
        '/storage/v1/object/sign/',                          -- Replace sign
        '/storage/v1/object/public/'                         -- With public
    )
WHERE profile_pic_supabase_url LIKE '%/storage/v1/object/sign/%'
  AND profile_pic_supabase_url IS NOT NULL;

-- Verify the changes
SELECT
    "playerId",
    "FullName",
    profile_pic_supabase_url
FROM opta_player_object
WHERE profile_pic_supabase_url IS NOT NULL
LIMIT 5;

-- Count how many were updated
SELECT COUNT(*) as updated_urls
FROM opta_player_object
WHERE profile_pic_supabase_url LIKE '%/storage/v1/object/public/%';