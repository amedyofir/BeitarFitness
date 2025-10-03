'use client'

import React, { useState, useEffect } from 'react'
import { Search, Calendar, FileText, Download, Trash2, Eye, Upload, FileDown } from 'lucide-react'
import { CSVReportService } from '../../lib/csvReportService'
import { CSVReportsList } from '../../types/csvReport'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

interface SimpleCSVReportsManagerProps {
  onLoadReport?: (data: any[]) => void // Parsed CSV data
  onClose?: () => void
}

export default function SimpleCSVReportsManager({ onLoadReport, onClose }: SimpleCSVReportsManagerProps) {
  const [reports, setReports] = useState<CSVReportsList[]>([])
  const [filteredReports, setFilteredReports] = useState<CSVReportsList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('all')
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [reports, searchTerm, selectedSeason])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const result = await CSVReportService.getAllReports()
      if (result.success && result.data) {
        setReports(result.data)
      } else {
        console.error('Error fetching reports:', result.error)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = [...reports]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.opponent_team.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.matchday_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.filename && report.filename.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by season
    if (selectedSeason !== 'all') {
      filtered = filtered.filter(report => report.season === selectedSeason)
    }

    setFilteredReports(filtered)
  }

  const handleLoadReport = async (report: CSVReportsList) => {
    setLoadingReportId(report.id)
    try {
      const result = await CSVReportService.loadCSVReport(report.matchday_number, report.opponent_team)
      if (result.success && result.data) {
        // Convert to running report format if callback expects it
        const runningData = await CSVReportService.convertToRunningReportFormat(result.data.parsed_data)
        onLoadReport?.(runningData)
        onClose?.()
      } else {
        alert(`Error loading report: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error loading report: ${error.message}`)
    } finally {
      setLoadingReportId(null)
    }
  }

  const handleDownloadCSV = async (report: CSVReportsList) => {
    try {
      const result = await CSVReportService.loadCSVReport(report.matchday_number, report.opponent_team)
      if (result.success && result.data) {
        // Create download link for the CSV
        const blob = new Blob([result.data.report.csv_content], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = report.filename || `${report.matchday_number}-vs-${report.opponent_team}.csv`
        link.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert(`Error downloading CSV: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error downloading CSV: ${error.message}`)
    }
  }

  const handleDownloadPDF = async (report: CSVReportsList) => {
    try {
      const result = await CSVReportService.loadCSVReport(report.matchday_number, report.opponent_team)
      if (result.success && result.data) {
        const parsedData = result.data.parsed_data

        // Create PDF
        const doc = new jsPDF('landscape')

        // Add title
        doc.setFontSize(18)
        doc.setTextColor(255, 215, 0)
        doc.text(`Matchday ${report.matchday_number} - Beitar vs ${report.opponent_team}`, 14, 15)

        // Add metadata
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(`Season: ${report.season} | Date: ${formatDate(report.match_date || report.uploaded_at)}`, 14, 22)
        doc.text(`Total Players: ${report.total_rows}`, 14, 27)

        // Prepare table data
        if (parsedData && parsedData.length > 0) {
          const headers = Object.keys(parsedData[0])
          const rows = parsedData.map((row: any) => headers.map(header => row[header] || ''))

          // Add table
          ;(doc as any).autoTable({
            head: [headers],
            body: rows,
            startY: 32,
            theme: 'striped',
            headStyles: {
              fillColor: [255, 215, 0],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              fontSize: 8
            },
            bodyStyles: {
              fontSize: 7,
              textColor: [50, 50, 50]
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            },
            margin: { top: 32, right: 14, bottom: 14, left: 14 },
            styles: {
              cellPadding: 2,
              overflow: 'linebreak',
              fontSize: 7
            }
          })
        }

        // Save PDF
        const filename = `${report.matchday_number}-vs-${report.opponent_team}.pdf`
        doc.save(filename)
      } else {
        alert(`Error downloading PDF: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error downloading PDF: ${error.message}`)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const result = await CSVReportService.deleteReport(reportId)
      if (result.success) {
        setReports(reports.filter(r => r.id !== reportId))
        alert('Report deleted successfully')
      } else {
        alert(`Error deleting report: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error deleting report: ${error.message}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const uniqueSeasons = Array.from(new Set(reports.map(r => r.season)))

  if (loading) {
    return (
      <div className="csv-reports-loading">
        <div className="spinner"></div>
        <p>Loading CSV reports...</p>
      </div>
    )
  }

  return (
    <div className="csv-reports-manager">
      <style jsx>{`
        .csv-reports-manager {
          background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
          border-radius: 12px;
          padding: 24px;
          color: #fff;
          max-width: 1200px;
          margin: 0 auto;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #FFD700;
          padding-bottom: 16px;
        }
        
        .title {
          color: #FFD700;
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
        
        .close-btn {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        
        .filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .search-box {
          position: relative;
          flex: 1;
          min-width: 250px;
        }
        
        .search-box input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #444;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 14px;
        }
        
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #888;
        }
        
        .season-select select {
          padding: 12px 16px;
          border: 1px solid #444;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 14px;
          cursor: pointer;
        }
        
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
        }
        
        .report-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 20px;
          transition: transform 0.2s, border-color 0.2s;
        }
        
        .report-card:hover {
          transform: translateY(-2px);
          border-color: #FFD700;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .matchday-info {
          flex: 1;
        }
        
        .matchday-title {
          color: #FFD700;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }
        
        .opponent {
          font-size: 16px;
          color: #fff;
          margin: 0 0 8px 0;
        }
        
        .file-info {
          font-size: 12px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
        }
        
        .upload-date {
          font-size: 12px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .csv-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .stats-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .stat {
          text-align: center;
        }
        
        .stat-label {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        
        .stat-value {
          color: #FFD700;
          font-weight: 600;
        }
        
        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 8px;
        }
        
        .action-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: opacity 0.2s;
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .load-btn {
          background: #22c55e;
          color: white;
        }
        
        .download-btn {
          background: #3b82f6;
          color: white;
        }

        .pdf-btn {
          background: #f97316;
          color: white;
        }

        .delete-btn {
          background: #ef4444;
          color: white;
        }
        
        .csv-reports-loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          color: #fff;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #444;
          border-top: 4px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #888;
        }
        
        .empty-state h3 {
          color: #FFD700;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="header">
        <h1 className="title">Saved CSV Reports</h1>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by opponent, matchday, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="season-select">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            <option value="all">All Seasons</option>
            {uniqueSeasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="empty-state">
          <h3>No CSV Reports Found</h3>
          <p>
            {reports.length === 0 
              ? "No saved CSV reports yet. Save your first running report!"
              : "No reports match your current filters."
            }
          </p>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="card-header">
                <div className="matchday-info">
                  <h3 className="matchday-title">Matchday {report.matchday_number}</h3>
                  <p className="opponent">vs {report.opponent_team}</p>
                  <div className="file-info">
                    <FileText size={12} />
                    {report.filename || 'CSV File'}
                  </div>
                  <div className="upload-date">
                    <Calendar size={12} />
                    {formatDate(report.uploaded_at)}
                  </div>
                </div>
                <div className="csv-badge">📊 CSV</div>
              </div>

              <div className="stats-row">
                <div className="stat">
                  <div className="stat-label">Total Rows</div>
                  <div className="stat-value">{report.total_rows}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Season</div>
                  <div className="stat-value">{report.season}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Uploaded By</div>
                  <div className="stat-value">{report.uploaded_by || 'System'}</div>
                </div>
              </div>

              <div className="actions">
                <button
                  className="action-btn load-btn"
                  onClick={() => handleLoadReport(report)}
                  disabled={loadingReportId === report.id}
                >
                  {loadingReportId === report.id ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <Eye size={12} />
                      Load
                    </>
                  )}
                </button>

                <button
                  className="action-btn download-btn"
                  onClick={() => handleDownloadCSV(report)}
                >
                  <Download size={12} />
                  CSV
                </button>

                <button
                  className="action-btn pdf-btn"
                  onClick={() => handleDownloadPDF(report)}
                >
                  <FileDown size={12} />
                  PDF
                </button>

                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDeleteReport(report.id)}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}