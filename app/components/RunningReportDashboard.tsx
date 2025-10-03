'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, RefreshCw, AlertCircle, CheckCircle, FileDown } from 'lucide-react'
import { CSVReportService } from '../../lib/csvReportService'
import { CSVReportsList } from '../../types/csvReport'
import ComprehensiveMatchdayReport from './ComprehensiveMatchdayReport'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'

export default function RunningReportDashboard() {
  const exportRef = useRef<HTMLDivElement>(null)
  const [savedReports, setSavedReports] = useState<CSVReportsList[]>([])
  const [selectedReport, setSelectedReport] = useState<CSVReportsList | null>(null)
  const [runningData, setRunningData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isLoadingReport, setIsLoadingReport] = useState(false)

  // Load saved reports on component mount
  useEffect(() => {
    loadSavedReports()
  }, [])

  const loadSavedReports = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const result = await CSVReportService.getAllReports()
      
      if (result.success && result.data) {
        setSavedReports(result.data)
      } else {
        setError(result.error || 'Failed to load reports')
      }
    } catch (error: any) {
      console.error('Error loading reports:', error)
      setError('Failed to load saved reports')
    } finally {
      setIsLoading(false)
    }
  }

  const loadReportData = async (report: CSVReportsList) => {
    setIsLoadingReport(true)
    setError('')
    
    try {
      const result = await CSVReportService.loadCSVReport(
        report.matchday_number,
        report.opponent_team
      )
      
      if (result.success && result.data) {
        // Convert CSV data to running report format
        const convertedData = await CSVReportService.convertToRunningReportFormat(
          result.data.parsed_data
        )

        setRunningData(convertedData)
        setSelectedReport(report)
      } else {
        setError(result.error || 'Failed to load report data')
      }
    } catch (error: any) {
      console.error('Error loading report data:', error)
      setError('Failed to load report data')
    } finally {
      setIsLoadingReport(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const goBackToList = () => {
    setSelectedReport(null)
    setRunningData([])
    setError('')
  }

  const handleDownloadPDF = async () => {
    if (!exportRef.current || !selectedReport) return

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#1a1f2e',
        logging: false,
        windowWidth: exportRef.current.scrollWidth,
        windowHeight: exportRef.current.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Calculate PDF dimensions to fit content
      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight]
      })

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`Matchday-${selectedReport.matchday_number}-vs-${selectedReport.opponent_team}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    }
  }

  if (selectedReport && runningData.length > 0) {
    return (
      <div>
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={goBackToList}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFD700',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontFamily: 'Montserrat',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back to Reports
          </button>

          <div style={{
            color: '#FFD700',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Matchday {selectedReport.matchday_number} vs {selectedReport.opponent_team}
          </div>

          <button
            onClick={handleDownloadPDF}
            style={{
              background: '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontFamily: 'Montserrat',
              fontWeight: '600'
            }}
          >
            <FileDown size={16} />
            Download PDF
          </button>
        </div>

        <ComprehensiveMatchdayReport
          runningData={runningData}
          matchdayNumber={selectedReport.matchday_number}
          selectedOpponent={selectedReport.opponent_team}
          exportRef={exportRef}
        />
      </div>
    )
  }

  return (
    <div className="running-report-dashboard">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#FFD700', fontSize: '24px', margin: 0 }}>
          Running Report Dashboard
        </h2>
        <p style={{ color: 'var(--secondary-text)', margin: '8px 0 0 0' }}>
          View running reports from finalized matches stored in the database
        </p>
      </div>

      {/* Refresh Button */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={loadSavedReports}
          disabled={isLoading}
          style={{
            background: isLoading ? '#666' : 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: isLoading ? '#ccc' : '#000',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '600',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Loading...' : 'Refresh Reports'}
        </button>

        <div style={{
          color: 'var(--secondary-text)',
          fontSize: '14px'
        }}>
          {savedReports.length} report{savedReports.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} />
          <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#FFD700', marginBottom: '16px' }} className="animate-spin" />
          <p style={{ color: 'var(--primary-text)', fontFamily: 'Montserrat' }}>
            Loading saved reports...
          </p>
        </div>
      )}

      {/* No Reports Found */}
      {!isLoading && savedReports.length === 0 && !error && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Calendar size={48} style={{ color: '#FFD700', marginBottom: '16px' }} />
          <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '12px' }}>
            No Reports Found
          </h3>
          <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', marginBottom: '20px' }}>
            No running reports have been saved to the database yet.
          </p>
          <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', fontSize: '14px' }}>
            Upload and save running data through the "Running Report" tab to see them here.
          </p>
        </div>
      )}

      {/* Reports List */}
      {!isLoading && savedReports.length > 0 && (
        <div className="glass-card">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '16px',
            padding: '20px'
          }}>
            {savedReports.map((report) => (
              <div
                key={report.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onClick={() => loadReportData(report)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    color: '#FFD700',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    Matchday {report.matchday_number}
                  </div>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle size={12} />
                    Saved
                  </div>
                </div>

                <div style={{
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Beitar vs {report.opponent_team}
                </div>

                <div style={{
                  color: 'var(--secondary-text)',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}>
                  {report.match_date && formatDate(report.match_date)}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: 'var(--secondary-text)'
                }}>
                  <span>{report.total_rows} player records</span>
                  <span>{report.season}</span>
                </div>

                {report.notes && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: 'var(--secondary-text)',
                    fontStyle: 'italic'
                  }}>
                    {report.notes}
                  </div>
                )}

                {/* Loading overlay for this specific report */}
                {isLoadingReport && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}>
                    <RefreshCw size={24} style={{ color: '#FFD700' }} className="animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}