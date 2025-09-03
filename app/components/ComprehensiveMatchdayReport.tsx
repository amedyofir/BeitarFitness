'use client'

import React from 'react'
import { Download, FileText, Image } from 'lucide-react'
import html2canvas from 'html2canvas'

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
  if (!runningData || runningData.length === 0 || !selectedOpponent) {
    return null
  }

  // Helper functions
  const formatDistance = (distance: number) => {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(2)}km`
    }
    return `${Math.round(distance)}m`
  }

  const formatSpeed = (speed: number | undefined) => {
    if (speed === undefined || speed === null) return '-'
    if (typeof speed === 'string') return speed
    return speed.toFixed(1)
  }

  // Aggregate team data
  const getTeamData = () => {
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
    
    return teams.sort((a, b) => b.almogScore - a.almogScore)
  }

  const allTeams = getTeamData()
  const beitarTeam = allTeams.find(t => t.team.toLowerCase().includes('beitar'))
  const opponentTeam = allTeams.find(t => t.team === selectedOpponent)
  const beitarPlayers = beitarTeam?.players || []
  const opponentPlayers = opponentTeam?.players || []
  
  // Debug logging
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

  const maxDistance = Math.max(...allTeams.map(t => t.totalDistance))
  const maxInPoss = Math.max(...allTeams.map(t => t.totalInPoss))
  const maxOutPoss = Math.max(...allTeams.map(t => t.totalOutPoss))

  const downloadPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const reportElement = document.getElementById('comprehensive-matchday-report')
      if (!reportElement) return

      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#1a1f2e',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        height: reportElement.scrollHeight,
        width: reportElement.scrollWidth
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('landscape', 'mm', 'a4')
      const pdfWidth = 297
      const pdfHeight = 210
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      if (imgHeight <= pdfHeight) {
        // Single page
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      } else {
        // Multiple pages
        let y = 0
        const pageHeight = (pdfHeight * canvas.width) / pdfWidth
        
        while (y < canvas.height) {
          const pageCanvas = document.createElement('canvas')
          const pageCtx = pageCanvas.getContext('2d')
          pageCanvas.width = canvas.width
          pageCanvas.height = Math.min(pageHeight, canvas.height - y)
          
          pageCtx?.drawImage(canvas, 0, -y)
          
          const pageData = pageCanvas.toDataURL('image/png')
          const currentPageHeight = (pageCanvas.height * imgWidth) / pageCanvas.width
          
          if (y > 0) pdf.addPage()
          pdf.addImage(pageData, 'PNG', 0, 0, imgWidth, currentPageHeight)
          
          y += pageHeight
        }
      }

      pdf.save(`League_${matchdayNumber}_Beitar_vs_${selectedOpponent.replace(/\s+/g, '_')}.pdf`)
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
    }
  }

  const downloadJPG = async () => {
    const reportElement = document.getElementById('comprehensive-matchday-report')
    if (!reportElement) return

    try {
      const originalHeight = reportElement.style.height
      const originalMaxHeight = reportElement.style.maxHeight
      const originalOverflow = reportElement.style.overflow
      
      reportElement.style.height = 'auto'
      reportElement.style.maxHeight = 'none'
      reportElement.style.overflow = 'visible'
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#1a1f2e',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowHeight: reportElement.scrollHeight,
        windowWidth: Math.max(reportElement.scrollWidth, 1200),
        height: reportElement.scrollHeight,
        width: Math.max(reportElement.scrollWidth, 1200),
        y: 0,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX
      })
      
      reportElement.style.height = originalHeight
      reportElement.style.maxHeight = originalMaxHeight
      reportElement.style.overflow = originalOverflow
      
      const link = document.createElement('a')
      link.download = `League_${matchdayNumber}_Beitar_vs_${selectedOpponent.replace(/\s+/g, '_')}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.click()
    } catch (error: any) {
      console.error('Error downloading JPG:', error)
    }
  }

  const downloadReport = async () => {
    const reportElement = document.getElementById('comprehensive-matchday-report')
    if (!reportElement) return

    try {
      // Force the element to be fully visible for screenshot
      const originalHeight = reportElement.style.height
      const originalMaxHeight = reportElement.style.maxHeight
      const originalOverflow = reportElement.style.overflow
      
      // Remove any height restrictions temporarily
      reportElement.style.height = 'auto'
      reportElement.style.maxHeight = 'none'
      reportElement.style.overflow = 'visible'
      
      // Wait for any layout changes
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#1a1f2e',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowHeight: reportElement.scrollHeight,
        windowWidth: Math.max(reportElement.scrollWidth, 1200),
        height: reportElement.scrollHeight,
        width: Math.max(reportElement.scrollWidth, 1200),
        y: 0,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX
      })
      
      // Restore original styles
      reportElement.style.height = originalHeight
      reportElement.style.maxHeight = originalMaxHeight
      reportElement.style.overflow = originalOverflow
      
      const link = document.createElement('a')
      link.download = `League_${matchdayNumber}_Beitar_vs_${selectedOpponent.replace(/\s+/g, '_')}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    } catch (error: any) {
      console.error('Error downloading report:', error)
    }
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
          fontSize: '9px',
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
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
          {index + 1}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'left', color: '#fff', fontSize: '11px', fontWeight: '500', width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.Player}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '13px', fontWeight: '600' }}>
          {formatDistance(totalDistance)}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontSize: '13px' }}>
          {mpm.toFixed(1)}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontSize: '13px' }}>
          {intensity.toFixed(1)}%
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '13px', fontWeight: '600' }}>
          {formatSpeed(speed)}
        </td>
        <td style={{ padding: '10px 8px', width: '140px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '8px', color: '#888', width: '35px' }}>In Poss</span>
              {renderProgressBar(inPoss, Math.max(...runningData.map(p => p.DistanceRunInPoss || 0)), 'green')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '8px', color: '#888', width: '35px' }}>Out Poss</span>
              {renderProgressBar(outPoss, Math.max(...runningData.map(p => p.DistanceRunOutPoss || 0)), 'red')}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', width: '140px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '8px', color: '#888', width: '35px' }}>In Poss</span>
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
                  fontSize: '9px',
                  color: '#fff',
                  fontWeight: '600'
                }}>
                  {inPossIntensity.toFixed(1)}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '8px', color: '#888', width: '35px' }}>Out Poss</span>
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
                  fontSize: '9px',
                  color: '#fff',
                  fontWeight: '600'
                }}>
                  {outPossIntensity.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>
          {almogScore.toFixed(1)}
        </td>
      </tr>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Download Buttons */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 100,
        display: 'flex',
        gap: '6px'
      }}>
        <button
          onClick={downloadReport}
          style={{
            background: 'rgba(255, 215, 0, 0.9)',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)'
          }}
          title="Download PNG"
        >
          <Download size={16} color="#000" />
        </button>
        <button
          onClick={downloadJPG}
          style={{
            background: 'rgba(34, 197, 94, 0.9)',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)'
          }}
          title="Download JPG"
        >
          <Image size={16} color="#fff" />
        </button>
        <button
          onClick={downloadPDF}
          style={{
            background: 'rgba(239, 68, 68, 0.9)',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)'
          }}
          title="Download PDF"
        >
          <FileText size={16} color="#fff" />
        </button>
      </div>

      <div id="comprehensive-matchday-report" style={{ 
        background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
        borderRadius: '12px',
        padding: '20px',
        color: '#fff',
        fontFamily: 'Montserrat',
        minHeight: 'auto',
        overflow: 'visible',
        width: '100%'
      }}>
        
        {/* Main Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '20px',
            fontWeight: '700',
            margin: 0,
            letterSpacing: '1px'
          }}>
            League {matchdayNumber} - Beitar Jerusalem vs {selectedOpponent}
          </h1>
        </div>

        {/* 1. All Teams Comparison */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            All Teams Comparison
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '11px' }}>
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
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>
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
                        <span style={{ fontSize: '8px', color: '#888', width: '35px' }}>In Poss</span>
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
                            fontSize: '9px',
                            color: '#fff',
                            fontWeight: '600'
                          }}>
                            {team.avgInPossIntensity.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '8px', color: '#888', width: '35px' }}>Out Poss</span>
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
                            fontSize: '9px',
                            color: '#fff',
                            fontWeight: '600'
                          }}>
                            {team.avgOutPossIntensity.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontSize: '12px', fontWeight: '700' }}>
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
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            All Teams Half-Time Breakdown
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '11px' }}>
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
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8px', color: '#22c55e', width: '20px' }}>1st</span>
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
                              fontSize: '8px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {formatDistance(firstHalfDistance)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8px', color: '#ef4444', width: '20px' }}>2nd</span>
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
                              fontSize: '8px',
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
                          <span style={{ fontSize: '8px', color: '#22c55e', width: '20px' }}>1st</span>
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
                              fontSize: '8px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {firstHalfIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8px', color: '#ef4444', width: '20px' }}>2nd</span>
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
                              fontSize: '8px',
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
                          <span style={{ fontSize: '8px', color: '#22c55e', width: '20px' }}>1st</span>
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
                              fontSize: '8px',
                              color: '#fff',
                              fontWeight: '600'
                            }}>
                              {firstHalfAlmog.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8px', color: '#ef4444', width: '20px' }}>2nd</span>
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
                              fontSize: '8px',
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
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            Beitar Players
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '11px' }}>
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
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {selectedOpponent} Players
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '11px' }}>
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
            textAlign: 'center'
          }}>
            Head-to-Head Comparison
          </h2>
          
          {beitarTeam && opponentTeam && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(239, 68, 68, 0.08))',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              
              {/* Overall Winner Banner */}
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '25px',
                padding: '12px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.15), rgba(239, 68, 68, 0.15))'
              }}>
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '4px'
                }}>
                  <span style={{ color: '#FFD700' }}>BEITAR</span>
                  <span style={{ color: '#888', margin: '0 10px' }}>VS</span>
                  <span style={{ color: '#ef4444' }}>{selectedOpponent.toUpperCase()}</span>
                </div>
              </div>

              {/* Metrics Comparison */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Distance Comparison */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '80px', fontSize: '11px', color: '#888', fontWeight: '600', textAlign: 'right' }}>DISTANCE</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#FFD700', 
                      width: '65px', 
                      textAlign: 'right',
                      fontWeight: '600'
                    }}>
                      {formatDistance(beitarTeam.totalDistance)}
                    </span>
                    <div style={{ flex: 1, height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', position: 'relative', overflow: 'visible' }}>
                      {/* Center line indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-4px',
                        bottom: '-4px',
                        width: '2px',
                        background: 'rgba(255, 255, 255, 0.3)',
                        zIndex: 1
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: `${(beitarTeam.totalDistance / (beitarTeam.totalDistance + opponentTeam.totalDistance)) * 100}%`,
                        height: '100%',
                        background: beitarTeam.totalDistance > opponentTeam.totalDistance ? 
                          'linear-gradient(90deg, #FFD700, #FFC107)' : 
                          'linear-gradient(90deg, #FFD700, #FFA000)',
                        borderRadius: '4px 0 0 4px',
                        opacity: beitarTeam.totalDistance > opponentTeam.totalDistance ? 1 : 0.7
                      }} />
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        width: `${(opponentTeam.totalDistance / (beitarTeam.totalDistance + opponentTeam.totalDistance)) * 100}%`,
                        height: '100%',
                        background: opponentTeam.totalDistance > beitarTeam.totalDistance ? 
                          'linear-gradient(90deg, #dc2626, #ef4444)' : 
                          'linear-gradient(90deg, #dc2626, #ef4444)',
                        borderRadius: '0 4px 4px 0',
                        opacity: opponentTeam.totalDistance > beitarTeam.totalDistance ? 1 : 0.7
                      }} />
                      {/* Winner V mark */}
                      {beitarTeam.totalDistance > opponentTeam.totalDistance && (
                        <div style={{
                          position: 'absolute',
                          left: '25%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '14px',
                          color: '#000',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                      {opponentTeam.totalDistance > beitarTeam.totalDistance && (
                        <div style={{
                          position: 'absolute',
                          right: '25%',
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          fontSize: '14px',
                          color: '#fff',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#ef4444', 
                      width: '65px', 
                      textAlign: 'left',
                      fontWeight: '600'
                    }}>
                      {formatDistance(opponentTeam.totalDistance)}
                    </span>
                  </div>
                </div>

                {/* Intensity Comparison */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '80px', fontSize: '11px', color: '#888', fontWeight: '600', textAlign: 'right' }}>INTENSITY</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#FFD700', 
                      width: '65px', 
                      textAlign: 'right',
                      fontWeight: '600'
                    }}>
                      {beitarTeam.avgIntensity.toFixed(1)}%
                    </span>
                    <div style={{ flex: 1, height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', position: 'relative', overflow: 'visible' }}>
                      {/* Center line indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-4px',
                        bottom: '-4px',
                        width: '2px',
                        background: 'rgba(255, 255, 255, 0.3)',
                        zIndex: 1
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: `${(beitarTeam.avgIntensity / (beitarTeam.avgIntensity + opponentTeam.avgIntensity)) * 100}%`,
                        height: '100%',
                        background: beitarTeam.avgIntensity > opponentTeam.avgIntensity ? 
                          'linear-gradient(90deg, #FFD700, #FFC107)' : 
                          'linear-gradient(90deg, #FFD700, #FFA000)',
                        borderRadius: '4px 0 0 4px',
                        opacity: beitarTeam.avgIntensity > opponentTeam.avgIntensity ? 1 : 0.7
                      }} />
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        width: `${(opponentTeam.avgIntensity / (beitarTeam.avgIntensity + opponentTeam.avgIntensity)) * 100}%`,
                        height: '100%',
                        background: opponentTeam.avgIntensity > beitarTeam.avgIntensity ? 
                          'linear-gradient(90deg, #dc2626, #ef4444)' : 
                          'linear-gradient(90deg, #dc2626, #ef4444)',
                        borderRadius: '0 4px 4px 0',
                        opacity: opponentTeam.avgIntensity > beitarTeam.avgIntensity ? 1 : 0.7
                      }} />
                      {/* Winner V mark */}
                      {beitarTeam.avgIntensity > opponentTeam.avgIntensity && (
                        <div style={{
                          position: 'absolute',
                          left: '25%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '14px',
                          color: '#000',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                      {opponentTeam.avgIntensity > beitarTeam.avgIntensity && (
                        <div style={{
                          position: 'absolute',
                          right: '25%',
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          fontSize: '14px',
                          color: '#fff',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#ef4444', 
                      width: '65px', 
                      textAlign: 'left',
                      fontWeight: '600'
                    }}>
                      {opponentTeam.avgIntensity.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Speed Comparison */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '80px', fontSize: '11px', color: '#888', fontWeight: '600', textAlign: 'right' }}>AVG SPEED</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#FFD700', 
                      width: '65px', 
                      textAlign: 'right',
                      fontWeight: '600'
                    }}>
                      {formatSpeed(beitarTeam.avgSpeed)}
                    </span>
                    <div style={{ flex: 1, height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', position: 'relative', overflow: 'visible' }}>
                      {/* Center line indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-4px',
                        bottom: '-4px',
                        width: '2px',
                        background: 'rgba(255, 255, 255, 0.3)',
                        zIndex: 1
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: `${(beitarTeam.avgSpeed / (beitarTeam.avgSpeed + opponentTeam.avgSpeed)) * 100}%`,
                        height: '100%',
                        background: beitarTeam.avgSpeed > opponentTeam.avgSpeed ? 
                          'linear-gradient(90deg, #FFD700, #FFC107)' : 
                          'linear-gradient(90deg, #FFD700, #FFA000)',
                        borderRadius: '4px 0 0 4px',
                        opacity: beitarTeam.avgSpeed > opponentTeam.avgSpeed ? 1 : 0.7
                      }} />
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        width: `${(opponentTeam.avgSpeed / (beitarTeam.avgSpeed + opponentTeam.avgSpeed)) * 100}%`,
                        height: '100%',
                        background: opponentTeam.avgSpeed > beitarTeam.avgSpeed ? 
                          'linear-gradient(90deg, #dc2626, #ef4444)' : 
                          'linear-gradient(90deg, #dc2626, #ef4444)',
                        borderRadius: '0 4px 4px 0',
                        opacity: opponentTeam.avgSpeed > beitarTeam.avgSpeed ? 1 : 0.7
                      }} />
                      {/* Winner V mark */}
                      {beitarTeam.avgSpeed > opponentTeam.avgSpeed && (
                        <div style={{
                          position: 'absolute',
                          left: '25%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '14px',
                          color: '#000',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                      {opponentTeam.avgSpeed > beitarTeam.avgSpeed && (
                        <div style={{
                          position: 'absolute',
                          right: '25%',
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          fontSize: '14px',
                          color: '#fff',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#ef4444', 
                      width: '65px', 
                      textAlign: 'left',
                      fontWeight: '600'
                    }}>
                      {formatSpeed(opponentTeam.avgSpeed)}
                    </span>
                  </div>
                </div>

                {/* MPM Comparison */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '80px', fontSize: '11px', color: '#888', fontWeight: '600', textAlign: 'right' }}>MPM</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#FFD700', 
                      width: '65px', 
                      textAlign: 'right',
                      fontWeight: '600'
                    }}>
                      {beitarTeam.avgMPM.toFixed(1)}
                    </span>
                    <div style={{ flex: 1, height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', position: 'relative', overflow: 'visible' }}>
                      {/* Center line indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-4px',
                        bottom: '-4px',
                        width: '2px',
                        background: 'rgba(255, 255, 255, 0.3)',
                        zIndex: 1
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: `${(beitarTeam.avgMPM / (beitarTeam.avgMPM + opponentTeam.avgMPM)) * 100}%`,
                        height: '100%',
                        background: beitarTeam.avgMPM > opponentTeam.avgMPM ? 
                          'linear-gradient(90deg, #FFD700, #FFC107)' : 
                          'linear-gradient(90deg, #FFD700, #FFA000)',
                        borderRadius: '4px 0 0 4px',
                        opacity: beitarTeam.avgMPM > opponentTeam.avgMPM ? 1 : 0.7
                      }} />
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        width: `${(opponentTeam.avgMPM / (beitarTeam.avgMPM + opponentTeam.avgMPM)) * 100}%`,
                        height: '100%',
                        background: opponentTeam.avgMPM > beitarTeam.avgMPM ? 
                          'linear-gradient(90deg, #dc2626, #ef4444)' : 
                          'linear-gradient(90deg, #dc2626, #ef4444)',
                        borderRadius: '0 4px 4px 0',
                        opacity: opponentTeam.avgMPM > beitarTeam.avgMPM ? 1 : 0.7
                      }} />
                      {/* Winner V mark */}
                      {beitarTeam.avgMPM > opponentTeam.avgMPM && (
                        <div style={{
                          position: 'absolute',
                          left: '25%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '14px',
                          color: '#000',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                      {opponentTeam.avgMPM > beitarTeam.avgMPM && (
                        <div style={{
                          position: 'absolute',
                          right: '25%',
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          fontSize: '14px',
                          color: '#fff',
                          fontWeight: '700',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#ef4444', 
                      width: '65px', 
                      textAlign: 'left',
                      fontWeight: '600'
                    }}>
                      {opponentTeam.avgMPM.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* ALMOG Comparison */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ width: '80px', fontSize: '12px', color: '#FFD700', fontWeight: '700', textAlign: 'right' }}>ALMOG</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#FFD700', 
                      width: '65px', 
                      textAlign: 'right',
                      fontWeight: '700'
                    }}>
                      {beitarTeam.almogScore.toFixed(1)}
                    </span>
                    <div style={{ flex: 1, height: '28px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', position: 'relative', overflow: 'visible' }}>
                      {/* Center line indicator */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '-4px',
                        bottom: '-4px',
                        width: '2px',
                        background: 'rgba(255, 215, 0, 0.5)',
                        zIndex: 1
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        width: `${(beitarTeam.almogScore / (beitarTeam.almogScore + opponentTeam.almogScore)) * 100}%`,
                        height: '100%',
                        background: beitarTeam.almogScore > opponentTeam.almogScore ? 
                          'linear-gradient(90deg, #FFD700, #FFC107)' : 
                          'linear-gradient(90deg, #FFD700, #FFA000)',
                        borderRadius: '4px 0 0 4px',
                        opacity: beitarTeam.almogScore > opponentTeam.almogScore ? 1 : 0.7
                      }} />
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        width: `${(opponentTeam.almogScore / (beitarTeam.almogScore + opponentTeam.almogScore)) * 100}%`,
                        height: '100%',
                        background: opponentTeam.almogScore > beitarTeam.almogScore ? 
                          'linear-gradient(90deg, #dc2626, #ef4444)' : 
                          'linear-gradient(90deg, #dc2626, #ef4444)',
                        borderRadius: '0 4px 4px 0',
                        opacity: opponentTeam.almogScore > beitarTeam.almogScore ? 1 : 0.7
                      }} />
                      {/* Winner V mark - larger for ALMOG */}
                      {beitarTeam.almogScore > opponentTeam.almogScore && (
                        <div style={{
                          position: 'absolute',
                          left: '25%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: '16px',
                          color: '#000',
                          fontWeight: '900',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                      {opponentTeam.almogScore > beitarTeam.almogScore && (
                        <div style={{
                          position: 'absolute',
                          right: '25%',
                          top: '50%',
                          transform: 'translate(50%, -50%)',
                          fontSize: '16px',
                          color: '#fff',
                          fontWeight: '900',
                          zIndex: 2
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#ef4444', 
                      width: '65px', 
                      textAlign: 'left',
                      fontWeight: '700'
                    }}>
                      {opponentTeam.almogScore.toFixed(1)}
                    </span>
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