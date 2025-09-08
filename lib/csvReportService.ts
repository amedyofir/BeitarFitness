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