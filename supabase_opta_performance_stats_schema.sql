-- Opta Performance Stats Schema
-- Table for frequently updated performance statistics from CSV uploads
-- This joins with opta_player_object via playerId

CREATE TABLE IF NOT EXISTS opta_performance_stats (
    id SERIAL PRIMARY KEY,

    -- Foreign key to link with opta_player_object
    "playerId" TEXT NOT NULL,

    -- Upload metadata
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    season VARCHAR(20) DEFAULT '2025-2026',
    csv_filename VARCHAR(255),

    -- Basic match info
    "Rank" INTEGER,
    "GM" INTEGER, -- Games played
    "Min" INTEGER, -- Minutes played
    "Age" INTEGER,

    -- Shooting stats
    "SOG_from_box" INTEGER,
    "shotfromgolden" INTEGER,
    "shotfrombox" INTEGER,
    "SOG" INTEGER, -- Shots on Goal
    "Shot" INTEGER, -- Total shots
    "ShotConv" DECIMAL(5,2), -- Shot conversion %
    "Shotcr" INTEGER,
    "xG" DECIMAL(10,3), -- Expected Goals
    "Goal" INTEGER, -- Actual goals

    -- Passing stats
    "Ast" INTEGER, -- Assists
    "KeyPass" INTEGER,
    "xA" DECIMAL(10,3), -- Expected Assists
    "Pass%" DECIMAL(5,2), -- Pass accuracy %
    "%PassFwd" DECIMAL(5,2), -- Forward pass accuracy
    "PassAccFwd" INTEGER,
    "Ps%InA3rd" DECIMAL(5,2), -- Pass % in attacking third
    "PsCmpInBox" INTEGER, -- Passes completed in box
    "ProgPass%" DECIMAL(5,2), -- Progressive pass %
    "ProgPass" INTEGER,

    -- Physical/Movement stats
    "KMHSPEED" DECIMAL(5,2), -- Max speed
    "distancepergame" INTEGER,
    "%Intensity" DECIMAL(5,2),
    "Touches" INTEGER,
    "TouchOpBox" INTEGER, -- Touches in opponent box
    "ProgCarry%" DECIMAL(5,2),
    "ProgCarry" INTEGER,

    -- Defensive stats
    "Tckl" INTEGER, -- Tackles
    "Int" INTEGER, -- Interceptions
    "Clrnce" INTEGER, -- Clearances
    "AerialWon" INTEGER,
    "Aerial%" DECIMAL(5,2),
    "Aerials" INTEGER,
    "GrndDlWn" INTEGER, -- Ground duels won
    "ground%" DECIMAL(5,2),
    "ground_duels" INTEGER,
    "poswonopphalf" INTEGER, -- Possessions won in opponent half

    -- Dribbling/Take-ons
    "TakeOn" INTEGER,
    "TakeOn%" DECIMAL(5,2),
    "TakeOnOvr" INTEGER,
    "TakeOnFail" INTEGER,
    "Success1v1" INTEGER,
    "1v1%" DECIMAL(5,2),
    "1v1" INTEGER,

    -- Other performance metrics
    "GAA" DECIMAL(5,2), -- Goals Against Average (GK)
    "ChncOpnPl" INTEGER, -- Chances/Opportunities
    "+/-" INTEGER, -- Plus/Minus
    "plusminus" DECIMAL(5,2),
    "MinIncET" INTEGER, -- Minutes including extra time
    "Chance" INTEGER,
    "poslost" INTEGER,
    "PsLostD3" INTEGER,
    "PossLost" INTEGER,
    "FlComD3" INTEGER,
    "ErrShot" INTEGER,
    "ErrGoal" INTEGER,
    "%DropFwdUPr" DECIMAL(5,2),
    "touches/Turnovers" DECIMAL(5,2),
    "LongBall%" DECIMAL(5,2),

    -- Note: We'll handle duplicates in application logic instead of DB constraint
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_opta_perf_player_id ON opta_performance_stats("playerId");
CREATE INDEX IF NOT EXISTS idx_opta_perf_season ON opta_performance_stats(season);
CREATE INDEX IF NOT EXISTS idx_opta_perf_upload_date ON opta_performance_stats(upload_date);

-- Foreign key constraint
ALTER TABLE opta_performance_stats
ADD CONSTRAINT fk_opta_perf_player
FOREIGN KEY ("playerId") REFERENCES opta_player_object("playerId")
ON DELETE CASCADE;

-- Comments
COMMENT ON TABLE opta_performance_stats IS 'Performance statistics from Opta CSV uploads, linked to opta_player_object via playerId';
COMMENT ON COLUMN opta_performance_stats."playerId" IS 'Links to opta_player_object.playerId';
COMMENT ON COLUMN opta_performance_stats.csv_filename IS 'Source CSV file for tracking data provenance';