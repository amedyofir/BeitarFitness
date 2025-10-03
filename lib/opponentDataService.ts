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
  our_s1e3?: number
  our_s1e2?: number
  our_s1?: number

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
  upload_date?: string
  csv_filename?: string
  notes?: string
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
  const s1e2 = parseInt_(row['S1E2'])  // StartA1EndA2
  const s1e3 = parseInt_(row['S1E3'])  // StartA1EndA3
  const s1 = parseInt_(row['s1'])      // SeqStartA1

  // Helper function to parse percentage strings
  const parsePercentage = (value: string): number | undefined => {
    if (!value || value === '') return undefined
    const cleaned = value.replace('%', '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  // LongBall% - take directly from CSV (already calculated)
  const longBallPercentage = parsePercentage(row['LongBall%'])

  return {
    team_full_name: row['teamFullName'] || row['Team'],
    our_avg_sequence_time: parseNumeric(row['AvgSeqTime']),
    our_long_ball_percentage: longBallPercentage,
    our_s1e3: s1e3,
    our_s1e2: s1e2,
    our_s1: s1
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
        our_s1e3: ourTeamMetrics.our_s1e3,
        our_s1e2: ourTeamMetrics.our_s1e2,
        our_s1: ourTeamMetrics.our_s1
      }
    }

    return team
  })
}

// Save opponent statistics (overwrites existing data)
export const saveOpponentStatistics = async (data: OpponentStatistics[], metadata: OpponentMetadata) => {
  try {
    console.log(`💾 Saving opponent statistics (${data.length} teams)`)

    const uploadDate = new Date().toISOString()
    const season = metadata.season || '2025-2026'

    // Delete all existing data for this season (fresh start each upload)
    const { error: deleteStatsError } = await supabase
      .from('opponent_statistics')
      .delete()
      .eq('season', season)

    if (deleteStatsError) {
      console.error('Error deleting old statistics:', deleteStatsError)
    }

    const { error: deleteMetaError } = await supabase
      .from('opponent_metadata')
      .delete()
      .eq('season', season)

    if (deleteMetaError) {
      console.error('Error deleting old metadata:', deleteMetaError)
    }

    // Insert new metadata
    const { error: metadataError } = await supabase
      .from('opponent_metadata')
      .insert({
        opponent_name: 'All Teams', // Generic since no specific opponent selected yet
        season: season,
        total_teams: data.length,
        total_matchdays: metadata.total_matchdays || 0,
        upload_date: uploadDate,
        csv_filename: metadata.csv_filename,
        notes: metadata.notes,
        uploaded_at: uploadDate
      })

    if (metadataError) {
      console.error('Error saving opponent metadata:', metadataError)
      throw new Error(`Metadata save failed: ${metadataError.message || metadataError}`)
    }

    // Insert new opponent statistics with ALL fields
    const dataWithMetadata = data.map(team => ({
      opponent_name: team.team_full_name,
      season: season,
      team_full_name: team.team_full_name,

      // Team Information
      team_rank: team.team_rank,
      team_id: team.team_id,
      team_image_id: team.team_image_id,
      team_short_name: team.team_short_name,
      team_abbrev_name: team.team_abbrev_name,
      team_color: team.team_color,
      opta_team_id: team.opta_team_id,

      // League Information
      league_id: team.league_id,
      league_name: team.league_name,

      // Match Performance Metrics (CSV 1)
      goals_scored: team.goals_scored,
      expected_assists: team.expected_assists,
      expected_goals_per_shot: team.expected_goals_per_shot,
      expected_goals: team.expected_goals,
      ground_duels: team.ground_duels,
      dribbles_successful: team.dribbles_successful,

      // Positional Play Metrics (CSV 1)
      start_a3_end_box: team.start_a3_end_box,
      start_a2_end_box: team.start_a2_end_box,
      pass_completed_to_box: team.pass_completed_to_box,
      end_box_using_corner: team.end_box_using_corner,
      start_a2_end_a3: team.start_a2_end_a3,
      start_a1_end_box: team.start_a1_end_box,
      start_a2_end_a3_alt: team.start_a2_end_a3_alt,
      start_a1_end_a3: team.start_a1_end_a3,
      start_a1_end_a2: team.start_a1_end_a2,
      seq_start_att_3rd: team.seq_start_att_3rd,
      seq_start_mid_3rd: team.seq_start_mid_3rd,
      seq_start_a1: team.seq_start_a1,

      // Possession & Passing (CSV 1)
      aerial_percentage: team.aerial_percentage,
      ground_percentage: team.ground_percentage,
      cross_open: team.cross_open,
      pass_from_assist_to_golden: team.pass_from_assist_to_golden,
      pass_assist_zone: team.pass_assist_zone,

      // Shooting Metrics (CSV 1)
      shots_on_goal_penalty_area: team.shots_on_goal_penalty_area,
      shots_on_goal_from_box: team.shots_on_goal_from_box,
      shot_from_golden: team.shot_from_golden,
      shot_from_box: team.shot_from_box,
      shots_on_goal: team.shots_on_goal,
      shots_including_blocked: team.shots_including_blocked,
      actual_goals: team.actual_goals,

      // Ball Control (CSV 1)
      touches: team.touches,
      touch_opponent_box: team.touch_opponent_box,
      drop_forward_up_percentage: team.drop_forward_up_percentage,
      possession_won_opponent_half: team.possession_won_opponent_half,

      // Tactical Metrics (CSV 1)
      avg_sequence_time: team.avg_sequence_time,
      ppda_40: team.ppda_40,

      // Press Score Components from CSV 2 (our team's metrics)
      our_avg_sequence_time: team.our_avg_sequence_time,
      our_long_ball_percentage: team.our_long_ball_percentage,
      our_s1e3: team.our_s1e3,
      our_s1e2: team.our_s1e2,
      our_s1: team.our_s1,

      // Metadata
      total_matchdays: metadata.total_matchdays || 0,
      upload_date: uploadDate,
      uploaded_at: uploadDate
    }))

    const { error: insertError } = await supabase
      .from('opponent_statistics')
      .insert(dataWithMetadata)

    if (insertError) {
      console.error('Error inserting opponent statistics:', insertError)
      throw new Error(`Data insert failed: ${insertError.message || insertError}`)
    }

    return {
      success: true,
      message: `Successfully saved statistics for ${data.length} teams`,
      upload_date: uploadDate
    }
  } catch (error) {
    console.error('Error in saveOpponentStatistics:', error)
    throw error
  }
}

// Fetch opponent statistics for a specific opponent and upload_date (latest if not specified)
export const fetchOpponentStatistics = async (
  opponentName: string,
  season: string = '2025-2026',
  uploadDate?: string
) => {
  try {
    console.log(`🔍 Fetching opponent statistics for: ${opponentName}`)

    let query = supabase
      .from('opponent_statistics')
      .select('*')
      .eq('opponent_name', opponentName)
      .eq('season', season)

    // If uploadDate is specified, filter by it. Otherwise, get latest upload
    if (uploadDate) {
      query = query.eq('upload_date', uploadDate)
    } else {
      // Get the most recent upload_date for this opponent
      const { data: latestMetadata } = await supabase
        .from('opponent_metadata')
        .select('upload_date')
        .eq('opponent_name', opponentName)
        .eq('season', season)
        .order('upload_date', { ascending: false })
        .limit(1)
        .single()

      if (latestMetadata?.upload_date) {
        query = query.eq('upload_date', latestMetadata.upload_date)
      }
    }

    const { data, error } = await query.order('team_full_name')

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

// Fetch all team names from latest upload (for opponent selection)
export const fetchAvailableTeams = async (season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('opponent_statistics')
      .select('team_full_name')
      .eq('season', season)
      .order('team_full_name')

    if (error) {
      console.error('Error fetching available teams:', error)
      throw error
    }

    // Return unique team names
    const uniqueTeams = [...new Set(data?.map(d => d.team_full_name) || [])]
    return uniqueTeams
  } catch (error) {
    console.error('Error in fetchAvailableTeams:', error)
    throw error
  }
}

// Fetch ALL teams data from latest upload (for showing dashboard immediately)
export const fetchAllTeamsData = async (season: string = '2025-2026') => {
  try {
    console.log(`🔍 Fetching all teams data for season: ${season}`)

    // Get the most recent upload_date
    const { data: latestMetadata } = await supabase
      .from('opponent_metadata')
      .select('upload_date')
      .eq('season', season)
      .order('upload_date', { ascending: false })
      .limit(1)
      .single()

    if (!latestMetadata?.upload_date) {
      console.log('No data found in database')
      return []
    }

    // Fetch all teams for this upload_date
    const { data, error } = await supabase
      .from('opponent_statistics')
      .select('*')
      .eq('season', season)
      .eq('upload_date', latestMetadata.upload_date)
      .order('team_full_name')

    if (error) {
      console.error('Error fetching all teams data:', error)
      throw error
    }

    // Add field aliases for MatchdayReport compatibility
    const enrichedData = (data || []).map((team, index) => ({
      ...team,
      Team: team.team_full_name,
      teamFullName: team.team_full_name,
      Rank: index + 1,
      team_rank: index + 1
    }))

    console.log(`✅ Loaded ${enrichedData.length} teams from database`)
    return enrichedData
  } catch (error) {
    console.error('Error in fetchAllTeamsData:', error)
    throw error
  }
}

// Fetch all available opponents (with latest upload info)
export const fetchAvailableOpponents = async (season: string = '2025-2026') => {
  try {
    // Get all uploads for this season, ordered by upload_date (newest first)
    const { data, error } = await supabase
      .from('opponent_metadata')
      .select('*')
      .eq('season', season)
      .order('upload_date', { ascending: false })

    if (error) {
      console.error('Error fetching available opponents:', error)
      throw error
    }

    // Group by opponent_name and keep only the latest upload for each
    const uniqueOpponents = new Map<string, any>()
    data?.forEach(opponent => {
      if (!uniqueOpponents.has(opponent.opponent_name)) {
        uniqueOpponents.set(opponent.opponent_name, opponent)
      }
    })

    // Convert to array and keep sorted by upload_date (newest first)
    return Array.from(uniqueOpponents.values()).sort((a, b) =>
      new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
    )
  } catch (error) {
    console.error('Error in fetchAvailableOpponents:', error)
    throw error
  }
}

// Fetch all upload history for a specific opponent
export const fetchOpponentUploadHistory = async (
  opponentName: string,
  season: string = '2025-2026'
) => {
  try {
    const { data, error } = await supabase
      .from('opponent_metadata')
      .select('*')
      .eq('opponent_name', opponentName)
      .eq('season', season)
      .order('upload_date', { ascending: false })

    if (error) {
      console.error('Error fetching opponent upload history:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchOpponentUploadHistory:', error)
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

// Delete opponent data (specific upload or all uploads)
export const deleteOpponentData = async (
  opponentName: string,
  season: string = '2025-2026',
  uploadDate?: string
) => {
  try {
    if (uploadDate) {
      // Delete specific upload
      const { error: statsError } = await supabase
        .from('opponent_statistics')
        .delete()
        .eq('opponent_name', opponentName)
        .eq('season', season)
        .eq('upload_date', uploadDate)

      if (statsError) {
        console.error('Error deleting opponent statistics:', statsError)
        throw statsError
      }

      const { error: metadataError } = await supabase
        .from('opponent_metadata')
        .delete()
        .eq('opponent_name', opponentName)
        .eq('season', season)
        .eq('upload_date', uploadDate)

      if (metadataError) {
        console.error('Error deleting opponent metadata:', metadataError)
        throw metadataError
      }

      return { success: true, message: `Successfully deleted upload from ${new Date(uploadDate).toLocaleDateString()} for ${opponentName}` }
    } else {
      // Delete all uploads for this opponent
      const { error: statsError } = await supabase
        .from('opponent_statistics')
        .delete()
        .eq('opponent_name', opponentName)
        .eq('season', season)

      if (statsError) {
        console.error('Error deleting opponent statistics:', statsError)
        throw statsError
      }

      const { error: metadataError } = await supabase
        .from('opponent_metadata')
        .delete()
        .eq('opponent_name', opponentName)
        .eq('season', season)

      if (metadataError) {
        console.error('Error deleting opponent metadata:', metadataError)
        throw metadataError
      }

      return { success: true, message: `Successfully deleted all data for ${opponentName}` }
    }
  } catch (error) {
    console.error('Error in deleteOpponentData:', error)
    throw error
  }
}