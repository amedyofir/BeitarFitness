// TypeScript types for Raw Matchday Reports (simplified approach)

export interface MatchdayReport {
  id?: string
  matchday_number: string
  opponent_team: string
  match_date?: string
  season?: string
  uploaded_at?: string
  uploaded_by?: string
  total_records?: number
  csv_filename?: string
  is_active?: boolean
}

export interface RawPlayerData {
  id?: string
  matchday_report_id?: string
  
  // Store CSV data exactly as-is
  player: string
  player_full_name?: string
  position?: string
  team_name?: string
  newest_team?: string
  min_field?: number  // "Min" field from CSV
  min_inc_et?: number // "MinIncET" field from CSV
  distance_run_first_half?: number
  distance_run_scnd_half?: number
  first_half_dist_sprint?: number
  scnd_half_dist_sprint?: number
  first_half_dist_hs_run?: number
  scnd_half_dist_hs_run?: number
  top_speed?: number
  kmh_speed?: string // Keep as string since CSV might have string values
  in_poss_dist_sprint?: number
  out_poss_dist_sprint?: number
  in_poss_dist_hs_run?: number
  out_poss_dist_hs_run?: number
  distance_run_in_poss?: number
  distance_run_out_poss?: number
  gs?: number
  pos?: string
  
  // For any additional CSV columns
  additional_data?: Record<string, any>
  
  created_at?: string
}

export interface MatchdayReportsList {
  id: string
  matchday_number: string
  opponent_team: string
  match_date?: string
  season: string
  uploaded_at: string
  total_records: number
  csv_filename?: string
  beitar_players: number
  opponent_players: number
}

export interface PlayerSeasonAggregation {
  player: string
  team_name: string
  season: string
  games_played: number
  
  // Distance stats
  avg_total_distance: number
  total_distance_season: number
  max_game_distance: number
  min_game_distance: number
  
  // Sprint stats
  avg_sprint_distance: number
  total_sprint_season: number
  
  // HSR stats
  avg_hsr_distance: number
  total_hsr_season: number
  
  // Speed stats
  avg_speed: number
  max_speed: number
  
  // Playing time
  avg_minutes: number
  total_minutes_season: number
  avg_meters_per_minute: number
  
  // Game range
  first_game?: string
  last_game?: string
  opponents_faced: string
}

export interface PlayerVsOpponent {
  player: string
  team_name: string
  opponent_team: string
  season: string
  games_vs_opponent: number
  avg_distance_vs_opponent: number
  avg_sprint_vs_opponent: number
  avg_speed_vs_opponent: number
  avg_minutes_vs_opponent: number
  last_game_date?: string
  last_matchday: string
}

// Request interfaces
export interface SaveRawReportRequest {
  matchday_number: string
  opponent_team: string
  match_date?: string
  season?: string
  uploaded_by?: string
  csv_filename?: string
  player_data: PlayerRunningData[] // Original CSV format
}

export interface LoadRawReportResponse {
  report: MatchdayReport
  player_data: PlayerRunningData[] // Converted back to original format
}

// This matches the existing interface from ComprehensiveMatchdayReport
export interface PlayerRunningData {
  Player: string
  playerFullName?: string
  Position?: string
  teamName?: string
  newestTeam?: string
  Min?: number
  MinIncET?: number
  DistanceRunFirstHalf?: number
  DistanceRunScndHalf?: number
  FirstHalfDistSprint?: number
  ScndHalfDistSprint?: number
  FirstHalfDistHSRun?: number
  ScndHalfDistHSRun?: number
  TopSpeed?: number
  KMHSPEED?: number | string
  InPossDistSprint?: number
  OutPossDistSprint?: number
  InPossDistHSRun?: number
  OutPossDistHSRun?: number
  DistanceRunInPoss?: number
  DistanceRunOutPoss?: number
  GS?: number
  pos?: string
  [key: string]: any // For any additional CSV columns
}