'use client'

import React from 'react'
import { Shield, Download } from 'lucide-react'
import html2canvas from 'html2canvas'

interface MatchdayReportProps {
  csvData: any[]
  matchdayNumber: string
}

export default function MatchdayReport({ csvData, matchdayNumber }: MatchdayReportProps) {
  if (!csvData || csvData.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#fff' }}>
        <p>No data available for Matchday {matchdayNumber}</p>
      </div>
    )
  }

  const downloadReport = async () => {
    const reportElement = document.getElementById('matchday-report-full')
    if (!reportElement) return

    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      link.download = `Matchday_${matchdayNumber}_Full_Report.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  // Find Beitar in the data
  const beitarData = csvData.find(team => 
    team.teamFullName?.toLowerCase().includes('beitar') || 
    team.Team?.toLowerCase().includes('beitar')
  )

  if (!beitarData) {
    return (
      <div style={{ padding: '20px', color: '#fff' }}>
        <p>No Beitar data found for Matchday {matchdayNumber}</p>
      </div>
    )
  }

  // Sort teams by rank
  const sortedTeams = [...csvData].sort((a, b) => parseInt(a.Rank) - parseInt(b.Rank))

  // Helper functions
  const formatPercentage = (value: any) => {
    if (typeof value === 'string' && value.includes('%')) return value
    if (!value || isNaN(value)) return '0%'
    return `${parseFloat(value).toFixed(1)}%`
  }

  const getColorByValue = (value: number, min: number, max: number, inverse = false) => {
    const ratio = (value - min) / (max - min)
    const adjustedRatio = inverse ? 1 - ratio : ratio
    
    if (adjustedRatio >= 0.75) return '#22c55e' // Green
    if (adjustedRatio >= 0.5) return '#3b82f6' // Blue  
    if (adjustedRatio >= 0.25) return '#f59e0b' // Orange
    return '#ef4444' // Red
  }

  const getProgressBarColor = (team: any, field: string) => {
    const values = sortedTeams.map(t => parseFloat(t[field]) || 0)
    const value = parseFloat(team[field]) || 0
    const min = Math.min(...values)
    const max = Math.max(...values)
    return getColorByValue(value, min, max)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Download Button */}
      <button
        onClick={downloadReport}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
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

      <div id="matchday-report-full" style={{
        background: '#0a0a0a',
        padding: '20px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minWidth: '1000px'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1f2e 0%, #0a0a0a 100%)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          border: '1px solid #333'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Shield size={20} color="#FFD700" />
            <span style={{ color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>FCBJ DATA</span>
          </div>
          
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '20px', 
            fontWeight: '700',
            marginBottom: '15px' 
          }}>
            Matchday {matchdayNumber} Report
          </h1>

          {/* Press Metrics Section */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>
              ⚡ Press Metrics & Scoring
            </div>
            
            <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '40px' }}>RANK</th>
                  <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '120px' }}>TEAM</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>PPDA40<br/>SCORE</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>AVG TIME (s)<br/>P POS</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>xG (15TH<br/>perc p5)</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>PPDA40</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, index) => {
                  const isBeitar = team.Team?.toLowerCase().includes('beitar')
                  const ppda40Score = 100 - (index * 100 / sortedTeams.length)
                  
                  return (
                    <tr key={team.teamId} style={{ 
                      borderBottom: '1px solid #222',
                      background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                    }}>
                      <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff' }}>{index + 1}</td>
                      <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                        {team.Team}
                      </td>
                      <td style={{ 
                        padding: '6px 4px', 
                        textAlign: 'center'
                      }}>
                        <span style={{
                          color: getProgressBarColor(team, 'ppda40'),
                          fontWeight: '600'
                        }}>●●●</span> {ppda40Score.toFixed(0)}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                        {parseFloat(team.AvgSeqTime || 0).toFixed(1)}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                        {parseFloat(team.xG || 0).toFixed(2)}
                      </td>
                      <td style={{ 
                        padding: '6px 4px', 
                        textAlign: 'center',
                        color: getProgressBarColor(team, 'ppda40'),
                        fontWeight: '600'
                      }}>
                        {parseFloat(team.ppda40 || 0).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Duels Section */}
        <div style={{ 
          background: '#111',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          border: '1px solid #333'
        }}>
          <h3 style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
            ⚔️ Duels
          </h3>
          
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '40px' }}>RANK</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '120px' }}>TEAM</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>DUELS<br/>SCORE</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>AERIAL %</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>GROUND %</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                const aerialPerc = parseFloat(team['Aerial%'] || 0)
                const groundPerc = parseFloat(team['ground%'] || 0)
                const duelsScore = ((aerialPerc + groundPerc) / 2).toFixed(1)
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff' }}>{index + 1}</td>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center'
                    }}>
                      <span style={{
                        color: parseFloat(duelsScore) > 50 ? '#22c55e' : parseFloat(duelsScore) > 45 ? '#f59e0b' : '#ef4444',
                        fontWeight: '600'
                      }}>●●●</span> {duelsScore}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center',
                      color: aerialPerc > 50 ? '#22c55e' : '#fff'
                    }}>
                      {formatPercentage(team['Aerial%'])}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center',
                      color: groundPerc > 50 ? '#22c55e' : '#fff'
                    }}>
                      {formatPercentage(team['ground%'])}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Assist Zone Section */}
        <div style={{ 
          background: '#111',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          border: '1px solid #333'
        }}>
          <h3 style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
            🎯 Assist Zone
          </h3>
          
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '40px' }}>RANK</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '120px' }}>TEAM</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>ASSIST ZONE<br/>SCORE</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>ASSIST FROM<br/>PASSES</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>SHOT FROM<br/>GOLDEN ⚡</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>A2PASS/CROSS</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff' }}>{index + 1}</td>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center'
                    }}>
                      <span style={{
                        color: getProgressBarColor(team, 'passAssistZone'),
                        fontWeight: '600'
                      }}>●●●</span> {team.passAssistZone || 0}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.passfromassisttogolden || 0}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.shotfromgolden || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center',
                      color: '#22c55e'
                    }}>
                      {formatPercentage((team.CrossOpen || 0) / (team.passAssistZone || 1) * 100)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Shot Locations Section */}
        <div style={{ 
          background: '#111',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          border: '1px solid #333'
        }}>
          <h3 style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
            📍 Shot Locations
          </h3>
          
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '40px' }}>RANK</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '120px' }}>TEAM</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>PP/P5</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>16M/P6</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>17M/P6</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>LOCATION<br/>%</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff' }}>{index + 1}</td>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.SOG_from_penalty_area || 0}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.SOG_from_box || 0}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.shotfrombox || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center',
                      color: '#22c55e'
                    }}>
                      {formatPercentage(((team.SOG_from_penalty_area || 0) / (team.SOG || 1)) * 100)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Shot Quality Section */}
        <div style={{ 
          background: '#111',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px',
          border: '1px solid #333'
        }}>
          <h3 style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>
            🎯 Shot Quality
          </h3>
          
          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '40px' }}>RANK</th>
                <th style={{ padding: '6px 4px', textAlign: 'left', color: '#888', width: '120px' }}>TEAM</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>PP/P5</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>P1SEO</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>12M*6</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>17M1</th>
                <th style={{ padding: '6px 4px', textAlign: 'center', color: '#888' }}>QUALITY<br/>%</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                const sog = team.SOG || 1
                const qualityPerc = ((team.SOG_from_penalty_area || 0) / sog * 100)
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff' }}>{index + 1}</td>
                    <td style={{ padding: '6px 4px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.ShtIncBl || 0}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {formatPercentage(team['ExpG/Shot'] * 100)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {formatPercentage((team.SOG_from_box / sog) * 100)}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: '#fff' }}>
                      {formatPercentage((team.shotfrombox / (team.ShtIncBl || 1)) * 100)}
                    </td>
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center',
                      color: qualityPerc > 50 ? '#22c55e' : qualityPerc > 30 ? '#f59e0b' : '#ef4444',
                      fontWeight: '600'
                    }}>
                      {formatPercentage(qualityPerc)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Progressions Section */}
        <div style={{ 
          background: '#111',
          borderRadius: '8px',
          padding: '15px',
          border: '1px solid #333'
        }}>
          <h3 style={{ fontSize: '11px', color: '#FFD700', marginBottom: '10px' }}>
            ➡️ Field Progression Analysis
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
            {/* A1 → A2 THIRD */}
            <div>
              <h4 style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>A1 → A2 THIRD</h4>
              <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                <tbody>
                  {sortedTeams.map((team) => {
                    const isBeitar = team.Team?.toLowerCase().includes('beitar')
                    const value = team['Starta1enda2/'] || 0
                    const maxValue = Math.max(...sortedTeams.map(t => t['Starta1enda2/'] || 0))
                    const percentage = (value / maxValue) * 100
                    
                    return (
                      <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ 
                          padding: '4px', 
                          color: isBeitar ? '#FFD700' : '#fff',
                          fontWeight: isBeitar ? '600' : '400',
                          fontSize: '9px',
                          width: '80px'
                        }}>
                          {team.Team}
                        </td>
                        <td style={{ padding: '4px', width: '100px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <div style={{
                              width: '60px',
                              height: '8px',
                              background: '#222',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: isBeitar ? '#FFD700' : '#22c55e',
                                borderRadius: '4px'
                              }} />
                            </div>
                            <span style={{ fontSize: '8px', color: '#fff' }}>{value}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* A2 → A3 THIRD */}
            <div>
              <h4 style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>A2 → A3 THIRD</h4>
              <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                <tbody>
                  {sortedTeams.map((team) => {
                    const isBeitar = team.Team?.toLowerCase().includes('beitar')
                    const value = team['Starta2enda3/'] || team.starta2enda3 || 0
                    const maxValue = Math.max(...sortedTeams.map(t => t['Starta2enda3/'] || t.starta2enda3 || 0))
                    const percentage = (value / maxValue) * 100
                    
                    return (
                      <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ 
                          padding: '4px', 
                          color: isBeitar ? '#FFD700' : '#fff',
                          fontWeight: isBeitar ? '600' : '400',
                          fontSize: '9px',
                          width: '80px'
                        }}>
                          {team.Team}
                        </td>
                        <td style={{ padding: '4px', width: '100px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <div style={{
                              width: '60px',
                              height: '8px',
                              background: '#222',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: isBeitar ? '#FFD700' : '#3b82f6',
                                borderRadius: '4px'
                              }} />
                            </div>
                            <span style={{ fontSize: '8px', color: '#fff' }}>{value}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* A3 → BOX */}
            <div>
              <h4 style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>A3 → BOX</h4>
              <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                <tbody>
                  {sortedTeams.map((team) => {
                    const isBeitar = team.Team?.toLowerCase().includes('beitar')
                    const value = team['Starta3endbox /'] || 0
                    const maxValue = Math.max(...sortedTeams.map(t => t['Starta3endbox /'] || 0))
                    const percentage = (value / maxValue) * 100
                    
                    return (
                      <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ 
                          padding: '4px', 
                          color: isBeitar ? '#FFD700' : '#fff',
                          fontWeight: isBeitar ? '600' : '400',
                          fontSize: '9px',
                          width: '80px'
                        }}>
                          {team.Team}
                        </td>
                        <td style={{ padding: '4px', width: '100px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <div style={{
                              width: '60px',
                              height: '8px',
                              background: '#222',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                background: isBeitar ? '#FFD700' : '#ef4444',
                                borderRadius: '4px'
                              }} />
                            </div>
                            <span style={{ fontSize: '8px', color: '#fff' }}>{value}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}