'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, RefreshCw, AlertCircle, Download, Filter, Users, Trophy, Target } from 'lucide-react'
import html2canvas from 'html2canvas'
import { CSVReportService } from '../../lib/csvReportService'

interface PlayerAggregateData {
  player: string
  playerFullName: string
  team: string
  position: string
  totalMinutes: number
  totalMatches: number
  
  // Raw totals
  totalDistance: number
  totalFirstHalf: number
  totalSecondHalf: number
  totalHSRDistance: number
  totalSprintDistance: number
  
  // Normalized (per 90 min)
  normalizedDistance: number
  intensity: number
  averageSpeed: number
  almogScore: number
}

interface TopPlayersData {
  season: string
  totalMatches: number
  totalPlayers: number
  playersData: PlayerAggregateData[]
  matchesList: Array<{
    matchday: string
    opponent: string
    date?: string
  }>
}

export default function TopPlayersReport() {
  const [playersData, setPlayersData] = useState<TopPlayersData | null>(null)
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerAggregateData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedSeason, setSelectedSeason] = useState('2025-2026')
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['2025-2026'])
  
  // Filters
  const [minMinutes, setMinMinutes] = useState(90) // Minimum 90 minutes played
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [availablePositions, setAvailablePositions] = useState<string[]>([])
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('almogScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAvailableSeasons()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.multi-select-dropdown')) {
        setShowTeamDropdown(false)
        setShowPositionDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (selectedSeason && availableSeasons.length > 0 && availableSeasons.includes(selectedSeason)) {
      loadTopPlayers()
    }
  }, [selectedSeason, availableSeasons])

  useEffect(() => {
    if (playersData) {
      applyFilters()
    }
  }, [playersData, minMinutes, selectedTeams, selectedPositions, sortColumn, sortDirection])

  const loadAvailableSeasons = async () => {
    try {
      const result = await CSVReportService.getSeasonsList()
      if (result.success && result.data && result.data.length > 0) {
        setAvailableSeasons(result.data)
        // Set the first available season as default if current selection isn't available
        if (!result.data.includes(selectedSeason)) {
          setSelectedSeason(result.data[0])
        }
      } else {
        // No seasons found
        setAvailableSeasons([])
        setError('No match reports found. Please upload some match data first.')
      }
    } catch (error) {
      console.error('Error loading seasons:', error)
      setError('Failed to load available seasons')
    }
  }

  const loadTopPlayers = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      if (availableSeasons.length === 0) {
        setError('No match reports found. Please upload match data in the League section first.')
        return
      }

      const result = await CSVReportService.getTeamAveragesBySeason(selectedSeason)
      
      if (!result.success || !result.data) {
        const errorMsg = result.error || 'Failed to load player data'
        if (errorMsg.includes('No reports found for season')) {
          setError(`No match reports found for ${selectedSeason} season. Please upload match data in the League section or select a different season.`)
        } else {
          setError(errorMsg)
        }
        return
      }

      const aggregatedData = result.data.aggregatedData
      const playersOnly = aggregatedData.filter((item: any) => item.Position !== 'TEAM')
      
      // Process player data with 90-minute normalization
      const processedPlayers: PlayerAggregateData[] = playersOnly.map((player: any) => {
        // Calculate TOTAL minutes across all matches (average * matches played)
        const matchesPlayed = player.matchesPlayed || 1
        const avgMinutes = player.MinIncET || player.Min || 0
        const totalMinutes = avgMinutes * matchesPlayed
        
        // For normalization, we need average distance per match, not total
        const avgDistancePerMatch = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
        const totalHSRDistance = (player.FirstHalfDistHSRun || 0) + (player.ScndHalfDistHSRun || 0)
        const totalSprintDistance = (player.FirstHalfDistSprint || 0) + (player.ScndHalfDistSprint || 0)
        
        // 90-minute normalization (using average distance and average minutes per match)
        const normalizedDistance = avgMinutes > 0 ? (avgDistancePerMatch / avgMinutes) * 90 : 0
        
        // Intensity calculation: (HSR + Sprint) / Total Distance * 100
        const intensity = avgDistancePerMatch > 0 ? ((totalHSRDistance + totalSprintDistance) / avgDistancePerMatch * 100) : 0
        
        // Maximum speed (not average)
        const maxSpeed = player.TopSpeed || (typeof player.KMHSPEED === 'string' ? parseFloat(player.KMHSPEED) : (player.KMHSPEED || 0))
        
        return {
          player: player.Player,
          playerFullName: player.playerFullName || player.Player,
          team: player.teamName || player.newestTeam || 'Unknown',
          position: player.Position || player.pos || 'Unknown',
          totalMinutes,  // This is now TOTAL minutes across all matches
          totalMatches: player.matchesPlayed || 0,
          totalDistance: avgDistancePerMatch * matchesPlayed,  // Total distance across all matches
          totalFirstHalf: player.DistanceRunFirstHalf || 0,
          totalSecondHalf: player.DistanceRunScndHalf || 0,
          totalHSRDistance,
          totalSprintDistance,
          normalizedDistance,
          intensity,
          averageSpeed: maxSpeed,  // Using max speed instead of average
          almogScore: 0 // Will calculate after normalization
        }
      })

      // Calculate ALMOG scores (40% intensity, 30% speed, 30% distance)
      const distances = processedPlayers.map(p => p.normalizedDistance).filter(d => d > 0)
      const intensities = processedPlayers.map(p => p.intensity).filter(i => i > 0)
      const speeds = processedPlayers.map(p => p.averageSpeed).filter(s => s > 0)
      
      const minDistance = Math.min(...distances)
      const maxDistance = Math.max(...distances)
      const minIntensity = Math.min(...intensities)
      const maxIntensity = Math.max(...intensities)
      const minSpeed = Math.min(...speeds)
      const maxSpeed = Math.max(...speeds)

      processedPlayers.forEach(player => {
        const distanceScore = maxDistance > minDistance ? 
          ((player.normalizedDistance - minDistance) / (maxDistance - minDistance)) * 100 : 50
        const intensityScore = maxIntensity > minIntensity ? 
          ((player.intensity - minIntensity) / (maxIntensity - minIntensity)) * 100 : 50
        const speedScore = maxSpeed > minSpeed ? 
          ((player.averageSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100 : 50
        
        player.almogScore = (intensityScore * 0.4) + (speedScore * 0.3) + (distanceScore * 0.3)
      })

      // Extract unique teams and positions for filters
      const teams = Array.from(new Set(processedPlayers.map(p => p.team))).sort()
      const positions = Array.from(new Set(processedPlayers.map(p => p.position))).sort()
      
      setAvailableTeams(teams)
      setAvailablePositions(positions)

      setPlayersData({
        season: selectedSeason,
        totalMatches: result.data.totalMatches,
        totalPlayers: processedPlayers.length,
        playersData: processedPlayers,
        matchesList: result.data.matchesList
      })

    } catch (error: any) {
      console.error('Error loading top players:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    if (!playersData) return
    
    let filtered = playersData.playersData.filter(player => {
      // Filter by minimum minutes
      if (player.totalMinutes < minMinutes) return false
      
      // Filter by teams (multiple selection)
      if (selectedTeams.length > 0 && !selectedTeams.includes(player.team)) return false
      
      // Filter by positions (multiple selection)
      if (selectedPositions.length > 0 && !selectedPositions.includes(player.position)) return false
      
      return true
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof PlayerAggregateData]
      let bValue: any = b[sortColumn as keyof PlayerAggregateData]
      
      // Handle string comparisons for player names and team names
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (sortDirection === 'asc') {
        if (aValue < bValue) return -1
        if (aValue > bValue) return 1
        return 0
      } else {
        if (aValue > bValue) return -1
        if (aValue < bValue) return 1
        return 0
      }
    })
    
    setFilteredPlayers(filtered)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to descending for numerical values, ascending for text
      setSortColumn(column)
      const isNumeric = ['totalMinutes', 'normalizedDistance', 'intensity', 'averageSpeed', 'almogScore'].includes(column)
      setSortDirection(isNumeric ? 'desc' : 'asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const handleDownloadPNG = async () => {
    if (!exportRef.current) return
    
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0b0b0f',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      })
      
      const link = document.createElement('a')
      link.download = `FCBJ-TopPlayers-${selectedSeason}.png`
      link.href = canvas.toDataURL()
      link.click()
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const formatDistance = (meters: number): string => {
    // Always show in meters with comma separator
    return `${Math.round(meters).toLocaleString()}m`
  }

  const formatSpeed = (speed: number): string => {
    return `${speed.toFixed(1)}`
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <RefreshCw className="animate-spin" size={32} color="#FFD700" />
        <p style={{ color: '#FFD700', marginTop: '16px' }}>Loading top players data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertCircle size={32} color="#ef4444" />
        <p style={{ color: '#ef4444', marginTop: '16px' }}>Error: {error}</p>
        <button 
          onClick={loadTopPlayers}
          style={{
            backgroundColor: '#22c55e',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            marginTop: '16px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!playersData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--secondary-text)' }}>No player data available</p>
      </div>
    )
  }

  return (
    <div className="top-players-report">
      {/* Header Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <div>
          <h2 style={{ color: '#FFD700', fontSize: '24px', margin: 0 }}>
            Top Players Report
          </h2>
          <p style={{ color: 'var(--secondary-text)', margin: '8px 0 0 0' }}>
            Player performance normalized per 90 minutes
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
            onClick={loadTopPlayers}
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

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', position: 'relative', overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
          <Filter size={18} color="#FFD700" />
          <h3 style={{ color: '#FFD700', fontSize: '16px', margin: 0 }}>Filters</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', position: 'relative' }}>
          <div>
            <label style={{ color: 'var(--secondary-text)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Min Minutes Played
            </label>
            <input
              type="number"
              min="0"
              max="2000"
              value={minMinutes}
              onChange={(e) => setMinMinutes(parseInt(e.target.value) || 0)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '14px',
                width: '100px'
              }}
            />
          </div>
          
          <div style={{ position: 'relative' }} className="multi-select-dropdown">
            <label style={{ color: 'var(--secondary-text)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Team
            </label>
            <div
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '14px',
                minWidth: '150px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{selectedTeams.length === 0 ? 'All Teams' : `${selectedTeams.length} selected`}</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </div>
            {showTeamDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: '200px',
                background: '#1a1a1a',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '4px',
                marginTop: '4px',
                maxHeight: '250px',
                overflowY: 'auto',
                zIndex: 9999,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
              }}>
                <div
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    background: selectedTeams.length === 0 ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
                  }}
                  onClick={() => setSelectedTeams([])}
                >
                  <label style={{ cursor: 'pointer', display: 'block', color: '#fff', fontSize: '13px' }}>
                    Select All
                  </label>
                </div>
                {availableTeams.map(team => (
                  <div
                    key={team}
                    style={{
                      padding: '6px 8px',
                      cursor: 'pointer',
                      background: selectedTeams.includes(team) ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
                    }}
                    onClick={() => {
                      if (selectedTeams.includes(team)) {
                        setSelectedTeams(selectedTeams.filter(t => t !== team))
                      } else {
                        setSelectedTeams([...selectedTeams, team])
                      }
                    }}
                  >
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#fff', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(team)}
                        onChange={() => {}}
                        style={{ marginRight: '6px' }}
                      />
                      {team}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ position: 'relative' }} className="multi-select-dropdown">
            <label style={{ color: 'var(--secondary-text)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              Position
            </label>
            <div
              onClick={() => setShowPositionDropdown(!showPositionDropdown)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '14px',
                minWidth: '120px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{selectedPositions.length === 0 ? 'All Positions' : `${selectedPositions.length} selected`}</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </div>
            {showPositionDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: '180px',
                background: '#1a1a1a',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '4px',
                marginTop: '4px',
                maxHeight: '250px',
                overflowY: 'auto',
                zIndex: 9999,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
              }}>
                <div
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    background: selectedPositions.length === 0 ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
                  }}
                  onClick={() => setSelectedPositions([])}
                >
                  <label style={{ cursor: 'pointer', display: 'block', color: '#fff', fontSize: '13px' }}>
                    Select All
                  </label>
                </div>
                {availablePositions.map(position => (
                  <div
                    key={position}
                    style={{
                      padding: '6px 8px',
                      cursor: 'pointer',
                      background: selectedPositions.includes(position) ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
                    }}
                    onClick={() => {
                      if (selectedPositions.includes(position)) {
                        setSelectedPositions(selectedPositions.filter(p => p !== position))
                      } else {
                        setSelectedPositions([...selectedPositions, position])
                      }
                    }}
                  >
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#fff', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPositions.includes(position)}
                        onChange={() => {}}
                        style={{ marginRight: '6px' }}
                      />
                      {position}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--secondary-text)' }}>
          Showing {filteredPlayers.length} of {playersData.totalPlayers} players
        </div>
      </div>

      {/* Export Container */}
      <div ref={exportRef} style={{ 
        background: 'var(--primary-bg)',
        padding: '20px',
        borderRadius: '12px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        
        {/* Report Header */}
        <div style={{ textAlign: 'center', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <img 
            src="/beitar-logo.png" 
            alt="Beitar Jerusalem" 
            style={{ 
              height: '40px',
              width: 'auto'
            }}
          />
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '22px',
            fontWeight: '700',
            margin: 0,
            letterSpacing: '1px'
          }}>
            FCBJ DATA - TOP PLAYERS
          </h1>
        </div>


        {/* Top Players Table */}
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ 
            color: '#FFD700', 
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            שחקנים מובילים (90 דקות)
          </h2>
          
          <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
            <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                <th style={{ padding: '4px 2px', textAlign: 'center', color: '#FFD700', fontSize: '9px' }}>RANK</th>
                <th 
                  onClick={() => handleSort('playerFullName')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'left', 
                    color: '#FFD700', 
                    fontSize: '9px', 
                    width: '100px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  PLAYER {getSortIcon('playerFullName')}
                </th>
                <th 
                  onClick={() => handleSort('team')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  TEAM {getSortIcon('team')}
                </th>
                <th 
                  onClick={() => handleSort('position')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  POS {getSortIcon('position')}
                </th>
                <th 
                  onClick={() => handleSort('totalMinutes')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  MIN {getSortIcon('totalMinutes')}
                </th>
                <th 
                  onClick={() => handleSort('normalizedDistance')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  DISTANCE {getSortIcon('normalizedDistance')}
                </th>
                <th 
                  onClick={() => handleSort('intensity')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  INTENSITY% {getSortIcon('intensity')}
                </th>
                <th 
                  onClick={() => handleSort('averageSpeed')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  SPEED {getSortIcon('averageSpeed')}
                </th>
                <th 
                  onClick={() => handleSort('almogScore')}
                  style={{ 
                    padding: '4px 2px', 
                    textAlign: 'center', 
                    color: '#FFD700', 
                    fontSize: '9px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  ALMOG {getSortIcon('almogScore')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, index) => {
                const isBeitarPlayer = player.team.toLowerCase().includes('beitar')
                
                return (
                  <tr 
                    key={`${player.player}-${player.team}`}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: isBeitarPlayer ? 'rgba(255, 215, 0, 0.15)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#FFD700', fontWeight: '600', fontSize: '12px' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '100px', fontSize: '11px' }}>
                      {player.playerFullName}
                      <div style={{ fontSize: '9px', color: '#888', marginTop: '1px' }}>
                        {player.totalMatches} games
                      </div>
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#fff', fontSize: '10px' }}>
                      {player.team}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#fff', fontSize: '10px' }}>
                      {player.position}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#fff', fontSize: '11px' }}>
                      {Math.round(player.totalMinutes)}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>
                      {formatDistance(player.normalizedDistance)}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#fff', fontSize: '11px' }}>
                      {player.intensity.toFixed(1)}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#FFD700', fontSize: '11px', fontWeight: '600' }}>
                      {formatSpeed(player.averageSpeed)}
                    </td>
                    <td style={{ padding: '6px 2px', textAlign: 'center', color: '#FFD700', fontSize: '13px', fontWeight: '700' }}>
                      {player.almogScore.toFixed(1)}
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