'use client'

import React, { useState, useEffect } from 'react'
import { Search, Calendar, Users, TrendingUp, Download, Trash2, Eye } from 'lucide-react'
import { RawMatchdayReportService } from '../../lib/rawMatchdayReportService'
import { MatchdayReportsList, LoadRawReportResponse } from '../../types/rawMatchdayReport'

interface SavedReportsManagerProps {
  onLoadReport?: (data: LoadRawReportResponse) => void
  onClose?: () => void
}

export default function SavedReportsManager({ onLoadReport, onClose }: SavedReportsManagerProps) {
  const [reports, setReports] = useState<MatchdayReportsList[]>([])
  const [filteredReports, setFilteredReports] = useState<MatchdayReportsList[]>([])
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
      const result = await RawMatchdayReportService.getAllReports()
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
        report.matchday_number.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by season
    if (selectedSeason !== 'all') {
      filtered = filtered.filter(report => report.season === selectedSeason)
    }

    setFilteredReports(filtered)
  }

  const handleLoadReport = async (report: MatchdayReportsList) => {
    setLoadingReportId(report.id)
    try {
      const result = await RawMatchdayReportService.loadRawReport(report.matchday_number, report.opponent_team)
      if (result.success && result.data) {
        onLoadReport?.(result.data)
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

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const result = await RawMatchdayReportService.deleteReport(reportId)
      if (result.success) {
        // Remove from local state
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

  const getTeamBadge = (beitarPlayers: number, opponentPlayers: number) => {
    const totalPlayers = beitarPlayers + opponentPlayers
    if (totalPlayers === 0) {
      return <span className="team-badge neutral">📊 DATA</span>
    }
    return <span className="team-badge info">👥 {totalPlayers} PLAYERS</span>
  }

  const uniqueSeasons = Array.from(new Set(reports.map(r => r.season)))

  if (loading) {
    return (
      <div className="saved-reports-manager loading">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Loading saved reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="saved-reports-manager">
      <style jsx>{`
        .saved-reports-manager {
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
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
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
        
        .match-date {
          font-size: 12px;
          color: #888;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .team-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
        }
        
        .team-badge.info {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
        
        .team-badge.neutral {
          background: rgba(156, 163, 175, 0.2);
          color: #9ca3af;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-label {
          font-size: 10px;
          color: #888;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        
        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #FFD700;
        }
        
        .actions {
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          flex: 1;
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
        
        .delete-btn {
          background: #ef4444;
          color: white;
        }
        
        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }
        
        .loading-content {
          text-align: center;
        }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #444;
          border-top: 4px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
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
        <h1 className="title">Saved Running Reports</h1>
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
            placeholder="Search by opponent or matchday..."
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
          <h3>No Reports Found</h3>
          <p>
            {reports.length === 0 
              ? "No saved reports yet. Generate and save your first report!"
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
                  <div className="match-date">
                    <Calendar size={12} />
                    {report.match_date ? formatDate(report.match_date) : formatDate(report.uploaded_at)}
                  </div>
                </div>
                {getTeamBadge(report.beitar_players, report.opponent_players)}
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-label">Total Records</div>
                  <div className="stat-value">{report.total_records}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Beitar Players</div>
                  <div className="stat-value">{report.beitar_players}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Opponent Players</div>
                  <div className="stat-value">{report.opponent_players}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Season</div>
                  <div className="stat-value">{report.season}</div>
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
                      Load Report
                    </>
                  )}
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