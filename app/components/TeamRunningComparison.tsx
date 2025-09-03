'use client'

import React from 'react'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'

interface PlayerRunningData {
  Player: string
  playerFullName: string
  Position: string
  teamName: string
  newestTeam: string
  Min: number
  DistanceRunFirstHalf: number
  DistanceRunScndHalf: number
  FirstHalfDistSprint: number
  ScndHalfDistSprint: number
  FirstHalfDistHSRun: number
  ScndHalfDistHSRun: number
  TopSpeed: number
  InPossDistSprint: number
  OutPossDistSprint: number
  InPossDistHSRun: number
  OutPossDistHSRun: number
  DistanceRunInPoss: number
  DistanceRunOutPoss: number
}

interface TeamRunningComparisonProps {
  runningData: PlayerRunningData[]
  matchdayNumber: string
  selectedOpponent?: string
}

export default function TeamRunningComparison({ runningData, matchdayNumber, selectedOpponent }: TeamRunningComparisonProps) {
  if (!runningData || runningData.length === 0) {
    return null
  }

  // Aggregate running data by team
  const teamRunningData: { [team: string]: {
    totalDistance: number
    totalSprints: number
    totalHSR: number
    totalInPoss: number
    totalOutPoss: number
    totalInPossHSR: number
    totalOutPossHSR: number
    maxSpeed: number
    playerCount: number
    totalMinutes: number
  }} = {}
  
  runningData.forEach(player => {
    const teamName = player.teamName || player.newestTeam
    if (!teamName) return
    
    if (!teamRunningData[teamName]) {
      teamRunningData[teamName] = {
        totalDistance: 0,
        totalSprints: 0,
        totalHSR: 0,
        totalInPoss: 0,
        totalOutPoss: 0,
        totalInPossHSR: 0,
        totalOutPossHSR: 0,
        maxSpeed: 0,
        playerCount: 0,
        totalMinutes: 0
      }
    }
    
    const team = teamRunningData[teamName]
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const totalSprints = (player.FirstHalfDistSprint || 0) + (player.ScndHalfDistSprint || 0)
    const totalHSR = (player.FirstHalfDistHSRun || 0) + (player.ScndHalfDistHSRun || 0)
    const inPossDistance = player.DistanceRunInPoss || 0
    const outPossDistance = player.DistanceRunOutPoss || 0
    const inPossHSR = player.InPossDistHSRun || 0
    const outPossHSR = player.OutPossDistHSRun || 0
    
    team.totalDistance += totalDistance
    team.totalSprints += totalSprints
    team.totalHSR += totalHSR
    team.totalInPoss += inPossDistance
    team.totalOutPoss += outPossDistance
    team.totalInPossHSR += inPossHSR
    team.totalOutPossHSR += outPossHSR
    team.maxSpeed = Math.max(team.maxSpeed, player.TopSpeed || 0)
    team.playerCount++
    team.totalMinutes += player.Min || 0
  })
  
  // Convert to array and calculate averages
  const teamsWithAverages = Object.entries(teamRunningData)
    .map(([team, data]) => {
      const avgDistance = data.totalDistance / data.playerCount
      const avgMPM = data.totalMinutes / data.playerCount
      const avgIntensity = avgDistance > 0 ? ((data.totalHSR / data.totalDistance) * 100) : 0
      const avgInPossDistance = data.totalInPoss / data.playerCount
      const avgOutPossDistance = data.totalOutPoss / data.playerCount
      const avgInPossIntensity = avgInPossDistance > 0 ? ((data.totalInPossHSR / data.totalInPoss) * 100) : 0
      const avgOutPossIntensity = avgOutPossDistance > 0 ? ((data.totalOutPossHSR / data.totalOutPoss) * 100) : 0
      
      // Calculate ALMOG score
      const distanceScore = Math.min((avgDistance / 12000) * 30, 30)
      const intensityScore = Math.min(avgIntensity * 3, 30)
      const speedScore = Math.min((data.maxSpeed / 35) * 20, 20)
      const sprintScore = Math.min(((data.totalSprints / data.playerCount) / 500) * 20, 20)
      const almogScore = distanceScore + intensityScore + speedScore + sprintScore

      return {
        team,
        avgDistance,
        avgMPM,
        avgIntensity,
        avgInPossDistance,
        avgOutPossDistance,
        avgInPossIntensity,
        avgOutPossIntensity,
        maxSpeed: data.maxSpeed,
        playerCount: data.playerCount,
        almogScore
      }
    })
    .sort((a, b) => b.avgDistance - a.avgDistance)

  // Find max values for progress bars
  const maxDistance = Math.max(...teamsWithAverages.map(t => t.avgDistance))
  const maxInPoss = Math.max(...teamsWithAverages.map(t => t.avgInPossDistance))
  const maxOutPoss = Math.max(...teamsWithAverages.map(t => t.avgOutPossDistance))

  const downloadReport = async () => {
    const reportElement = document.getElementById('team-running-comparison')
    if (!reportElement) return

    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#1a1f2e',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      const opponentName = selectedOpponent ? `_vs_${selectedOpponent.replace(/\s+/g, '_')}` : ''
      link.download = `FCBJ_DATA_Matchday_${matchdayNumber}${opponentName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  const formatDistance = (distance: number) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)}km`
    }
    return `${Math.round(distance)}m`
  }

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

      <div id="team-running-comparison" style={{ 
        background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
        borderRadius: '12px',
        padding: '30px',
        color: '#fff',
        fontFamily: 'Montserrat',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#FFD700',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#000'
            }}>
              ⚽
            </div>
            <h1 style={{ 
              color: '#FFD700', 
              fontFamily: 'Montserrat', 
              fontWeight: '700',
              fontSize: '24px',
              margin: 0,
              letterSpacing: '2px'
            }}>
              FCBJ DATA
            </h1>
          </div>
          <h2 style={{ 
            color: '#FFD700', 
            fontFamily: 'Montserrat', 
            fontWeight: '400',
            fontSize: '18px',
            margin: 0
          }}>
            {selectedOpponent ? `Beitar Jerusalem vs ${selectedOpponent}` : 'Beitar Jerusalem'}
          </h2>
        </div>

        {/* Main Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontFamily: 'Montserrat'
          }}>
            <thead>
              <tr style={{ 
                borderBottom: '2px solid #FFD700',
                background: 'rgba(255, 215, 0, 0.05)'
              }}>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>RANK</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>TEAM</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>DISTANCE</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>MPM</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>INTENSITY %</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>SPEED</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>DISTANCE</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>INTENSITY %</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithAverages.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar') || team.team.toLowerCase().includes('jerusalem')
                const inPossPercent = team.avgDistance > 0 ? (team.avgInPossDistance / team.avgDistance * 100) : 0
                const outPossPercent = team.avgDistance > 0 ? (team.avgOutPossDistance / team.avgDistance * 100) : 0
                
                return (
                  <tr 
                    key={team.team}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'center', 
                      color: '#FFD700', 
                      fontWeight: '600',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'left', 
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {team.team}
                    </td>
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'center', 
                      color: '#FFD700',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {formatDistance(team.avgDistance)}
                    </td>
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'center', 
                      color: '#fff',
                      fontSize: '13px'
                    }}>
                      {Math.round(team.avgMPM)}
                    </td>
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'center', 
                      color: '#fff',
                      fontSize: '13px'
                    }}>
                      {team.avgIntensity.toFixed(1)}%
                    </td>
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'center', 
                      color: '#FFD700',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      {team.maxSpeed.toFixed(2)} km/h
                    </td>
                    <td style={{ padding: '15px 8px', width: '200px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#888', width: '50px' }}>In Poss</span>
                          <div style={{ 
                            flex: 1, 
                            height: '16px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '8px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(team.avgInPossDistance / maxInPoss) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: '8px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '5px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {formatDistance(team.avgInPossDistance)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#888', width: '50px' }}>Out Poss</span>
                          <div style={{ 
                            flex: 1, 
                            height: '16px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '8px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(team.avgOutPossDistance / maxOutPoss) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '8px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '5px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {formatDistance(team.avgOutPossDistance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '15px 8px', width: '200px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#888', width: '50px' }}>In Poss</span>
                          <div style={{ 
                            flex: 1, 
                            height: '16px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '8px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(team.avgInPossIntensity * 8, 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: '8px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '5px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {team.avgInPossIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#888', width: '50px' }}>Out Poss</span>
                          <div style={{ 
                            flex: 1, 
                            height: '16px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '8px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(team.avgOutPossIntensity * 8, 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '8px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '5px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {team.avgOutPossIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '15px 8px', 
                      textAlign: 'center', 
                      color: '#FFD700',
                      fontSize: '14px',
                      fontWeight: '700'
                    }}>
                      {team.almogScore.toFixed(1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}