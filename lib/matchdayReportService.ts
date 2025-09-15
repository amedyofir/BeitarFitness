import { supabase } from './supabase'
import { 
  MatchdayRunningReport, 
  MatchdayPlayerData, 
  MatchdayReportSummary,
  SaveReportRequest,
  LoadReportResponse,
  PlayerRunningData 
} from '../types/matchdayReport'

export class MatchdayReportService {
  
  /**
   * Save a complete matchday running report to Supabase
   */
  static async saveReport(data: SaveReportRequest): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      // First, check if report already exists
      const existingReport = await this.getReportByMatchday(data.matchday_number, data.opponent_team)
      if (existingReport.success && existingReport.data) {
        return { success: false, error: 'Report already exists for this matchday and opponent' }
      }

      // Calculate team statistics from player data
      const teamStats = this.calculateTeamStats(data.player_data)
      
      // Create the main report record
      const reportData: Partial<MatchdayRunningReport> = {
        matchday_number: data.matchday_number,
        opponent_team: data.opponent_team,
        match_date: data.match_date,
        season: data.season || '2025-2026',
        created_by: data.created_by,
        total_players: data.player_data.length,
        beitar_players_count: teamStats.beitar.playerCount,
        opponent_players_count: teamStats.opponent.playerCount,
        beitar_total_distance: teamStats.beitar.totalDistance,
        beitar_avg_mpm: teamStats.beitar.avgMPM,
        beitar_avg_intensity: teamStats.beitar.avgIntensity,
        beitar_avg_speed: teamStats.beitar.avgSpeed,
        beitar_almog_score: teamStats.beitar.almogScore,
        opponent_total_distance: teamStats.opponent.totalDistance,
        opponent_avg_mpm: teamStats.opponent.avgMPM,
        opponent_avg_intensity: teamStats.opponent.avgIntensity,
        opponent_avg_speed: teamStats.opponent.avgSpeed,
        opponent_almog_score: teamStats.opponent.almogScore,
        is_active: true
      }

      // Insert main report
      const { data: reportResult, error: reportError } = await supabase
        .from('matchday_running_reports')
        .insert([reportData])
        .select()
        .single()

      if (reportError) throw reportError

      const reportId = reportResult.id

      // Transform and insert player data
      const playerDataRecords: Partial<MatchdayPlayerData>[] = data.player_data.map(player => ({
        report_id: reportId,
        player_name: player.Player,
        player_full_name: player.playerFullName,
        position: player.Position,
        team_name: player.teamName || player.newestTeam || 'Unknown',
        newest_team: player.newestTeam,
        minutes: player.Min,
        minutes_including_et: player.MinIncET,
        distance_run_first_half: player.DistanceRunFirstHalf,
        distance_run_second_half: player.DistanceRunScndHalf,
        total_distance: (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0),
        first_half_dist_sprint: player.FirstHalfDistSprint,
        second_half_dist_sprint: player.ScndHalfDistSprint,
        total_sprint_distance: (player.FirstHalfDistSprint || 0) + (player.ScndHalfDistSprint || 0),
        first_half_dist_hsr: player.FirstHalfDistHSRun,
        second_half_dist_hsr: player.ScndHalfDistHSRun,
        total_hsr_distance: (player.FirstHalfDistHSRun || 0) + (player.ScndHalfDistHSRun || 0),
        top_speed: player.TopSpeed,
        kmh_speed: typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : player.KMHSPEED,
        in_poss_dist_sprint: player.InPossDistSprint,
        out_poss_dist_sprint: player.OutPossDistSprint,
        in_poss_dist_hsr: player.InPossDistHSRun,
        out_poss_dist_hsr: player.OutPossDistHSRun,
        distance_run_in_poss: player.DistanceRunInPoss,
        distance_run_out_poss: player.DistanceRunOutPoss,
        gs_number: player.GS,
        position_code: player.pos,
        // Calculate derived metrics
        meters_per_minute: this.calculateMPM(player),
        intensity_percentage: this.calculateIntensity(player),
        almog_score: this.calculatePlayerAlmogScore(player, data.player_data)
      }))

      // Insert player data in batches to avoid potential limits
      const batchSize = 100
      for (let i = 0; i < playerDataRecords.length; i += batchSize) {
        const batch = playerDataRecords.slice(i, i + batchSize)
        const { error: playerError } = await supabase
          .from('matchday_player_data')
          .insert(batch)

        if (playerError) throw playerError
      }

      return { success: true, reportId }

    } catch (error: any) {
      console.error('Error saving matchday report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load a complete matchday running report from Supabase
   */
  static async loadReport(matchdayNumber: string, opponentTeam: string): Promise<{ success: boolean; data?: LoadReportResponse; error?: string }> {
    try {
      // Get the report
      const reportResult = await this.getReportByMatchday(matchdayNumber, opponentTeam)
      if (!reportResult.success || !reportResult.data) {
        return { success: false, error: 'Report not found' }
      }

      const report = reportResult.data

      // Get player data
      const { data: playerData, error: playerError } = await supabase
        .from('matchday_player_data')
        .select('*')
        .eq('report_id', report.id)

      if (playerError) throw playerError

      // Transform back to PlayerRunningData format
      const transformedPlayerData: PlayerRunningData[] = (playerData || []).map(player => ({
        Player: player.player_name,
        playerFullName: player.player_full_name,
        Position: player.position,
        teamName: player.team_name,
        newestTeam: player.newest_team,
        Min: player.minutes,
        MinIncET: player.minutes_including_et,
        DistanceRunFirstHalf: player.distance_run_first_half,
        DistanceRunScndHalf: player.distance_run_second_half,
        FirstHalfDistSprint: player.first_half_dist_sprint,
        ScndHalfDistSprint: player.second_half_dist_sprint,
        FirstHalfDistHSRun: player.first_half_dist_hsr,
        ScndHalfDistHSRun: player.second_half_dist_hsr,
        TopSpeed: player.top_speed,
        KMHSPEED: player.kmh_speed,
        InPossDistSprint: player.in_poss_dist_sprint,
        OutPossDistSprint: player.out_poss_dist_sprint,
        InPossDistHSRun: player.in_poss_dist_hsr,
        OutPossDistHSRun: player.out_poss_dist_hsr,
        DistanceRunInPoss: player.distance_run_in_poss,
        DistanceRunOutPoss: player.distance_run_out_poss,
        GS: player.gs_number,
        pos: player.position_code
      }))

      return {
        success: true,
        data: {
          report,
          player_data: transformedPlayerData
        }
      }

    } catch (error: any) {
      console.error('Error loading matchday report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all saved reports summary
   */
  static async getAllReports(): Promise<{ success: boolean; data?: MatchdayReportSummary[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('matchday_reports_summary')
        .select('*')
        .order('match_date', { ascending: false })

      if (error) throw error

      return { success: true, data: data || [] }

    } catch (error: any) {
      console.error('Error getting all reports:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get report by matchday and opponent
   */
  static async getReportByMatchday(matchdayNumber: string, opponentTeam: string): Promise<{ success: boolean; data?: MatchdayRunningReport; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('matchday_running_reports')
        .select('*')
        .eq('matchday_number', matchdayNumber)
        .eq('opponent_team', opponentTeam)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      return { success: true, data: data || null }

    } catch (error: any) {
      console.error('Error getting report by matchday:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a report
   */
  static async deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('matchday_running_reports')
        .update({ is_active: false })
        .eq('id', reportId)

      if (error) throw error

      return { success: true }

    } catch (error: any) {
      console.error('Error deleting report:', error)
      return { success: false, error: error.message }
    }
  }

  // Helper methods for calculations
  private static calculateMPM(player: PlayerRunningData): number {
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const gameTime = player.MinIncET || player.Min || 0
    return gameTime > 0 ? (totalDistance / gameTime) : 0
  }

  private static calculateIntensity(player: PlayerRunningData): number {
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const highIntensityDistance = (player.FirstHalfDistHSRun || 0) + (player.FirstHalfDistSprint || 0) + 
                                  (player.ScndHalfDistHSRun || 0) + (player.ScndHalfDistSprint || 0)
    return totalDistance > 0 ? (highIntensityDistance / totalDistance * 100) : 0
  }

  private static calculatePlayerAlmogScore(player: PlayerRunningData, allPlayers: PlayerRunningData[]): number {
    // This is a simplified version - you may want to implement the full calculation logic
    const mpm = this.calculateMPM(player)
    const intensity = this.calculateIntensity(player)
    const speed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || player.TopSpeed || 0)
    
    // Simple weighted score - adjust weights as needed
    return (mpm * 0.3) + (intensity * 0.4) + (speed * 0.3)
  }

  private static calculateTeamStats(playerData: PlayerRunningData[]) {
    const beitarPlayers = playerData.filter(p => 
      (p.teamName || p.newestTeam || '').toLowerCase().includes('beitar')
    )
    const opponentPlayers = playerData.filter(p => 
      !(p.teamName || p.newestTeam || '').toLowerCase().includes('beitar')
    )

    const calculateTeamMetrics = (players: PlayerRunningData[]) => {
      const validPlayers = players.filter(p => (p.MinIncET || p.Min || 0) > 0)
      
      const totalDistance = validPlayers.reduce((sum, p) => 
        sum + (p.DistanceRunFirstHalf || 0) + (p.DistanceRunScndHalf || 0), 0)
      
      const avgMPM = validPlayers.length > 0 ? 
        validPlayers.reduce((sum, p) => sum + this.calculateMPM(p), 0) / validPlayers.length : 0
      
      const avgIntensity = validPlayers.length > 0 ? 
        validPlayers.reduce((sum, p) => sum + this.calculateIntensity(p), 0) / validPlayers.length : 0
      
      const avgSpeed = validPlayers.length > 0 ? 
        validPlayers.reduce((sum, p) => {
          const speed = typeof p.KMHSPEED === 'string' ? parseFloat(p.KMHSPEED) : (p.KMHSPEED || p.TopSpeed || 0)
          return sum + speed
        }, 0) / validPlayers.length : 0
      
      const almogScore = validPlayers.length > 0 ? 
        validPlayers.reduce((sum, p) => sum + this.calculatePlayerAlmogScore(p, playerData), 0) / validPlayers.length : 0

      return {
        playerCount: validPlayers.length,
        totalDistance,
        avgMPM,
        avgIntensity,
        avgSpeed,
        almogScore
      }
    }

    return {
      beitar: calculateTeamMetrics(beitarPlayers),
      opponent: calculateTeamMetrics(opponentPlayers)
    }
  }
}