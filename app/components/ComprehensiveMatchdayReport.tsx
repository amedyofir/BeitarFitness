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
  isSeasonReport?: boolean
  highlightOpponent?: string
  exportRef?: React.RefObject<HTMLDivElement>
}

export default function ComprehensiveMatchdayReport({ runningData, matchdayNumber, selectedOpponent, isSeasonReport = false, highlightOpponent, exportRef: externalExportRef }: ComprehensiveMatchdayReportProps) {
  const internalExportRef = useRef<HTMLDivElement>(null)
  const exportRef = externalExportRef || internalExportRef
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const [matchDate, setMatchDate] = useState<string>(new Date().toISOString().split('T')[0])

  const handleDownloadPNG = async () => {
    if (!exportRef.current) return

    try {
      // Store original styles
      const originalStyles = {
        maxWidth: exportRef.current.style.maxWidth,
        width: exportRef.current.style.width,
        overflow: exportRef.current.style.overflow
      }

      // Find all table containers and store their styles
      const tableContainers = exportRef.current.querySelectorAll('[style*="overflowX"]') as NodeListOf<HTMLElement>
      const originalTableStyles = Array.from(tableContainers).map(container => ({
        element: container,
        overflow: container.style.overflow,
        overflowX: container.style.overflowX,
        width: container.style.width,
        minWidth: container.style.minWidth
      }))

      // Temporarily modify styles for full-width capture
      exportRef.current.style.maxWidth = 'none'
      exportRef.current.style.width = 'fit-content'
      exportRef.current.style.overflow = 'visible'

      // Fix table containers to show full width
      tableContainers.forEach(container => {
        container.style.overflow = 'visible'
        container.style.overflowX = 'visible'
        container.style.width = 'auto'
        container.style.minWidth = 'auto'
      })

      // Find all tables and ensure they show at full width
      const tables = exportRef.current.querySelectorAll('table') as NodeListOf<HTMLTableElement>
      const originalTableElementStyles = Array.from(tables).map(table => ({
        element: table,
        width: table.style.width,
        minWidth: table.style.minWidth
      }))

      // Let tables use their natural width
      tables.forEach(table => {
        if (table.style.minWidth) {
          // Keep minWidth if set, but remove width constraint
          table.style.width = 'auto'
        }
      })

      // Force a reflow to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get the actual content dimensions
      const rect = exportRef.current.getBoundingClientRect()
      
      // Find the rightmost element to get exact width needed
      const allElements = exportRef.current.querySelectorAll('*')
      let maxRight = 0
      allElements.forEach(el => {
        const elRect = el.getBoundingClientRect()
        const rightEdge = elRect.right - rect.left
        if (rightEdge > maxRight) {
          maxRight = rightEdge
        }
      })
      
      // Use the actual content width plus small padding
      const fullWidth = Math.ceil(maxRight + 20) // Add 20px padding for safety
      const fullHeight = Math.max(exportRef.current.scrollHeight, rect.height)

      console.log('PNG Export - Dimensions:', { fullWidth, fullHeight, scrollWidth: exportRef.current.scrollWidth, scrollHeight: exportRef.current.scrollHeight })

      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#242b3d',
        useCORS: true,
        allowTaint: true,
        scale: 2,
        width: fullWidth,
        height: fullHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        logging: false
      })

      // Restore original styles
      exportRef.current.style.maxWidth = originalStyles.maxWidth
      exportRef.current.style.width = originalStyles.width
      exportRef.current.style.overflow = originalStyles.overflow

      // Restore table container styles
      originalTableStyles.forEach(({ element, overflow, overflowX, width, minWidth }) => {
        element.style.overflow = overflow
        element.style.overflowX = overflowX
        element.style.width = width
        element.style.minWidth = minWidth
      })

      // Restore table element styles
      originalTableElementStyles.forEach(({ element, width, minWidth }) => {
        element.style.width = width
        element.style.minWidth = minWidth
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
        season: '2025-2026',
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
        maxGM: 0,
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

    // Track MAX(GM) for season reports
    const playerGM = parseFloat(player.GM) || 0
    team.maxGM = Math.max(team.maxGM, playerGM)

    team.playerCount++
    team.players.push(player)
  })
  
  // First pass to get the data
  const teams = Object.entries(teamData).map(([team, data]) => {
    // For season reports, normalize team totals by MAX(GM)
    // Special case: Ironi Tiberias and Hapoel Haifa use MAX(GM)-1 due to missing match data
    let effectiveMaxGM = data.maxGM
    if (isSeasonReport && (team === 'Ironi Tiberias' || team === 'Hapoel Haifa')) {
      effectiveMaxGM = Math.max(1, data.maxGM - 1)
    }
    const gmNormalizeFactor = isSeasonReport && effectiveMaxGM > 0 ? (1 / effectiveMaxGM) : 1

    return {
      team,
      totalDistance: data.totalDistance * gmNormalizeFactor,
      totalFirstHalf: data.totalFirstHalf * gmNormalizeFactor,
      totalSecondHalf: data.totalSecondHalf * gmNormalizeFactor,
      totalInPoss: data.totalInPoss * gmNormalizeFactor,
      totalOutPoss: data.totalOutPoss * gmNormalizeFactor,
      avgInPossIntensity: data.totalInPoss > 0 ? ((data.totalInPossHSR + data.totalInPossSprint) / data.totalInPoss * 100) : 0,
      avgOutPossIntensity: data.totalOutPoss > 0 ? ((data.totalOutPossHSR + data.totalOutPossSprint) / data.totalOutPoss * 100) : 0,
      avgMPM: data.maxGameTime > 0 ? (data.totalDistance / data.maxGameTime) : 0,
      avgIntensity: data.totalDistance > 0 ?
        ((data.totalFirstHalfHSR + data.totalFirstHalfSprint + data.totalSecondHalfHSR + data.totalSecondHalfSprint) / data.totalDistance * 100) : 0,
      avgSpeed: data.totalSpeed > 0 && data.playerCount > 0 ? (data.totalSpeed / data.playerCount) : 0,
      playerCount: data.playerCount,
      players: data.players,
      totalFirstHalfHSR: data.totalFirstHalfHSR * gmNormalizeFactor,
      totalFirstHalfSprint: data.totalFirstHalfSprint * gmNormalizeFactor,
      totalSecondHalfHSR: data.totalSecondHalfHSR * gmNormalizeFactor,
      totalSecondHalfSprint: data.totalSecondHalfSprint * gmNormalizeFactor,
      speedFirstHalf: data.speedFirstHalf,
      speedSecondHalf: data.speedSecondHalf,
      maxGameTime: data.maxGameTime,
      maxGM: data.maxGM,
      almogScore: 0 // Will calculate after getting min/max
    }
  })
  
  // Get min and max for proportional scoring
  const distanceValues = teams.map(t => t.totalDistance).filter(v => v > 0)
  const mpmValues = teams.map(t => t.avgMPM).filter(v => v > 0)
  const speedValues = teams.map(t => t.avgSpeed).filter(v => v > 0)
  const intensityValues = teams.map(t => t.avgIntensity).filter(v => v > 0)

  const minDistance = Math.min(...distanceValues)
  const maxDistance = Math.max(...distanceValues)
  const minMPM = Math.min(...mpmValues)
  const maxMPM = Math.max(...mpmValues)
  const minSpeed = Math.min(...speedValues)
  const maxSpeed = Math.max(...speedValues)
  const minIntensity = Math.min(...intensityValues)
  const maxIntensity = Math.max(...intensityValues)

  // Calculate proportional ALMOG scores
  teams.forEach(team => {
    const distanceScore = maxDistance > minDistance ?
      ((team.totalDistance - minDistance) / (maxDistance - minDistance)) * 100 : 50
    const mpmScore = maxMPM > minMPM ?
      ((team.avgMPM - minMPM) / (maxMPM - minMPM)) * 100 : 50
    const speedScore = maxSpeed > minSpeed ?
      ((team.avgSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100 : 50
    const intensityScore = maxIntensity > minIntensity ?
      ((team.avgIntensity - minIntensity) / (maxIntensity - minIntensity)) * 100 : 50

    // For season reports: Distance 40%, Speed 10%, Intensity 50%
    // For match reports: MPM 40%, Speed 10%, Intensity 50%
    if (isSeasonReport) {
      team.almogScore = (distanceScore * 0.4) + (speedScore * 0.1) + (intensityScore * 0.5)
    } else {
      team.almogScore = (mpmScore * 0.4) + (speedScore * 0.1) + (intensityScore * 0.5)
    }
  })
  
  const allTeams = teams.sort((a, b) => b.almogScore - a.almogScore)



  const renderProgressBar = (value: number, maxValue: number, color: 'green' | 'red') => {
    const percentage = maxValue > 0 ? (value / maxValue * 100) : 0
    const gradient = color === 'green' 
      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
      : 'linear-gradient(90deg, #ef4444, #dc2626)'
    
    // Format value with full distance format
    const formattedValue = formatDistance(value)
    
    return (
      <div style={{ 
        flex: 1, 
        height: '14px', 
        background: 'rgba(255, 255, 255, 0.1)', 
        borderRadius: '7px',
        position: 'relative',
        overflow: 'hidden',
        minWidth: '60px'
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
          right: '2px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '14px',
          color: '#fff',
          fontWeight: '700',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
          paddingLeft: '2px'
        }}>
          {formattedValue}
        </span>
      </div>
    )
  }

  const renderPlayerRow = (player: any, index: number, isSubstitute: boolean = false) => {
    const gameTime = player.MinIncET || player.Min || 0

    // For season reports, normalize distances by (value / MinIncET) * 90
    const normalizeFactor = isSeasonReport && gameTime > 0 ? (90 / gameTime) : 1

    // Calculate raw total distance for MPM (always use raw distance for MPM)
    const rawTotalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
    const totalDistance = rawTotalDistance * normalizeFactor
    const mpm = gameTime > 0 ? (rawTotalDistance / gameTime) : 0
    const inPoss = (player.DistanceRunInPoss || 0) * normalizeFactor
    const outPoss = (player.DistanceRunOutPoss || 0) * normalizeFactor
    const inPossHSR = (player.InPossDistHSRun || 0) * normalizeFactor
    const inPossSprint = (player.InPossDistSprint || 0) * normalizeFactor
    const outPossHSR = (player.OutPossDistHSRun || 0) * normalizeFactor
    const outPossSprint = (player.OutPossDistSprint || 0) * normalizeFactor
    const firstHalfHSR = (player.FirstHalfDistHSRun || 0) * normalizeFactor
    const firstHalfSprint = (player.FirstHalfDistSprint || 0) * normalizeFactor
    const secondHalfHSR = (player.ScndHalfDistHSRun || 0) * normalizeFactor
    const secondHalfSprint = (player.ScndHalfDistSprint || 0) * normalizeFactor

    const inPossIntensity = inPoss > 0 ? ((inPossHSR + inPossSprint) / inPoss * 100) : 0
    const outPossIntensity = outPoss > 0 ? ((outPossHSR + outPossSprint) / outPoss * 100) : 0
    const intensity = totalDistance > 0 ?
      ((firstHalfHSR + firstHalfSprint + secondHalfHSR + secondHalfSprint) / totalDistance * 100) : 0
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
          {player.Min && (
            <span style={{
              marginLeft: '6px',
              color: '#FFD700',
              fontWeight: '700',
              fontSize: '14px',
              background: 'rgba(255, 215, 0, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}>
              {player.Min}'
            </span>
          )}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '16px', fontWeight: '600' }}>
          {formatDistance(totalDistance)}
        </td>
        {!isSeasonReport && <td style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontSize: '16px' }}>
          {mpm.toFixed(1)}
        </td>}
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontSize: '16px' }}>
          {intensity.toFixed(1)}%
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#FFD700', fontSize: '16px', fontWeight: '600' }}>
          {formatSpeed(speed)}
        </td>
        <td style={{ padding: '10px 8px', width: '160px' }}>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600', display: 'block', marginBottom: '2px' }}>In Poss</span>
              {renderProgressBar(inPoss, maxPlayerInPoss, 'green')}
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Out Poss</span>
              {renderProgressBar(outPoss, maxPlayerOutPoss, 'red')}
            </div>
          </div>
        </td>
        <td style={{ padding: '10px 8px', width: '160px' }}>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: '600', display: 'block', marginBottom: '2px' }}>In Poss</span>
              <div style={{
                width: '100%',
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
                  right: '2px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#fff',
                  fontWeight: '700'
                }}>
                  {inPossIntensity.toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Out Poss</span>
              <div style={{
                width: '100%',
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
                  right: '2px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  color: '#fff',
                  fontWeight: '700'
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
  const opponentTeam = allTeams.find(t => t.team === (highlightOpponent || selectedOpponent))
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
    const gameTime = player.MinIncET || player.Min || 0
    const normalizeFactor = isSeasonReport && gameTime > 0 ? (90 / gameTime) : 1
    const totalDistance = ((player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)) * normalizeFactor
    const inPoss = (player.DistanceRunInPoss || 0) * normalizeFactor
    const outPoss = (player.DistanceRunOutPoss || 0) * normalizeFactor
    const mpm = gameTime > 0 ? (totalDistance / gameTime) : 0

    // Normalize HSR and Sprint for intensity calculation
    const totalHSR = ((player.FirstHalfDistHSRun || 0) + (player.ScndHalfDistHSRun || 0)) * normalizeFactor
    const totalSprint = ((player.FirstHalfDistSprint || 0) + (player.ScndHalfDistSprint || 0)) * normalizeFactor
    const intensity = totalDistance > 0 ? ((totalHSR + totalSprint) / totalDistance * 100) : 0

    const speed = typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || player.TopSpeed || 0)
    return { player, totalDistance, inPoss, outPoss, mpm, intensity, speed }
  })

  // Get min/max for player metrics
  const playerDistanceValues = playerMetrics.map(p => p.totalDistance).filter(v => v > 0)
  const playerInPossValues = playerMetrics.map(p => p.inPoss).filter(v => v > 0)
  const playerOutPossValues = playerMetrics.map(p => p.outPoss).filter(v => v > 0)
  const playerMpmValues = playerMetrics.map(p => p.mpm).filter(v => v > 0)
  const playerSpeedValues = playerMetrics.map(p => p.speed).filter(v => v > 0)
  const playerIntensityValues = playerMetrics.map(p => p.intensity).filter(v => v > 0)

  const minPlayerDistance = Math.min(...playerDistanceValues)
  const maxPlayerDistance = Math.max(...playerDistanceValues)
  const maxPlayerInPoss = Math.max(...playerInPossValues)
  const maxPlayerOutPoss = Math.max(...playerOutPossValues)
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

    const distanceScore = maxPlayerDistance > minPlayerDistance ?
      ((metrics.totalDistance - minPlayerDistance) / (maxPlayerDistance - minPlayerDistance)) * 100 : 50
    const mpmScore = maxPlayerMPM > minPlayerMPM ?
      ((metrics.mpm - minPlayerMPM) / (maxPlayerMPM - minPlayerMPM)) * 100 : 50
    const speedScore = maxPlayerSpeed > minPlayerSpeed ?
      ((metrics.speed - minPlayerSpeed) / (maxPlayerSpeed - minPlayerSpeed)) * 100 : 50
    const intensityScore = maxPlayerIntensity > minPlayerIntensity ?
      ((metrics.intensity - minPlayerIntensity) / (maxPlayerIntensity - minPlayerIntensity)) * 100 : 50

    // For season reports: Distance 40%, Speed 10%, Intensity 50%
    // For match reports: MPM 40%, Speed 10%, Intensity 50%
    if (isSeasonReport) {
      return (distanceScore * 0.4) + (speedScore * 0.1) + (intensityScore * 0.5)
    } else {
      return (mpmScore * 0.4) + (speedScore * 0.1) + (intensityScore * 0.5)
    }
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
      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: isSeasonReport ? 'flex-end' : 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        {/* Match Date Input - Only for match reports */}
        {!isSeasonReport && (
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
        )}

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          {!isSeasonReport && (
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
          )}

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
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '14px', fontWeight: '700', width: '140px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                {!isSeasonReport && <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>MPM</th>}
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar')
                const isOpponentRow = highlightOpponent ? team.team === highlightOpponent : team.team === selectedOpponent

                return (
                  <tr
                    key={team.team}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' :
                                  isOpponentRow ? 'rgba(239, 68, 68, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '16px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
                      {formatDistance(team.totalDistance)}
                    </td>
                    {!isSeasonReport && <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff', fontSize: '16px' }}>
                      {Math.round(team.avgMPM)}
                    </td>}
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff', fontSize: '16px' }}>
                      {team.avgIntensity.toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
                      {formatSpeed(team.avgSpeed)}
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '50px', textAlign: 'left', fontWeight: '600' }}>In Poss</span>
                        {renderProgressBar(team.totalInPoss, maxInPoss, 'green')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '50px', textAlign: 'left', fontWeight: '600' }}>Out Poss</span>
                        {renderProgressBar(team.totalOutPoss, maxOutPoss, 'red')}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '50px', textAlign: 'left', fontWeight: '600' }}>In Poss</span>
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
                            right: '2px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px',
                            color: '#fff',
                            fontWeight: '700'
                          }}>
                            {team.avgInPossIntensity.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#888', width: '50px', textAlign: 'left', fontWeight: '600' }}>Out Poss</span>
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
                            right: '2px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '14px',
                            color: '#fff',
                            fontWeight: '700'
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
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '14px', fontWeight: '700', width: '140px' }}>TEAM</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {allTeams.map((team, index) => {
                const isBeitarRow = team.team.toLowerCase().includes('beitar')
                const isOpponentRow = highlightOpponent ? team.team === highlightOpponent : team.team === selectedOpponent

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
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '16px' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '16px' }}>
                      {team.team}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', minWidth: '150px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#22c55e', width: '30px', textAlign: 'left', fontWeight: '600' }}>1st</span>
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
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: '700'
                            }}>
                              {formatDistance(firstHalfDistance)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#ef4444', width: '30px', textAlign: 'left', fontWeight: '600' }}>2nd</span>
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
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: '700'
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
                          <span style={{ fontSize: '12px', color: '#22c55e', width: '30px', textAlign: 'left', fontWeight: '600' }}>1st</span>
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
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: '700'
                            }}>
                              {firstHalfIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#ef4444', width: '30px', textAlign: 'left', fontWeight: '600' }}>2nd</span>
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
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: '700'
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
                          <span style={{ fontSize: '12px', color: '#22c55e', width: '30px', textAlign: 'left', fontWeight: '600' }}>1st</span>
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
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: '700'
                            }}>
                              {firstHalfAlmog.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: '#ef4444', width: '30px', textAlign: 'left', fontWeight: '600' }}>2nd</span>
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
                              fontSize: '14px',
                              color: '#fff',
                              fontWeight: '700'
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
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '14px', fontWeight: '700', width: '120px' }}>PLAYER</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                {!isSeasonReport && <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>MPM</th>}
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {isSeasonReport ? (
                // For season reports, split by minutes played (over 200 vs under 200)
                <>
                  {sortedBeitarPlayers.filter(p => {
                    const minutes = p.MinIncET || p.Min || 0
                    return minutes > 200
                  }).map((player, index) =>
                    renderPlayerRow(player, index, false)
                  )}

                  {sortedBeitarPlayers.filter(p => {
                    const minutes = p.MinIncET || p.Min || 0
                    return minutes <= 200
                  }).length > 0 && (
                    <>
                      <tr>
                        <td colSpan={9} style={{
                          padding: '12px 8px',
                          textAlign: 'center',
                          background: 'rgba(139, 69, 19, 0.2)',
                          borderTop: '2px solid rgba(139, 69, 19, 0.5)',
                          borderBottom: '2px solid rgba(139, 69, 19, 0.5)'
                        }}>
                          <span style={{ color: '#D2691E', fontWeight: '700', fontSize: '14px' }}>
                            PLAYERS UNDER 200 MINUTES
                          </span>
                        </td>
                      </tr>

                      {sortedBeitarPlayers.filter(p => {
                        const minutes = p.MinIncET || p.Min || 0
                        return minutes <= 200
                      }).map((player, index) =>
                        renderPlayerRow(player, index, true)
                      )}
                    </>
                  )}
                </>
              ) : (
                // For match reports, filter by GS (starting 11 vs substitutes)
                <>
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
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* 4. Opponent Players */}
        {(highlightOpponent || (selectedOpponent && selectedOpponent !== "All Teams")) && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            color: '#FFD700',
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            {highlightOpponent || selectedOpponent} Players
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>RANK</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '14px', fontWeight: '700', width: '120px' }}>PLAYER</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                {!isSeasonReport && <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>MPM</th>}
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>SPEED</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>DISTANCE</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>INTENSITY %</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '14px', fontWeight: '700' }}>ALMOG</th>
              </tr>
            </thead>
            <tbody>
              {isSeasonReport ? (
                // For season reports, split by minutes played (over 200 vs under 200)
                <>
                  {sortedOpponentPlayers.filter(p => {
                    const minutes = p.MinIncET || p.Min || 0
                    return minutes > 200
                  }).map((player, index) =>
                    renderPlayerRow(player, index, false)
                  )}

                  {sortedOpponentPlayers.filter(p => {
                    const minutes = p.MinIncET || p.Min || 0
                    return minutes <= 200
                  }).length > 0 && (
                    <>
                      <tr>
                        <td colSpan={9} style={{
                          padding: '12px 8px',
                          textAlign: 'center',
                          background: 'rgba(139, 69, 19, 0.2)',
                          borderTop: '2px solid rgba(139, 69, 19, 0.5)',
                          borderBottom: '2px solid rgba(139, 69, 19, 0.5)'
                        }}>
                          <span style={{ color: '#D2691E', fontWeight: '700', fontSize: '14px' }}>
                            PLAYERS UNDER 200 MINUTES
                          </span>
                        </td>
                      </tr>

                      {sortedOpponentPlayers.filter(p => {
                        const minutes = p.MinIncET || p.Min || 0
                        return minutes <= 200
                      }).map((player, index) =>
                        renderPlayerRow(player, index, true)
                      )}
                    </>
                  )}
                </>
              ) : (
                // For match reports, filter by GS (starting 11 vs substitutes)
                <>
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
                </>
              )}
            </tbody>
          </table>
          </div>
        </div>
        )}


      </div>
    </div>
  )
}
