import { supabase } from './supabase'
import { 
  MatchdayReport, 
  RawPlayerData, 
  MatchdayReportsList,
  PlayerSeasonAggregation,
  PlayerVsOpponent,
  SaveRawReportRequest,
  LoadRawReportResponse,
  PlayerRunningData 
} from '../types/rawMatchdayReport'

export class RawMatchdayReportService {
  
  /**
   * Save raw CSV data exactly as received
   */
  static async saveRawReport(data: SaveRawReportRequest): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      // Check if report already exists
      const existingReport = await this.getReportByMatchday(data.matchday_number, data.opponent_team)
      if (existingReport.success && existingReport.data) {
        return { success: false, error: 'Report already exists for this matchday and opponent' }
      }

      // Create the main report record
      const reportData: Partial<MatchdayReport> = {
        matchday_number: data.matchday_number,
        opponent_team: data.opponent_team,
        match_date: data.match_date,
        season: data.season || '2025-2026',
        uploaded_by: data.uploaded_by,
        total_records: data.player_data.length,
        csv_filename: data.csv_filename,
        is_active: true
      }

      // Insert main report
      const { data: reportResult, error: reportError } = await supabase
        .from('matchday_reports')
        .insert([reportData])
        .select()
        .single()

      if (reportError) throw reportError

      const reportId = reportResult.id

      // Transform CSV data to database format (keeping original structure)
      const rawPlayerData: Partial<RawPlayerData>[] = data.player_data.map(player => {
        // Extract any additional fields not in the main schema
        const knownFields = [
          'Player', 'playerFullName', 'Position', 'teamName', 'newestTeam',
          'Min', 'MinIncET', 'DistanceRunFirstHalf', 'DistanceRunScndHalf',
          'FirstHalfDistSprint', 'ScndHalfDistSprint', 'FirstHalfDistHSRun',
          'ScndHalfDistHSRun', 'TopSpeed', 'KMHSPEED', 'InPossDistSprint',
          'OutPossDistSprint', 'InPossDistHSRun', 'OutPossDistHSRun',
          'DistanceRunInPoss', 'DistanceRunOutPoss', 'GS', 'pos'
        ]

        const additionalData: Record<string, any> = {}
        Object.keys(player).forEach(key => {
          if (!knownFields.includes(key)) {
            additionalData[key] = player[key]
          }
        })

        return {
          matchday_report_id: reportId,
          player: player.Player,
          player_full_name: player.playerFullName,
          position: player.Position,
          team_name: player.teamName || player.newestTeam || 'Unknown',
          newest_team: player.newestTeam,
          min_field: player.Min,
          min_inc_et: player.MinIncET,
          distance_run_first_half: player.DistanceRunFirstHalf,
          distance_run_scnd_half: player.DistanceRunScndHalf,
          first_half_dist_sprint: player.FirstHalfDistSprint,
          scnd_half_dist_sprint: player.ScndHalfDistSprint,
          first_half_dist_hs_run: player.FirstHalfDistHSRun,
          scnd_half_dist_hs_run: player.ScndHalfDistHSRun,
          top_speed: player.TopSpeed,
          kmh_speed: typeof player.KMHSPEED === 'number' ? player.KMHSPEED.toString() : player.KMHSPEED,
          in_poss_dist_sprint: player.InPossDistSprint,
          out_poss_dist_sprint: player.OutPossDistSprint,
          in_poss_dist_hs_run: player.InPossDistHSRun,
          out_poss_dist_hs_run: player.OutPossDistHSRun,
          distance_run_in_poss: player.DistanceRunInPoss,
          distance_run_out_poss: player.DistanceRunOutPoss,
          gs: player.GS,
          pos: player.pos,
          additional_data: Object.keys(additionalData).length > 0 ? additionalData : undefined
        }
      })

      // Insert player data in batches
      const batchSize = 100
      for (let i = 0; i < rawPlayerData.length; i += batchSize) {
        const batch = rawPlayerData.slice(i, i + batchSize)
        const { error: playerError } = await supabase
          .from('raw_player_data')
          .insert(batch)

        if (playerError) throw playerError
      }

      return { success: true, reportId }

    } catch (error: any) {
      console.error('Error saving raw report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load raw report data and convert back to original CSV format
   */
  static async loadRawReport(matchdayNumber: string, opponentTeam: string): Promise<{ success: boolean; data?: LoadRawReportResponse; error?: string }> {
    try {
      // Get the report
      const reportResult = await this.getReportByMatchday(matchdayNumber, opponentTeam)
      if (!reportResult.success || !reportResult.data) {
        return { success: false, error: 'Report not found' }
      }

      const report = reportResult.data

      // Get raw player data
      const { data: rawPlayerData, error: playerError } = await supabase
        .from('raw_player_data')
        .select('*')
        .eq('matchday_report_id', report.id)

      if (playerError) throw playerError

      // Convert back to original CSV format
      const playerData: PlayerRunningData[] = (rawPlayerData || []).map(player => {
        const baseData: PlayerRunningData = {
          Player: player.player,
          playerFullName: player.player_full_name,
          Position: player.position,
          teamName: player.team_name,
          newestTeam: player.newest_team,
          Min: player.min_field,
          MinIncET: player.min_inc_et,
          DistanceRunFirstHalf: player.distance_run_first_half,
          DistanceRunScndHalf: player.distance_run_scnd_half,
          FirstHalfDistSprint: player.first_half_dist_sprint,
          ScndHalfDistSprint: player.scnd_half_dist_sprint,
          FirstHalfDistHSRun: player.first_half_dist_hs_run,
          ScndHalfDistHSRun: player.scnd_half_dist_hs_run,
          TopSpeed: player.top_speed,
          KMHSPEED: player.kmh_speed && !isNaN(parseFloat(player.kmh_speed)) 
                   ? parseFloat(player.kmh_speed) 
                   : player.kmh_speed,
          InPossDistSprint: player.in_poss_dist_sprint,
          OutPossDistSprint: player.out_poss_dist_sprint,
          InPossDistHSRun: player.in_poss_dist_hs_run,
          OutPossDistHSRun: player.out_poss_dist_hs_run,
          DistanceRunInPoss: player.distance_run_in_poss,
          DistanceRunOutPoss: player.distance_run_out_poss,
          GS: player.gs,
          pos: player.pos
        }

        // Add any additional data that was in the original CSV
        if (player.additional_data) {
          Object.assign(baseData, player.additional_data)
        }

        return baseData
      })

      return {
        success: true,
        data: {
          report,
          player_data: playerData
        }
      }

    } catch (error: any) {
      console.error('Error loading raw report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all saved reports (simplified list)
   */
  static async getAllReports(): Promise<{ success: boolean; data?: MatchdayReportsList[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('matchday_reports_list')
        .select('*')

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
  static async getReportByMatchday(matchdayNumber: string, opponentTeam: string): Promise<{ success: boolean; data?: MatchdayReport; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('matchday_reports')
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
   * Delete a report (soft delete)
   */
  static async deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('matchday_reports')
        .update({ is_active: false })
        .eq('id', reportId)

      if (error) throw error

      return { success: true }

    } catch (error: any) {
      console.error('Error deleting report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get player aggregation data across all matchdays for a season
   */
  static async getPlayerSeasonAggregation(season?: string): Promise<{ success: boolean; data?: PlayerSeasonAggregation[]; error?: string }> {
    try {
      let query = supabase
        .from('player_season_aggregation')
        .select('*')

      if (season) {
        query = query.eq('season', season)
      }

      const { data, error } = await query.order('avg_total_distance', { ascending: false })

      if (error) throw error

      return { success: true, data: data || [] }

    } catch (error: any) {
      console.error('Error getting player season aggregation:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get player performance vs specific opponents
   */
  static async getPlayerVsOpponent(player?: string, opponent?: string): Promise<{ success: boolean; data?: PlayerVsOpponent[]; error?: string }> {
    try {
      let query = supabase
        .from('player_vs_opponent')
        .select('*')

      if (player) {
        query = query.eq('player', player)
      }

      if (opponent) {
        query = query.eq('opponent_team', opponent)
      }

      const { data, error } = await query.order('avg_distance_vs_opponent', { ascending: false })

      if (error) throw error

      return { success: true, data: data || [] }

    } catch (error: any) {
      console.error('Error getting player vs opponent data:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get unique players list
   */
  static async getPlayersList(season?: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      let query = supabase
        .from('raw_player_data')
        .select('player')
        .order('player')

      if (season) {
        query = query
          .eq('matchday_reports.season', season)
          .eq('matchday_reports.is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      const uniquePlayers = Array.from(new Set((data || []).map(item => item.player)))
      return { success: true, data: uniquePlayers }

    } catch (error: any) {
      console.error('Error getting players list:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get unique opponents list
   */
  static async getOpponentsList(season?: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      let query = supabase
        .from('matchday_reports')
        .select('opponent_team')
        .eq('is_active', true)
        .order('opponent_team')

      if (season) {
        query = query.eq('season', season)
      }

      const { data, error } = await query

      if (error) throw error

      const uniqueOpponents = Array.from(new Set((data || []).map(item => item.opponent_team)))
      return { success: true, data: uniqueOpponents }

    } catch (error: any) {
      console.error('Error getting opponents list:', error)
      return { success: false, error: error.message }
    }
  }
}