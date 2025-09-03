'use client'

import React from 'react'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'

interface MatchdayReportProps {
  csvData: any[]
  matchdayNumber: string
}

export default function MatchdayReport({ csvData, matchdayNumber }: MatchdayReportProps) {
  if (!csvData || csvData.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--secondary-text)' }}>No data available</p>
      </div>
    )
  }

  const downloadReport = async () => {
    const reportElement = document.getElementById('matchday-report')
    if (!reportElement) return

    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#1a1f2e',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      link.download = `Matchday_${matchdayNumber}_Report.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  // Find Beitar's data
  const beitarData = csvData.find(team => 
    team.teamFullName?.toLowerCase().includes('beitar') || 
    team.Team?.toLowerCase().includes('beitar')
  )

  // Sort teams by rank
  const sortedTeams = [...csvData].sort((a, b) => (a.Rank || 0) - (b.Rank || 0))

  return (
    <div style={{ position: 'relative' }}>
      {/* Download Button */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 100
      }}>
        <button
          onClick={downloadReport}
          style={{
            background: 'rgba(255, 215, 0, 0.9)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Download size={20} color="#000" />
        </button>
      </div>

      <div id="matchday-report" className="glass-card" style={{ padding: '30px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontFamily: 'Montserrat', 
            fontWeight: '700',
            fontSize: '28px',
            marginBottom: '10px'
          }}>
            MATCHDAY {matchdayNumber} REPORT
          </h2>
          <p style={{ 
            color: 'var(--secondary-text)', 
            fontFamily: 'Montserrat',
            fontSize: '14px'
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* League Table */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ 
            color: '#FFD700', 
            fontFamily: 'Montserrat', 
            fontSize: '20px',
            marginBottom: '20px'
          }}>
            League Performance Rankings
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="stats-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #FFD700' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700' }}>Rank</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#FFD700' }}>Team</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>xG</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>ExpG</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>SOG</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>Touches</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>Touch Op Box</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>Ground %</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: '#FFD700' }}>Aerial %</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => {
                  const isBeitarRow = team.teamFullName?.toLowerCase().includes('beitar') || 
                                      team.Team?.toLowerCase().includes('beitar')
                  
                  return (
                    <tr 
                      key={team.teamId || index}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: isBeitarRow ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
                      }}
                    >
                      <td style={{ 
                        padding: '12px', 
                        color: isBeitarRow ? '#FFD700' : 'var(--primary-text)',
                        fontWeight: isBeitarRow ? '600' : '400'
                      }}>
                        {team.Rank || index + 1}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        color: isBeitarRow ? '#FFD700' : 'var(--primary-text)',
                        fontWeight: isBeitarRow ? '600' : '400'
                      }}>
                        {team.teamFullName || team.Team}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team.xG?.toFixed(2) || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team.ExpG?.toFixed(2) || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team.SOG || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team.Touches || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team.TouchOpBox || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team['ground%'] || '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--primary-text)' }}>
                        {team['Aerial%'] || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Beitar Specific Stats */}
        {beitarData && (
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ 
              color: '#FFD700', 
              fontFamily: 'Montserrat', 
              fontSize: '20px',
              marginBottom: '20px'
            }}>
              Beitar Jerusalem Performance
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: 'var(--secondary-text)', fontSize: '12px', marginBottom: '8px' }}>Expected Goals</p>
                <p style={{ color: '#FFD700', fontSize: '24px', fontWeight: '600' }}>{beitarData.xG?.toFixed(2) || '-'}</p>
              </div>
              
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: 'var(--secondary-text)', fontSize: '12px', marginBottom: '8px' }}>Shots on Goal</p>
                <p style={{ color: '#FFD700', fontSize: '24px', fontWeight: '600' }}>{beitarData.SOG || '-'}</p>
              </div>
              
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: 'var(--secondary-text)', fontSize: '12px', marginBottom: '8px' }}>Total Touches</p>
                <p style={{ color: '#FFD700', fontSize: '24px', fontWeight: '600' }}>{beitarData.Touches || '-'}</p>
              </div>
              
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <p style={{ color: 'var(--secondary-text)', fontSize: '12px', marginBottom: '8px' }}>League Position</p>
                <p style={{ color: '#FFD700', fontSize: '24px', fontWeight: '600' }}>#{beitarData.Rank || '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}