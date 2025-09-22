import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface CornersStatistics {
  matchday_number: string
  season?: string
  team_id?: string
  team_image_id?: string
  team_full_name: string
  team?: string
  team_abbrev_name?: string
  team_short_name?: string
  newest_team_color?: string
  league_id?: string
  league_name?: string
  gm?: number
  xgcornopp?: number
  xgcorn?: number
  goaloppfromcorner?: number
  goalfromcorner?: number
  shotoppfromcorner?: number
  shotfromcorner?: number
  oppcorners?: number
  corners?: number
  opta_team_id?: string
}

export interface CornersMetadata {
  matchday_number: string
  season?: string
  csv_filename?: string
  total_teams?: number
  notes?: string
}

/**
 * Save corners statistics and metadata to Supabase
 * Overwrites existing data for the same matchday
 */
export async function saveCornersStatistics(
  statistics: CornersStatistics[],
  metadata: CornersMetadata
): Promise<void> {
  try {
    console.log('Starting corners data save process...')

    // First, delete existing data for this matchday
    await deleteCornersData(metadata.matchday_number, metadata.season || '2025-2026')

    // Insert new metadata
    const { error: metadataError } = await supabase
      .from('corners_metadata')
      .insert([{
        matchday_number: metadata.matchday_number,
        season: metadata.season || '2025-2026',
        csv_filename: metadata.csv_filename,
        total_teams: metadata.total_teams,
        notes: metadata.notes
      }])

    if (metadataError) {
      console.error('Error inserting corners metadata:', metadataError)
      throw metadataError
    }

    // Insert new statistics
    const statisticsToInsert = statistics.map(stat => ({
      matchday_number: stat.matchday_number,
      season: stat.season || '2025-2026',
      team_id: stat.team_id,
      team_image_id: stat.team_image_id,
      team_full_name: stat.team_full_name,
      team: stat.team,
      team_abbrev_name: stat.team_abbrev_name,
      team_short_name: stat.team_short_name,
      newest_team_color: stat.newest_team_color,
      league_id: stat.league_id,
      league_name: stat.league_name,
      gm: stat.gm || 0,
      xgcornopp: stat.xgcornopp || 0,
      xgcorn: stat.xgcorn || 0,
      goaloppfromcorner: stat.goaloppfromcorner || 0,
      goalfromcorner: stat.goalfromcorner || 0,
      shotoppfromcorner: stat.shotoppfromcorner || 0,
      shotfromcorner: stat.shotfromcorner || 0,
      oppcorners: stat.oppcorners || 0,
      corners: stat.corners || 0,
      opta_team_id: stat.opta_team_id
    }))

    const { error: statisticsError } = await supabase
      .from('corners_statistics')
      .insert(statisticsToInsert)

    if (statisticsError) {
      console.error('Error inserting corners statistics:', statisticsError)
      throw statisticsError
    }

    console.log(`Successfully saved corners data for matchday ${metadata.matchday_number}`)
  } catch (error) {
    console.error('Error in saveCornersStatistics:', error)
    throw error
  }
}

/**
 * Delete existing corners data for a specific matchday
 */
export async function deleteCornersData(matchdayNumber: string, season: string = '2025-2026'): Promise<void> {
  try {
    // Delete statistics first (due to foreign key constraint)
    const { error: statsError } = await supabase
      .from('corners_statistics')
      .delete()
      .eq('matchday_number', matchdayNumber)
      .eq('season', season)

    if (statsError) {
      console.error('Error deleting corners statistics:', statsError)
      throw statsError
    }

    // Delete metadata
    const { error: metadataError } = await supabase
      .from('corners_metadata')
      .delete()
      .eq('matchday_number', matchdayNumber)
      .eq('season', season)

    if (metadataError) {
      console.error('Error deleting corners metadata:', metadataError)
      throw metadataError
    }

    console.log(`Deleted existing corners data for matchday ${matchdayNumber}`)
  } catch (error) {
    console.error('Error in deleteCornersData:', error)
    throw error
  }
}

/**
 * Fetch corners statistics for a specific matchday
 */
export async function fetchCornersStatistics(matchdayNumber: string, season: string = '2025-2026'): Promise<CornersStatistics[]> {
  try {
    const { data, error } = await supabase
      .from('corners_statistics')
      .select('*')
      .eq('matchday_number', matchdayNumber)
      .eq('season', season)
      .order('team_full_name')

    if (error) {
      console.error('Error fetching corners statistics:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchCornersStatistics:', error)
    throw error
  }
}

/**
 * Fetch all available matchdays with corners data
 */
export async function fetchAvailableMatchdays(): Promise<CornersMetadata[]> {
  try {
    const { data, error } = await supabase
      .from('corners_metadata')
      .select('*')
      .order('upload_date', { ascending: false })

    if (error) {
      console.error('Error fetching available matchdays:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchAvailableMatchdays:', error)
    throw error
  }
}

/**
 * Check if data exists for a specific matchday
 */
export async function checkCornersDataExists(matchdayNumber: string, season: string = '2025-2026'): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('corners_metadata')
      .select('matchday_number')
      .eq('matchday_number', matchdayNumber)
      .eq('season', season)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking corners data existence:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in checkCornersDataExists:', error)
    return false
  }
}

/**
 * Parse a CSV row to corners statistics format
 */
export function parseCornersCSVRow(row: any): CornersStatistics {
  return {
    matchday_number: '', // Will be set when saving
    season: '2025-2026',
    team_id: row.teamId || row.team_id || '',
    team_image_id: row.teamImageId || row.team_image_id || '',
    team_full_name: row.teamFullName || row.team_full_name || row.Team || '',
    team: row.team || row.Team || '',
    team_abbrev_name: row.teamAbbrevName || row.team_abbrev_name || '',
    team_short_name: row.teamShortName || row.team_short_name || '',
    newest_team_color: row.newestTeamColor || row.newest_team_color || '',
    league_id: row.leagueId || row.league_id || '',
    league_name: row.leagueName || row.league_name || '',
    gm: parseInt(row.gm || row.GM || '0') || 0,
    xgcornopp: parseFloat(row.xgcornopp || row.xg_corner_opp || '0') || 0,
    xgcorn: parseFloat(row.xgcorn || row.xg_corner || row['xg from corner'] || '0') || 0,
    goaloppfromcorner: parseInt(row.goaloppfromcorner || row.goal_opp_from_corner || '0') || 0,
    goalfromcorner: parseInt(row.goalfromcorner || row.goal_from_corner || '0') || 0,
    shotoppfromcorner: parseInt(row.shotoppfromcorner || row.shot_opp_from_corner || '0') || 0,
    shotfromcorner: parseInt(row.shotfromcorner || row.shot_from_corner || '0') || 0,
    oppcorners: parseInt(row.oppcorners || row.opp_corners || '0') || 0,
    corners: parseInt(row.corners || row.Corners || '0') || 0,
    opta_team_id: row.optaTeamId || row.opta_team_id || ''
  }
}