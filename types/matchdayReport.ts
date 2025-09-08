// TypeScript types for Matchday Running Reports

export interface MatchdayRunningReport {
  id?: string
  matchday_number: string
  opponent_team: string
  match_date?: string
  season?: string
  created_at?: string
  updated_at?: string
  created_by?: string
  
  // Metadata
  total_players?: number
  beitar_players_count?: number
  opponent_players_count?: number
  
  // Beitar team stats
  beitar_total_distance?: number
  beitar_avg_mpm?: number
  beitar_avg_intensity?: number
  beitar_avg_speed?: number
  beitar_almog_score?: number
  
  // Opponent team stats
  opponent_total_distance?: number
  opponent_avg_mpm?: number
  opponent_avg_intensity?: number
  opponent_avg_speed?: number
  opponent_almog_score?: number
  
  // Status
  is_active?: boolean
}

export interface MatchdayPlayerData {
  id?: string
  report_id?: string
  
  // Player identification
  player_name: string
  player_full_name?: string
  position?: string
  team_name: string
  newest_team?: string
  
  // Playing time
  minutes?: number
  minutes_including_et?: number
  
  // Distance metrics
  distance_run_first_half?: number
  distance_run_second_half?: number
  total_distance?: number
  
  // Sprint distances
  first_half_dist_sprint?: number
  second_half_dist_sprint?: number
  total_sprint_distance?: number
  
  // High speed running distances
  first_half_dist_hsr?: number
  second_half_dist_hsr?: number
  total_hsr_distance?: number
  
  // Speed metrics
  top_speed?: number
  kmh_speed?: number
  
  // Possession-based metrics
  in_poss_dist_sprint?: number
  out_poss_dist_sprint?: number
  in_poss_dist_hsr?: number
  out_poss_dist_hsr?: number
  distance_run_in_poss?: number
  distance_run_out_poss?: number
  
  // Calculated performance metrics
  meters_per_minute?: number
  intensity_percentage?: number
  almog_score?: number
  
  // Additional fields
  gs_number?: number
  position_code?: string
  
  created_at?: string
}

export interface MatchdayReportSummary {
  id: string
  matchday_number: string
  opponent_team: string
  match_date?: string
  season: string
  created_at: string
  total_players: number
  beitar_players_count: number
  opponent_players_count: number
  
  // Team totals
  beitar_total_distance: number
  opponent_total_distance: number
  distance_difference: number
  
  beitar_avg_speed: number
  opponent_avg_speed: number
  speed_difference: number
  
  beitar_avg_intensity: number
  opponent_avg_intensity: number
  intensity_difference: number
  
  beitar_almog_score: number
  opponent_almog_score: number
  almog_difference: number
  
  almog_winner: 'Beitar' | string | 'Draw'
}

export interface SaveReportRequest {
  matchday_number: string
  opponent_team: string
  match_date?: string
  season?: string
  created_by?: string
  player_data: PlayerRunningData[]
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
  [key: string]: any
}

export interface LoadReportResponse {
  report: MatchdayRunningReport
  player_data: PlayerRunningData[]
}