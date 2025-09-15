import { supabase } from './supabase'

export interface MatchGpsData {
  matchweek: number
  match_date: string
  opponent: string
  match_type: 'home' | 'away'
  player_name: string
  position?: string
  minutes_played?: number
  total_distance?: number
  hsr_distance?: number
  sprint_distance?: number
  accelerations?: number
  decelerations?: number
  max_speed?: number
  avg_speed?: number
  sprints?: number
  top_speed_percentage?: number
  metabolic_power?: number
  hmld?: number
  dynamic_stress_load?: number
  total_loading?: number
  fatigue_index?: number
  season?: string
}

export interface MatchMetadata {
  matchweek: number
  match_date: string
  opponent: string
  match_type: 'home' | 'away'
  competition?: string
  result?: string
  formation?: string
  weather_conditions?: string
  notes?: string
  csv_filename?: string
  uploaded_by?: string
  season?: string
}

// Save match GPS data for a specific matchweek
export const saveMatchGpsData = async (data: MatchGpsData[], metadata: MatchMetadata) => {
  try {
    // First, save or update match metadata
    const { error: metadataError } = await supabase
      .from('match_metadata')
      .upsert({
        ...metadata,
        uploaded_at: new Date().toISOString(),
        season: metadata.season || '2025-2026'
      }, {
        onConflict: 'matchweek,season'
      })

    if (metadataError) {
      console.error('Error saving match metadata:', metadataError)
      throw metadataError
    }

    // Delete existing data for this matchweek to avoid duplicates
    const { error: deleteError } = await supabase
      .from('match_gps_data')
      .delete()
      .eq('matchweek', metadata.matchweek)
      .eq('season', metadata.season || '2025-2026')

    if (deleteError) {
      console.error('Error deleting existing match data:', deleteError)
      throw deleteError
    }

    // Insert new match GPS data
    const dataWithMetadata = data.map(player => ({
      ...player,
      matchweek: metadata.matchweek,
      match_date: metadata.match_date,
      opponent: metadata.opponent,
      match_type: metadata.match_type,
      season: metadata.season || '2025-2026'
    }))

    const { error: insertError } = await supabase
      .from('match_gps_data')
      .insert(dataWithMetadata)

    if (insertError) {
      console.error('Error inserting match GPS data:', insertError)
      throw insertError
    }

    return { success: true, message: `Successfully saved data for matchweek ${metadata.matchweek}` }
  } catch (error) {
    console.error('Error in saveMatchGpsData:', error)
    throw error
  }
}

// Fetch match GPS data for a specific matchweek
export const fetchMatchGpsData = async (matchweek: number, season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('match_gps_data')
      .select('*')
      .eq('matchweek', matchweek)
      .eq('season', season)
      .order('player_name')

    if (error) {
      console.error('Error fetching match GPS data:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchMatchGpsData:', error)
    throw error
  }
}

// Fetch all match metadata for the season
export const fetchMatchMetadata = async (season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('match_metadata')
      .select('*')
      .eq('season', season)
      .order('matchweek', { ascending: false })

    if (error) {
      console.error('Error fetching match metadata:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchMatchMetadata:', error)
    throw error
  }
}

// Fetch latest match data for all players
export const fetchLatestMatchData = async () => {
  try {
    const { data, error } = await supabase
      .from('latest_match_performance')
      .select('*')
      .order('player_name')

    if (error) {
      console.error('Error fetching latest match data:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchLatestMatchData:', error)
    throw error
  }
}

// Fetch season averages for all players
export const fetchSeasonAverages = async () => {
  try {
    const { data, error } = await supabase
      .from('season_averages')
      .select('*')
      .order('avg_distance', { ascending: false })

    if (error) {
      console.error('Error fetching season averages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchSeasonAverages:', error)
    throw error
  }
}

// Fetch all matchweeks for the season
export const fetchAvailableMatchweeks = async (season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('match_metadata')
      .select('matchweek, match_date, opponent, match_type, result')
      .eq('season', season)
      .order('matchweek', { ascending: false })

    if (error) {
      console.error('Error fetching available matchweeks:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in fetchAvailableMatchweeks:', error)
    throw error
  }
}

// Delete match data for a specific matchweek
export const deleteMatchData = async (matchweek: number, season: string = '2025-2026') => {
  try {
    // Delete GPS data
    const { error: gpsError } = await supabase
      .from('match_gps_data')
      .delete()
      .eq('matchweek', matchweek)
      .eq('season', season)

    if (gpsError) {
      console.error('Error deleting match GPS data:', gpsError)
      throw gpsError
    }

    // Delete metadata
    const { error: metadataError } = await supabase
      .from('match_metadata')
      .delete()
      .eq('matchweek', matchweek)
      .eq('season', season)

    if (metadataError) {
      console.error('Error deleting match metadata:', metadataError)
      throw metadataError
    }

    return { success: true, message: `Successfully deleted data for matchweek ${matchweek}` }
  } catch (error) {
    console.error('Error in deleteMatchData:', error)
    throw error
  }
}

// Check if a matchweek already has data
export const checkMatchweekExists = async (matchweek: number, season: string = '2025-2026') => {
  try {
    const { data, error } = await supabase
      .from('match_metadata')
      .select('matchweek')
      .eq('matchweek', matchweek)
      .eq('season', season)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking matchweek existence:', error)
      throw error
    }

    return !!data
  } catch (error) {
    console.error('Error in checkMatchweekExists:', error)
    return false
  }
}