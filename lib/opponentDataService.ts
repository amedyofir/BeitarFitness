import { supabase } from './supabase'

export interface OpponentStatistics {
  opponent_name: string
  season?: string
  
  // Team Information
  team_rank?: number
  team_id?: string
  team_image_id?: string
  team_full_name: string
  team_short_name?: string
  team_abbrev_name?: string
  team_color?: string
  opta_team_id?: string
  
  // League Information
  league_id?: string
  league_name?: string
  
  // Match Performance Metrics
  goals_scored?: number
  expected_assists?: number
  expected_goals_per_shot?: number
  expected_goals?: number
  ground_duels?: number
  dribbles_successful?: number
  
  // Positional Play Metrics
  start_a3_end_box?: number
  start_a2_end_box?: number
  pass_completed_to_box?: number
  end_box_using_corner?: number
  start_a2_end_a3?: number
  start_a1_end_box?: number
  start_a2_end_a3_alt?: number
  start_a1_end_a3?: number
  start_a1_end_a2?: number
  seq_start_att_3rd?: number
  seq_start_mid_3rd?: number
  seq_start_a1?: number
  
  // Possession & Passing
  aerial_percentage?: number
  ground_percentage?: number
  cross_open?: number
  pass_from_assist_to_golden?: number
  pass_assist_zone?: number
  
  // Shooting Metrics
  shots_on_goal_penalty_area?: number
  shots_on_goal_from_box?: number
  shot_from_golden?: number
  shot_from_box?: number
  shots_on_goal?: number
  shots_including_blocked?: number
  actual_goals?: number
  
  // Ball Control
  touches?: number
  touch_opponent_box?: number
  drop_forward_up_percentage?: number
  possession_won_opponent_half?: number
  
  // Tactical Metrics
  avg_sequence_time?: number
  ppda_40?: number

  // Press Score Components (from second CSV - our team's metrics)
  our_avg_sequence_time?: number
  our_long_ball_percentage?: number
  our_a1_to_a2_a3_percentage?: number

  // Metadata
  total_matchdays?: number
  csv_filename?: string
  notes?: string
}

export interface OpponentMetadata {
  opponent_name: string
  season?: string
  total_teams?: number
  total_matchdays?: number
}

// Function to parse second CSV row (our team's metrics for press score)
export const parseOurTeamMetricsCsvRow = (row: any) => {
  // Helper function to parse numeric values
  const parseNumeric = (value: any): number | undefined => {
    if (!value || value === '') return undefined
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }

  // Helper function to parse integer values
  const parseInt_ = (value: any): number | undefined => {
    if (!value || value === '') return undefined
    const parsed = parseInt(value)
    return isNaN(parsed) ? undefined : parsed
  }

  // Extract values from CSV 2 (using correct column names)
  const s1e2 = parseInt_(row['S1E2']) || 0  // StartA1EndA2
  const s1e3 = parseInt_(row['S1E3']) || 0  // StartA1EndA3
  const s1 = parseInt_(row['s1']) || 0      // SeqStartA1

  // Helper function to parse percentage strings
  const parsePercentage = (value: string): number | undefined => {
    if (!value || value === '') return undefined
    const cleaned = value.replace('%', '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  // LongBall% - take directly from CSV (already calculated)
  const longBallPercentage = parsePercentage(row['LongBall%'])

  // A1→A2+A3 percentage = (S1E3 + S1E2) / s1
  const a1ToA2A3Percentage = s1 > 0
    ? ((s1e3 + s1e2) / s1) * 100
    : undefined

  return {
    team_full_name: row['teamFullName'] || row['Team'],
    our_avg_sequence_time: parseNumeric(row['AvgSeqTime']),
    our_long_ball_percentage: longBallPercentage,
    our_a1_to_a2_a3_percentage: a1ToA2A3Percentage
  }
}

// Function to parse CSV row and convert to OpponentStatistics (same logic as team parsing)
export const parseOpponentCsvRow = (row: any): OpponentStatistics => {
  // Helper function to parse percentage strings
  const parsePercentage = (value: string): number | undefined => {
    if (!value || value === '') return undefined
    const cleaned = value.replace('%', '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  // Helper function to parse numeric values
  const parseNumeric = (value: any): number | undefined => {
    if (!value || value === '') return undefined
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }

  // Helper function to parse integer values
  const parseInt_ = (value: any): number | undefined => {
    if (!value || value === '') return undefined
    const parsed = parseInt(value)
    return isNaN(parsed) ? undefined : parsed
  }

  return {
    opponent_name: '', // Will be set by the calling function
    season: '2025-2026',
    
    // Team Information
    team_rank: parseInt_(row['Rank']),
    team_id: row['teamId'],
    team_image_id: row['teamImageId'],
    team_full_name: row['teamFullName'] || row['Team'],
    team_short_name: row['teamShortName'],
    team_abbrev_name: row['teamAbbrevName'],
    team_color: row['newestTeamColor'],
    opta_team_id: row['optaTeamId'],
    
    // League Information
    league_id: row['leagueId'],
    league_name: row['leagueName'],
    
    // Match Performance Metrics
    goals_scored: parseInt_(row['GM']),
    expected_assists: parseNumeric(row['xA']),
    expected_goals_per_shot: parseNumeric(row['ExpG/Shot']),
    expected_goals: parseNumeric(row['ExpG']),
    ground_duels: parseNumeric(row['ground_duels']),
    dribbles_successful: parseInt_(row['dribblesuccessful']),
    
    // Positional Play Metrics
    start_a3_end_box: parseInt_(row['Starta3endbox /']),
    start_a2_end_box: parseInt_(row['Starta2endbox/']),
    pass_completed_to_box: parseInt_(row['passcompletedtobox']),
    end_box_using_corner: parseInt_(row['endboxusingconrer']),
    start_a2_end_a3: parseInt_(row['starta2enda3']),
    start_a1_end_box: parseInt_(row['Starta1endbox/']),
    start_a2_end_a3_alt: parseInt_(row['Starta2enda3/']),
    start_a1_end_a3: parseInt_(row['Starta1enda3/']),
    start_a1_end_a2: parseInt_(row['Starta1enda2/']),
    seq_start_att_3rd: parseInt_(row['SeqStartAtt3rd']),
    seq_start_mid_3rd: parseInt_(row['SeqStartMid3rd']),
    seq_start_a1: parseInt_(row['SeqStartA1']),
    
    // Possession & Passing
    aerial_percentage: parsePercentage(row['Aerial%']),
    ground_percentage: parsePercentage(row['ground%']),
    cross_open: parseInt_(row['CrossOpen']),
    pass_from_assist_to_golden: parseInt_(row['passfromassisttogolden']),
    pass_assist_zone: parseInt_(row['passAssistZone']),
    
    // Shooting Metrics
    shots_on_goal_penalty_area: parseInt_(row['SOG_from_penalty_area']),
    shots_on_goal_from_box: parseInt_(row['SOG_from_box']),
    shot_from_golden: parseInt_(row['shotfromgolden']),
    shot_from_box: parseInt_(row['shotfrombox']),
    shots_on_goal: parseInt_(row['SOG']),
    shots_including_blocked: parseInt_(row['ShtIncBl']),
    actual_goals: parseNumeric(row['xG']),
    
    // Ball Control
    touches: parseInt_(row['Touches']),
    touch_opponent_box: parseInt_(row['TouchOpBox']),
    drop_forward_up_percentage: parsePercentage(row['%DropFwdUPr']),
    possession_won_opponent_half: parseInt_(row['poswonopponenthalf']),
    
    // Tactical Metrics
    avg_sequence_time: parseNumeric(row['AvgSeqTime']),
    ppda_40: parseNumeric(row['ppda40'])
  }
}

// Merge opponent statistics from two CSVs (first CSV + second CSV with our team metrics)
export const mergeOpponentStatistics = (
  opponentData: OpponentStatistics[],
  ourTeamData: any[]
): OpponentStatistics[] => {
  return opponentData.map(team => {
    // Find matching team in our team data by team name
    const ourTeamMetrics = ourTeamData.find(
      t => t.team_full_name === team.team_full_name
    )

    if (ourTeamMetrics) {
      return {
        ...team,
        our_avg_sequence_time: ourTeamMetrics.our_avg_sequence_time,
        our_long_ball_percentage: ourTeamMetrics.our_long_ball_percentage,
        our_a1_to_a2_a3_percentage: ourTeamMetrics.our_a1_to_a2_a3_percentage
      }
    }

    return team
  })
}

// Save opponent statistics (overwrites existing data for the same opponent)
export const saveOpponentStatistics = async (data: OpponentStatistics[], metadata: OpponentMetadata) => {
  try {
    console.log(`💾 Saving opponent statistics for: ${metadata.opponent_name}`)
    
    // First, save or update opponent metadata (simplified)
    const { error: metadataError } = await supabase
      .from('opponent_metadata')
      .upsert({
        opponent_name: metadata.opponent_name,
        season: metadata.season || '2025-2026',
        total_teams: data.length,
        total_matchdays: metadata.total_matchdays || 0,
        uploaded_at: new Date().toISOString()
      }, {
        onConflict: 'opponent_name,season'
      })

    if (metadataError) {
      console.error('Error saving opponent metadata:', metadataError)
      throw new Error(`Metadata save failed: ${metadataError.message || metadataError}`)
    }

    // Delete existing data for this opponent to overwrite
    const { error: deleteError } = await supabase
      .from('opponent_statistics')
      .delete()
      .eq('opponent_name', metadata.opponent_name)
      .eq('season', metadata.season || '2025-2026')

    if (deleteError) {
      console.error('Error deleting existing opponent data:', deleteError)
      throw deleteError
    }

    // Insert new opponent statistics (only database columns)
    const dataWithMetadata = data.map(team => ({
      opponent_name: metadata.opponent_name,
      season: metadata.season || '2025-2026',
      team_full_name: team.team_full_name,
      goals_scored: team.goals_scored,
      shots_on_goal: team.shots_on_goal,
      touches: team.touches,
      total_matchdays: metadata.total_matchdays || 0,
      uploaded_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('opponent_statistics')
      .insert(dataWithMetadata)

    if (insertError) {
      console.error('Error inserting opponent statistics:', insertError)
      throw new Error(`Data insert failed: ${insertError.message || insertError}`)
    }

    return { success: true, message: `Successfully saved opponent statistics for ${metadata.opponent_name}` }
  } catch (error) {
    console.error('Error in saveOpponentStatistics:', error)
    throw error
  }
}

// Fetch opponent statistics for a specific opponent
export const fetchOpponentStatistics = async (opponentName: string, season: string = '2025-2026') => {
  try {
    console.log(`🔍 Fetching opponent statistics for: ${opponentName}`)
    const { data, error } = await supabase
      .from('opponent_statistics')
      .select('*')
      .eq('opponent_name', opponentName)
      .eq('season', season)
      .order('team_full_name')

    if (error) {
      console.error('Error fetching opponent statistics:', error)
      throw error
    }

    // Add field aliases for MatchdayReport compatibility
    const enrichedData = (data || []).map((team, index) => ({
      ...team,
      // Add aliases that MatchdayReport expects
      Team: team.team_full_name,
      teamFullName: team.team_full_name,
      Rank: index + 1,
      team_rank: index + 1
    }))

    return enrichedData
  } catch (error) {
    console.error('Error in fetchOpponentStatistics:', error)
    throw error
  }
}

// Fetch all available opponents
export const fetchAvailableOpponents = async (season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('opponent_metadata')
      .select('*')
      .eq('season', season)
      .order('opponent_name')

    if (error) {
      console.error('Error fetching available opponents:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchAvailableOpponents:', error)
    throw error
  }
}

// Check if opponent data already exists
export const checkOpponentDataExists = async (opponentName: string, season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('opponent_metadata')
      .select('opponent_name')
      .eq('opponent_name', opponentName)
      .eq('season', season)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking opponent data existence:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in checkOpponentDataExists:', error)
    return false
  }
}

// Delete opponent data
export const deleteOpponentData = async (opponentName: string, season: string = '2025-2026') => {
  try {
    // Delete statistics
    const { error: statsError } = await supabase
      .from('opponent_statistics')
      .delete()
      .eq('opponent_name', opponentName)
      .eq('season', season)

    if (statsError) {
      console.error('Error deleting opponent statistics:', statsError)
      throw statsError
    }

    // Delete metadata
    const { error: metadataError } = await supabase
      .from('opponent_metadata')
      .delete()
      .eq('opponent_name', opponentName)
      .eq('season', season)

    if (metadataError) {
      console.error('Error deleting opponent metadata:', metadataError)
      throw metadataError
    }

    return { success: true, message: `Successfully deleted data for ${opponentName}` }
  } catch (error) {
    console.error('Error in deleteOpponentData:', error)
    throw error
  }
}