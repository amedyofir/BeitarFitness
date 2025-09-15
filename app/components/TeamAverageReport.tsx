'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, RefreshCw, AlertCircle, Download, TrendingUp, Users, Target } from 'lucide-react'
import html2canvas from 'html2canvas'
import { CSVReportService } from '../../lib/csvReportService'

interface TeamAverageData {
  season: string
  totalMatches: number
  totalPlayers: number
  aggregatedData: any[]
  matchesList: Array<{
    matchday: string
    opponent: string
    date?: string
  }>
}

export default function TeamAverageReport() {
  const [averageData, setAverageData] = useState<TeamAverageData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedSeason, setSelectedSeason] = useState('2024-2025')
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['2024-2025'])
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAvailableSeasons()
    loadTeamAverages()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      loadTeamAverages()
    }
  }, [selectedSeason])

  const loadAvailableSeasons = async () => {
    try {
      const result = await CSVReportService.getSeasonsList()
      if (result.success && result.data) {
        setAvailableSeasons(result.data)
      }
    } catch (error) {
      console.error('Error loading seasons:', error)
    }
  }

  const loadTeamAverages = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const result = await CSVReportService.getTeamAveragesBySeason(selectedSeason)
      
      if (result.success && result.data) {
        setAverageData(result.data)
      } else {
        setError(result.error || 'Failed to load team averages')
        setAverageData(null)
      }
    } catch (error: any) {
      console.error('Error loading team averages:', error)
      setError('Failed to load team averages')
      setAverageData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadPNG = async () => {
    if (!exportRef.current) return

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#242b3d',
        useCORS: true,
        allowTaint: true,
        scale: 2,
        width: exportRef.current.scrollWidth,
        height: exportRef.current.scrollHeight
      })

      const link = document.createElement('a')
      link.download = `team-average-report-${selectedSeason}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating PNG:', error)
      alert('Failed to generate PNG. Please try again.')
    }
  }

  // Helper functions (same as ComprehensiveMatchdayReport)
  const formatDistance = (distance: number) => {
    return `${Math.round(distance).toLocaleString()}m`
  }

  const formatSpeed = (speed: number | undefined) => {
    if (speed === undefined || speed === null) return '-'
    if (typeof speed === 'string') return speed
    return speed.toFixed(1)
  }

  const formatIntensity = (intensity: number) => {
    return `${intensity.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="team-average-loading">
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#FFD700', marginBottom: '16px' }} className="animate-spin" />
          <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '12px' }}>
            Loading Team Averages
          </h3>
          <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat' }}>
            Aggregating data across all matches in {selectedSeason}...
          </p>
        </div>
      </div>
    )
  }

  if (error && !averageData) {
    return (
      <div className="team-average-error">
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ color: '#ef4444', fontFamily: 'Montserrat', marginBottom: '12px' }}>
            No Data Available
          </h3>
          <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', marginBottom: '20px' }}>
            {error}
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'Montserrat',
                marginRight: '12px'
              }}
            >
              {availableSeasons.map(season => (
                <option key={season} value={season}>Season {season}</option>
              ))}
            </select>
            
            <button
              onClick={loadTeamAverages}
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Retry
            </button>
          </div>
          
          <p style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>
            Make sure you have saved running reports for the selected season.
          </p>
        </div>
      </div>
    )
  }

  if (!averageData) return null

  // Process data - now aggregated at service level with TEAM TOTALS first
  const runningData = averageData.aggregatedData
  
  // Separate team averages from player averages
  const teamAverages = runningData.filter(item => item.Position === 'TEAM')
  const playerAverages = runningData.filter(item => item.Position !== 'TEAM')

  // Convert team averages to the format expected by the report
  const teams = teamAverages.map(teamData => {
    const totalDistance = (teamData.DistanceRunFirstHalf || 0) + (teamData.DistanceRunScndHalf || 0)
    const inPoss = teamData.DistanceRunInPoss || 0
    const outPoss = teamData.DistanceRunOutPoss || 0
    const firstHalfHSR = teamData.FirstHalfDistHSRun || 0
    const firstHalfSprint = teamData.FirstHalfDistSprint || 0
    const secondHalfHSR = teamData.ScndHalfDistHSRun || 0
    const secondHalfSprint = teamData.ScndHalfDistSprint || 0
    const inPossHSR = teamData.InPossDistHSRun || 0
    const outPossHSR = teamData.OutPossDistHSRun || 0
    const inPossSprint = teamData.InPossDistSprint || 0
    const outPossSprint = teamData.OutPossDistSprint || 0
    
    // FIXED: MPM should be calculated properly using total team minutes
    const totalMinutesET = teamData.MinIncET || teamData.Min || 0
    const avgMPM = totalMinutesET > 0 ? (totalDistance / totalMinutesET) : 0
    
    // DEBUG: Log intensity calculation issues
    if (teamData.teamName?.toLowerCase().includes('beitar')) {
      console.log(`${teamData.teamName} Intensity Debug:`, {
        matchCount: teamData._debug_matchCount,
        totalInPoss: teamData._debug_sumInPoss,
        totalOutPoss: teamData._debug_sumOutPoss,
        totalInPossHSR: teamData._debug_sumInPossHSR,
        totalInPossSprint: teamData._debug_sumInPossSprint,
        totalOutPossHSR: teamData._debug_sumOutPossHSR,
        totalOutPossSprint: teamData._debug_sumOutPossSprint,
        avgInPoss: inPoss,
        avgOutPoss: outPoss,
        avgInPossHSR: inPossHSR,
        avgInPossSprint: inPossSprint,
        avgOutPossHSR: outPossHSR,
        avgOutPossSprint: outPossSprint,
        oldCalculatedInPossIntensity: inPoss > 0 ? ((inPossHSR + inPossSprint) / inPoss * 100) : 0,
        oldCalculatedOutPossIntensity: outPoss > 0 ? ((outPossHSR + outPossSprint) / outPoss * 100) : 0,
        newInPossIntensity: teamData.avgInPossIntensity || 0,
        newOutPossIntensity: teamData.avgOutPossIntensity || 0,
        sumInPossIntensity: teamData._debug_sumInPossIntensity,
        sumOutPossIntensity: teamData._debug_sumOutPossIntensity,
        expectedAverage: "Should be around (11.2 + 6.7)/2 = 8.95%"
      })
    }
    
    return {
      team: teamData.teamName,
      totalDistance: totalDistance,
      totalFirstHalf: teamData.DistanceRunFirstHalf || 0,
      totalSecondHalf: teamData.DistanceRunScndHalf || 0,
      totalInPoss: inPoss,
      totalOutPoss: outPoss,
      avgInPossIntensity: teamData.avgInPossIntensity || 0, // FIXED: Use pre-calculated intensity
      avgOutPossIntensity: teamData.avgOutPossIntensity || 0, // FIXED: Use pre-calculated intensity
      avgMPM: avgMPM, // FIXED: Now using proper calculation
      avgIntensity: totalDistance > 0 ? 
        ((firstHalfHSR + firstHalfSprint + secondHalfHSR + secondHalfSprint) / totalDistance * 100) : 0,
      avgSpeed: teamData.KMHSPEED || teamData.TopSpeed || 0,
      playerCount: teamData.uniquePlayers || 0,
      players: playerAverages.filter(p => p.teamName === teamData.teamName),
      totalFirstHalfHSR: firstHalfHSR,
      totalFirstHalfSprint: firstHalfSprint,
      totalSecondHalfHSR: secondHalfHSR,
      totalSecondHalfSprint: secondHalfSprint,
      speedFirstHalf: teamData.KMHSPEED || teamData.TopSpeed || 0,
      speedSecondHalf: teamData.KMHSPEED || teamData.TopSpeed || 0,
      maxGameTime: totalMinutesET, // FIXED: Using total minutes
      almogScore: 0
    }
  })
  
  // Calculate ALMOG scores (same logic as ComprehensiveMatchdayReport)
  const mpmValues = teams.map(t => t.avgMPM).filter(v => v > 0)
  const speedValues = teams.map(t => t.avgSpeed).filter(v => v > 0)
  const intensityValues = teams.map(t => t.avgIntensity).filter(v => v > 0)
  
  const minMPM = Math.min(...mpmValues)
  const maxMPM = Math.max(...mpmValues)
  const minSpeed = Math.min(...speedValues)
  const maxSpeed = Math.max(...speedValues)
  const minIntensity = Math.min(...intensityValues)
  const maxIntensity = Math.max(...intensityValues)
  
  teams.forEach(team => {
    const mpmScore = maxMPM > minMPM ? 
      ((team.avgMPM - minMPM) / (maxMPM - minMPM)) * 100 : 50
    const speedScore = maxSpeed > minSpeed ? 
      ((team.avgSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100 : 50
    const intensityScore = maxIntensity > minIntensity ? 
      ((team.avgIntensity - minIntensity) / (maxIntensity - minIntensity)) * 100 : 50
    
    team.almogScore = (mpmScore * 0.3) + (speedScore * 0.3) + (intensityScore * 0.4)
  })
  
  const allTeams = teams.sort((a, b) => b.almogScore - a.almogScore)

  // Calculate player metrics for ALMOG scoring - use playerAverages, not runningData
  const playerMetrics = playerAverages.map(player => {
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const gameTime = player.MinIncET || player.Min || 0
    const mpm = gameTime > 0 ? (totalDistance / gameTime) : 0
    const intensity = totalDistance > 0 ? 
      (((player.FirstHalfDistHSRun || 0) + (player.FirstHalfDistSprint || 0) + 
        (player.ScndHalfDistHSRun || 0) + (player.ScndHalfDistSprint || 0)) / totalDistance * 100) : 0
    const speed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || player.TopSpeed || 0)
    return { player, mpm, intensity, speed }
  })
  
  const playerMpmValues = playerMetrics.map(p => p.mpm).filter(v => v > 0)
  const playerSpeedValues = playerMetrics.map(p => p.speed).filter(v => v > 0)
  const playerIntensityValues = playerMetrics.map(p => p.intensity).filter(v => v > 0)
  
  const minPlayerMPM = Math.min(...playerMpmValues)
  const maxPlayerMPM = Math.max(...playerMpmValues)
  const minPlayerSpeed = Math.min(...playerSpeedValues)
  const maxPlayerSpeed = Math.max(...playerSpeedValues)
  const minPlayerIntensity = Math.min(...playerIntensityValues)
  const maxPlayerIntensity = Math.max(...playerIntensityValues)

  const calculatePlayerAlmog = (player: any) => {
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const gameTime = player.MinIncET || player.Min || 0
    const mpm = gameTime > 0 ? (totalDistance / gameTime) : 0
    const intensity = totalDistance > 0 ? 
      (((player.FirstHalfDistHSRun || 0) + (player.FirstHalfDistSprint || 0) + 
        (player.ScndHalfDistHSRun || 0) + (player.ScndHalfDistSprint || 0)) / totalDistance * 100) : 0
    const speed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || player.TopSpeed || 0)
    
    const metrics = playerMetrics.find(p => p.player === player)
    if (!metrics) return 0
    
    const mpmScore = maxPlayerMPM > minPlayerMPM ? 
      ((metrics.mpm - minPlayerMPM) / (maxPlayerMPM - minPlayerMPM)) * 100 : 50
    const speedScore = maxPlayerSpeed > minPlayerSpeed ? 
      ((metrics.speed - minPlayerSpeed) / (maxPlayerSpeed - minPlayerSpeed)) * 100 : 50
    const intensityScore = maxPlayerIntensity > minPlayerIntensity ? 
      ((metrics.intensity - minPlayerIntensity) / (maxPlayerIntensity - minPlayerIntensity)) * 100 : 50
    
    return (mpmScore * 0.3) + (speedScore * 0.3) + (intensityScore * 0.4)
  }
  

  const renderProgressBar = (value: number, maxValue: number, color: 'green' | 'red') => {
    const percentage = maxValue > 0 ? (value / maxValue * 100) : 0
    const gradient = color === 'green' 
      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
      : 'linear-gradient(90deg, #ef4444, #dc2626)'
    
    return (
      <div style={{ 
        flex: 1, 
        height: '14px', 
        background: 'rgba(255, 255, 255, 0.1)', 
        borderRadius: '7px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: gradient,
          borderRadius: '7px',
          transition: 'width 0.3s ease'
        }} />
        <span style={{
          position: 'absolute',
          right: '4px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '16px',
          color: '#fff',
          fontWeight: '600'
        }}>
          {formatDistance(value)}
        </span>
      </div>
    )
  }

  const renderPlayerRow = (player: any, index: number) => {
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const gameTime = player.MinIncET || player.Min || 0
    const mpm = gameTime > 0 ? (totalDistance / gameTime) : 0
    const inPoss = player.DistanceRunInPoss || 0
    const outPoss = player.DistanceRunOutPoss || 0
    const inPossIntensity = inPoss > 0 ? (((player.InPossDistHSRun || 0) + (player.InPossDistSprint || 0)) / inPoss * 100) : 0
    const outPossIntensity = outPoss > 0 ? (((player.OutPossDistHSRun || 0) + (player.OutPossDistSprint || 0)) / outPoss * 100) : 0
    const intensity = totalDistance > 0 ? 
      (((player.FirstHalfDistHSRun || 0) + (player.FirstHalfDistSprint || 0) + 
        (player.ScndHalfDistHSRun || 0) + (player.ScndHalfDistSprint || 0)) / totalDistance * 100) : 0
    const speed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || player.TopSpeed || 0)
    
    const almogScore = calculatePlayerAlmog(player)

    return (
      <tr key={player.Player} style={{ 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
          {index + 1}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'left', color: '#fff', fontSize: '16px', fontWeight: '500', width: '120px' }}>
          {player.Player}
          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
            {player.matchesPlayed || 0} matches
          </div>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '16px', fontWeight: '600' }}>
          {formatDistance(totalDistance)}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontSize: '16px' }}>
          {mpm.toFixed(1)}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontSize: '16px' }}>
          {intensity.toFixed(1)}%
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '16px', fontWeight: '600' }}>
          {formatSpeed(speed)}
        </td>
        <td style={{ padding: '10px 8px', width: '140px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>In Poss</span>
              {renderProgressBar(inPoss, Math.max(...playerAverages.map(p => p.DistanceRunInPoss || 0)), 'green')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>Out Poss</span>
              {renderProgressBar(outPoss, Math.max(...playerAverages.map(p => p.DistanceRunOutPoss || 0)), 'red')}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', width: '140px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>In Poss</span>
              <div style={{ 
                flex: 1, 
                height: '14px', 
                background: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: '7px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(inPossIntensity * 8, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  borderRadius: '7px'
                }} />
                <span style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: '#fff',
                  fontWeight: '600'
                }}>
                  {inPossIntensity.toFixed(1)}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>Out Poss</span>
              <div style={{ 
                flex: 1, 
                height: '14px', 
                background: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: '7px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min(outPossIntensity * 8, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                  borderRadius: '7px'
                }} />
                <span style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: '#fff',
                  fontWeight: '600'
                }}>
                  {outPossIntensity.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '18px', fontWeight: '700' }}>
          {almogScore.toFixed(1)}
        </td>
      </tr>
    )
  }

  const maxDistanceForBars = Math.max(...allTeams.map(t => t.totalDistance))
  const maxInPoss = Math.max(...allTeams.map(t => t.totalInPoss))
  const maxOutPoss = Math.max(...allTeams.map(t => t.totalOutPoss))

  return (
    <div className="team-average-report">
      {/* Header Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <div>
          <h2 style={{ color: '#FFD700', fontSize: '24px', margin: 0 }}>
            Team Average Report
          </h2>
          <p style={{ color: 'var(--secondary-text)', margin: '8px 0 0 0' }}>
            Season-long performance averages across all saved matches
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'Montserrat'
            }}
          >
            {availableSeasons.map(season => (
              <option key={season} value={season}>Season {season}</option>
            ))}
          </select>

          <button 
            onClick={loadTeamAverages}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? '#666' : '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <button 
            onClick={handleDownloadPNG}
            style={{
              backgroundColor: '#FFD700',
              color: '#1a1f2e',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Download size={16} />
            Download PNG
          </button>
        </div>
      </div>


      {/* Matches Included */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ color: '#FFD700', margin: '0 0 12px 0' }}>Matches Included in Analysis</h4>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px'
        }}>
          {averageData.matchesList.map((match, index) => (
            <span 
              key={index}
              style={{
                background: 'rgba(255, 215, 0, 0.1)',
                color: '#FFD700',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              MD{match.matchday} vs {match.opponent}
            </span>
          ))}
        </div>
      </div>

      {/* Main Report Content (using same structure as ComprehensiveMatchdayReport) */}
      <div ref={exportRef} style={{ 
        background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
        borderRadius: '12px',
        padding: '16px',
        color: '#fff',
        fontFamily: 'sans-serif',
        minHeight: 'auto',
        overflow: 'visible',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        {/* Report Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
          <img 
            src="/beitar-logo.png" 
            alt="Beitar Jerusalem" 
            style={{ 
              height: '50px',
              width: 'auto'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '28px',
            fontWeight: '700',
            margin: 0,
            letterSpacing: '2px'
          }}>
            FCBJ DATA
          </h1>
        </div>

        {/* Teams Comparison Table */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            ממוצע עונתי
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '140px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>AVG DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>AVG INTENSITY</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>AVG SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar')
                
                return (
                  <tr 
                    key={team.team}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', fontSize: '16px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {formatDistance(team.totalDistance)}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.avgIntensity.toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {formatSpeed(team.avgSpeed)}
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '10px', color: '#888', width: '45px' }}>In Poss</span>
                          {renderProgressBar(team.totalInPoss, maxInPoss, 'green')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#888', width: '45px' }}>Out Poss</span>
                          {renderProgressBar(team.totalOutPoss, maxOutPoss, 'red')}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>In Poss</span>
                          <div style={{ 
                            flex: 1, 
                            height: '14px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '7px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(team.avgInPossIntensity * 8, 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: '7px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '16px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {team.avgInPossIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>Out Poss</span>
                          <div style={{ 
                            flex: 1, 
                            height: '14px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '7px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(team.avgOutPossIntensity * 8, 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '7px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '16px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {team.avgOutPossIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontSize: '18px', fontWeight: '700' }}>
                      {team.almogScore.toFixed(1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>

        {/* Half Split Analysis Table */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            Half Split Analysis - Season Averages
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '140px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE BY HALF</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY BY HALF</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar')
                
                return (
                  <tr 
                    key={team.team}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', fontSize: '16px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '45px' }}>1st Half</span>
                        {renderProgressBar(team.totalFirstHalf, Math.max(...allTeams.map(t => Math.max(t.totalFirstHalf, t.totalSecondHalf))), 'green')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '45px' }}>2nd Half</span>
                        {renderProgressBar(team.totalSecondHalf, Math.max(...allTeams.map(t => Math.max(t.totalFirstHalf, t.totalSecondHalf))), 'red')}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '45px' }}>1st Half</span>
                        <div style={{ 
                          flex: 1, 
                          height: '14px', 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          borderRadius: '7px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {(() => {
                            const teamData = teamAverages.find(t => t.teamName === team.team)
                            const firstHalfIntensity = teamData?.avgFirstHalfIntensity || 0
                            return (
                              <>
                                <div style={{
                                  width: `${Math.min(firstHalfIntensity * 8, 100)}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                                  borderRadius: '7px'
                                }} />
                                <span style={{
                                  position: 'absolute',
                                  right: '4px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  fontSize: '16px',
                                  color: '#fff',
                                  fontWeight: '600'
                                }}>
                                  {firstHalfIntensity.toFixed(1)}%
                                </span>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '45px' }}>2nd Half</span>
                        <div style={{ 
                          flex: 1, 
                          height: '14px', 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          borderRadius: '7px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {(() => {
                            const teamData = teamAverages.find(t => t.teamName === team.team)
                            const secondHalfIntensity = teamData?.avgSecondHalfIntensity || 0
                            return (
                              <>
                                <div style={{
                                  width: `${Math.min(secondHalfIntensity * 8, 100)}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                  borderRadius: '7px'
                                }} />
                                <span style={{
                                  position: 'absolute',
                                  right: '4px',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  fontSize: '16px',
                                  color: '#fff',
                                  fontWeight: '600'
                                }}>
                                  {secondHalfIntensity.toFixed(1)}%
                                </span>
                              </>
                            )
                          })()}
                        </div>
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
  )
}