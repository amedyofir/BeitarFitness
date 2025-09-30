-- Separate table for CSV uploads - NEVER touch opta_player_object!
-- This table stores the uploaded CSV data separately

CREATE TABLE IF NOT EXISTS opta_csv_uploads (
    id SERIAL PRIMARY KEY,

    -- Player identification (to link with opta_player_object if needed)
    "playerId" TEXT NOT NULL,

    -- Upload metadata
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    season VARCHAR(20) DEFAULT '2025-2026',
    csv_filename VARCHAR(255),

    -- All CSV data (exactly as uploaded)
    "Rank" INTEGER,
    "playerImageId" TEXT,
    "Player" TEXT,
    "playerFullName" TEXT,
    "pos" TEXT,
    "teamImageId" TEXT,
    "teamName" TEXT,
    "teamShortName" TEXT,
    "teamAbbrevName" TEXT,
    "newestTeamId" TEXT,
    "newestTeam" TEXT,
    "newestTeamColor" TEXT,
    "newestLeagueId" TEXT,
    "newestLeague" TEXT,
    "optaPersonId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "Position" TEXT,
    "GM" INTEGER,
    "Min" INTEGER,
    "Age" INTEGER,

    -- All the performance stats (using DECIMAL for flexibility)
    "poslost" DECIMAL(10,2),
    "SOG_from_box" DECIMAL(10,2),
    "shotfromgolden" DECIMAL(10,2),
    "shotfrombox" DECIMAL(10,2),
    "SOG" DECIMAL(10,2),
    "Shot" DECIMAL(10,2),
    "GAA" DECIMAL(10,3),
    "ChncOpnPl" DECIMAL(10,2),
    "+/-" DECIMAL(10,2),
    "MinIncET" DECIMAL(10,2),
    "TakeOnOvr" DECIMAL(10,2),
    "TakeOnFail" DECIMAL(10,2),
    "Success1v1" DECIMAL(10,2),
    "Chance" DECIMAL(10,2),
    "PassAccFwd" DECIMAL(10,2),
    "%PassFwd" DECIMAL(5,2),
    "TouchOpBox" DECIMAL(10,2),
    "ShotConv" DECIMAL(5,2),
    "plusminus" DECIMAL(5,2),
    "Shotcr" DECIMAL(10,2),
    "GrndDlWn" DECIMAL(10,2),
    "AerialWon" DECIMAL(10,2),
    "xG" DECIMAL(10,3),
    "Goal" DECIMAL(10,2),
    "KMHSPEED" DECIMAL(5,2),
    "distancepergame" DECIMAL(10,2),
    "%Intensity" DECIMAL(5,2),
    "FlComD3" DECIMAL(10,2),
    "ErrShot" DECIMAL(10,2),
    "ErrGoal" DECIMAL(10,2),
    "Clrnce" DECIMAL(10,2),
    "Int" DECIMAL(10,2),
    "Tckl" DECIMAL(10,2),
    "PsLostD3" DECIMAL(10,2),
    "PossLost" DECIMAL(10,2),
    "Touches" DECIMAL(10,2),
    "poswonopphalf" DECIMAL(10,2),
    "Aerial%" DECIMAL(5,2),
    "Aerials" DECIMAL(10,2),
    "ground%" DECIMAL(5,2),
    "ground_duels" DECIMAL(10,2),
    "%DropFwdUPr" DECIMAL(5,2),
    "touches/Turnovers" DECIMAL(5,2),
    "TakeOn%" DECIMAL(5,2),
    "LongBall%" DECIMAL(5,2),
    "Pass%" DECIMAL(5,2),
    "Ast" DECIMAL(10,2),
    "KeyPass" DECIMAL(10,2),
    "xA" DECIMAL(10,3),
    "TakeOn" DECIMAL(10,2),
    "PsCmpInBox" DECIMAL(10,2),
    "Ps%InA3rd" DECIMAL(5,2),
    "1v1%" DECIMAL(5,2),
    "1v1" DECIMAL(10,2),
    "ProgCarry%" DECIMAL(5,2),
    "ProgCarry" DECIMAL(10,2),
    "ProgPass%" DECIMAL(5,2),
    "ProgPass" DECIMAL(10,2)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opta_csv_player_id ON opta_csv_uploads("playerId");
CREATE INDEX IF NOT EXISTS idx_opta_csv_upload_date ON opta_csv_uploads(upload_date);
CREATE INDEX IF NOT EXISTS idx_opta_csv_season ON opta_csv_uploads(season);

-- RLS off for now
ALTER TABLE opta_csv_uploads DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE opta_csv_uploads IS 'CSV upload data - separate from opta_player_object to preserve original data';