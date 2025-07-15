import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type WeeklyLoadData = {
  id?: number
  player_name: string
  period_name: string
  period_number: number
  date: string
  day_name: string
  activity_name: string
  total_duration: string
  total_distance: number
  maximum_velocity: number
  acceleration_b3_efforts_gen2: number
  deceleration_b3_efforts_gen2: number
  rhie_total_bouts: number
  meterage_per_minute: number
  high_speed_running_total_distance_b6: number
  velocity_b4_plus_total_efforts_gen2: number
  very_high_speed_running_total_distance_b7: number
  running_imbalance: number
  hmld_gen2: number
  hmld_per_min_gen2: number
  target_km: number
  target_intensity: number
  notes?: string
} 