import { supabase } from './lib/supabase'

async function createTable() {
  try {
    console.log('Creating opta_csv_uploads table...')

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS opta_csv_uploads (
          id SERIAL PRIMARY KEY,
          "playerId" TEXT NOT NULL,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          season VARCHAR(20) DEFAULT '2025-2026',
          csv_filename VARCHAR(255),

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

          "poslost" INTEGER,
          "SOG_from_box" INTEGER,
          "shotfromgolden" INTEGER,
          "shotfrombox" INTEGER,
          "SOG" INTEGER,
          "Shot" INTEGER,
          "GAA" DECIMAL(10,3),
          "ChncOpnPl" INTEGER,
          "+/-" INTEGER,
          "MinIncET" INTEGER,
          "TakeOnOvr" INTEGER,
          "TakeOnFail" INTEGER,
          "Success1v1" INTEGER,
          "Chance" INTEGER,
          "PassAccFwd" INTEGER,
          "%PassFwd" DECIMAL(5,2),
          "TouchOpBox" INTEGER,
          "ShotConv" DECIMAL(5,2),
          "plusminus" DECIMAL(5,2),
          "Shotcr" INTEGER,
          "GrndDlWn" INTEGER,
          "AerialWon" INTEGER,
          "xG" DECIMAL(10,3),
          "Goal" INTEGER,
          "KMHSPEED" DECIMAL(5,2),
          "distancepergame" INTEGER,
          "%Intensity" DECIMAL(5,2),
          "FlComD3" INTEGER,
          "ErrShot" INTEGER,
          "ErrGoal" INTEGER,
          "Clrnce" INTEGER,
          "Int" INTEGER,
          "Tckl" INTEGER,
          "PsLostD3" INTEGER,
          "PossLost" INTEGER,
          "Touches" INTEGER,
          "poswonopphalf" INTEGER,
          "Aerial%" DECIMAL(5,2),
          "Aerials" INTEGER,
          "ground%" DECIMAL(5,2),
          "ground_duels" INTEGER,
          "%DropFwdUPr" DECIMAL(5,2),
          "touches/Turnovers" DECIMAL(5,2),
          "TakeOn%" DECIMAL(5,2),
          "LongBall%" DECIMAL(5,2),
          "Pass%" DECIMAL(5,2),
          "Ast" INTEGER,
          "KeyPass" INTEGER,
          "xA" DECIMAL(10,3),
          "TakeOn" INTEGER,
          "PsCmpInBox" INTEGER,
          "Ps%InA3rd" DECIMAL(5,2),
          "1v1%" DECIMAL(5,2),
          "1v1" INTEGER,
          "ProgCarry%" DECIMAL(5,2),
          "ProgCarry" INTEGER,
          "ProgPass%" DECIMAL(5,2),
          "ProgPass" INTEGER
        );

        ALTER TABLE opta_csv_uploads DISABLE ROW LEVEL SECURITY;
      `
    })

    if (error) {
      console.error('Error creating table:', error)
    } else {
      console.log('✅ Table created successfully!')
    }

  } catch (err) {
    console.error('Failed:', err)
  }
}

createTable()