'use client'

import React, { useState, useEffect } from 'react'
import MatchReports from './MatchReports'
import WeeklyAnalysis from './WeeklyAnalysis'
import LatestDataBand from './LatestDataBand'
import BarChartView from './BarChartView'
import CoachNutritionTab from './CoachNutritionTab'
import MatchdayReport from './MatchdayReport'
import MatchGPSLeagueTab from './MatchGPSLeagueTab'
import IntensityView from './IntensityView'
import DistanceView from './DistanceView'
import CornersDashboardView from './CornersDashboardView'
import SoccerPitch from './SoccerPitch'
import OptaDataUploader from './OptaDataUploader'
import StatsComparison from './StatsComparison'
import { fetchTeamMatchStatistics, fetchTeamMatchMetadata, fetchAggregatedTeamStatistics, checkAggregatedDataExists } from '@/lib/teamMatchService'
import { fetchAllTeamsData } from '@/lib/opponentDataService'
import { BarChart3, Trophy, Scale, FileText, Activity, Zap, Route, Target, Users, Upload } from 'lucide-react'

// Matchup Analysis Interface Component
function MatchupAnalysisInterface() {
  const [availablePlayers, setAvailablePlayers] = React.useState<any[]>([])
  const [loadingPlayers, setLoadingPlayers] = React.useState(true)
  const [teamFilter, setTeamFilter] = React.useState<string>('all')
  const [positionFilter, setPositionFilter] = React.useState<string>('all')
  const [leftTeam, setLeftTeam] = React.useState<string>('Beitar Jerusalem')
  const [rightTeam, setRightTeam] = React.useState<string>('')
  const [assignedPositions, setAssignedPositions] = React.useState<{[key: string]: any}>({})
  const [comparisonMode, setComparisonMode] = React.useState<'assignment' | '1v1' | 'unit-vs-unit' | 'side-vs-side' | 'cross-unit'>('assignment')
  const [selectedUnit, setSelectedUnit] = React.useState<'goalkeeper' | 'defense' | 'midfield' | 'attack' | 'total' | 'left' | 'middle' | 'right' | 'def-vs-att' | 'att-vs-def'>('midfield')
  const [selectedPlayers, setSelectedPlayers] = React.useState<any[]>([])
  const [highlightedPlayers, setHighlightedPlayers] = React.useState<any[]>([]) // Individual players to highlight on pitch
  const [showUploader, setShowUploader] = React.useState(false)

  // Function to load players
  const loadPlayers = async () => {
    try {
      setLoadingPlayers(true)
      const { fetchAllPlayersForMatchup } = await import('@/lib/playerService')
      const players = await fetchAllPlayersForMatchup()
      setAvailablePlayers(players)
    } catch (err) {
      console.error('Error loading players:', err)
      setAvailablePlayers([])
    } finally {
      setLoadingPlayers(false)
    }
  }

  // Fetch players on component mount
  React.useEffect(() => {
    loadPlayers()
  }, [])

  // Auto-compare teams in different modes
  React.useEffect(() => {
    console.log('🚀 Auto-compare effect triggered:', { comparisonMode, selectedUnit, leftTeam, rightTeam, playersCount: availablePlayers.length })

    if (!leftTeam || !rightTeam || availablePlayers.length === 0) {
      console.log('❌ Early return - missing data:', { leftTeam, rightTeam, playersCount: availablePlayers.length })
      return
    }

    const leftTeamPlayers = availablePlayers.filter(p => p.actual_team_name === leftTeam)
    const rightTeamPlayers = availablePlayers.filter(p => p.actual_team_name === rightTeam)

    console.log('👥 Team players found:', {
      leftTeam, leftCount: leftTeamPlayers.length,
      rightTeam, rightCount: rightTeamPlayers.length
    })

    if (leftTeamPlayers.length === 0 || rightTeamPlayers.length === 0) {
      console.log('❌ No players found for comparison')
      return
    }

    if (comparisonMode === 'side-vs-side') {
      if (selectedUnit === 'left') {
        // Left side: Home LB+LW vs Away RB+RW
        const homeLBLW = getFieldPositionPlayers(leftTeamPlayers, ['LB', 'LW', 'LWB'])
        const awayRBRW = getFieldPositionPlayers(rightTeamPlayers, ['RB', 'RW', 'RWB'])

        console.log('🔵 LEFT SIDE Selection:', {
          homeLBLW: homeLBLW.map(p => ({ name: p.name, position: p.position, team: p.actual_team_name })),
          awayRBRW: awayRBRW.map(p => ({ name: p.name, position: p.position, team: p.actual_team_name }))
        })

        if (homeLBLW.length > 0 && awayRBRW.length > 0) {
          setSelectedPlayers([
            createPositionGroup(homeLBLW, `${leftTeam} Left Side`, 'LB+LW'),
            createPositionGroup(awayRBRW, `${rightTeam} Right Side`, 'RB+RW')
          ])
          setHighlightedPlayers([...homeLBLW, ...awayRBRW])
        }
      } else if (selectedUnit === 'middle') {
        // Middle: CM1+CM2+CM3 vs opponent midfield
        const homeMidfield = getFieldPositionPlayers(leftTeamPlayers, ['CM', 'CDM', 'CAM', 'DM', 'AM'])
        const awayMidfield = getFieldPositionPlayers(rightTeamPlayers, ['CM', 'CDM', 'CAM', 'DM', 'AM'])

        if (homeMidfield.length > 0 && awayMidfield.length > 0) {
          setSelectedPlayers([
            createPositionGroup(homeMidfield, `${leftTeam} Midfield`, 'CM1+CM2+CM3'),
            createPositionGroup(awayMidfield, `${rightTeam} Midfield`, 'CM1+CM2+CM3')
          ])
          setHighlightedPlayers([...homeMidfield, ...awayMidfield])
        }
      } else if (selectedUnit === 'right') {
        // Right side: Home RB+RW vs Away LB+LW
        const homeRBRW = getFieldPositionPlayers(leftTeamPlayers, ['RB', 'RW', 'RWB'])
        const awayLBLW = getFieldPositionPlayers(rightTeamPlayers, ['LB', 'LW', 'LWB'])

        if (homeRBRW.length > 0 && awayLBLW.length > 0) {
          setSelectedPlayers([
            createPositionGroup(homeRBRW, `${leftTeam} Right Side`, 'RB+RW'),
            createPositionGroup(awayLBLW, `${rightTeam} Left Side`, 'LB+LW')
          ])
          setHighlightedPlayers([...homeRBRW, ...awayLBLW])
        }
      }
    } else if (comparisonMode === 'cross-unit') {
      // Cross unit works like unit-vs-unit but compares different units
      // Let the SoccerPitch component handle the visual rendering with opacity
      if (selectedUnit === 'def-vs-att') {
        // Home Defense vs Away Attack - create unit totals for stats comparison
        const homeDefense = leftTeamPlayers.filter(p => p.unit === 'defense')
        const awayAttack = rightTeamPlayers.filter(p => p.unit === 'attack')

        if (homeDefense.length > 0 && awayAttack.length > 0) {
          import('@/lib/playerService').then(({ calculateUnitTotals }) => {
            const homeDefenseTotal = calculateUnitTotals(homeDefense)
            const awayAttackTotal = calculateUnitTotals(awayAttack)

            setSelectedPlayers([homeDefenseTotal, awayAttackTotal])
          })
        }
      } else if (selectedUnit === 'att-vs-def') {
        // Home Attack vs Away Defense
        const homeAttack = leftTeamPlayers.filter(p => p.unit === 'attack')
        const awayDefense = rightTeamPlayers.filter(p => p.unit === 'defense')

        if (homeAttack.length > 0 && awayDefense.length > 0) {
          import('@/lib/playerService').then(({ calculateUnitTotals }) => {
            const homeAttackTotal = calculateUnitTotals(homeAttack)
            const awayDefenseTotal = calculateUnitTotals(awayDefense)

            setSelectedPlayers([homeAttackTotal, awayDefenseTotal])
          })
        }
      }
    }
  }, [comparisonMode, leftTeam, rightTeam, selectedUnit, availablePlayers])

  // Helper function to calculate total stats for a team
  const calculateTeamTotalStats = (players: any[]) => {
    if (players.length === 0) {
      return { duels: 0, passes: 0, intensity: 0, xG: 0, distance: 0 }
    }

    const totals = players.reduce((acc, player) => {
      const stats = player.stats || {}
      return {
        duels: acc.duels + (stats.duels || 0),
        passes: acc.passes + (stats.passes || 0),
        intensity: acc.intensity + (stats.intensity || 0),
        xG: acc.xG + (stats.xG || 0),
        distance: acc.distance + (stats.distance || 0)
      }
    }, { duels: 0, passes: 0, intensity: 0, xG: 0, distance: 0 })

    // For percentage-based stats, calculate averages
    return {
      duels: totals.duels,
      passes: totals.passes,
      intensity: totals.intensity / players.length, // Average intensity
      xG: totals.xG,
      distance: totals.distance
    }
  }

  // Helper function to get players by field positions
  const getFieldPositionPlayers = (players: any[], positions: string[]) => {
    console.log('🔍 Searching for positions:', positions)
    console.log('🔍 Available players:', players.map(p => ({ name: p.name, position: p.position })))

    const filtered = players.filter(player => {
      const position = player.position?.toUpperCase() || ''
      // Use exact match or word boundary to avoid "RW" matching "FoRWard"
      const matches = positions.some(pos => {
        const posUpper = pos.toUpperCase()
        // Check if position equals the target or contains it as a separate word
        return position === posUpper ||
               position.split(/[\s,/-]+/).includes(posUpper) ||
               new RegExp(`\\b${posUpper}\\b`).test(position)
      })
      if (matches) {
        console.log(`✅ Player ${player.name} (${player.position}) matches position ${positions}`)
      }
      return matches
    })

    console.log('🎯 Filtered players:', filtered.map(p => ({ name: p.name, position: p.position })))
    return filtered
  }

  // Helper function to create a position group for comparison
  const createPositionGroup = (players: any[], groupName: string, positionLabel: string) => {
    return {
      id: `group-${groupName.replace(/\s+/g, '-').toLowerCase()}`,
      name: groupName,
      position: positionLabel,
      unit: 'group',
      team: groupName.includes(leftTeam) ? 'left' : 'right',
      actual_team_name: groupName.includes(leftTeam) ? leftTeam : rightTeam,
      stats: calculateTeamTotalStats(players),
      playerCount: players.length
    }
  }

  const getUniqueTeamNames = () => {
    const teamNames = availablePlayers
      .map(p => p.actual_team_name)
      .filter(t => t && t !== 'Unknown Team')
    return Array.from(new Set(teamNames)).sort()
  }

  const getUniquePositions = () => {
    const positions = availablePlayers
      .map(p => p.position)
      .filter(p => p && p !== 'Unknown')
    return Array.from(new Set(positions)).sort()
  }

  const getFilteredPlayers = () => {
    let filtered = availablePlayers

    if (teamFilter !== 'all') {
      filtered = filtered.filter(p => p.actual_team_name === teamFilter)
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter(p => p.position === positionFilter)
    }

    return filtered
  }

  const getModalFilteredPlayers = () => {
    if (!selectedPositionForAssignment) return []

    const isLeftPosition = selectedPositionForAssignment.startsWith('left-')
    const isRightPosition = selectedPositionForAssignment.startsWith('right-')

    let filtered = availablePlayers

    if (isLeftPosition && leftTeam) {
      filtered = filtered.filter(p => p.actual_team_name === leftTeam)
    } else if (isRightPosition && rightTeam) {
      filtered = filtered.filter(p => p.actual_team_name === rightTeam)
    }

    return filtered
  }

  const handlePlayerClick = (player: any) => {
    if (comparisonMode === '1v1') {
      const otherTeam = player.team === 'beitar' ? 'opponent' : 'beitar'
      const currentFromOtherTeam = selectedPlayers.find(p => p.team === otherTeam)
      const currentFromSameTeam = selectedPlayers.find(p => p.team === player.team)

      let newSelection = []
      if (currentFromSameTeam) {
        newSelection = selectedPlayers.filter(p => p.team !== player.team)
        newSelection.push(player)
      } else {
        newSelection = [...selectedPlayers.filter(p => p.team === otherTeam), player]
      }

      setSelectedPlayers(newSelection.slice(0, 2))
    }
  }

  const [selectedPositionForAssignment, setSelectedPositionForAssignment] = React.useState<string | null>(null)
  const [showPlayerModal, setShowPlayerModal] = React.useState(false)
  const [modalPosition, setModalPosition] = React.useState<{x: number, y: number}>({x: 0, y: 0})

  const handlePlayerAssignment = (positionKey: string, player: any, event?: React.MouseEvent) => {
    setSelectedPositionForAssignment(positionKey)

    // Show modal at click position
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      setModalPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })
    }
    setShowPlayerModal(true)
    console.log('Position selected for assignment:', positionKey)
  }

  const assignPlayerToPosition = (player: any) => {
    if (selectedPositionForAssignment) {
      // Determine which team this position belongs to
      const isLeftPosition = selectedPositionForAssignment.startsWith('left-')
      const isRightPosition = selectedPositionForAssignment.startsWith('right-')

      // Check if player belongs to the correct team based on position
      let canAssign = false
      if (isLeftPosition) {
        // Left positions should be assigned players from leftTeam
        canAssign = player.actual_team_name === leftTeam
      } else if (isRightPosition) {
        // Right positions should be assigned players from rightTeam
        canAssign = player.actual_team_name === rightTeam
      }

      if (canAssign) {
        setAssignedPositions(prev => ({
          ...prev,
          [selectedPositionForAssignment]: player
        }))
        setSelectedPositionForAssignment(null) // Clear selection after assignment
        setShowPlayerModal(false) // Close modal
        console.log('Player assigned:', player.name, 'to position:', selectedPositionForAssignment)
      } else {
        // Show warning if trying to assign wrong team
        const expectedTeam = isLeftPosition ? leftTeam : rightTeam
        console.warn(`Cannot assign ${player.actual_team_name} player to ${isLeftPosition ? 'left' : 'right'} team position. Expected: ${expectedTeam}`)
        alert(`This position requires a player from ${expectedTeam}. Selected player is from ${player.actual_team_name}.`)
      }
    }
  }

  const handle1v1Selection = React.useCallback((players: any[]) => {
    // Add safety check to prevent React DOM errors
    if (comparisonMode === '1v1' && Array.isArray(players)) {
      setSelectedPlayers(players)
    }
  }, [comparisonMode])


  const getBeitarPlayers = () => {
    return availablePlayers.filter(p => p.team === 'beitar')
  }

  const getOpponentPlayers = () => {
    return availablePlayers.filter(p => p.team === 'opponent')
  }

  if (loadingPlayers) {
    return (
      <div style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ color: '#FFD700', fontSize: '18px', fontWeight: '600' }}>
          Loading players...
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 215, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#FFD700' }}>
            🏆 Matchup Analysis
          </h2>

          {/* Upload Data Button */}
          <button
            onClick={() => setShowUploader(!showUploader)}
            style={{
              background: showUploader
                ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                : 'rgba(255, 255, 255, 0.1)',
              color: showUploader ? '#000' : '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Upload size={14} />
            Upload Data
          </button>
        </div>

        {/* Simple Control Panel */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '6px',
          padding: '12px',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          marginBottom: '12px'
        }}>
          {/* Team Selection */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#FFD700', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                Home Team
              </label>
              <select
                value={leftTeam}
                onChange={(e) => setLeftTeam(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              >
                <option value="Beitar Jerusalem">Beitar Jerusalem</option>
                {getUniqueTeamNames().map(teamName => (
                  <option key={teamName} value={teamName} style={{ background: '#1a1a1a' }}>
                    {teamName}
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              color: '#FFD700',
              fontSize: '12px',
              fontWeight: '600',
              padding: '0 8px'
            }}>VS</div>

            <div style={{ flex: 1 }}>
              <label style={{ color: '#ef4444', fontSize: '12px', marginBottom: '4px', display: 'block' }}>
                Away Team
              </label>
              <select
                value={rightTeam}
                onChange={(e) => setRightTeam(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              >
                <option value="">Select Away Team</option>
                {getUniqueTeamNames().map(teamName => (
                  <option key={teamName} value={teamName} style={{ background: '#1a1a1a' }}>
                    {teamName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Analysis Mode Selection */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {[
              { mode: 'assignment', label: 'Assign' },
              { mode: '1v1', label: '1v1' },
              { mode: 'unit-vs-unit', label: 'Unit vs Unit' },
              { mode: 'side-vs-side', label: 'Side vs Side' },
              { mode: 'cross-unit', label: 'Cross Unit' }
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => {
                  React.startTransition(() => {
                    setComparisonMode(mode as any)
                    if (mode === '1v1' || mode === 'unit-vs-unit' || mode === 'side-vs-side' || mode === 'cross-unit') {
                      setSelectedPlayers([])
                      setHighlightedPlayers([])
                      // For cross-unit and side-vs-side, ensure we have an opponent team and set default units
                      if ((mode === 'side-vs-side' || mode === 'cross-unit') && !rightTeam) {
                        console.log('⚠️ Setting default opponent team for comparison mode')
                        const teamNames = getUniqueTeamNames()
                        const defaultOpponent = teamNames.find(name => name !== leftTeam)
                        if (defaultOpponent) {
                          setRightTeam(defaultOpponent)
                        }
                      }
                      // Set default units for new modes
                      if (mode === 'side-vs-side') {
                        setSelectedUnit('left')
                      } else if (mode === 'cross-unit') {
                        setSelectedUnit('def-vs-att')
                      }
                    }
                  })
                }}
                style={{
                  background: comparisonMode === mode
                    ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: comparisonMode === mode ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Unit Selection for Different Comparison Modes */}
          {comparisonMode === 'unit-vs-unit' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { value: 'goalkeeper', label: 'GK' },
                { value: 'defense', label: 'DEF' },
                { value: 'midfield', label: 'MID' },
                { value: 'attack', label: 'ATT' }
              ].map(unit => (
                <button
                  key={unit.value}
                  onClick={() => setSelectedUnit(unit.value as any)}
                  style={{
                    background: selectedUnit === unit.value
                      ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: selectedUnit === unit.value ? '#fff' : '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          )}

          {/* Side vs Side - Field Position Selection */}
          {comparisonMode === 'side-vs-side' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { value: 'left', label: 'Left Side (LB+LW vs RB+RW)' },
                { value: 'middle', label: 'Middle (CM1+CM2+CM3)' },
                { value: 'right', label: 'Right Side (RB+RW vs LB+LW)' }
              ].map(unit => (
                <button
                  key={unit.value}
                  onClick={() => setSelectedUnit(unit.value as any)}
                  style={{
                    background: selectedUnit === unit.value
                      ? 'linear-gradient(135deg, #10b981, #047857)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: selectedUnit === unit.value ? '#fff' : '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          )}

          {/* Cross Unit - Defense vs Attack */}
          {comparisonMode === 'cross-unit' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { value: 'def-vs-att', label: 'Home DEF vs Away ATT' },
                { value: 'att-vs-def', label: 'Home ATT vs Away DEF' }
              ].map(unit => (
                <button
                  key={unit.value}
                  onClick={() => setSelectedUnit(unit.value as any)}
                  style={{
                    background: selectedUnit === unit.value
                      ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: selectedUnit === unit.value ? '#fff' : '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  {unit.label}
                </button>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Data Upload Section - Full Width */}
      {showUploader && (
        <div style={{
          marginBottom: '20px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid rgba(255, 215, 0, 0.2)'
        }}>
          <OptaDataUploader
            onUploadComplete={() => {
              // Reload players after successful upload
              loadPlayers()
              setShowUploader(false) // Hide uploader after successful upload
            }}
          />
        </div>
      )}

      {/* Main Content Area - Full Width */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
          <SoccerPitch
            beitarPlayers={getBeitarPlayers()}
            opponentPlayers={getOpponentPlayers()}
            selectedTeams={[]}
            selectedPlayers={comparisonMode === 'side-vs-side' ? highlightedPlayers : selectedPlayers}
            isAssignmentMode={comparisonMode === 'assignment'}
            comparisonMode={comparisonMode as any}
            selectedUnit={comparisonMode === 'cross-unit' ?
              (selectedUnit === 'def-vs-att' ? 'defense' : selectedUnit === 'att-vs-def' ? 'attack' : undefined) :
              (selectedUnit !== 'total' && selectedUnit !== 'left' && selectedUnit !== 'middle' && selectedUnit !== 'right' ? selectedUnit as any : undefined)
            }
            selectedSideMatchup={comparisonMode === 'side-vs-side' && (selectedUnit === 'left' || selectedUnit === 'middle' || selectedUnit === 'right') ? selectedUnit : null}
            leftTeam={leftTeam}
            rightTeam={rightTeam || "Select Opponent Team"}
            assignedPositions={assignedPositions}
            onPlayerAssignment={handlePlayerAssignment}
            on1v1Selection={handle1v1Selection}
          />

          {/* Stats Comparison Component - Below Pitch */}
          {(comparisonMode === '1v1' || comparisonMode === 'unit-vs-unit' || comparisonMode === 'side-vs-side' || comparisonMode === 'cross-unit') && (
            <StatsComparison
              comparisonMode={comparisonMode as any}
              selectedPlayers={selectedPlayers}
              selectedUnit={comparisonMode === 'cross-unit' ?
                (selectedUnit === 'def-vs-att' ? 'defense' : selectedUnit === 'att-vs-def' ? 'attack' : undefined) :
                (selectedUnit !== 'total' && selectedUnit !== 'left' && selectedUnit !== 'middle' && selectedUnit !== 'right' ? selectedUnit as any : undefined)
              }
              allPlayers={availablePlayers}
            />
          )}

          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(255, 215, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            color: '#FFD700',
            textAlign: 'center',
            maxWidth: '600px'
          }}>
            {comparisonMode === 'assignment' ? (
              <>
                <strong>🎯 Interactive Team Assignment System</strong>
                <br />
                1. Select teams in left panel 2. Click position placeholders on pitch 3. Choose player from modal
                {Object.keys(assignedPositions).length > 0 && (
                  <>
                    <br />
                    <button
                      onClick={() => setAssignedPositions({})}
                      style={{
                        marginTop: '8px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#fca5a5',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All Assignments
                    </button>
                  </>
                )}
              </>
            ) : comparisonMode === '1v1' ? (
              <>
                <strong>👥 1v1 Player Comparison</strong>
                <br />
                Click on assigned players on the pitch to compare them directly.
              </>
            ) : comparisonMode === 'unit-vs-unit' ? (
              <>
                <strong>⚽ Unit vs Unit Analysis</strong>
                <br />
                Analyzing {selectedUnit} units from both teams. Use the dropdown to switch units.
              </>
            ) : (
              <>
                <strong>🎯 Side vs Side Analysis</strong>
                <br />
                Click different areas of the pitch to compare position groups (top, middle, bottom).
              </>
            )}
          </div>
        </div>

      {/* Player Selection Modal */}
      {showPlayerModal && selectedPositionForAssignment && (
        <>
          {/* Modal Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => {
              setShowPlayerModal(false)
              setSelectedPositionForAssignment(null)
            }}
          >
            {/* Modal Content */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
                borderRadius: '12px',
                padding: '20px',
                maxWidth: '400px',
                maxHeight: '70vh',
                width: '90%',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
                paddingBottom: '12px'
              }}>
                <h3 style={{
                  margin: 0,
                  color: '#FFD700',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  🎯 Assign Player to {selectedPositionForAssignment}
                </h3>
                <button
                  onClick={() => {
                    setShowPlayerModal(false)
                    setSelectedPositionForAssignment(null)
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: '#fca5a5',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Team Info */}
              <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#93c5fd',
                textAlign: 'center'
              }}>
                {(() => {
                  const isLeftPosition = selectedPositionForAssignment.startsWith('left-')
                  const expectedTeam = isLeftPosition ? leftTeam : rightTeam
                  return `Showing ${expectedTeam} players only`
                })()}
              </div>

              {/* Player List */}
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {getModalFilteredPlayers().map(player => (
                  <div
                    key={player.id}
                    onClick={() => assignPlayerToPosition(player)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Player Photo */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {player.photo ? (
                        <img
                          src={player.photo}
                          alt={player.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            // Fallback to initials if image fails
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div style="color: #fff; font-size: 14px; font-weight: bold;">
                                  ${player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                              `
                            }
                          }}
                        />
                      ) : (
                        // Show initials if no photo available
                        <div style={{
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}>
                          {player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Player Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#fff',
                        marginBottom: '4px'
                      }}>
                        {player.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#cbd5e1'
                      }}>
                        {player.position} • {player.actual_team_name}
                      </div>
                    </div>
                  </div>
                ))}

                {getModalFilteredPlayers().length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '20px',
                    color: '#888',
                    fontSize: '14px'
                  }}>
                    No players available for this position
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function CoachDashboard() {
  const [activeCoachTab, setActiveCoachTab] = useState<'weekly-running' | 'match-reports' | 'nutrition' | 'match-stats' | 'match-gps-league' | 'training-gps' | 'corners' | 'matchup' | 'opponent-view'>('weekly-running')
  const [opponentViewData, setOpponentViewData] = useState<any[]>([])
  const [loadingOpponentView, setLoadingOpponentView] = useState(false)
  const [selectedOpponent, setSelectedOpponent] = useState<string>('')
  const [activeNutritionTab, setActiveNutritionTab] = useState<'by-player' | 'team-overview'>('by-player')
  const [activeTrainingTab, setActiveTrainingTab] = useState<'distance' | 'intensity'>('distance')
  const [availableMatches, setAvailableMatches] = useState<any[]>([])
  const [selectedMatchweek, setSelectedMatchweek] = useState<number | string | null>(null)
  const [matchStatsData, setMatchStatsData] = useState<any[]>([])
  const [loadingMatchStats, setLoadingMatchStats] = useState(false)
  const [aggregatedDataExists, setAggregatedDataExists] = useState(false)

  // Load available matches when component mounts or when match-stats tab is selected
  useEffect(() => {
    if (activeCoachTab === 'match-stats') {
      loadAvailableMatches()
    }
    if (activeCoachTab === 'opponent-view') {
      loadOpponentViewData()
    }
  }, [activeCoachTab])

  const loadOpponentViewData = async () => {
    setLoadingOpponentView(true)
    try {
      const data = await fetchAllTeamsData()
      setOpponentViewData(data)
    } catch (error) {
      console.error('Error loading opponent view data:', error)
    }
    setLoadingOpponentView(false)
  }

  const loadAvailableMatches = async () => {
    console.log('🔍 Loading available matches...')
    try {
      console.log('📊 Fetching team match metadata...')
      const matches = await fetchTeamMatchMetadata()
      console.log('✅ Team matches found:', matches)
      setAvailableMatches(matches.sort((a, b) => b.matchweek - a.matchweek)) // Sort by most recent first
      
      // Check if aggregated data exists
      console.log('🔍 Checking for aggregated data...')
      const hasAggregatedData = await checkAggregatedDataExists()
      console.log('✅ Aggregated data exists:', hasAggregatedData)
      setAggregatedDataExists(hasAggregatedData)
      
      // Auto-select the most recent match or aggregated data if available
      if (!selectedMatchweek) {
        if (hasAggregatedData) {
          console.log('🏆 Auto-selecting uploaded aggregated data')
          setSelectedMatchweek('uploaded-aggregated')
          loadUploadedAggregatedData()
        } else if (matches.length > 0) {
          const mostRecent = Math.max(...matches.map(m => m.matchweek))
          console.log('📈 Auto-selecting most recent match:', mostRecent)
          setSelectedMatchweek(mostRecent)
          loadMatchData(mostRecent)
        } else {
          console.log('⚠️ No matches or aggregated data found')
        }
      }
    } catch (error) {
      console.error('❌ Error loading available matches:', error)
    }
  }

  const loadMatchData = async (matchweek: number) => {
    setLoadingMatchStats(true)
    try {
      const data = await fetchTeamMatchStatistics(matchweek)
      setMatchStatsData(data)
    } catch (error) {
      console.error('Error loading match data:', error)
      setMatchStatsData([])
    }
    setLoadingMatchStats(false)
  }

  const loadAggregatedData = async () => {
    setLoadingMatchStats(true)
    try {
      // Get all team data and aggregate it
      const allTeamData = []
      const matchdayNumbers = Array.from(new Set(availableMatches.map(mw => mw.matchweek)))
      
      for (const matchweek of matchdayNumbers) {
        try {
          const data = await fetchTeamMatchStatistics(matchweek)
          if (data && data.length > 0) {
            allTeamData.push(...data.map(team => ({ ...team, source_matchweek: matchweek })))
          }
        } catch (error) {
          console.log(`No team data for matchweek ${matchweek}`)
        }
      }

      if (allTeamData.length > 0) {
        // Create aggregated data - average stats for each team across all matchdays
        const teamAggregates: { [key: string]: any } = {}
        
        allTeamData.forEach(team => {
          const teamName = team.team_full_name
          if (!teamAggregates[teamName]) {
            teamAggregates[teamName] = {
              ...team,
              matchdays_count: 0,
              source_matchweeks: []
            }
          }
          
          const agg = teamAggregates[teamName]
          agg.matchdays_count += 1
          agg.source_matchweeks.push(team.source_matchweek)
          
          // Aggregate numeric fields - SUM totals for most fields, AVERAGE for percentages
          const sumFields = [
            'goals_scored', 'expected_assists', 'expected_goals', 'ground_duels', 
            'dribbles_successful', 'start_a3_end_box', 'start_a2_end_box',
            'pass_completed_to_box', 'end_box_using_corner', 'start_a2_end_a3',
            'start_a1_end_box', 'start_a2_end_a3_alt', 'start_a1_end_a3', 'start_a1_end_a2',
            'seq_start_att_3rd', 'seq_start_mid_3rd', 'seq_start_a1', 'cross_open', 
            'pass_from_assist_to_golden', 'pass_assist_zone', 'shots_on_goal_penalty_area', 
            'shots_on_goal_from_box', 'shot_from_golden', 'shot_from_box', 'shots_on_goal', 
            'shots_including_blocked', 'actual_goals', 'touches', 'touch_opponent_box',
            'possession_won_opponent_half'
          ]
          
          const averageFields = [
            'expected_goals_per_shot', 'aerial_percentage', 'ground_percentage', 
            'drop_forward_up_percentage', 'avg_sequence_time', 'ppda_40'
          ]
          
          // Sum the fields that should be totaled
          sumFields.forEach(field => {
            if (team[field] !== null && team[field] !== undefined && !isNaN(parseFloat(team[field]))) {
              if (agg.matchdays_count === 1) {
                agg[field] = parseFloat(team[field])
              } else {
                agg[field] = (agg[field] || 0) + parseFloat(team[field])
              }
            }
          })
          
          // Average the fields that should be averaged (percentages, rates)
          averageFields.forEach(field => {
            if (team[field] !== null && team[field] !== undefined && !isNaN(parseFloat(team[field]))) {
              if (agg.matchdays_count === 1) {
                agg[field] = parseFloat(team[field])
              } else {
                agg[field] = ((agg[field] * (agg.matchdays_count - 1)) + parseFloat(team[field])) / agg.matchdays_count
              }
            }
          })
        })

        const aggregatedData = Object.values(teamAggregates)
        setMatchStatsData(aggregatedData)
      } else {
        setMatchStatsData([])
      }
    } catch (error) {
      console.error('Error loading aggregated data:', error)
      setMatchStatsData([])
    }
    setLoadingMatchStats(false)
  }

  const loadUploadedAggregatedData = async () => {
    console.log('🏆 Loading uploaded aggregated data...')
    setLoadingMatchStats(true)
    try {
      const data = await fetchAggregatedTeamStatistics()
      console.log('✅ Uploaded aggregated data:', data)
      setMatchStatsData(data)
    } catch (error) {
      console.error('❌ Error loading uploaded aggregated data:', error)
      setMatchStatsData([])
    }
    setLoadingMatchStats(false)
  }

  const handleMatchSelect = (value: string) => {
    if (value === 'aggregated') {
      setSelectedMatchweek('aggregated')
      loadAggregatedData()
    } else if (value === 'uploaded-aggregated') {
      setSelectedMatchweek('uploaded-aggregated')
      loadUploadedAggregatedData()
    } else {
      const matchweek = parseInt(value)
      setSelectedMatchweek(matchweek)
      loadMatchData(matchweek)
    }
  }

  return (
    <div className="coach-dashboard">
      <div className="coach-dashboard-header">
        <h2>Coach Dashboard</h2>
      </div>

      <nav className="coach-tab-nav">
        <button
          onClick={() => setActiveCoachTab('weekly-running')}
          className={`tab-button ${activeCoachTab === 'weekly-running' ? 'active' : ''}`}
        >
          <BarChart3 />
          Weekly GPS
        </button>
        <button
          onClick={() => setActiveCoachTab('match-reports')}
          className={`tab-button ${activeCoachTab === 'match-reports' ? 'active' : ''}`}
        >
          <Trophy />
          Match GPS Data
        </button>
        <button
          onClick={() => setActiveCoachTab('nutrition')}
          className={`tab-button ${activeCoachTab === 'nutrition' ? 'active' : ''}`}
        >
          <Scale />
          Fat %
        </button>
        <button
          onClick={() => setActiveCoachTab('match-stats')}
          className={`tab-button ${activeCoachTab === 'match-stats' ? 'active' : ''}`}
        >
          <FileText />
          Match Stats
        </button>
        <button
          onClick={() => setActiveCoachTab('match-gps-league')}
          className={`tab-button ${activeCoachTab === 'match-gps-league' ? 'active' : ''}`}
        >
          <Activity />
          Match GPS League
        </button>
        <button
          onClick={() => setActiveCoachTab('training-gps')}
          className={`tab-button ${activeCoachTab === 'training-gps' ? 'active' : ''}`}
        >
          <Route />
          Training GPS Data
        </button>
        <button
          onClick={() => setActiveCoachTab('corners')}
          className={`tab-button ${activeCoachTab === 'corners' ? 'active' : ''}`}
        >
          <Target />
          Corners Analysis
        </button>
        <button
          onClick={() => setActiveCoachTab('matchup')}
          className={`tab-button ${activeCoachTab === 'matchup' ? 'active' : ''}`}
        >
          <Users />
          Matchup Analysis
        </button>
        <button
          onClick={() => setActiveCoachTab('opponent-view')}
          className={`tab-button ${activeCoachTab === 'opponent-view' ? 'active' : ''}`}
        >
          <Trophy />
          Opponent View
        </button>
      </nav>

      <div className="coach-tab-content">
        {activeCoachTab === 'weekly-running' && (
          <>
            <LatestDataBand />
            <BarChartView />
          </>
        )}
        {activeCoachTab === 'match-reports' && <MatchReports />}
        {activeCoachTab === 'nutrition' && (
          <CoachNutritionTab 
            activeNutritionTab={activeNutritionTab}
            setActiveNutritionTab={setActiveNutritionTab}
          />
        )}
        {activeCoachTab === 'match-stats' && (
          <div className="match-stats-tab">
            {/* Match Selector */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              borderRadius: '8px', 
              padding: '20px', 
              marginBottom: '20px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <h3 style={{ 
                color: '#FFD700', 
                margin: '0 0 15px 0', 
                fontFamily: 'Montserrat',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                📊 Select Match Report
              </h3>
              
              {availableMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <p style={{ fontFamily: 'Montserrat' }}>No match statistics available</p>
                  <p style={{ fontFamily: 'Montserrat', fontSize: '12px' }}>Upload team data using the Matchday Wizard</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ 
                    color: 'var(--primary-text)', 
                    fontFamily: 'Montserrat', 
                    fontWeight: '500',
                    fontSize: '14px'
                  }}>
                    Match:
                  </label>
                  <select
                    value={selectedMatchweek || ''}
                    onChange={(e) => handleMatchSelect(e.target.value)}
                    disabled={loadingMatchStats}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--primary-text)',
                      fontFamily: 'Montserrat',
                      fontSize: '14px',
                      cursor: loadingMatchStats ? 'not-allowed' : 'pointer',
                      minWidth: '250px'
                    }}
                  >
                    {/* Uploaded Aggregated Data Option */}
                    {aggregatedDataExists && (
                      <option 
                        value="uploaded-aggregated"
                        style={{ background: '#1a1a1a', color: '#10b981', fontWeight: 'bold' }}
                      >
                        🏆 Season Summary (Uploaded Aggregated Data)
                      </option>
                    )}
                    
                    {/* Calculated Aggregated Option - only show if multiple matches available AND no uploaded aggregated data */}
                    {availableMatches.length > 1 && !aggregatedDataExists && (
                      <option 
                        value="aggregated"
                        style={{ background: '#1a1a1a', color: '#22c55e', fontWeight: 'bold' }}
                      >
                        📊 Season Summary ({availableMatches.length} matches averaged)
                      </option>
                    )}
                    
                    {/* Individual Match Options */}
                    {availableMatches.map(match => (
                      <option 
                        key={match.matchweek} 
                        value={match.matchweek}
                        style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}
                      >
                        Matchday {match.matchweek} - {new Date(match.match_date).toLocaleDateString('en-GB')} {match.teams_count && `(${match.teams_count} teams)`}
                      </option>
                    ))}
                  </select>
                  
                  {loadingMatchStats && (
                    <span style={{ 
                      color: '#FFD700', 
                      fontFamily: 'Montserrat', 
                      fontSize: '12px',
                      fontStyle: 'italic'
                    }}>
                      Loading...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Match Report Display */}
            {selectedMatchweek && matchStatsData.length > 0 && !loadingMatchStats && (
              <div style={{ marginTop: '20px' }}>
                <MatchdayReport 
                  csvData={matchStatsData} 
                  matchdayNumber={
                    selectedMatchweek === 'aggregated' 
                      ? `Season (${availableMatches.length} matchdays)` 
                      : selectedMatchweek === 'uploaded-aggregated'
                        ? 'Season Summary'
                        : selectedMatchweek.toString()
                  } 
                />
              </div>
            )}

            {selectedMatchweek && matchStatsData.length === 0 && !loadingMatchStats && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#888',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontFamily: 'Montserrat' }}>
                  {selectedMatchweek === 'aggregated' 
                    ? 'No data available for season aggregation' 
                    : selectedMatchweek === 'uploaded-aggregated'
                      ? 'No uploaded aggregated data available'
                      : `No data available for Matchday ${selectedMatchweek}`
                  }
                </p>
              </div>
            )}
          </div>
        )}
        {activeCoachTab === 'match-gps-league' && (
          <div className="match-gps-league-tab">
            <MatchGPSLeagueTab />
          </div>
        )}
        {activeCoachTab === 'training-gps' && (
          <div className="training-gps-tab">
            {/* Sub-navigation for Training GPS Data */}
            <nav className="sub-tab-nav" style={{ 
              marginBottom: '20px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <button
                onClick={() => setActiveTrainingTab('distance')}
                className={`sub-tab-button ${activeTrainingTab === 'distance' ? 'active' : ''}`}
                style={{
                  background: activeTrainingTab === 'distance' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                  color: activeTrainingTab === 'distance' ? '#FFD700' : 'var(--secondary-text)',
                  border: `1px solid ${activeTrainingTab === 'distance' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginRight: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Route size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Distance
              </button>
              <button
                onClick={() => setActiveTrainingTab('intensity')}
                className={`sub-tab-button ${activeTrainingTab === 'intensity' ? 'active' : ''}`}
                style={{
                  background: activeTrainingTab === 'intensity' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                  color: activeTrainingTab === 'intensity' ? '#FFD700' : 'var(--secondary-text)',
                  border: `1px solid ${activeTrainingTab === 'intensity' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Zap size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Intensity
              </button>
            </nav>

            {/* Content based on active sub-tab */}
            {activeTrainingTab === 'distance' && (
              <div className="training-distance-content">
                <DistanceView />
              </div>
            )}
            {activeTrainingTab === 'intensity' && (
              <div className="training-intensity-content">
                <IntensityView />
              </div>
            )}
          </div>
        )}
        {activeCoachTab === 'corners' && (
          <div className="corners-tab">
            <CornersDashboardView />
          </div>
        )}

        {activeCoachTab === 'matchup' && (
          <MatchupAnalysisInterface />
        )}

        {activeCoachTab === 'opponent-view' && (
          <div className="opponent-view-tab">
            {loadingOpponentView ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <p style={{ fontFamily: 'Montserrat' }}>Loading opponent view data...</p>
              </div>
            ) : opponentViewData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <p style={{ fontFamily: 'Montserrat' }}>No opponent data available</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: '12px' }}>Upload opponent data in Developer Mode → Opponent View</p>
              </div>
            ) : (
              <>
                {/* Opponent Selector */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <label style={{
                    color: 'var(--primary-text)',
                    fontSize: '14px',
                    fontFamily: 'Montserrat',
                    fontWeight: '600'
                  }}>
                    🎯 Focus on opponent:
                  </label>
                  <select
                    value={selectedOpponent}
                    onChange={(e) => setSelectedOpponent(e.target.value)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--primary-text)',
                      fontSize: '14px',
                      fontFamily: 'Montserrat',
                      fontWeight: '600',
                      cursor: 'pointer',
                      minWidth: '200px'
                    }}
                  >
                    <option value="">All Teams</option>
                    {opponentViewData.map((team: any) => {
                      const teamName = team.Team || team.team_full_name || team.teamFullName || 'Unknown'
                      return (
                        <option key={teamName} value={teamName}>
                          {teamName}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <MatchdayReport
                  csvData={opponentViewData}
                  matchdayNumber="All Teams Analysis"
                  isOpponentAnalysis={true}
                  selectedOpponent={selectedOpponent}
                />
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
} 