import { supabase } from './supabase'

export const testOptaLeaguePlayersTable = async () => {
  console.log('🧪 Testing opta_league_players table access...')

  try {
    // First, let's see if we can access the table at all
    const { data, error, count } = await supabase
      .from('opta_league_players')
      .select('*', { count: 'exact' })
      .limit(3)

    if (error) {
      console.error('❌ Error accessing opta_league_players:', error)
      return { success: false, error }
    }

    console.log('✅ Successfully accessed opta_league_players table')
    console.log('📊 Total rows in table:', count)
    console.log('📋 Sample data structure:', data?.[0] ? Object.keys(data[0]) : 'No data')
    console.log('🔍 First 3 records:', data)

    // Let's also check what team names exist
    const { data: teams, error: teamsError } = await supabase
      .from('opta_league_players')
      .select('team')
      .limit(20)

    if (!teamsError && teams) {
      const uniqueTeams = [...new Set(teams.map(t => t.team))].filter(Boolean)
      console.log('🏈 Available teams:', uniqueTeams)

      // Check specifically for Beitar
      const beitarTeams = uniqueTeams.filter(team =>
        team && team.toLowerCase().includes('beitar')
      )
      console.log('🟡 Beitar teams found:', beitarTeams)
    }

    return { success: true, data, count, teams }
  } catch (err) {
    console.error('❌ Exception testing opta_league_players:', err)
    return { success: false, error: err }
  }
}