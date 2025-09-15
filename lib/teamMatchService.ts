import { supabase } from './supabase'

export interface TeamMatchStatistics {
  matchweek: number
  match_date: string
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
}

export interface TeamMatchMetadata {
  matchweek: number
  match_date: string
  competition?: string
  league_name?: string
  match_type?: 'home' | 'away'
  notes?: string
  csv_filename?: string
  uploaded_by?: string
  season?: string
  teams_count?: number
}

// Function to parse CSV row and convert to TeamMatchStatistics
export const parseTeamCsvRow = (row: any): TeamMatchStatistics => {
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
    matchweek: 0, // Will be set by the calling function
    match_date: '', // Will be set by the calling function
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

// Save team match statistics for a specific matchweek
export const saveTeamMatchStatistics = async (data: TeamMatchStatistics[], metadata: TeamMatchMetadata) => {
  try {
    // First, save or update team match metadata
    const { error: metadataError } = await supabase
      .from('team_match_metadata')
      .upsert({
        ...metadata,
        uploaded_at: new Date().toISOString(),
        season: metadata.season || '2025-2026',
        teams_count: data.length
      }, {
        onConflict: 'matchweek,season'
      })

    if (metadataError) {
      console.error('Error saving team match metadata:', metadataError)
      console.error('Metadata being saved:', metadata)
      throw new Error(`Metadata save failed: ${metadataError.message || metadataError}`)
    }

    // Delete existing data for this matchweek to avoid duplicates
    const { error: deleteError } = await supabase
      .from('team_match_statistics')
      .delete()
      .eq('matchweek', metadata.matchweek)
      .eq('season', metadata.season || '2025-2026')

    if (deleteError) {
      console.error('Error deleting existing team match data:', deleteError)
      throw deleteError
    }

    // Insert new team match statistics
    const dataWithMetadata = data.map(team => ({
      ...team,
      matchweek: metadata.matchweek,
      match_date: metadata.match_date,
      season: metadata.season || '2025-2026'
    }))

    const { error: insertError } = await supabase
      .from('team_match_statistics')
      .insert(dataWithMetadata)

    if (insertError) {
      console.error('Error inserting team match statistics:', insertError)
      console.error('First few rows of data being inserted:', dataWithMetadata.slice(0, 2))
      throw new Error(`Data insert failed: ${insertError.message || insertError}`)
    }

    return { success: true, message: `Successfully saved team statistics for matchweek ${metadata.matchweek}` }
  } catch (error) {
    console.error('Error in saveTeamMatchStatistics:', error)
    throw error
  }
}

// Fetch team match statistics for a specific matchweek
export const fetchTeamMatchStatistics = async (matchweek: number, season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('team_match_statistics')
      .select('*')
      .eq('matchweek', matchweek)
      .eq('season', season)
      .order('team_rank')

    if (error) {
      console.error('Error fetching team match statistics:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchTeamMatchStatistics:', error)
    throw error
  }
}

// Fetch Beitar Jerusalem specific performance data
export const fetchBeitarPerformance = async (season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('beitar_team_performance')
      .select('*')
      .eq('season', season)
      .order('match_date', { ascending: false })

    if (error) {
      console.error('Error fetching Beitar performance:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchBeitarPerformance:', error)
    throw error
  }
}

// Fetch league standings for a specific matchweek
export const fetchLeagueStandings = async (matchweek: number, season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('league_team_standings')
      .select('*')
      .eq('matchweek', matchweek)
      .eq('season', season)
      .order('team_rank')

    if (error) {
      console.error('Error fetching league standings:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchLeagueStandings:', error)
    throw error
  }
}

// Fetch all team match metadata for the season (excluding aggregated data)
export const fetchTeamMatchMetadata = async (season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('team_match_metadata')
      .select('*')
      .eq('season', season)
      .neq('matchweek', 999) // Exclude aggregated data from regular match listings
      .order('matchweek', { ascending: false })

    if (error) {
      console.error('Error fetching team match metadata:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchTeamMatchMetadata:', error)
    throw error
  }
}

// Check if team data already exists for a matchweek
export const checkTeamMatchweekExists = async (matchweek: number, season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('team_match_metadata')
      .select('matchweek')
      .eq('matchweek', matchweek)
      .eq('season', season)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking team matchweek existence:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in checkTeamMatchweekExists:', error)
    return false
  }
}

// Save aggregated team statistics (overwrites existing summary)
export const saveAggregatedTeamStatistics = async (data: TeamMatchStatistics[], season: string = '2025-2026') => {
  try {
    // Use a special matchweek value for aggregated data (e.g., 999)
    const AGGREGATED_MATCHWEEK = 999
    const aggregatedDate = new Date().toISOString().split('T')[0]

    // First, save or update aggregated metadata
    const metadata: TeamMatchMetadata = {
      matchweek: AGGREGATED_MATCHWEEK,
      match_date: aggregatedDate,
      competition: 'Season Summary',
      league_name: 'Ligat Ha\'al (Israel)',
      match_type: 'home', // Not applicable for aggregated
      csv_filename: 'aggregated_season_data.csv',
      season,
      teams_count: data.length,
      notes: 'Aggregated season statistics - overwrites previous summary'
    }

    const { error: metadataError } = await supabase
      .from('team_match_metadata')
      .upsert({
        ...metadata,
        uploaded_at: new Date().toISOString()
      }, {
        onConflict: 'matchweek,season'
      })

    if (metadataError) {
      console.error('Error saving aggregated team metadata:', metadataError)
      throw new Error(`Aggregated metadata save failed: ${metadataError.message || metadataError}`)
    }

    // Delete existing aggregated data for this season
    const { error: deleteError } = await supabase
      .from('team_match_statistics')
      .delete()
      .eq('matchweek', AGGREGATED_MATCHWEEK)
      .eq('season', season)

    if (deleteError) {
      console.error('Error deleting existing aggregated team data:', deleteError)
      throw deleteError
    }

    // Insert new aggregated team statistics
    const dataWithMetadata = data.map(team => ({
      ...team,
      matchweek: AGGREGATED_MATCHWEEK,
      match_date: aggregatedDate,
      season
    }))

    const { error: insertError } = await supabase
      .from('team_match_statistics')
      .insert(dataWithMetadata)

    if (insertError) {
      console.error('Error inserting aggregated team statistics:', insertError)
      throw new Error(`Aggregated data insert failed: ${insertError.message || insertError}`)
    }

    return { success: true, message: `Successfully saved aggregated season statistics for ${data.length} teams` }
  } catch (error) {
    console.error('Error in saveAggregatedTeamStatistics:', error)
    throw error
  }
}

// Fetch aggregated team statistics
export const fetchAggregatedTeamStatistics = async (season: string = '2025-2026') => {
  try {
    const AGGREGATED_MATCHWEEK = 999
    const { data, error } = await supabase
      .from('team_match_statistics')
      .select('*')
      .eq('matchweek', AGGREGATED_MATCHWEEK)
      .eq('season', season)
      .order('team_rank')

    if (error) {
      console.error('Error fetching aggregated team statistics:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchAggregatedTeamStatistics:', error)
    throw error
  }
}

// Check if aggregated data exists
export const checkAggregatedDataExists = async (season: string = '2025-2026') => {
  try {
    const AGGREGATED_MATCHWEEK = 999
    const { data, error } = await supabase
      .from('team_match_metadata')
      .select('matchweek')
      .eq('matchweek', AGGREGATED_MATCHWEEK)
      .eq('season', season)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking aggregated data existence:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in checkAggregatedDataExists:', error)
    return false
  }
}