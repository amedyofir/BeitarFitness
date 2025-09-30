const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Supabase client
const supabaseUrl = 'https://qvktvgqvjlxopejtupnl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2a3R2Z3F2amx4b3BlanR1cG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzMDI5MTQsImV4cCI6MjA0Nzg3ODkxNH0.L8r7_C4dYhfHIoZ7VPPPhM5oEVKq4Qe9vFV3K2Rp3MY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runSQL() {
  try {
    console.log('Creating opta_csv_uploads table...')

    // First, let's check what exists in opta_player_object
    console.log('Checking opta_player_object table...')
    const { data: playerData, error: playerError } = await supabase
      .from('opta_player_object')
      .select('count(*)')
      .limit(1)

    if (playerError) {
      console.error('Error accessing opta_player_object:', playerError)
    } else {
      console.log('opta_player_object table exists and accessible')
    }

    // Create the new table using raw SQL
    const createTableSQL = `
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
    `

    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL })

    if (error) {
      console.error('Error creating table:', error)
    } else {
      console.log('✅ Table created successfully')
    }

    // Also run the access fix for opta_player_object
    const fixAccessSQL = `ALTER TABLE opta_player_object DISABLE ROW LEVEL SECURITY;`
    const { data: fixData, error: fixError } = await supabase.rpc('exec_sql', { sql: fixAccessSQL })

    if (fixError) {
      console.error('Note: Could not disable RLS (might not be needed):', fixError.message)
    } else {
      console.log('✅ Fixed table access')
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

runSQL()