import { supabase } from './supabase'
import { CSVReport, CSVReportsList, SaveCSVRequest, LoadCSVResponse } from '../types/csvReport'

export class CSVReportService {
  
  /**
   * Save CSV file content directly to database
   */
  static async saveCSVReport(data: SaveCSVRequest): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      // Check if report already exists
      const existingReport = await this.getReportByMatchday(data.matchday_number, data.opponent_team)
      if (existingReport.success && existingReport.data) {
        return { success: false, error: 'Report already exists for this matchday and opponent' }
      }

      // Parse CSV to get headers and row count
      const lines = data.csv_content.trim().split('\n')
      const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : []
      const totalRows = Math.max(0, lines.length - 1) // Subtract header row

      // Create the report record
      const reportData: Partial<CSVReport> = {
        matchday_number: data.matchday_number,
        opponent_team: data.opponent_team,
        match_date: data.match_date,
        season: data.season || '2024-2025',
        filename: data.filename,
        original_filename: data.original_filename,
        csv_content: data.csv_content,
        csv_headers: headers,
        total_rows: totalRows,
        uploaded_by: data.uploaded_by,
        notes: data.notes,
        is_active: true
      }

      // Insert report
      const { data: reportResult, error: reportError } = await supabase
        .from('csv_reports')
        .insert([reportData])
        .select()
        .single()

      if (reportError) throw reportError

      return { success: true, reportId: reportResult.id }

    } catch (error: any) {
      console.error('Error saving CSV report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Load CSV report and parse the data
   */
  static async loadCSVReport(matchdayNumber: string, opponentTeam: string): Promise<{ success: boolean; data?: LoadCSVResponse; error?: string }> {
    try {
      // Get the report
      const reportResult = await this.getReportByMatchday(matchdayNumber, opponentTeam)
      if (!reportResult.success || !reportResult.data) {
        return { success: false, error: 'Report not found' }
      }

      const report = reportResult.data

      // Parse CSV content
      const parsedData = this.parseCSVContent(report.csv_content)

      return {
        success: true,
        data: {
          report,
          parsed_data: parsedData
        }
      }

    } catch (error: any) {
      console.error('Error loading CSV report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get all saved CSV reports
   */
  static async getAllReports(): Promise<{ success: boolean; data?: CSVReportsList[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('csv_reports_list')
        .select('*')

      if (error) throw error

      return { success: true, data: data || [] }

    } catch (error: any) {
      console.error('Error getting all CSV reports:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get report by matchday and opponent
   */
  static async getReportByMatchday(matchdayNumber: string, opponentTeam: string): Promise<{ success: boolean; data?: CSVReport; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('csv_reports')
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
      console.error('Error getting CSV report by matchday:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a report (soft delete)
   */
  static async deleteReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('csv_reports')
        .update({ is_active: false })
        .eq('id', reportId)

      if (error) throw error

      return { success: true }

    } catch (error: any) {
      console.error('Error deleting CSV report:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Parse CSV content into array of objects
   */
  static parseCSVContent(csvContent: string): any[] {
    try {
      const lines = csvContent.trim().split('\n')
      if (lines.length < 2) return [] // Need at least header + 1 data row

      // Get headers from first line
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      // Parse data lines
      const data = []
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i])
        if (values.length === headers.length) {
          const row: any = {}
          headers.forEach((header, index) => {
            const value = values[index]?.trim().replace(/"/g, '')
            // Try to convert to number if it looks like a number
            row[header] = this.convertValue(value)
          })
          data.push(row)
        }
      }

      return data

    } catch (error) {
      console.error('Error parsing CSV content:', error)
      return []
    }
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const values = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"' // Escaped quote
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes // Toggle quote state
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    values.push(current) // Add the last value
    return values
  }

  /**
   * Convert string values to appropriate types
   */
  private static convertValue(value: string): string | number {
    if (!value || value === '') return ''
    
    // Try to convert to number
    const num = parseFloat(value)
    if (!isNaN(num) && isFinite(num) && value.match(/^-?[\d.,]+$/)) {
      return num
    }
    
    return value
  }

  /**
   * Convert parsed CSV data back to original format expected by running report
   */
  static convertToRunningReportFormat(parsedData: any[]): any[] {
    return parsedData.map(row => {
      // Map common CSV columns to the expected format
      // Adjust these mappings based on your actual CSV structure
      return {
        Player: row['Player'] || row['player'] || row['Name'],
        playerFullName: row['playerFullName'] || row['Full Name'] || row['Player'],
        Position: row['Position'] || row['position'] || row['Pos'],
        teamName: row['teamName'] || row['Team Name'] || row['Team'],
        newestTeam: row['newestTeam'] || row['Newest Team'] || row['teamName'],
        Min: row['Min'] || row['Minutes'] || row['min'],
        MinIncET: row['MinIncET'] || row['Minutes Inc ET'] || row['Min'],
        DistanceRunFirstHalf: row['DistanceRunFirstHalf'] || row['Distance Run First Half'],
        DistanceRunScndHalf: row['DistanceRunScndHalf'] || row['Distance Run Second Half'],
        FirstHalfDistSprint: row['FirstHalfDistSprint'] || row['First Half Dist Sprint'],
        ScndHalfDistSprint: row['ScndHalfDistSprint'] || row['Second Half Dist Sprint'],
        FirstHalfDistHSRun: row['FirstHalfDistHSRun'] || row['First Half Dist HS Run'],
        ScndHalfDistHSRun: row['ScndHalfDistHSRun'] || row['Second Half Dist HS Run'],
        TopSpeed: row['TopSpeed'] || row['Top Speed'] || row['Max Speed'],
        KMHSPEED: row['KMHSPEED'] || row['Speed (km/h)'] || row['Speed'],
        InPossDistSprint: row['InPossDistSprint'] || row['In Poss Dist Sprint'],
        OutPossDistSprint: row['OutPossDistSprint'] || row['Out Poss Dist Sprint'],
        InPossDistHSRun: row['InPossDistHSRun'] || row['In Poss Dist HS Run'],
        OutPossDistHSRun: row['OutPossDistHSRun'] || row['Out Poss Dist HS Run'],
        DistanceRunInPoss: row['DistanceRunInPoss'] || row['Distance Run In Poss'],
        DistanceRunOutPoss: row['DistanceRunOutPoss'] || row['Distance Run Out Poss'],
        GS: row['GS'] || row['Game Score'],
        pos: row['pos'] || row['Position Code'],
        
        // Include any additional fields from the CSV
        ...row
      }
    })
  }

  /**
   * Get unique opponents list from saved reports
   */
  static async getOpponentsList(season?: string): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      let query = supabase
        .from('csv_reports')
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

  /**
   * Get aggregated team averages across all matches for a season
   */
  static async getTeamAveragesBySeason(season: string = '2024-2025'): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.getAllReports()
      
      if (!result.success || !result.data) {
        return { success: false, error: 'Failed to load reports' }
      }

      // Filter reports by season
      const seasonReports = result.data.filter(report => report.season === season)
      
      if (seasonReports.length === 0) {
        return { success: false, error: `No reports found for season ${season}` }
      }

      // Load and aggregate all CSV data for the season
      const allMatchData: any[] = []
      
      for (const report of seasonReports) {
        const reportResult = await this.loadCSVReport(report.matchday_number, report.opponent_team)
        if (reportResult.success && reportResult.data) {
          const convertedData = this.convertToRunningReportFormat(reportResult.data.parsed_data)
          
          // Add match metadata to each player record
          convertedData.forEach(player => {
            player.matchday_number = report.matchday_number
            player.opponent_team = report.opponent_team
            player.match_date = report.match_date
          })
          
          allMatchData.push(...convertedData)
        }
      }

      if (allMatchData.length === 0) {
        return { success: false, error: 'No valid match data found' }
      }

      // Aggregate by team and player
      const aggregatedData = this.aggregatePlayerDataAcrossMatches(allMatchData)
      
      return { 
        success: true, 
        data: {
          season,
          totalMatches: seasonReports.length,
          totalPlayers: allMatchData.length,
          aggregatedData,
          matchesList: seasonReports.map(r => ({
            matchday: r.matchday_number,
            opponent: r.opponent_team,
            date: r.match_date
          }))
        }
      }

    } catch (error: any) {
      console.error('Error getting team averages:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Aggregate player data across multiple matches - TEAM TOTALS FIRST
   */
  private static aggregatePlayerDataAcrossMatches(allMatchData: any[]): any[] {
    // First, organize data by match and team
    const matchTeamData: { [key: string]: any } = {}
    
    allMatchData.forEach(player => {
      const teamName = player.teamName || player.newestTeam || 'Unknown'
      const matchKey = `${player.matchday_number}_${player.opponent_team}`
      const teamMatchKey = `${matchKey}_${teamName}`
      
      // Skip goalkeepers and non-playing players
      if (player.Position?.toLowerCase().includes('goalkeeper') || 
          player.pos?.toLowerCase().includes('goalkeeper')) return
      
      const playingTime = player.MinIncET || player.Min || 0
      if (playingTime <= 0) return
      
      if (!matchTeamData[teamMatchKey]) {
        matchTeamData[teamMatchKey] = {
          matchday: player.matchday_number,
          opponent: player.opponent_team,
          date: player.match_date,
          teamName: teamName,
          
          // Team totals for this match
          totalDistance: 0,
          totalFirstHalf: 0,
          totalSecondHalf: 0,
          totalInPoss: 0,
          totalOutPoss: 0,
          totalFirstHalfHSR: 0,
          totalFirstHalfSprint: 0,
          totalSecondHalfHSR: 0,
          totalSecondHalfSprint: 0,
          totalInPossHSR: 0,
          totalOutPossHSR: 0,
          totalInPossSprint: 0,
          totalOutPossSprint: 0,
          totalMinutes: 0,
          totalMinutesET: 0,
          maxSpeed: 0,
          totalSpeed: 0,
          speedCount: 0,
          
          players: []
        }
      }
      
      const teamMatch = matchTeamData[teamMatchKey]
      
      // Add player's stats to team totals for this match
      teamMatch.totalDistance += (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
      teamMatch.totalFirstHalf += (player.DistanceRunFirstHalf || 0)
      teamMatch.totalSecondHalf += (player.DistanceRunScndHalf || 0)
      teamMatch.totalInPoss += (player.DistanceRunInPoss || 0)
      teamMatch.totalOutPoss += (player.DistanceRunOutPoss || 0)
      teamMatch.totalFirstHalfHSR += (player.FirstHalfDistHSRun || 0)
      teamMatch.totalFirstHalfSprint += (player.FirstHalfDistSprint || 0)
      teamMatch.totalSecondHalfHSR += (player.ScndHalfDistHSRun || 0)
      teamMatch.totalSecondHalfSprint += (player.ScndHalfDistSprint || 0)
      teamMatch.totalInPossHSR += (player.InPossDistHSRun || 0)
      teamMatch.totalOutPossHSR += (player.OutPossDistHSRun || 0)
      teamMatch.totalInPossSprint += (player.InPossDistSprint || 0)
      teamMatch.totalOutPossSprint += (player.OutPossDistSprint || 0)
      teamMatch.totalMinutes += (player.Min || 0)
      teamMatch.totalMinutesET += (player.MinIncET || 0)
      
      // Track both TopSpeed and KMHSPEED
      const topSpeed = typeof player.TopSpeed === 'string' ? parseFloat(player.TopSpeed) : (player.TopSpeed || 0)
      const kmhSpeed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || 0)
      
      // Use the higher of the two for max speed
      const maxSpeedForPlayer = Math.max(topSpeed, kmhSpeed)
      
      if (!isNaN(kmhSpeed) && kmhSpeed > 0) {
        teamMatch.totalSpeed += kmhSpeed
        teamMatch.speedCount++
      }
      
      if (!isNaN(maxSpeedForPlayer) && maxSpeedForPlayer > 0) {
        teamMatch.maxSpeed = Math.max(teamMatch.maxSpeed, maxSpeedForPlayer)
      }
      
      teamMatch.players.push(player)
    })
    
    // Now aggregate team totals across matches - FILTER OUT INVALID DATA
    const teamAverages: { [teamName: string]: any } = {}
    
    Object.values(matchTeamData).forEach(teamMatch => {
      const teamName = teamMatch.teamName
      
      // VALIDATION: Skip matches where team total distance is less than 10,000m (data error)
      if (teamMatch.totalDistance < 10000) {
        console.warn(`⚠️ Excluding invalid match data for ${teamName}: only ${teamMatch.totalDistance}m total distance (match ${teamMatch.matchday} vs ${teamMatch.opponent})`)
        return
      }
      
      if (!teamAverages[teamName]) {
        teamAverages[teamName] = {
          teamName: teamName,
          matchCount: 0,
          
          // Accumulate team totals across matches
          sumDistance: 0,
          sumFirstHalf: 0,
          sumSecondHalf: 0,
          sumInPoss: 0,
          sumOutPoss: 0,
          sumFirstHalfHSR: 0,
          sumFirstHalfSprint: 0,
          sumSecondHalfHSR: 0,
          sumSecondHalfSprint: 0,
          sumInPossHSR: 0,
          sumOutPossHSR: 0,
          sumInPossSprint: 0,
          sumOutPossSprint: 0,
          sumMinutes: 0,
          sumMinutesET: 0,
          maxTopSpeed: 0,
          sumAvgSpeed: 0,
          
          // NEW: Store team-level intensity calculations per match
          sumInPossIntensity: 0,
          sumOutPossIntensity: 0,
          
          // NEW: Half split aggregations per match
          sumFirstHalfIntensity: 0,
          sumSecondHalfIntensity: 0,
          
          allPlayers: new Set(),
          matches: []
        }
      }
      
      const team = teamAverages[teamName]
      team.matchCount++
      
      // Add this match's team totals to the sum
      team.sumDistance += teamMatch.totalDistance
      team.sumFirstHalf += teamMatch.totalFirstHalf
      team.sumSecondHalf += teamMatch.totalSecondHalf
      team.sumInPoss += teamMatch.totalInPoss
      team.sumOutPoss += teamMatch.totalOutPoss
      team.sumFirstHalfHSR += teamMatch.totalFirstHalfHSR
      team.sumFirstHalfSprint += teamMatch.totalFirstHalfSprint
      team.sumSecondHalfHSR += teamMatch.totalSecondHalfHSR
      team.sumSecondHalfSprint += teamMatch.totalSecondHalfSprint
      team.sumInPossHSR += teamMatch.totalInPossHSR
      team.sumOutPossHSR += teamMatch.totalOutPossHSR
      team.sumInPossSprint += teamMatch.totalInPossSprint
      team.sumOutPossSprint += teamMatch.totalOutPossSprint
      team.sumMinutes += teamMatch.totalMinutes
      team.sumMinutesET += teamMatch.totalMinutesET
      team.maxTopSpeed = Math.max(team.maxTopSpeed, teamMatch.maxSpeed)
      team.sumAvgSpeed += (teamMatch.speedCount > 0 ? teamMatch.totalSpeed / teamMatch.speedCount : 0)
      
      // FIXED: Calculate team intensity PER MATCH, then sum for averaging
      const matchInPossIntensity = teamMatch.totalInPoss > 0 ? 
        ((teamMatch.totalInPossHSR + teamMatch.totalInPossSprint) / teamMatch.totalInPoss * 100) : 0
      const matchOutPossIntensity = teamMatch.totalOutPoss > 0 ? 
        ((teamMatch.totalOutPossHSR + teamMatch.totalOutPossSprint) / teamMatch.totalOutPoss * 100) : 0
      
      team.sumInPossIntensity += matchInPossIntensity
      team.sumOutPossIntensity += matchOutPossIntensity
      
      // NEW: Calculate half split intensities PER MATCH
      const matchFirstHalfIntensity = teamMatch.totalFirstHalf > 0 ? 
        ((teamMatch.totalFirstHalfHSR + teamMatch.totalFirstHalfSprint) / teamMatch.totalFirstHalf * 100) : 0
      const matchSecondHalfIntensity = teamMatch.totalSecondHalf > 0 ? 
        ((teamMatch.totalSecondHalfHSR + teamMatch.totalSecondHalfSprint) / teamMatch.totalSecondHalf * 100) : 0
        
      team.sumFirstHalfIntensity += matchFirstHalfIntensity
      team.sumSecondHalfIntensity += matchSecondHalfIntensity
      
      // Track all unique players
      teamMatch.players.forEach((p: any) => team.allPlayers.add(p.Player))
      
      team.matches.push({
        matchday: teamMatch.matchday,
        opponent: teamMatch.opponent,
        date: teamMatch.date,
        totalDistance: teamMatch.totalDistance,
        playerCount: teamMatch.players.length
      })
    })
    
    // Convert team averages to player-like format for compatibility with report
    const result: any[] = []
    
    Object.values(teamAverages).forEach(team => {
      const matchCount = team.matchCount || 1
      
      // Create a synthetic "team average" entry
      result.push({
        Player: `${team.teamName} Team Average`,
        playerFullName: `${team.teamName} - Season Average`,
        Position: 'TEAM',
        teamName: team.teamName,
        newestTeam: team.teamName,
        matchesPlayed: matchCount,
        
        // These are now TEAM AVERAGES across matches
        Min: team.sumMinutes / matchCount,
        MinIncET: team.sumMinutesET / matchCount,
        DistanceRunFirstHalf: team.sumFirstHalf / matchCount,
        DistanceRunScndHalf: team.sumSecondHalf / matchCount,
        FirstHalfDistSprint: team.sumFirstHalfSprint / matchCount,
        ScndHalfDistSprint: team.sumSecondHalfSprint / matchCount,
        FirstHalfDistHSRun: team.sumFirstHalfHSR / matchCount,
        ScndHalfDistHSRun: team.sumSecondHalfHSR / matchCount,
        InPossDistSprint: team.sumInPossSprint / matchCount,
        OutPossDistSprint: team.sumOutPossSprint / matchCount,
        InPossDistHSRun: team.sumInPossHSR / matchCount,
        OutPossDistHSRun: team.sumOutPossHSR / matchCount,
        DistanceRunInPoss: team.sumInPoss / matchCount,
        DistanceRunOutPoss: team.sumOutPoss / matchCount,
        
        // FIXED: Add properly calculated team intensities
        avgInPossIntensity: team.sumInPossIntensity / matchCount,
        avgOutPossIntensity: team.sumOutPossIntensity / matchCount,
        
        // NEW: Add half split intensities
        avgFirstHalfIntensity: team.sumFirstHalfIntensity / matchCount,
        avgSecondHalfIntensity: team.sumSecondHalfIntensity / matchCount,
        
        // DEBUG DATA for troubleshooting
        _debug_matchCount: matchCount,
        _debug_sumInPoss: team.sumInPoss,
        _debug_sumOutPoss: team.sumOutPoss,
        _debug_sumInPossHSR: team.sumInPossHSR,
        _debug_sumInPossSprint: team.sumInPossSprint,
        _debug_sumOutPossHSR: team.sumOutPossHSR,
        _debug_sumOutPossSprint: team.sumOutPossSprint,
        _debug_sumInPossIntensity: team.sumInPossIntensity,
        _debug_sumOutPossIntensity: team.sumOutPossIntensity,
        
        TopSpeed: team.maxTopSpeed,
        KMHSPEED: team.sumAvgSpeed / matchCount,
        
        // Metadata
        totalMatches: matchCount,
        avgPlayingTime: team.sumMinutesET / matchCount,
        totalDistance: team.sumDistance / matchCount,
        uniquePlayers: team.allPlayers.size,
        
        GS: 1,
        pos: 'TEAM'
      })
      
      // Also add individual player averages for detail view
      const playerStats: { [key: string]: any } = {}
      
      // Collect all player data across matches for this team
      Object.values(matchTeamData).forEach(teamMatch => {
        if (teamMatch.teamName === team.teamName) {
          teamMatch.players.forEach((player: any) => {
            const playerKey = player.Player
            
            if (!playerStats[playerKey]) {
              playerStats[playerKey] = {
                Player: player.Player,
                playerFullName: player.playerFullName,
                Position: player.Position,
                teamName: player.teamName || player.newestTeam,
                newestTeam: player.newestTeam,
                matchesPlayed: 0,
                
                totalMin: 0,
                totalMinIncET: 0,
                totalDistanceRunFirstHalf: 0,
                totalDistanceRunScndHalf: 0,
                totalFirstHalfDistSprint: 0,
                totalScndHalfDistSprint: 0,
                totalFirstHalfDistHSRun: 0,
                totalScndHalfDistHSRun: 0,
                totalInPossDistSprint: 0,
                totalOutPossDistSprint: 0,
                totalInPossDistHSRun: 0,
                totalOutPossDistHSRun: 0,
                totalDistanceRunInPoss: 0,
                totalDistanceRunOutPoss: 0,
                maxTopSpeed: 0,
                totalKMHSPEED: 0,
                validSpeedReadings: 0
              }
            }
            
            const stats = playerStats[playerKey]
            stats.matchesPlayed++
            
            stats.totalMin += (player.Min || 0)
            stats.totalMinIncET += (player.MinIncET || 0)
            stats.totalDistanceRunFirstHalf += (player.DistanceRunFirstHalf || 0)
            stats.totalDistanceRunScndHalf += (player.DistanceRunScndHalf || 0)
            stats.totalFirstHalfDistSprint += (player.FirstHalfDistSprint || 0)
            stats.totalScndHalfDistSprint += (player.ScndHalfDistSprint || 0)
            stats.totalFirstHalfDistHSRun += (player.FirstHalfDistHSRun || 0)
            stats.totalScndHalfDistHSRun += (player.ScndHalfDistHSRun || 0)
            stats.totalInPossDistSprint += (player.InPossDistSprint || 0)
            stats.totalOutPossDistSprint += (player.OutPossDistSprint || 0)
            stats.totalInPossDistHSRun += (player.InPossDistHSRun || 0)
            stats.totalOutPossDistHSRun += (player.OutPossDistHSRun || 0)
            stats.totalDistanceRunInPoss += (player.DistanceRunInPoss || 0)
            stats.totalDistanceRunOutPoss += (player.DistanceRunOutPoss || 0)
            
            // Track both TopSpeed and KMHSPEED
            const topSpeed = typeof player.TopSpeed === 'string' ? parseFloat(player.TopSpeed) : (player.TopSpeed || 0)
            const kmhSpeed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || 0)
            
            // Use the higher of the two for max speed
            const maxSpeedForMatch = Math.max(topSpeed, kmhSpeed)
            
            if (!isNaN(kmhSpeed) && kmhSpeed > 0) {
              stats.totalKMHSPEED += kmhSpeed
              stats.validSpeedReadings++
            }
            
            // Track the absolute maximum speed across all matches
            if (!isNaN(maxSpeedForMatch) && maxSpeedForMatch > 0) {
              stats.maxTopSpeed = Math.max(stats.maxTopSpeed, maxSpeedForMatch)
            }
          })
        }
      })
      
      // Add individual player averages
      Object.values(playerStats).forEach((stats: any) => {
        const matchesPlayed = stats.matchesPlayed || 1
        
        result.push({
          Player: stats.Player,
          playerFullName: stats.playerFullName,
          Position: stats.Position,
          teamName: stats.teamName,
          newestTeam: stats.newestTeam,
          matchesPlayed: stats.matchesPlayed,
          
          Min: stats.totalMin / matchesPlayed,
          MinIncET: stats.totalMinIncET / matchesPlayed,
          DistanceRunFirstHalf: stats.totalDistanceRunFirstHalf / matchesPlayed,
          DistanceRunScndHalf: stats.totalDistanceRunScndHalf / matchesPlayed,
          FirstHalfDistSprint: stats.totalFirstHalfDistSprint / matchesPlayed,
          ScndHalfDistSprint: stats.totalScndHalfDistSprint / matchesPlayed,
          FirstHalfDistHSRun: stats.totalFirstHalfDistHSRun / matchesPlayed,
          ScndHalfDistHSRun: stats.totalScndHalfDistHSRun / matchesPlayed,
          InPossDistSprint: stats.totalInPossDistSprint / matchesPlayed,
          OutPossDistSprint: stats.totalOutPossDistSprint / matchesPlayed,
          InPossDistHSRun: stats.totalInPossDistHSRun / matchesPlayed,
          OutPossDistHSRun: stats.totalOutPossDistHSRun / matchesPlayed,
          DistanceRunInPoss: stats.totalDistanceRunInPoss / matchesPlayed,
          DistanceRunOutPoss: stats.totalDistanceRunOutPoss / matchesPlayed,
          
          TopSpeed: stats.maxTopSpeed,
          KMHSPEED: stats.validSpeedReadings > 0 ? (stats.totalKMHSPEED / stats.validSpeedReadings) : 0,
          
          totalMatches: stats.matchesPlayed,
          avgPlayingTime: stats.totalMinIncET / matchesPlayed,
          totalDistance: (stats.totalDistanceRunFirstHalf + stats.totalDistanceRunScndHalf) / matchesPlayed,
          
          GS: 1,
          pos: stats.Position
        })
      })
    })
    
    return result
  }

  /**
   * Get unique seasons list
   */
  static async getSeasonsList(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('csv_reports')
        .select('season')
        .eq('is_active', true)
        .order('season')

      if (error) throw error

      const uniqueSeasons = Array.from(new Set((data || []).map(item => item.season)))
      return { success: true, data: uniqueSeasons }

    } catch (error: any) {
      console.error('Error getting seasons list:', error)
      return { success: false, error: error.message }
    }
  }
}