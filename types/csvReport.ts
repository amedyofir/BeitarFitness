// TypeScript types for CSV file storage

export interface CSVReport {
  id?: string
  matchday_number: string
  opponent_team: string
  match_date?: string
  season?: string
  filename?: string
  original_filename?: string
  csv_content: string // The entire CSV file as text
  csv_headers?: string[] // Array of column headers
  total_rows?: number
  uploaded_at?: string
  uploaded_by?: string
  is_active?: boolean
  notes?: string
}

export interface CSVReportsList {
  id: string
  matchday_number: string
  opponent_team: string
  match_date?: string
  season: string
  filename?: string
  original_filename?: string
  total_rows: number
  uploaded_at: string
  uploaded_by?: string
  notes?: string
}

export interface SaveCSVRequest {
  matchday_number: string
  opponent_team: string
  match_date?: string
  season?: string
  filename?: string
  original_filename?: string
  csv_content: string // The raw CSV text
  uploaded_by?: string
  notes?: string
}

export interface LoadCSVResponse {
  report: CSVReport
  parsed_data: any[] // Parsed CSV rows as objects
}

// Utility type for any CSV row data
export interface CSVRowData {
  [key: string]: string | number | undefined
}