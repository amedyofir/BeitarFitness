'use client'

import React, { useRef, useState } from 'react'
import { Download, Save, Loader2, Calendar } from 'lucide-react'
import html2canvas from 'html2canvas'
import { CSVReportService } from '../../lib/csvReportService'

interface PlayerRunningData {
  Player: string
  playerFullName?: string
  Position?: string
  teamName?: string
  newestTeam?: string
  Min?: number
  MinIncET?: number
  DistanceRunFirstHalf?: number
  DistanceRunScndHalf?: number
  FirstHalfDistSprint?: number
  ScndHalfDistSprint?: number
  FirstHalfDistHSRun?: number
  ScndHalfDistHSRun?: number
  TopSpeed?: number
  KMHSPEED?: number | string
  InPossDistSprint?: number
  OutPossDistSprint?: number
  InPossDistHSRun?: number
  OutPossDistHSRun?: number
  DistanceRunInPoss?: number
  DistanceRunOutPoss?: number
  GS?: number
  pos?: string
  [key: string]: any
}

interface ComprehensiveMatchdayReportProps {
  runningData: PlayerRunningData[]
  matchdayNumber: string
  selectedOpponent: string
}

export default function ComprehensiveMatchdayReport({ runningData, matchdayNumber, selectedOpponent }: ComprehensiveMatchdayReportProps) {
  const exportRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const [matchDate, setMatchDate] = useState<string>(new Date().toISOString().split('T')[0])

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
      link.download = `running-report-${selectedOpponent}-matchday-${matchdayNumber}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating PNG:', error)
      alert('Failed to generate PNG. Please try again.')
    }
  }

  const handleSaveReport = async () => {
    if (!runningData || runningData.length === 0) {
      setSaveMessage('No data to save')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    setIsSaving(true)
    setSaveMessage('')
    
    try {
      // Convert running data back to CSV format
      const csvContent = convertToCsvFormat(runningData)
      
      const result = await CSVReportService.saveCSVReport({
        matchday_number: matchdayNumber,
        opponent_team: selectedOpponent,
        match_date: matchDate, // Use the selected date
        season: '2024-2025',
        uploaded_by: 'System', // You can modify this to use actual user
        filename: `matchday-${matchdayNumber}-vs-${selectedOpponent}.csv`,
        original_filename: `Running${matchdayNumber} (${selectedOpponent}).csv`,
        csv_content: csvContent,
        notes: `Running report for Matchday ${matchdayNumber} vs ${selectedOpponent}`
      })

      if (result.success) {
        setSaveMessage('✅ Report saved successfully!')
        setTimeout(() => setSaveMessage(''), 5000)
      } else {
        setSaveMessage(`❌ Error: ${result.error}`)
        setTimeout(() => setSaveMessage(''), 5000)
      }
    } catch (error: any) {
      console.error('Error saving report:', error)
      setSaveMessage(`❌ Failed to save: ${error.message}`)
      setTimeout(() => setSaveMessage(''), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  if (!runningData || runningData.length === 0 || !selectedOpponent) {
    return null
  }

  // Helper functions
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

  // Convert running data back to CSV format
  const convertToCsvFormat = (data: PlayerRunningData[]): string => {
    if (!data || data.length === 0) return ''
    
    // Get all unique keys from all objects to create comprehensive headers
    const allKeys = new Set<string>()
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key))
    })
    
    // Convert to array and sort for consistent column order
    const headers = Array.from(allKeys).sort()
    
    // Create CSV content
    const csvLines = []
    
    // Add header row
    csvLines.push(headers.map(header => `"${header}"`).join(','))
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return '""'
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`
        return `"${value}"`
      })
      csvLines.push(values.join(','))
    })
    
    return csvLines.join('\n')
  }

  // Team data processing
  const teamData: { [team: string]: any } = {}
  
  runningData.forEach(player => {
    const teamName = player.teamName || player.newestTeam
    if (!teamName) return
    
    // Filter out goalkeepers and players with zero playing time
    if (player.Position?.toLowerCase().includes('goalkeeper') || 
        player.pos?.toLowerCase().includes('goalkeeper')) return
    
    // Filter out players who didn't actually play (zero MinIncET)
    const playingTime = player.MinIncET || player.Min || 0
    if (playingTime <= 0) return
    
    if (!teamData[teamName]) {
      teamData[teamName] = {
        totalDistance: 0,
        totalFirstHalf: 0,
        totalSecondHalf: 0,
        totalInPoss: 0,
        totalOutPoss: 0,
        totalFirstHalfHSR: 0,
        totalFirstHalfSprint: 0,
        totalSecondHalfHSR: 0,
        totalSecondHalfSprint: 0,
        totalInPossHSR: 0,
        totalOutPossHSR: 0,
        totalInPossSprint: 0,
        totalOutPossSprint: 0,
        totalSpeed: 0,
        speedFirstHalf: 0,
        speedSecondHalf: 0,
        maxGameTime: 0,
        playerCount: 0,
        players: []
      }
    }
    
    const team = teamData[teamName]
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const firstHalf = player.DistanceRunFirstHalf || 0
    const secondHalf = player.DistanceRunScndHalf || 0
    const inPoss = player.DistanceRunInPoss || 0
    const outPoss = player.DistanceRunOutPoss || 0
    const firstHalfHSR = player.FirstHalfDistHSRun || 0
    const firstHalfSprint = player.FirstHalfDistSprint || 0
    const secondHalfHSR = player.ScndHalfDistHSRun || 0
    const secondHalfSprint = player.ScndHalfDistSprint || 0
    const inPossHSR = player.InPossDistHSRun || 0
    const outPossHSR = player.OutPossDistHSRun || 0
    const inPossSprint = player.InPossDistSprint || 0
    const outPossSprint = player.OutPossDistSprint || 0
    
    team.totalDistance += totalDistance
    team.totalFirstHalf += firstHalf
    team.totalSecondHalf += secondHalf
    team.totalInPoss += inPoss
    team.totalOutPoss += outPoss
    team.totalFirstHalfHSR += firstHalfHSR
    team.totalFirstHalfSprint += firstHalfSprint
    team.totalSecondHalfHSR += secondHalfHSR
    team.totalSecondHalfSprint += secondHalfSprint
    team.totalInPossHSR += inPossHSR
    team.totalOutPossHSR += outPossHSR
    team.totalInPossSprint += inPossSprint
    team.totalOutPossSprint += outPossSprint
    const playerSpeed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : player.KMHSPEED
    const validSpeed = playerSpeed || player.TopSpeed || 0
    if (!isNaN(validSpeed) && validSpeed > 0) {
      team.totalSpeed += validSpeed
    }
    
    // For half calculations, we need to track speed per half
    // Since speed is a max value, we use the same speed for both halves
    if (!isNaN(validSpeed) && validSpeed > 0) {
      team.speedFirstHalf = (team.speedFirstHalf || 0) + validSpeed
      team.speedSecondHalf = (team.speedSecondHalf || 0) + validSpeed
    }
    team.maxGameTime = Math.max(team.maxGameTime, player.MinIncET || player.Min || 0)
    team.playerCount++
    team.players.push(player)
  })
  
  // First pass to get the data
  const teams = Object.entries(teamData).map(([team, data]) => ({
    team,
    totalDistance: data.totalDistance,
    totalFirstHalf: data.totalFirstHalf,
    totalSecondHalf: data.totalSecondHalf,
    totalInPoss: data.totalInPoss,
    totalOutPoss: data.totalOutPoss,
    avgInPossIntensity: data.totalInPoss > 0 ? ((data.totalInPossHSR + data.totalInPossSprint) / data.totalInPoss * 100) : 0,
    avgOutPossIntensity: data.totalOutPoss > 0 ? ((data.totalOutPossHSR + data.totalOutPossSprint) / data.totalOutPoss * 100) : 0,
    avgMPM: data.maxGameTime > 0 ? (data.totalDistance / data.maxGameTime) : 0,
    avgIntensity: data.totalDistance > 0 ? 
      ((data.totalFirstHalfHSR + data.totalFirstHalfSprint + data.totalSecondHalfHSR + data.totalSecondHalfSprint) / data.totalDistance * 100) : 0,
    avgSpeed: data.totalSpeed > 0 && data.playerCount > 0 ? (data.totalSpeed / data.playerCount) : 0,
    playerCount: data.playerCount,
    players: data.players,
    totalFirstHalfHSR: data.totalFirstHalfHSR,
    totalFirstHalfSprint: data.totalFirstHalfSprint,
    totalSecondHalfHSR: data.totalSecondHalfHSR,
    totalSecondHalfSprint: data.totalSecondHalfSprint,
    speedFirstHalf: data.speedFirstHalf,
    speedSecondHalf: data.speedSecondHalf,
    maxGameTime: data.maxGameTime,
    almogScore: 0 // Will calculate after getting min/max
  }))
  
  // Get min and max for proportional scoring
  const mpmValues = teams.map(t => t.avgMPM).filter(v => v > 0)
  const speedValues = teams.map(t => t.avgSpeed).filter(v => v > 0)
  const intensityValues = teams.map(t => t.avgIntensity).filter(v => v > 0)
  
  const minMPM = Math.min(...mpmValues)
  const maxMPM = Math.max(...mpmValues)
  const minSpeed = Math.min(...speedValues)
  const maxSpeed = Math.max(...speedValues)
  const minIntensity = Math.min(...intensityValues)
  const maxIntensity = Math.max(...intensityValues)
  
  // Calculate proportional ALMOG scores
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

  const renderPlayerRow = (player: any, index: number, isSubstitute: boolean = false) => {
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
    
    // Use the proportional ALMOG calculation
    const almogScore = calculatePlayerAlmog(player)

    return (
      <tr key={player.Player} style={{ 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: isSubstitute ? 'rgba(139, 69, 19, 0.3)' : 'transparent'
      }}>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
          {index + 1}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'left', color: '#fff', fontSize: '16px', fontWeight: '500', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.Player}
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
              {renderProgressBar(inPoss, Math.max(...runningData.map(p => p.DistanceRunInPoss || 0)), 'green')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>Out Poss</span>
              {renderProgressBar(outPoss, Math.max(...runningData.map(p => p.DistanceRunOutPoss || 0)), 'red')}
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


  const beitarTeam = allTeams.find(t => t.team.toLowerCase().includes('beitar'))
  const opponentTeam = allTeams.find(t => t.team === selectedOpponent)
  const beitarPlayers = beitarTeam?.players || []
  const opponentPlayers = opponentTeam?.players || []

  console.log('Beitar team:', beitarTeam)
  console.log('Beitar players count:', beitarPlayers.length)
  console.log('Opponent team:', opponentTeam)
  console.log('Opponent players count:', opponentPlayers.length)
  console.log('Sample Beitar player:', beitarPlayers[0])
  console.log('Sample opponent player:', opponentPlayers[0])

  // Get all players for min/max calculation
  const allPlayers = [...beitarPlayers, ...opponentPlayers]
  
  // Calculate metrics for all players
  const playerMetrics = allPlayers.map(player => {
    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const gameTime = player.MinIncET || player.Min || 0
    const mpm = gameTime > 0 ? (totalDistance / gameTime) : 0
    const intensity = totalDistance > 0 ? 
      (((player.FirstHalfDistHSRun || 0) + (player.FirstHalfDistSprint || 0) + 
        (player.ScndHalfDistHSRun || 0) + (player.ScndHalfDistSprint || 0)) / totalDistance * 100) : 0
    const speed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || player.TopSpeed || 0)
    return { player, mpm, intensity, speed }
  })
  
  // Get min/max for player metrics
  const playerMpmValues = playerMetrics.map(p => p.mpm).filter(v => v > 0)
  const playerSpeedValues = playerMetrics.map(p => p.speed).filter(v => v > 0)
  const playerIntensityValues = playerMetrics.map(p => p.intensity).filter(v => v > 0)
  
  const minPlayerMPM = Math.min(...playerMpmValues)
  const maxPlayerMPM = Math.max(...playerMpmValues)
  const minPlayerSpeed = Math.min(...playerSpeedValues)
  const maxPlayerSpeed = Math.max(...playerSpeedValues)
  const minPlayerIntensity = Math.min(...playerIntensityValues)
  const maxPlayerIntensity = Math.max(...playerIntensityValues)

  // Calculate proportional ALMOG for each player
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
  
  const sortedBeitarPlayers = [...beitarPlayers].sort((a, b) => 
    calculatePlayerAlmog(b) - calculatePlayerAlmog(a)
  )
  const sortedOpponentPlayers = [...opponentPlayers].sort((a, b) => 
    calculatePlayerAlmog(b) - calculatePlayerAlmog(a)
  )

  const maxDistanceForBars = Math.max(...allTeams.map(t => t.totalDistance))
  const maxInPoss = Math.max(...allTeams.map(t => t.totalInPoss))
  const maxOutPoss = Math.max(...allTeams.map(t => t.totalOutPoss))


  return (
    <div style={{ position: 'relative' }}>
      {/* Match Date and Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px' 
      }}>
        {/* Match Date Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Calendar size={16} style={{ color: '#FFD700' }} />
          <label style={{
            color: '#FFD700',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Match Date:
          </label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            style={{
              padding: '6px 12px',
              border: '1px solid #444',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          />
        </div>
        
        {/* Action Buttons */}
        <div style={{ 
          display: 'flex',
          gap: '12px'
        }}>
        <button 
          onClick={handleSaveReport}
          disabled={isSaving}
          style={{
            backgroundColor: isSaving ? '#666' : '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '16px',
            fontWeight: '600',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving...' : 'Save Report'}
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
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          <Download size={16} />
          Download PNG
        </button>
        </div>
      </div>
      
      {/* Save Message */}
      {saveMessage && (
        <div style={{
          textAlign: 'center',
          marginBottom: '16px',
          padding: '8px 16px',
          borderRadius: '6px',
          backgroundColor: saveMessage.includes('✅') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: saveMessage.includes('✅') ? '#22c55e' : '#ef4444',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {saveMessage}
        </div>
      )}

      <div ref={exportRef} id="comprehensive-matchday-report" style={{ 
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
        
        {/* Main Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '26px',
            fontWeight: '700',
            margin: 0,
            letterSpacing: '1px'
          }}>
            League {matchdayNumber} - Beitar Jerusalem vs {selectedOpponent}
          </h1>
        </div>

        {/* 1. All Teams Comparison */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            All Teams Comparison
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '140px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>MPM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar')
                const isOpponentRow = team.team === selectedOpponent
                
                return (
                  <tr 
                    key={team.team}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' : 
                                  isOpponentRow ? 'rgba(239, 68, 68, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '16px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {formatDistance(team.totalDistance)}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff' }}>
                      {Math.round(team.avgMPM)}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff' }}>
                      {team.avgIntensity.toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {formatSpeed(team.avgSpeed)}
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#888', width: '45px', textAlign: 'left' }}>In Poss</span>
                        {renderProgressBar(team.totalInPoss, maxInPoss, 'green')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#888', width: '45px', textAlign: 'left' }}>Out Poss</span>
                        {renderProgressBar(team.totalOutPoss, maxOutPoss, 'red')}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
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

        {/* 2. All Teams Half-Time Breakdown */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            All Teams Half-Time Breakdown
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '140px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar')
                const isOpponentRow = team.team === selectedOpponent
                
                const firstHalfDistance = team.totalFirstHalf
                const secondHalfDistance = team.totalSecondHalf
                const maxDistance = Math.max(...allTeams.map(t => t.totalDistance))
                
                // Calculate intensity from individual players for this team
                let firstHalfHSR = 0, firstHalfSprint = 0, secondHalfHSR = 0, secondHalfSprint = 0
                team.players.forEach((p: PlayerRunningData) => {
                  firstHalfHSR += (p.FirstHalfDistHSRun || 0)
                  firstHalfSprint += (p.FirstHalfDistSprint || 0)
                  secondHalfHSR += (p.ScndHalfDistHSRun || 0)
                  secondHalfSprint += (p.ScndHalfDistSprint || 0)
                })
                
                const firstHalfIntensity = firstHalfDistance > 0 ? 
                  ((firstHalfHSR + firstHalfSprint) / firstHalfDistance * 100) : 0
                const secondHalfIntensity = secondHalfDistance > 0 ? 
                  ((secondHalfHSR + secondHalfSprint) / secondHalfDistance * 100) : 0
                
                // Calculate average speed for each half
                const avgSpeedFirstHalf = team.playerCount > 0 ? (team.speedFirstHalf / team.playerCount) : 0
                const avgSpeedSecondHalf = team.playerCount > 0 ? (team.speedSecondHalf / team.playerCount) : 0
                
                // Get min/max for half distances and intensities across all teams
                const allFirstHalfDistances = allTeams.map(t => t.totalFirstHalf / t.playerCount).filter(v => v > 0)
                const allSecondHalfDistances = allTeams.map(t => t.totalSecondHalf / t.playerCount).filter(v => v > 0)
                const allFirstHalfIntensities = allTeams.map(t => {
                  let firstHSR = 0, firstSprint = 0
                  t.players.forEach((p: PlayerRunningData) => {
                    firstHSR += (p.FirstHalfDistHSRun || 0)
                    firstSprint += (p.FirstHalfDistSprint || 0)
                  })
                  return t.totalFirstHalf > 0 ? ((firstHSR + firstSprint) / t.totalFirstHalf * 100) : 0
                }).filter(v => v > 0)
                const allSecondHalfIntensities = allTeams.map(t => {
                  let secondHSR = 0, secondSprint = 0
                  t.players.forEach((p: PlayerRunningData) => {
                    secondHSR += (p.ScndHalfDistHSRun || 0)
                    secondSprint += (p.ScndHalfDistSprint || 0)
                  })
                  return t.totalSecondHalf > 0 ? ((secondHSR + secondSprint) / t.totalSecondHalf * 100) : 0
                }).filter(v => v > 0)
                
                const minFirstDist = Math.min(...allFirstHalfDistances)
                const maxFirstDist = Math.max(...allFirstHalfDistances)
                const minSecondDist = Math.min(...allSecondHalfDistances)
                const maxSecondDist = Math.max(...allSecondHalfDistances)
                const minFirstInt = Math.min(...allFirstHalfIntensities)
                const maxFirstInt = Math.max(...allFirstHalfIntensities)
                const minSecondInt = Math.min(...allSecondHalfIntensities)
                const maxSecondInt = Math.max(...allSecondHalfIntensities)
                
                // Calculate proportional scores for half breakdown (50% distance + 50% intensity)
                const firstHalfDistScore = maxFirstDist > minFirstDist ? 
                  ((firstHalfDistance / team.playerCount - minFirstDist) / (maxFirstDist - minFirstDist)) * 100 : 50
                const secondHalfDistScore = maxSecondDist > minSecondDist ? 
                  ((secondHalfDistance / team.playerCount - minSecondDist) / (maxSecondDist - minSecondDist)) * 100 : 50
                const firstHalfIntScore = maxFirstInt > minFirstInt ? 
                  ((firstHalfIntensity - minFirstInt) / (maxFirstInt - minFirstInt)) * 100 : 50
                const secondHalfIntScore = maxSecondInt > minSecondInt ? 
                  ((secondHalfIntensity - minSecondInt) / (maxSecondInt - minSecondInt)) * 100 : 50
                
                const firstHalfAlmog = (firstHalfDistScore * 0.5) + (firstHalfIntScore * 0.5)
                const secondHalfAlmog = (secondHalfDistScore * 0.5) + (secondHalfIntScore * 0.5)
                
                return (
                  <tr 
                    key={team.team}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' : 
                                  isOpponentRow ? 'rgba(239, 68, 68, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '16px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#22c55e', width: '20px' }}>1st</span>
                          <div style={{ 
                            flex: 1, 
                            height: '12px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(firstHalfDistance / maxDistance) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: '6px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {formatDistance(firstHalfDistance)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#ef4444', width: '20px' }}>2nd</span>
                          <div style={{ 
                            flex: 1, 
                            height: '12px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(secondHalfDistance / maxDistance) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '6px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {formatDistance(secondHalfDistance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#22c55e', width: '20px' }}>1st</span>
                          <div style={{ 
                            flex: 1, 
                            height: '12px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(firstHalfIntensity * 8, 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: '6px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {firstHalfIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#ef4444', width: '20px' }}>2nd</span>
                          <div style={{ 
                            flex: 1, 
                            height: '12px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(secondHalfIntensity * 8, 100)}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '6px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {secondHalfIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#22c55e', width: '20px' }}>1st</span>
                          <div style={{ 
                            flex: 1, 
                            height: '12px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(firstHalfAlmog / 100) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: '6px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {firstHalfAlmog.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#ef4444', width: '20px' }}>2nd</span>
                          <div style={{ 
                            flex: 1, 
                            height: '12px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            borderRadius: '6px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(secondHalfAlmog / 100) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '6px'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '2px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '10px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {secondHalfAlmog.toFixed(1)}
                            </span>
                          </div>
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

        {/* 3. Beitar Players */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            Beitar Players
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '120px' }}>PLAYER</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>MPM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {sortedBeitarPlayers.filter(p => {
                console.log('Beitar player GS check:', p.Player, 'GS:', p.GS, 'type:', typeof p.GS)
                return p.GS === 1 || p.GS === "1"
              }).map((player, index) => 
                renderPlayerRow(player, index, false)
              )}
              
              {sortedBeitarPlayers.filter(p => p.GS === 0 || p.GS === "0").length > 0 && (
                <>
                  <tr>
                    <td colSpan={9} style={{ 
                      padding: '15px 0 10px 0',
                      textAlign: 'center'
                    }}>
                      <span style={{ 
                        color: '#FFD700', 
                        fontSize: '12px',
                        fontWeight: '600',
                        letterSpacing: '1px'
                      }}>
                        SUBSTITUTES
                      </span>
                    </td>
                  </tr>
                  {sortedBeitarPlayers.filter(p => p.GS === 0 || p.GS === "0").map((player, index) => 
                    renderPlayerRow(player, index, true)
                  )}
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* 4. Opponent Players */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {selectedOpponent} Players
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '120px' }}>PLAYER</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>MPM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {sortedOpponentPlayers.filter(p => {
                console.log('Opponent player GS check:', p.Player, 'GS:', p.GS, 'type:', typeof p.GS)
                return p.GS === 1 || p.GS === "1"
              }).map((player, index) => 
                renderPlayerRow(player, index, false)
              )}
              
              {sortedOpponentPlayers.filter(p => p.GS === 0 || p.GS === "0").length > 0 && (
                <>
                  <tr>
                    <td colSpan={9} style={{ 
                      padding: '15px 0 10px 0',
                      textAlign: 'center'
                    }}>
                      <span style={{ 
                        color: '#FFD700', 
                        fontSize: '12px',
                        fontWeight: '600',
                        letterSpacing: '1px'
                      }}>
                        SUBSTITUTES
                      </span>
                    </td>
                  </tr>
                  {sortedOpponentPlayers.filter(p => p.GS === 0 || p.GS === "0").map((player, index) => 
                    renderPlayerRow(player, index, true)
                  )}
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* 5. Head-to-Head Comparison */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '20px',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            Head-to-Head Comparison
          </h2>
          
          {beitarTeam && opponentTeam && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              
              {/* Team Headers */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                padding: '12px 0'
              }}>
                <div style={{ 
                  flex: 1, 
                  textAlign: 'center',
                  padding: '12px',
                  background: beitarTeam.almogScore > opponentTeam.almogScore 
                    ? 'rgba(255, 215, 0, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: beitarTeam.almogScore > opponentTeam.almogScore 
                    ? '2px solid #FFD700' 
                    : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: beitarTeam.almogScore > opponentTeam.almogScore ? '#FFD700' : '#fff',
                    marginBottom: '4px'
                  }}>
                    BEITAR JERUSALEM
                  </div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: beitarTeam.almogScore > opponentTeam.almogScore ? '#FFD700' : '#fff'
                  }}>
                    {beitarTeam.almogScore.toFixed(1)}
                  </div>
                  {beitarTeam.almogScore > opponentTeam.almogScore && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#22c55e', 
                      fontWeight: '600',
                      marginTop: '4px'
                    }}>
                      WINNER
                    </div>
                  )}
                </div>

                <div style={{ 
                  padding: '0 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#888',
                  textAlign: 'center'
                }}>
                  VS
                </div>

                <div style={{ 
                  flex: 1, 
                  textAlign: 'center',
                  padding: '12px',
                  background: opponentTeam.almogScore > beitarTeam.almogScore 
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  border: opponentTeam.almogScore > beitarTeam.almogScore 
                    ? '2px solid #ef4444' 
                    : '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: opponentTeam.almogScore > beitarTeam.almogScore ? '#ef4444' : '#fff',
                    marginBottom: '4px'
                  }}>
                    {selectedOpponent.toUpperCase()}
                  </div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: opponentTeam.almogScore > beitarTeam.almogScore ? '#ef4444' : '#fff'
                  }}>
                    {opponentTeam.almogScore.toFixed(1)}
                  </div>
                  {opponentTeam.almogScore > beitarTeam.almogScore && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#22c55e', 
                      fontWeight: '600',
                      marginTop: '4px'
                    }}>
                      WINNER
                    </div>
                  )}
                </div>
              </div>

              {/* Metric Comparison Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '15px',
                marginBottom: '20px'
              }}>
                {/* Total Distance Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#AAA', 
                    fontWeight: '600',
                    textAlign: 'center',
                    marginBottom: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Distance
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      padding: '8px',
                      background: beitarTeam.totalDistance > opponentTeam.totalDistance 
                        ? 'rgba(255, 215, 0, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: beitarTeam.totalDistance > opponentTeam.totalDistance 
                        ? '1px solid rgba(255, 215, 0, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>BEITAR</div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: '600',
                        color: beitarTeam.totalDistance > opponentTeam.totalDistance ? '#FFD700' : '#fff'
                      }}>
                        {formatDistance(beitarTeam.totalDistance)}
                      </div>
                      {beitarTeam.totalDistance > opponentTeam.totalDistance && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                          WINNER
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '0 8px',
                      fontSize: '12px',
                      color: '#888'
                    }}>
                      <div style={{ fontWeight: '600', color: '#FFD700', marginBottom: '1px', fontSize: '16px' }}>
                        {formatDistance(Math.abs(beitarTeam.totalDistance - opponentTeam.totalDistance))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#FFD700', fontWeight: '600' }}>
                        {((Math.abs(beitarTeam.totalDistance - opponentTeam.totalDistance) / Math.min(beitarTeam.totalDistance, opponentTeam.totalDistance)) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px' }}>GAP</div>
                    </div>
                    
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      padding: '8px',
                      background: opponentTeam.totalDistance > beitarTeam.totalDistance 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: opponentTeam.totalDistance > beitarTeam.totalDistance 
                        ? '1px solid rgba(239, 68, 68, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>{selectedOpponent.toUpperCase()}</div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: '600',
                        color: opponentTeam.totalDistance > beitarTeam.totalDistance ? '#ef4444' : '#fff'
                      }}>
                        {formatDistance(opponentTeam.totalDistance)}
                      </div>
                      {opponentTeam.totalDistance > beitarTeam.totalDistance && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                          WINNER
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Intensity Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#AAA', 
                    fontWeight: '600',
                    textAlign: 'center',
                    marginBottom: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Intensity
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      padding: '8px',
                      background: beitarTeam.avgIntensity > opponentTeam.avgIntensity 
                        ? 'rgba(255, 215, 0, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: beitarTeam.avgIntensity > opponentTeam.avgIntensity 
                        ? '1px solid rgba(255, 215, 0, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>BEITAR</div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: '600',
                        color: beitarTeam.avgIntensity > opponentTeam.avgIntensity ? '#FFD700' : '#fff'
                      }}>
                        {formatIntensity(beitarTeam.avgIntensity)}
                      </div>
                      {beitarTeam.avgIntensity > opponentTeam.avgIntensity && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                          WINNER
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '0 8px',
                      fontSize: '12px',
                      color: '#888'
                    }}>
                      <div style={{ fontWeight: '600', color: '#FFD700', marginBottom: '1px', fontSize: '16px' }}>
                        {formatIntensity(Math.abs(beitarTeam.avgIntensity - opponentTeam.avgIntensity))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#FFD700', fontWeight: '600' }}>
                        {((Math.abs(beitarTeam.avgIntensity - opponentTeam.avgIntensity) / Math.min(beitarTeam.avgIntensity, opponentTeam.avgIntensity)) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px' }}>GAP</div>
                    </div>
                    
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      padding: '8px',
                      background: opponentTeam.avgIntensity > beitarTeam.avgIntensity 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: opponentTeam.avgIntensity > beitarTeam.avgIntensity 
                        ? '1px solid rgba(239, 68, 68, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>{selectedOpponent.toUpperCase()}</div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: '600',
                        color: opponentTeam.avgIntensity > beitarTeam.avgIntensity ? '#ef4444' : '#fff'
                      }}>
                        {formatIntensity(opponentTeam.avgIntensity)}
                      </div>
                      {opponentTeam.avgIntensity > beitarTeam.avgIntensity && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                          WINNER
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Speed Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#AAA', 
                    fontWeight: '600',
                    textAlign: 'center',
                    marginBottom: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Speed
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      padding: '8px',
                      background: beitarTeam.avgSpeed > opponentTeam.avgSpeed 
                        ? 'rgba(255, 215, 0, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: beitarTeam.avgSpeed > opponentTeam.avgSpeed 
                        ? '1px solid rgba(255, 215, 0, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>BEITAR</div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: '600',
                        color: beitarTeam.avgSpeed > opponentTeam.avgSpeed ? '#FFD700' : '#fff'
                      }}>
                        {formatSpeed(beitarTeam.avgSpeed)}
                      </div>
                      {beitarTeam.avgSpeed > opponentTeam.avgSpeed && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                          WINNER
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '0 8px',
                      fontSize: '12px',
                      color: '#888'
                    }}>
                      <div style={{ fontWeight: '600', color: '#FFD700', marginBottom: '1px', fontSize: '16px' }}>
                        {formatSpeed(Math.abs(beitarTeam.avgSpeed - opponentTeam.avgSpeed))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#FFD700', fontWeight: '600' }}>
                        {((Math.abs(beitarTeam.avgSpeed - opponentTeam.avgSpeed) / Math.min(beitarTeam.avgSpeed, opponentTeam.avgSpeed)) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '11px' }}>GAP</div>
                    </div>
                    
                    <div style={{ 
                      flex: 1, 
                      textAlign: 'center',
                      padding: '8px',
                      background: opponentTeam.avgSpeed > beitarTeam.avgSpeed 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: opponentTeam.avgSpeed > beitarTeam.avgSpeed 
                        ? '1px solid rgba(239, 68, 68, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ fontSize: '14px', color: '#999', marginBottom: '2px' }}>{selectedOpponent.toUpperCase()}</div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: '600',
                        color: opponentTeam.avgSpeed > beitarTeam.avgSpeed ? '#ef4444' : '#fff'
                      }}>
                        {formatSpeed(opponentTeam.avgSpeed)}
                      </div>
                      {opponentTeam.avgSpeed > beitarTeam.avgSpeed && (
                        <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600', marginTop: '2px' }}>
                          WINNER
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  )
}
