'use client'

import React from 'react'
import { Shield, Download } from 'lucide-react'
import { exportElementForWhatsApp, downloadImage, validateImageForWhatsApp } from '../../utils/whatsappExport'

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
      console.log('Starting WhatsApp-optimized export...')
      
      // Export with WhatsApp optimization
      const result = await exportElementForWhatsApp(reportElement, {
        backgroundColor: '#0b0b0f',
        filename: `Matchday_${matchdayNumber}_Report`,
        dualFormat: true,
        captureWidth: 900,  // Match the actual report width
        maintainAspectRatio: true,
        scale: 3  // Higher scale for better quality
      })
      
      // Validate PNG for WhatsApp
      const pngValidation = await validateImageForWhatsApp(result.png)
      console.log('PNG validation:', pngValidation)
      
      // Download primary format (PNG)
      downloadImage(
        result.png, 
        `Matchday_${matchdayNumber}_Report.png`,
        { showMetadata: true }
      )
      
      // If PNG is too large or has issues, also offer JPEG
      if (!pngValidation.isValid && result.jpeg) {
        console.log('PNG has issues, also providing JPEG fallback')
        setTimeout(() => {
          downloadImage(
            result.jpeg, 
            `Matchday_${matchdayNumber}_Report.jpg`,
            { showMetadata: true }
          )
        }, 1000)
      }
      
      console.log('Export completed:', {
        pngSize: `${(result.metadata.pngSize / 1024 / 1024).toFixed(1)}MB`,
        jpegSize: result.metadata.jpegSize ? `${(result.metadata.jpegSize / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        dimensions: `${result.metadata.width}x${result.metadata.height}`,
        whatsappReady: pngValidation.isValid
      })
      
    } catch (error) {
      console.error('Enhanced export failed:', error)
      alert('Export failed. Please try again.')
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

  // Calculate Press Scores (1-100 proportional)
  const calculatePressScores = () => {
    // Get all values for normalization
    const ppda40Values = sortedTeams.map(t => parseFloat(t.ppda40) || 0)
    const avgSeqTimeValues = sortedTeams.map(t => parseFloat(t.AvgSeqTime) || 0)
    const posWonValues = sortedTeams.map(t => parseFloat(t.poswonopponenthalf) || 0)

    // Get min/max for normalization
    const ppda40Min = Math.min(...ppda40Values)
    const ppda40Max = Math.max(...ppda40Values)
    const avgSeqMin = Math.min(...avgSeqTimeValues)
    const avgSeqMax = Math.max(...avgSeqTimeValues)
    const posWonMin = Math.min(...posWonValues)
    const posWonMax = Math.max(...posWonValues)

    return sortedTeams.map(team => {
      const ppda40 = parseFloat(team.ppda40) || 0
      const avgSeq = parseFloat(team.AvgSeqTime) || 0
      const posWon = parseFloat(team.poswonopponenthalf) || 0

      // Calculate proportional scores (1-100)
      // For PPDA40 and AvgSeq: lower is better, so invert the scale
      const ppda40Score = ppda40Max > ppda40Min ? 
        ((ppda40Max - ppda40) / (ppda40Max - ppda40Min)) * 99 + 1 : 50

      const avgSeqScore = avgSeqMax > avgSeqMin ? 
        ((avgSeqMax - avgSeq) / (avgSeqMax - avgSeqMin)) * 99 + 1 : 50

      // For possession won: higher is better
      const posWonScore = posWonMax > posWonMin ? 
        ((posWon - posWonMin) / (posWonMax - posWonMin)) * 99 + 1 : 50

      // Average the three scores
      const pressScore = (ppda40Score + avgSeqScore + posWonScore) / 3

      return {
        ...team,
        ppda40Score,
        avgSeqScore,
        posWonScore,
        pressScore
      }
    })
  }

  const teamsWithPressScores = calculatePressScores().sort((a, b) => b.pressScore - a.pressScore)

  // Calculate Duels Scores (1-100 proportional)
  const calculateDuelsScores = () => {
    // Get all values for normalization
    const groundValues = sortedTeams.map(t => parseFloat(t['ground%']) || 0)
    const aerialValues = sortedTeams.map(t => parseFloat(t['Aerial%']) || 0)

    // Get min/max for normalization
    const groundMin = Math.min(...groundValues)
    const groundMax = Math.max(...groundValues)
    const aerialMin = Math.min(...aerialValues)
    const aerialMax = Math.max(...aerialValues)

    return sortedTeams.map(team => {
      const ground = parseFloat(team['ground%']) || 0
      const aerial = parseFloat(team['Aerial%']) || 0

      // Calculate proportional scores (1-100) - higher is better for both
      const groundScore = groundMax > groundMin ? 
        ((ground - groundMin) / (groundMax - groundMin)) * 99 + 1 : 50

      const aerialScore = aerialMax > aerialMin ? 
        ((aerial - aerialMin) / (aerialMax - aerialMin)) * 99 + 1 : 50

      // Weighted average: 70% ground + 30% aerial
      const duelsScore = (groundScore * 0.7) + (aerialScore * 0.3)

      return {
        ...team,
        groundScore,
        aerialScore,
        duelsScore
      }
    })
  }

  const teamsWithDuelsScores = calculateDuelsScores().sort((a, b) => b.duelsScore - a.duelsScore)

  // Calculate Assist Zone Scores (1-100 proportional)
  const calculateAssistZoneScores = () => {
    // Get all values for normalization
    const passAssistValues = sortedTeams.map(t => parseFloat(t.passfromassisttogolden) || 0)
    const shotFromGoldenValues = sortedTeams.map(t => parseFloat(t.shotfromgolden) || 0)
    const crossPassRatioValues = sortedTeams.map(t => {
      const crossOpen = parseFloat(t.CrossOpen) || 0
      const passAssist = parseFloat(t.passfromassisttogolden) || 1
      return crossOpen / passAssist
    })

    // Get min/max for normalization
    const passAssistMin = Math.min(...passAssistValues)
    const passAssistMax = Math.max(...passAssistValues)
    const shotFromGoldenMin = Math.min(...shotFromGoldenValues)
    const shotFromGoldenMax = Math.max(...shotFromGoldenValues)
    const crossPassRatioMin = Math.min(...crossPassRatioValues)
    const crossPassRatioMax = Math.max(...crossPassRatioValues)

    return sortedTeams.map(team => {
      const passAssist = parseFloat(team.passfromassisttogolden) || 0
      const shotFromGolden = parseFloat(team.shotfromgolden) || 0
      const crossOpen = parseFloat(team.CrossOpen) || 0
      const crossPassRatio = crossOpen / (passAssist || 1)

      // Calculate proportional scores (1-100) - higher is better for all
      const passAssistScore = passAssistMax > passAssistMin ? 
        ((passAssist - passAssistMin) / (passAssistMax - passAssistMin)) * 99 + 1 : 50

      const shotFromGoldenScore = shotFromGoldenMax > shotFromGoldenMin ? 
        ((shotFromGolden - shotFromGoldenMin) / (shotFromGoldenMax - shotFromGoldenMin)) * 99 + 1 : 50

      const crossPassRatioScore = crossPassRatioMax > crossPassRatioMin ? 
        ((crossPassRatio - crossPassRatioMin) / (crossPassRatioMax - crossPassRatioMin)) * 99 + 1 : 50

      // Weighted average: 40% pass assist + 20% shot from golden + 40% cross/pass ratio
      const assistZoneScore = (passAssistScore * 0.4) + (shotFromGoldenScore * 0.2) + (crossPassRatioScore * 0.4)

      return {
        ...team,
        passAssistScore,
        shotFromGoldenScore,
        crossPassRatioScore,
        crossPassRatio,
        assistZoneScore
      }
    })
  }

  const teamsWithAssistZoneScores = calculateAssistZoneScores().sort((a, b) => b.assistZoneScore - a.assistZoneScore)

  // Calculate Shot Location Scores (1-100 proportional)
  const calculateShotLocationScores = () => {
    // Get all values for normalization
    const sogPenaltyValues = sortedTeams.map(t => parseFloat(t.SOG_from_penalty_area) || 0)
    const sogBoxValues = sortedTeams.map(t => parseFloat(t.SOG_from_box) || 0)
    const shotFromBoxValues = sortedTeams.map(t => parseFloat(t.shotfrombox) || 0)
    const shotFromGoldenPercentValues = sortedTeams.map(t => {
      const shotFromGolden = parseFloat(t.shotfromgolden) || 0
      const totalShots = parseFloat(t.ShtIncBl) || 1
      return (shotFromGolden / totalShots) * 100
    })

    // Get min/max for normalization
    const sogPenaltyMin = Math.min(...sogPenaltyValues)
    const sogPenaltyMax = Math.max(...sogPenaltyValues)
    const sogBoxMin = Math.min(...sogBoxValues)
    const sogBoxMax = Math.max(...sogBoxValues)
    const shotFromBoxMin = Math.min(...shotFromBoxValues)
    const shotFromBoxMax = Math.max(...shotFromBoxValues)
    const shotFromGoldenPercentMin = Math.min(...shotFromGoldenPercentValues)
    const shotFromGoldenPercentMax = Math.max(...shotFromGoldenPercentValues)

    return sortedTeams.map(team => {
      const sogPenalty = parseFloat(team.SOG_from_penalty_area) || 0
      const sogBox = parseFloat(team.SOG_from_box) || 0
      const shotFromBox = parseFloat(team.shotfrombox) || 0
      const shotFromGolden = parseFloat(team.shotfromgolden) || 0
      const totalShots = parseFloat(team.ShtIncBl) || 1
      const shotFromGoldenPercent = (shotFromGolden / totalShots) * 100

      // Calculate proportional scores (1-100) - higher is better for all
      const sogPenaltyScore = sogPenaltyMax > sogPenaltyMin ? 
        ((sogPenalty - sogPenaltyMin) / (sogPenaltyMax - sogPenaltyMin)) * 99 + 1 : 50

      const sogBoxScore = sogBoxMax > sogBoxMin ? 
        ((sogBox - sogBoxMin) / (sogBoxMax - sogBoxMin)) * 99 + 1 : 50

      const shotFromBoxScore = shotFromBoxMax > shotFromBoxMin ? 
        ((shotFromBox - shotFromBoxMin) / (shotFromBoxMax - shotFromBoxMin)) * 99 + 1 : 50

      const shotFromGoldenPercentScore = shotFromGoldenPercentMax > shotFromGoldenPercentMin ? 
        ((shotFromGoldenPercent - shotFromGoldenPercentMin) / (shotFromGoldenPercentMax - shotFromGoldenPercentMin)) * 99 + 1 : 50

      // Location score is based only on Shot from Golden %
      const locationScore = shotFromGoldenPercentScore

      return {
        ...team,
        sogPenaltyScore,
        sogBoxScore,
        shotFromBoxScore,
        shotFromGoldenPercent,
        shotFromGoldenPercentScore,
        locationScore
      }
    })
  }

  const teamsWithShotLocationScores = calculateShotLocationScores().sort((a, b) => b.shotFromGoldenPercent - a.shotFromGoldenPercent)

  // Calculate Shot Quality Scores (1-100 proportional)
  const calculateShotQualityScores = () => {
    // Get all values for normalization - Quality score is SOG_from_penalty_area / ShtIncBl
    const qualityPercentValues = sortedTeams.map(t => {
      const sogPenalty = parseFloat(t.SOG_from_penalty_area) || 0
      const totalShots = parseFloat(t.ShtIncBl) || 1
      return (sogPenalty / totalShots) * 100
    })

    // Get min/max for normalization
    const qualityPercentMin = Math.min(...qualityPercentValues)
    const qualityPercentMax = Math.max(...qualityPercentValues)

    return sortedTeams.map(team => {
      const sogPenalty = parseFloat(team.SOG_from_penalty_area) || 0
      const totalShots = parseFloat(team.ShtIncBl) || 1
      const qualityPercent = (sogPenalty / totalShots) * 100

      // Calculate proportional score (1-100) - higher is better
      const qualityScore = qualityPercentMax > qualityPercentMin ? 
        ((qualityPercent - qualityPercentMin) / (qualityPercentMax - qualityPercentMin)) * 99 + 1 : 50

      return {
        ...team,
        qualityPercent,
        qualityScore
      }
    })
  }

  const teamsWithShotQualityScores = calculateShotQualityScores().sort((a, b) => b.qualityPercent - a.qualityPercent)

  // Helper functions
  const formatPercentage = (value: any) => {
    if (typeof value === 'string' && value.includes('%')) return value
    if (!value || isNaN(value)) return '0%'
    return `${parseFloat(value).toFixed(1)}%`
  }

  const getScoreColor = (score: number) => {
    if (score >= 66) return '#22c55e' // Green - Good
    if (score >= 33) return '#f59e0b' // Orange - Middle  
    return '#ef4444' // Red - Bad
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
    <div style={{ position: 'relative', width: '100%', margin: '0', padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#0b0b0f' }}>
      {/* Download Button */}
      <button
        onClick={downloadReport}
        style={{
          position: 'absolute',
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
        background: '#0b0b0f',
        padding: '20px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '900px',
        margin: '0 auto',
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1f2e 0%, #0a0a0a 100%)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <img src="/beitar-logo.png" alt="Beitar Logo" style={{ width: '18px', height: '18px' }} />
            <span style={{ color: '#FFD700', fontSize: '12px', fontWeight: '600' }}>FCBJ DATA</span>
          </div>
          
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '18px', 
            fontWeight: '700',
            marginBottom: '8px' 
          }}>
            Matchday {matchdayNumber} Report
          </h1>

          {/* Press Metrics Section */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '9px', color: '#888', marginBottom: '6px', textAlign: 'center' }}>
              ⚡ Press Metrics & Scoring
            </div>
            
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>PRESS<br/>SCORE</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontSize: '9px' }}>חילוצי<br/>כדור</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontSize: '9px' }}>זמן<br/>יריבה</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>PPDA40</th>
                </tr>
              </thead>
              <tbody>
                {teamsWithPressScores.map((team, index) => {
                  const isBeitar = team.Team?.toLowerCase().includes('beitar')
                  
                  return (
                    <tr key={team.teamId} style={{ 
                      borderBottom: '1px solid #222',
                      background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                    }}>
                      <td style={{ 
                        padding: '8px 12px', 
                        color: isBeitar ? '#FFD700' : '#fff',
                        fontWeight: '600'
                      }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '6px 8px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                        {team.Team}
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: 'center'
                        }}>
                          <div style={{
                            width: '50px',
                            height: '12px',
                            background: '#222',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${team.pressScore}%`,
                              height: '100%',
                              background: getScoreColor(team.pressScore),
                              borderRadius: '6px'
                            }} />
                          </div>
                          <span style={{ 
                            color: getScoreColor(team.pressScore),
                            fontSize: '9px',
                            fontWeight: '600'
                          }}>
                            {team.pressScore.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        textAlign: 'center',
                        color: getScoreColor(team.posWonScore),
                        fontWeight: '600'
                      }}>
                        {team.poswonopponenthalf || 0} ({team.posWonScore.toFixed(0)})
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        textAlign: 'center',
                        color: getScoreColor(team.avgSeqScore),
                        fontWeight: '600'
                      }}>
                        {parseFloat(team.AvgSeqTime || 0).toFixed(1)}s ({team.avgSeqScore.toFixed(0)})
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        textAlign: 'center',
                        color: getScoreColor(team.ppda40Score),
                        fontWeight: '600'
                      }}>
                        {parseFloat(team.ppda40 || 0).toFixed(2)} ({team.ppda40Score.toFixed(0)})
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
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '9px', color: '#888', marginBottom: '6px', textAlign: 'center' }}>
            ⚔️ Duels
          </h3>
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '25%' }}>DUELS SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '18%' }}>GROUND % (70%)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '19%' }}>AERIAL % (30%)</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithDuelsScores.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: isBeitar ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.duelsScore}%`,
                            height: '100%',
                            background: getScoreColor(team.duelsScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.duelsScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.duelsScore.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: getScoreColor(team.groundScore),
                      fontWeight: '600'
                    }}>
                      {formatPercentage(team['ground%'])} ({team.groundScore.toFixed(0)})
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: getScoreColor(team.aerialScore),
                      fontWeight: '600'
                    }}>
                      {formatPercentage(team['Aerial%'])} ({team.aerialScore.toFixed(0)})
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
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '9px', color: '#888', marginBottom: '6px', textAlign: 'center' }}>
            🎯 Assist Zone
          </h3>
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '22%' }}>ASSIST ZONE SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '16%' }}>ASSIST FROM<br/>PASSES (40%)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '15%' }}>SHOT FROM<br/>GOLDEN (20%)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '15%' }}>A2PASS/CROSS<br/>(40%)</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithAssistZoneScores.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: isBeitar ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.assistZoneScore}%`,
                            height: '100%',
                            background: getScoreColor(team.assistZoneScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.assistZoneScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.assistZoneScore.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: getScoreColor(team.passAssistScore),
                      fontWeight: '600'
                    }}>
                      {team.passfromassisttogolden || 0} ({team.passAssistScore.toFixed(0)})
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: getScoreColor(team.shotFromGoldenScore),
                      fontWeight: '600'
                    }}>
                      {team.shotfromgolden || 0} ({team.shotFromGoldenScore.toFixed(0)})
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: getScoreColor(team.crossPassRatioScore),
                      fontWeight: '600'
                    }}>
                      {team.crossPassRatio.toFixed(2)} ({team.crossPassRatioScore.toFixed(0)})
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
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '9px', color: '#888', marginBottom: '6px', textAlign: 'center' }}>
            📍 Shot Locations
          </h3>
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '24%' }}>LOCATION SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '13%' }}>SHOTS</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '13%' }}>SHOTS FROM<br/>BOX</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '14%' }}>SHOTS FROM<br/>GOLDEN</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithShotLocationScores.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: isBeitar ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.locationScore}%`,
                            height: '100%',
                            background: getScoreColor(team.locationScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.locationScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.shotFromGoldenPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.ShtIncBl || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.shotfrombox || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.shotfromgolden || 0}
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
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '9px', color: '#888', marginBottom: '6px', textAlign: 'center' }}>
            🎯 Shot Quality
          </h3>
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '22%' }}>QUALITY SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '11%' }}>SHOTS</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '12%' }}>SHOTS ON<br/>TARGET</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '11%' }}>SHOTS FROM<br/>BOX</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '11%' }}>SHOTS FROM<br/>GOLDEN</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithShotQualityScores.map((team, index) => {
                const isBeitar = team.Team?.toLowerCase().includes('beitar')
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: isBeitar ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px', color: isBeitar ? '#FFD700' : '#fff', fontWeight: isBeitar ? '600' : '400' }}>
                      {team.Team}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.qualityScore}%`,
                            height: '100%',
                            background: getScoreColor(team.qualityScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.qualityScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.qualityPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.ShtIncBl || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.SOG || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.SOG_from_box || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {team.SOG_from_penalty_area || 0}
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
          padding: '10px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '12px', color: '#FFD700', marginBottom: '6px', textAlign: 'center' }}>
            ➡️ Field Progression Analysis
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* A1 → A2 THIRD */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>A1 → A2 THIRD</h4>
              <div style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>DEFENSIVE THIRD</div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
                <tbody>
                  {(() => {
                    // Calculate A1→A2 percentages and sort
                    const teamsWithA1A2 = sortedTeams.map(team => {
                      const numerator = (parseFloat(team['Starta1enda2/']) || 0) + 
                                      (parseFloat(team['Starta1enda3/']) || 0)
                      const denominator = parseFloat(team.SeqStartA1) || 1
                      const percentage = (numerator / denominator) * 100
                      return { ...team, a1a2Percentage: percentage }
                    }).sort((a, b) => b.a1a2Percentage - a.a1a2Percentage)

                    return teamsWithA1A2.map((team, index) => {
                      const isBeitar = team.Team?.toLowerCase().includes('beitar')
                      
                      return (
                        <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ 
                            padding: '4px 8px', 
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '9px',
                            width: '20px'
                          }}>
                            {index + 1}.
                          </td>
                          <td style={{ 
                            padding: '4px', 
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '9px',
                            width: '80px'
                          }}>
                            {team.Team}
                          </td>
                          <td style={{ 
                            padding: '4px 8px', 
                            textAlign: 'right',
                            color: isBeitar ? '#FFD700' : '#fbbf24',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {team.a1a2Percentage.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* A2 → A3 THIRD */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>A2 → A3 THIRD</h4>
              <div style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>MIDDLE THIRD</div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
                <tbody>
                  {(() => {
                    // Calculate A2→A3 percentages and sort
                    const teamsWithA2A3 = sortedTeams.map(team => {
                      const numerator = (parseFloat(team['Starta1enda3/']) || 0) + 
                                      (parseFloat(team['Starta2enda3/']) || 0)
                      const denominator = (parseFloat(team.SeqStartMid3rd) || 0) + 
                                        (parseFloat(team['Starta1enda2/']) || 0)
                      const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0
                      return { ...team, a2a3Percentage: percentage }
                    }).sort((a, b) => b.a2a3Percentage - a.a2a3Percentage)

                    return teamsWithA2A3.map((team, index) => {
                      const isBeitar = team.Team?.toLowerCase().includes('beitar')
                      
                      return (
                        <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ 
                            padding: '4px 8px', 
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '9px',
                            width: '20px'
                          }}>
                            {index + 1}.
                          </td>
                          <td style={{ 
                            padding: '4px', 
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '9px',
                            width: '80px'
                          }}>
                            {team.Team}
                          </td>
                          <td style={{ 
                            padding: '4px 8px', 
                            textAlign: 'right',
                            color: isBeitar ? '#FFD700' : '#fbbf24',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {team.a2a3Percentage.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* A3 → BOX */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>A3 → BOX</h4>
              <div style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>ATTACKING THIRD</div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
                <tbody>
                  {(() => {
                    // Calculate A3→BOX percentages and sort
                    const teamsWithA3Box = sortedTeams.map(team => {
                      const numerator = (parseFloat(team['Starta1endbox/']) || 0) + 
                                      (parseFloat(team['Starta2endbox/']) || 0) + 
                                      (parseFloat(team['Starta3endbox /']) || 0)
                      const denominator = (parseFloat(team.SeqStartAtt3rd) || 0) + 
                                        (parseFloat(team['Starta1enda3/']) || 0) + 
                                        (parseFloat(team['Starta2enda3/']) || 0)
                      const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0
                      return { ...team, a3BoxPercentage: percentage }
                    }).sort((a, b) => b.a3BoxPercentage - a.a3BoxPercentage)

                    return teamsWithA3Box.map((team, index) => {
                      const isBeitar = team.Team?.toLowerCase().includes('beitar')
                      
                      return (
                        <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ 
                            padding: '4px 8px', 
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '9px',
                            width: '20px'
                          }}>
                            {index + 1}.
                          </td>
                          <td style={{ 
                            padding: '4px', 
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '9px',
                            width: '80px'
                          }}>
                            {team.Team}
                          </td>
                          <td style={{ 
                            padding: '4px 8px', 
                            textAlign: 'right',
                            color: isBeitar ? '#FFD700' : '#fbbf24',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {team.a3BoxPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}