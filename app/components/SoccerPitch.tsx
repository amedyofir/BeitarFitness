'use client'

import React from 'react'
import { MatchupPlayer, PlayerUnit } from '@/lib/playerService'

interface SoccerPitchProps {
  beitarPlayers: MatchupPlayer[]
  opponentPlayers: MatchupPlayer[]
  selectedTeams: string[]
  selectedPlayers?: MatchupPlayer[]
  comparisonMode?: 'assignment' | '1v1' | 'unit-vs-unit' | 'side-vs-side' | 'cross-unit'
  selectedUnit?: PlayerUnit
  isAssignmentMode?: boolean
  assignedPositions?: {[key: string]: MatchupPlayer | null}
  onPlayerAssignment?: (positionKey: string, player: MatchupPlayer | null, event?: React.MouseEvent) => void
  on1v1Selection?: (players: MatchupPlayer[]) => void
  onSideSelection?: (side: 'top' | 'middle' | 'bottom') => void
  selectedSide?: 'top' | 'middle' | 'bottom' | null
  selectedSideMatchup?: 'left' | 'middle' | 'right' | null
  leftTeam?: string
  rightTeam?: string
}

interface PlayerPosition {
  x: number // percentage from left
  y: number // percentage from top
}

export default function SoccerPitch({
  beitarPlayers,
  opponentPlayers,
  selectedTeams,
  selectedPlayers = [],
  comparisonMode = 'assignment',
  selectedUnit,
  isAssignmentMode = false,
  assignedPositions = {},
  onPlayerAssignment,
  on1v1Selection,
  onSideSelection,
  selectedSide = null,
  selectedSideMatchup = null,
  leftTeam = '',
  rightTeam = ''
}: SoccerPitchProps) {

  // Formation positions for 4-3-3 on each half of the pitch
  const getFormationPositions = (team: 'beitar' | 'opponent'): { [key: string]: PlayerPosition } => {
    const formations = {
      // Left half - Beitar (attacking right)
      beitar: {
        GK: { x: 8, y: 50 },
        LB: { x: 20, y: 15 }, CB1: { x: 20, y: 35 }, CB2: { x: 20, y: 65 }, RB: { x: 20, y: 85 },
        CM1: { x: 35, y: 25 }, CM2: { x: 35, y: 50 }, CM3: { x: 35, y: 75 },
        LW: { x: 45, y: 20 }, ST: { x: 45, y: 50 }, RW: { x: 45, y: 80 }
      },
      // Right half - Opponent (attacking left)
      opponent: {
        GK: { x: 92, y: 50 },
        LB: { x: 80, y: 85 }, CB1: { x: 80, y: 65 }, CB2: { x: 80, y: 35 }, RB: { x: 80, y: 15 },
        CM1: { x: 65, y: 75 }, CM2: { x: 65, y: 50 }, CM3: { x: 65, y: 25 },
        LW: { x: 55, y: 80 }, ST: { x: 55, y: 50 }, RW: { x: 55, y: 20 }
      }
    }
    return formations[team]
  }

  // Get positions specific to a unit for unit-vs-unit mode
  const getUnitSpecificPositions = (unit: PlayerUnit, team: 'beitar' | 'opponent'): PlayerPosition[] => {
    const isBeitar = team === 'beitar'

    switch (unit) {
      case 'goalkeeper':
        return [{ x: isBeitar ? 8 : 92, y: 50 }]
      case 'defense':
        // Position defense players just outside the penalty box line (4-3-3 defense positions)
        return isBeitar ? [
          { x: 20, y: 15 }, // LB
          { x: 20, y: 35 }, // CB1
          { x: 20, y: 65 }, // CB2
          { x: 20, y: 85 }  // RB
        ] : [
          { x: 80, y: 85 }, // LB (mirrored)
          { x: 80, y: 65 }, // CB1
          { x: 80, y: 35 }, // CB2
          { x: 80, y: 15 }  // RB
        ]
      case 'midfield':
        // 3 midfield positions from 4-3-3
        return isBeitar ? [
          { x: 35, y: 25 }, // CM1
          { x: 35, y: 50 }, // CM2
          { x: 35, y: 75 }  // CM3
        ] : [
          { x: 65, y: 75 }, // CM1 (mirrored)
          { x: 65, y: 50 }, // CM2
          { x: 65, y: 25 }  // CM3
        ]
      case 'attack':
        // 3 attack positions from 4-3-3
        return isBeitar ? [
          { x: 45, y: 20 }, // LW
          { x: 45, y: 50 }, // ST
          { x: 45, y: 80 }  // RW
        ] : [
          { x: 55, y: 80 }, // LW (mirrored)
          { x: 55, y: 50 }, // ST
          { x: 55, y: 20 }  // RW
        ]
      default:
        return []
    }
  }

  const getPlayersByUnit = (players: MatchupPlayer[]) => {
    const units: { [key in PlayerUnit]: MatchupPlayer[] } = {
      goalkeeper: [], defense: [], midfield: [], attack: []
    }
    players.forEach(player => units[player.unit].push(player))
    return units
  }

  // Always show full formation placeholders, but determine visibility/highlighting
  const getPlayerAssignments = () => {
    // Always create full 4-3-3 formation with placeholders
    return createPlaceholderPositions()
  }

  // Determine if a player should be visible based on mode
  const isPlayerVisible = (player: MatchupPlayer, positionName: string) => {
    // In assignment mode, always show all players/placeholders
    if (comparisonMode === 'assignment') {
      return true
    }

    // In side-vs-side mode, only show selected players (those involved in the matchup)
    if (comparisonMode === 'side-vs-side') {
      // If we have selected players, only show those (check by player name and team for reliability)
      if (selectedPlayers.length > 0) {
        // Skip placeholders - they should always be dimmed
        if (player.id.includes('placeholder')) {
          return false
        }

        // For middle matchup, show all midfielders (not just selected ones)
        if (selectedSideMatchup === 'middle' && player.unit === 'midfield') {
          return true
        }

        // For other positions, match by player name and team, or by ID
        return selectedPlayers.some(sp =>
          (sp.name === player.name && sp.actual_team_name === player.actual_team_name) ||
          sp.id === player.id
        )
      }
      // Fallback to side-based visibility if selectedSide is set
      if (selectedSide) {
        const relevantPositions = getPositionsForSide(selectedSide, player.team)
        return relevantPositions.includes(positionName)
      }
      return true // If no selection, show all
    }

    // In 1v1 mode, only selected players are visible
    if (comparisonMode === '1v1') {
      return selectedPlayers.some(sp => sp.id === player.id)
    }

    // In unit-vs-unit mode, only players from the selected unit are visible
    if (comparisonMode === 'unit-vs-unit' && selectedUnit) {
      return getUnitForPosition(positionName) === selectedUnit
    }

    // In cross-unit mode, show players from both relevant units based on POSITION
    if (comparisonMode === 'cross-unit' && selectedUnit) {
      const isLeftTeam = positionName.startsWith('left-')
      const cleanPositionName = positionName.replace('left-', '').replace('right-', '')

      // For "Home DEF vs Away ATT" (selectedUnit = 'defense')
      if (selectedUnit === 'defense') {
        if (isLeftTeam) {
          // Home team - show defense positions
          return ['LB', 'CB1', 'CB2', 'RB'].includes(cleanPositionName)
        } else {
          // Away team - show attack positions
          return ['LW', 'ST', 'RW'].includes(cleanPositionName)
        }
      }

      // For "Home ATT vs Away DEF" (selectedUnit = 'attack')
      if (selectedUnit === 'attack') {
        if (isLeftTeam) {
          // Home team - show attack positions
          return ['LW', 'ST', 'RW'].includes(cleanPositionName)
        } else {
          // Away team - show defense positions
          return ['LB', 'CB1', 'CB2', 'RB'].includes(cleanPositionName)
        }
      }

      return false
    }

    return true
  }

  // Handle clicking on pitch players for 1v1 selection
  const handlePitchPlayerClick = (player: MatchupPlayer) => {
    if (comparisonMode === '1v1') {
      const isLeftTeam = player.team === 'beitar'
      const currentLeftSelection = selectedPlayers.find(p => p.team === 'beitar')
      const currentRightSelection = selectedPlayers.find(p => p.team === 'opponent')

      let newSelection = [...selectedPlayers]

      if (isLeftTeam) {
        // Clicking on left team - replace any existing left team selection
        newSelection = selectedPlayers.filter(p => p.team !== 'beitar')
        newSelection.push(player)
      } else {
        // Clicking on right team - replace any existing right team selection
        newSelection = selectedPlayers.filter(p => p.team !== 'opponent')
        newSelection.push(player)
      }

      // Update selected players via parent component
      if (on1v1Selection) {
        on1v1Selection(newSelection)
      }

      return newSelection
    }
    return selectedPlayers
  }

  // Helper function to determine which unit a position belongs to
  const getUnitForPosition = (positionName: string): PlayerUnit => {
    if (positionName === 'GK') return 'goalkeeper'
    if (['LB', 'CB1', 'CB2', 'RB'].includes(positionName)) return 'defense'
    if (['CM1', 'CM2', 'CM3'].includes(positionName)) return 'midfield'
    if (['LW', 'ST', 'RW'].includes(positionName)) return 'attack'
    return 'midfield' // default
  }

  // Helper function to determine which side of the pitch a position belongs to
  const getSideForPosition = (positionName: string): 'top' | 'middle' | 'bottom' => {
    // Top side: Left wing positions (LB, LW for left team becomes RB, RW for comparison)
    if (['LB', 'LW'].includes(positionName)) return 'top'

    // Bottom side: Right wing positions (RB, RW for left team becomes LB, LW for comparison)
    if (['RB', 'RW'].includes(positionName)) return 'bottom'

    // Middle: Central positions (GK, CB1, CB2, CM1, CM2, CM3, ST)
    if (['GK', 'CB1', 'CB2', 'CM1', 'CM2', 'CM3', 'ST'].includes(positionName)) return 'middle'

    return 'middle' // default
  }

  // Get positions that should be visible based on side selection
  const getPositionsForSide = (side: 'top' | 'middle' | 'bottom', team: 'beitar' | 'opponent'): string[] => {
    if (side === 'top') {
      // Top side comparison: Left team's left wing vs Right team's right wing
      return team === 'beitar' ? ['LB', 'LW'] : ['RB', 'RW']
    } else if (side === 'bottom') {
      // Bottom side comparison: Left team's right wing vs Right team's left wing
      return team === 'beitar' ? ['RB', 'RW'] : ['LB', 'LW']
    } else { // middle
      // Central positions for both teams
      return ['GK', 'CB1', 'CB2', 'CM1', 'CM2', 'CM3', 'ST']
    }
  }

  const createPlaceholderPositions = () => {
    const leftPositions = getFormationPositions('beitar')
    const rightPositions = getFormationPositions('opponent')
    const assignments: { player: MatchupPlayer, position: PlayerPosition, positionName: string, positionKey: string }[] = []

    // Get players organized by unit
    const beitarByUnit = getPlayersByUnit(beitarPlayers)
    const opponentByUnit = getPlayersByUnit(opponentPlayers)

    // Create left team positions with real players when available
    Object.entries(leftPositions).forEach(([posName, pos]) => {
      const positionKey = `left-${posName}`
      const assignedPlayer = assignedPositions[positionKey]

      // Try to get a real player for this position
      let realPlayer: MatchupPlayer | null = null
      const unitType = getUnitForPosition(posName)

      if (!assignedPlayer) {
        const unitPlayers = beitarByUnit[unitType]
        if (posName === 'GK' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `beitar-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'LB' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `beitar-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'CB1' && unitPlayers[1]) {
          realPlayer = { ...unitPlayers[1], id: `beitar-${posName}-${unitPlayers[1].id}` }
        } else if (posName === 'CB2' && unitPlayers[2]) {
          realPlayer = { ...unitPlayers[2], id: `beitar-${posName}-${unitPlayers[2].id}` }
        } else if (posName === 'RB' && unitPlayers[3]) {
          realPlayer = { ...unitPlayers[3], id: `beitar-${posName}-${unitPlayers[3].id}` }
        } else if (posName === 'CM1' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `beitar-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'CM2' && unitPlayers[1]) {
          realPlayer = { ...unitPlayers[1], id: `beitar-${posName}-${unitPlayers[1].id}` }
        } else if (posName === 'CM3' && unitPlayers[2]) {
          realPlayer = { ...unitPlayers[2], id: `beitar-${posName}-${unitPlayers[2].id}` }
        } else if (posName === 'LW' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `beitar-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'ST' && unitPlayers[1]) {
          realPlayer = { ...unitPlayers[1], id: `beitar-${posName}-${unitPlayers[1].id}` }
        } else if (posName === 'RW' && unitPlayers[2]) {
          realPlayer = { ...unitPlayers[2], id: `beitar-${posName}-${unitPlayers[2].id}` }
        }
      }

      const player: MatchupPlayer = assignedPlayer ? {
        ...assignedPlayer,
        team: 'beitar' // Ensure team is set correctly for position
      } : realPlayer || {
        id: positionKey,
        name: `${leftTeam || 'Left'} ${posName}`,
        position: posName,
        unit: unitType,
        team: 'beitar',
        stats: { duels: 0, passes: 0, intensity: 0, xG: 0, distance: 0 }
      }

      assignments.push({
        player,
        position: pos,
        positionName: posName,
        positionKey
      })
    })

    // Create right team positions with real players when available
    Object.entries(rightPositions).forEach(([posName, pos]) => {
      const positionKey = `right-${posName}`
      const assignedPlayer = assignedPositions[positionKey]

      // Try to get a real player for this position
      let realPlayer: MatchupPlayer | null = null
      const unitType = getUnitForPosition(posName)

      if (!assignedPlayer) {
        const unitPlayers = opponentByUnit[unitType]
        if (posName === 'GK' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `opponent-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'LB' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `opponent-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'CB1' && unitPlayers[1]) {
          realPlayer = { ...unitPlayers[1], id: `opponent-${posName}-${unitPlayers[1].id}` }
        } else if (posName === 'CB2' && unitPlayers[2]) {
          realPlayer = { ...unitPlayers[2], id: `opponent-${posName}-${unitPlayers[2].id}` }
        } else if (posName === 'RB' && unitPlayers[3]) {
          realPlayer = { ...unitPlayers[3], id: `opponent-${posName}-${unitPlayers[3].id}` }
        } else if (posName === 'CM1' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `opponent-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'CM2' && unitPlayers[1]) {
          realPlayer = { ...unitPlayers[1], id: `opponent-${posName}-${unitPlayers[1].id}` }
        } else if (posName === 'CM3' && unitPlayers[2]) {
          realPlayer = { ...unitPlayers[2], id: `opponent-${posName}-${unitPlayers[2].id}` }
        } else if (posName === 'LW' && unitPlayers[0]) {
          realPlayer = { ...unitPlayers[0], id: `opponent-${posName}-${unitPlayers[0].id}` }
        } else if (posName === 'ST' && unitPlayers[1]) {
          realPlayer = { ...unitPlayers[1], id: `opponent-${posName}-${unitPlayers[1].id}` }
        } else if (posName === 'RW' && unitPlayers[2]) {
          realPlayer = { ...unitPlayers[2], id: `opponent-${posName}-${unitPlayers[2].id}` }
        }
      }

      const player: MatchupPlayer = assignedPlayer ? {
        ...assignedPlayer,
        team: 'opponent' // Ensure team is set correctly for position
      } : realPlayer || {
        id: positionKey,
        name: `${rightTeam || 'Right'} ${posName}`,
        position: posName,
        unit: unitType,
        team: 'opponent',
        stats: { duels: 0, passes: 0, intensity: 0, xG: 0, distance: 0 }
      }

      assignments.push({
        player,
        position: pos,
        positionName: posName,
        positionKey
      })
    })

    return assignments
  }

  // Simple function to assign players to 4-3-3 formation
  const assignPlayersToFormation = (players: MatchupPlayer[], team: 'beitar' | 'opponent') => {
    const positions = getFormationPositions(team)
    const assignments: { player: MatchupPlayer, position: PlayerPosition, positionName: string }[] = []
    const unitPlayers = getPlayersByUnit(players)

    // Assign goalkeeper
    if (unitPlayers.goalkeeper[0]) {
      assignments.push({ player: unitPlayers.goalkeeper[0], position: positions.GK, positionName: 'GK' })
    }

    // Assign defense (4 players)
    const defensePositions = ['LB', 'CB1', 'CB2', 'RB']
    unitPlayers.defense.slice(0, 4).forEach((player, i) => {
      assignments.push({ player, position: positions[defensePositions[i]], positionName: defensePositions[i] })
    })

    // Assign midfield (3 players)
    const midfieldPositions = ['CM1', 'CM2', 'CM3']
    unitPlayers.midfield.slice(0, 3).forEach((player, i) => {
      assignments.push({ player, position: positions[midfieldPositions[i]], positionName: midfieldPositions[i] })
    })

    // Assign attack (3 players)
    const attackPositions = ['LW', 'ST', 'RW']
    unitPlayers.attack.slice(0, 3).forEach((player, i) => {
      assignments.push({ player, position: positions[attackPositions[i]], positionName: attackPositions[i] })
    })

    return assignments
  }

  const isPlayerHighlighted = (player: MatchupPlayer) => {
    if (comparisonMode === '1v1') {
      return selectedPlayers.some(sp => sp.id === player.id)
    } else if (comparisonMode === 'unit-vs-unit' && selectedUnit) {
      return player.unit === selectedUnit
    } else if (comparisonMode === 'side-vs-side') {
      return true
    } else if (comparisonMode === 'cross-unit' && selectedUnit) {
      // For cross-unit, highlight players from both relevant units based on POSITION, not player.unit
      const isHomeTeam = player.team === 'beitar' || player.actual_team_name === leftTeam

      // For "Home DEF vs Away ATT" (selectedUnit = 'defense')
      if (selectedUnit === 'defense') {
        if (isHomeTeam) {
          // Home team - highlight defense POSITIONS
          return ['LB', 'CB1', 'CB2', 'RB'].includes(player.position || '')
        } else {
          // Away team - highlight attack POSITIONS
          return ['LW', 'ST', 'RW'].includes(player.position || '')
        }
      }

      // For "Home ATT vs Away DEF" (selectedUnit = 'attack')
      if (selectedUnit === 'attack') {
        if (isHomeTeam) {
          // Home team - highlight attack POSITIONS
          return ['LW', 'ST', 'RW'].includes(player.position || '')
        } else {
          // Away team - highlight defense POSITIONS
          return ['LB', 'CB1', 'CB2', 'RB'].includes(player.position || '')
        }
      }

      return false
    }
    return false
  }

  // Get all player assignments based on current mode
  const allAssignments = getPlayerAssignments()

  return (
    <div style={{
      width: '100%', height: '450px', maxWidth: '800px', margin: '0 auto',
      background: 'linear-gradient(135deg, #0f7b0f 0%, #228b22 100%)',
      position: 'relative', borderRadius: '12px', border: '3px solid #fff',
      overflow: 'visible', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      {/* Pitch markings */}
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <line x1="50%" y1="0%" x2="50%" y2="100%" stroke="white" strokeWidth="2" />
        <circle cx="50%" cy="50%" r="80" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="50%" cy="50%" r="3" fill="white" />
        <rect x="0%" y="25%" width="18%" height="50%" fill="none" stroke="white" strokeWidth="2" />
        <rect x="0%" y="35%" width="8%" height="30%" fill="none" stroke="white" strokeWidth="2" />
        <rect x="82%" y="25%" width="18%" height="50%" fill="none" stroke="white" strokeWidth="2" />
        <rect x="92%" y="35%" width="8%" height="30%" fill="none" stroke="white" strokeWidth="2" />
        <rect x="0%" y="45%" width="2%" height="10%" fill="none" stroke="white" strokeWidth="2" />
        <rect x="98%" y="45%" width="2%" height="10%" fill="none" stroke="white" strokeWidth="2" />
      </svg>

      {/* Clickable areas for side selection in side-vs-side mode */}
      {comparisonMode === 'side-vs-side' && (
        <>
          {/* Top area (y: 0-33%) - Left wing vs Right wing */}
          <div
            onClick={() => onSideSelection && onSideSelection('top')}
            style={{
              position: 'absolute',
              top: '0%',
              left: '0%',
              width: '100%',
              height: '33.33%',
              cursor: 'pointer',
              background: selectedSide === 'top'
                ? 'rgba(255, 215, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedSide === 'top'
                ? '2px dashed rgba(255, 215, 0, 0.6)'
                : '1px dashed rgba(255, 255, 255, 0.2)',
              zIndex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedSide !== 'top') {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedSide !== 'top') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            {selectedSide === 'top' && (
              <div style={{
                color: '#FFD700',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                TOP: Left Wing vs Right Wing
              </div>
            )}
          </div>

          {/* Middle area (y: 33-66%) - Central positions */}
          <div
            onClick={() => onSideSelection && onSideSelection('middle')}
            style={{
              position: 'absolute',
              top: '33.33%',
              left: '0%',
              width: '100%',
              height: '33.34%',
              cursor: 'pointer',
              background: selectedSide === 'middle'
                ? 'rgba(255, 215, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedSide === 'middle'
                ? '2px dashed rgba(255, 215, 0, 0.6)'
                : '1px dashed rgba(255, 255, 255, 0.2)',
              zIndex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedSide !== 'middle') {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedSide !== 'middle') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            {selectedSide === 'middle' && (
              <div style={{
                color: '#FFD700',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                MIDDLE: Central Positions
              </div>
            )}
          </div>

          {/* Bottom area (y: 66-100%) - Right wing vs Left wing */}
          <div
            onClick={() => onSideSelection && onSideSelection('bottom')}
            style={{
              position: 'absolute',
              top: '66.67%',
              left: '0%',
              width: '100%',
              height: '33.33%',
              cursor: 'pointer',
              background: selectedSide === 'bottom'
                ? 'rgba(255, 215, 0, 0.1)'
                : 'rgba(255, 255, 255, 0.05)',
              border: selectedSide === 'bottom'
                ? '2px dashed rgba(255, 215, 0, 0.6)'
                : '1px dashed rgba(255, 255, 255, 0.2)',
              zIndex: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedSide !== 'bottom') {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedSide !== 'bottom') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            {selectedSide === 'bottom' && (
              <div style={{
                color: '#FFD700',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                BOTTOM: Right Wing vs Left Wing
              </div>
            )}
          </div>
        </>
      )}

      {/* All players/placeholders */}
      {allAssignments.map((assignment, index) => {
        const isHighlighted = isPlayerHighlighted(assignment.player)
        const isPlaceholder = isAssignmentMode || assignment.player.id.includes('placeholder')
        const isAssigned = isAssignmentMode && assignedPositions[assignment.positionKey || '']
        const isLeftTeam = assignment.player.team === 'beitar'
        const isVisible = isPlayerVisible(assignment.player, assignment.positionName)

        return (
          <div
            key={`player-${index}`}
            onClick={(event) => {
              if (comparisonMode === 'assignment' && onPlayerAssignment) {
                // Open assignment modal in assignment mode
                onPlayerAssignment(assignment.positionKey || '', null, event)
              } else if (comparisonMode === '1v1') {
                // Handle 1v1 player selection on pitch
                handlePitchPlayerClick(assignment.player)
              } else if (isAssignmentMode && onPlayerAssignment) {
                // Open assignment modal or directly assign
                onPlayerAssignment(assignment.positionKey || '', null, event)
              }
            }}
            style={{
              position: 'absolute',
              left: `${assignment.position.x}%`,
              top: `${assignment.position.y}%`,
              transform: 'translate(-50%, -50%)',
              width: isHighlighted ? '60px' : '50px',
              height: isHighlighted ? '60px' : '50px',
              borderRadius: '50%',
              opacity: isVisible ? 1 : 0.2,
              background: isPlaceholder
                ? isLeftTeam
                  ? isAssigned
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : 'linear-gradient(135deg, rgba(255, 215, 0, 0.4) 0%, rgba(255, 165, 0, 0.4) 100%)'
                  : isAssigned
                    ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
                    : 'linear-gradient(135deg, rgba(255, 68, 68, 0.4) 0%, rgba(204, 0, 0, 0.4) 100%)'
                : isHighlighted
                  ? isLeftTeam
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)'
                  : isLeftTeam
                    ? 'linear-gradient(135deg, #FFD700 80%, #FFA500 100%)'
                    : 'linear-gradient(135deg, #ff4444 80%, #cc0000 100%)',
              border: isHighlighted
                ? '4px solid #00ff00'
                : isPlaceholder
                  ? isLeftTeam
                    ? '2px dashed #FFD700'
                    : '2px dashed #ff4444'
                  : isLeftTeam
                    ? '3px solid #000'
                    : '3px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              color: isPlaceholder
                ? isLeftTeam ? '#FFD700' : '#ff4444'
                : isLeftTeam ? '#000' : '#fff',
              cursor: (comparisonMode === '1v1' || isAssignmentMode) ? 'pointer' : 'default',
              boxShadow: isHighlighted
                ? '0 4px 16px rgba(0,255,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
                : '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              zIndex: isHighlighted ? 10 : 1
            }}
            title={`${assignment.player.name} (${assignment.player.position})`}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}>
            {isAssigned ? (
              // Show full-size profile picture for assigned players
              <div style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {assignment.player.photo ? (
                  <>
                    {/* Player Photo - Full Size */}
                    <img
                      src={assignment.player.photo}
                      alt={assignment.player.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: isLeftTeam ? '3px solid #FFD700' : '3px solid #ff4444'
                      }}
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const lastName = assignment.player.name.split(' ').pop() || ''
                          const initials = assignment.player.name.split(' ').map(n => n[0]).join('').toUpperCase()
                          parent.innerHTML = `
                            <div style="
                              position: absolute;
                              top: -20px;
                              left: 50%;
                              transform: translateX(-50%);
                              background: rgba(0, 0, 0, 0.8);
                              color: #fff;
                              padding: 2px 6px;
                              border-radius: 4px;
                              font-size: 8px;
                              font-weight: bold;
                              white-space: nowrap;
                              z-index: 10;
                            ">${lastName}</div>
                            <div style="
                              width: 100%;
                              height: 100%;
                              border-radius: 50%;
                              background: ${isLeftTeam ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #ff4444, #cc0000)'};
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              color: ${isLeftTeam ? '#000' : '#fff'};
                              font-size: 16px;
                              font-weight: bold;
                              border: ${isLeftTeam ? '3px solid #FFD700' : '3px solid #ff4444'};
                            ">${initials}</div>
                          `
                        }
                      }}
                    />
                    {/* Last Name Label */}
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.8)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      zIndex: 10
                    }}>
                      {assignment.player.name.split(' ').pop()}
                    </div>
                  </>
                ) : (
                  // Show initials if no photo available
                  <>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: isLeftTeam
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                        : 'linear-gradient(135deg, #ff4444, #cc0000)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isLeftTeam ? '#000' : '#fff',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      border: isLeftTeam ? '3px solid #FFD700' : '3px solid #ff4444'
                    }}>
                      {assignment.player.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    {/* Last Name Label */}
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.8)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      zIndex: 10
                    }}>
                      {assignment.player.name.split(' ').pop()}
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Show position name for unassigned placeholders
              <div style={{ textAlign: 'center', lineHeight: '12px' }}>
                <div>{assignment.positionName}</div>
              </div>
            )}
          </div>
        )
      })}


    </div>
  )
}