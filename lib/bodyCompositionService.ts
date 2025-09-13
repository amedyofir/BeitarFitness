import { supabase } from './supabase'

export interface BodyCompositionRecord {
  id?: number
  player_name: string
  height: number
  weight: number
  fat: number
  fat_mass: number
  lean_mass: number
  measurement_date: string
  created_at?: string
  updated_at?: string
}

export interface BodyCompositionData {
  player: string
  height: number
  weight: number
  fat: number
  fatMass: number
  leanMass: number
  date: string
  dateObject: Date
}

/**
 * Fetch all body composition data from Supabase
 */
export async function fetchBodyCompositionData(): Promise<BodyCompositionData[]> {
  try {
    const { data, error } = await supabase
      .from('body_composition')
      .select('*')
      .order('measurement_date', { ascending: true })

    if (error) {
      console.error('Error fetching body composition data:', error)
      throw error
    }

    // Convert database format to component format
    return (data || []).map(record => ({
      player: record.player_name,
      height: record.height,
      weight: record.weight,
      fat: record.fat,
      fatMass: record.fat_mass,
      leanMass: record.lean_mass,
      date: record.measurement_date,
      dateObject: new Date(record.measurement_date)
    }))
  } catch (error) {
    console.error('Failed to fetch body composition data:', error)
    throw error
  }
}

/**
 * Clear all existing body composition data
 */
export async function clearBodyCompositionData(): Promise<void> {
  try {
    console.log('Starting to clear body composition data...')
    
    // First, check how many records exist
    const { count, error: countError } = await supabase
      .from('body_composition')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('Error counting records:', countError)
    } else {
      console.log('Current records in database:', count)
    }

    const { error } = await supabase
      .from('body_composition')
      .delete()
      .gte('id', 0) // Delete all records

    if (error) {
      console.error('Supabase delete error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Successfully cleared all body composition data')
  } catch (error) {
    console.error('Failed to clear body composition data:', error)
    throw error
  }
}

/**
 * Insert new body composition data (batch insert for better performance)
 */
export async function insertBodyCompositionData(data: BodyCompositionData[]): Promise<void> {
  try {
    console.log('Starting to insert body composition data:', data.length, 'records')
    
    // Convert component format to database format
    const records: Omit<BodyCompositionRecord, 'id' | 'created_at' | 'updated_at'>[] = data.map(item => ({
      player_name: item.player,
      height: item.height,
      weight: item.weight,
      fat: item.fat,
      fat_mass: item.fatMass,
      lean_mass: item.leanMass,
      measurement_date: item.date
    }))

    console.log('Converted records for database:', records)

    // Use batch insert for better performance
    const { data: insertedData, error } = await supabase
      .from('body_composition')
      .insert(records)
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Supabase insert response:', insertedData)
    console.log(`Successfully inserted ${records.length} body composition records`)
  } catch (error) {
    console.error('Failed to insert body composition data:', error)
    throw error
  }
}

/**
 * Replace all body composition data (clear and insert)
 */
export async function replaceBodyCompositionData(data: BodyCompositionData[]): Promise<void> {
  try {
    console.log('Starting to replace body composition data...')
    
    // Step 1: Clear existing data
    await clearBodyCompositionData()
    
    // Step 2: Insert new data
    await insertBodyCompositionData(data)
    
    console.log(`Successfully replaced body composition data with ${data.length} new records`)
  } catch (error) {
    console.error('Failed to replace body composition data:', error)
    throw error
  }
}

/**
 * Get latest measurement for each player
 */
export async function getLatestPlayerMeasurements(): Promise<BodyCompositionData[]> {
  try {
    const { data, error } = await supabase
      .from('body_composition')
      .select('*')
      .order('player_name, measurement_date', { ascending: false })

    if (error) {
      console.error('Error fetching latest measurements:', error)
      throw error
    }

    // Group by player and take the first (latest) record for each
    const latestData: Record<string, BodyCompositionRecord> = {}
    
    (data || []).forEach(record => {
      if (!latestData[record.player_name]) {
        latestData[record.player_name] = record
      }
    })

    // Convert to component format
    return Object.values(latestData).map(record => ({
      player: record.player_name,
      height: record.height,
      weight: record.weight,
      fat: record.fat,
      fatMass: record.fat_mass,
      leanMass: record.lean_mass,
      date: record.measurement_date,
      dateObject: new Date(record.measurement_date)
    }))
  } catch (error) {
    console.error('Failed to get latest player measurements:', error)
    throw error
  }
}

/**
 * Get measurements for a specific player
 */
export async function getPlayerMeasurements(playerName: string): Promise<BodyCompositionData[]> {
  try {
    const { data, error } = await supabase
      .from('body_composition')
      .select('*')
      .eq('player_name', playerName)
      .order('measurement_date', { ascending: true })

    if (error) {
      console.error('Error fetching player measurements:', error)
      throw error
    }

    // Convert to component format
    return (data || []).map(record => ({
      player: record.player_name,
      height: record.height,
      weight: record.weight,
      fat: record.fat,
      fatMass: record.fat_mass,
      leanMass: record.lean_mass,
      date: record.measurement_date,
      dateObject: new Date(record.measurement_date)
    }))
  } catch (error) {
    console.error('Failed to get player measurements:', error)
    throw error
  }
}

/**
 * Validate body composition data before saving
 */
export function validateBodyCompositionData(data: BodyCompositionData[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  data.forEach((item, index) => {
    if (!item.player || item.player.trim() === '') {
      errors.push(`Row ${index + 1}: Player name is required`)
    }
    
    if (item.height < 0 || item.height > 300) {
      errors.push(`Row ${index + 1}: Height must be between 0 and 300 cm`)
    }
    
    if (item.weight < 0 || item.weight > 500) {
      errors.push(`Row ${index + 1}: Weight must be between 0 and 500 kg`)
    }
    
    if (item.fat < 0 || item.fat > 100) {
      errors.push(`Row ${index + 1}: Fat percentage must be between 0 and 100`)
    }
    
    if (item.fatMass < 0) {
      errors.push(`Row ${index + 1}: Fat mass cannot be negative`)
    }
    
    if (item.leanMass < 0) {
      errors.push(`Row ${index + 1}: Lean mass cannot be negative`)
    }
    
    if (!item.date || isNaN(item.dateObject.getTime())) {
      errors.push(`Row ${index + 1}: Valid date is required`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}