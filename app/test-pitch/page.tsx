'use client'

import React from 'react'
import SoccerPitch from '../components/SoccerPitch'

const testPlayers = [
  {
    id: 'test1',
    name: 'Test Player 1',
    position: 'CB',
    unit: 'defense' as const,
    team: 'beitar' as const,
    stats: { duels: 60, passes: 80, intensity: 70, xG: 0.1, distance: 10000 }
  },
  {
    id: 'test2',
    name: 'Test Player 2',
    position: 'ST',
    unit: 'attack' as const,
    team: 'opponent' as const,
    stats: { duels: 50, passes: 70, intensity: 85, xG: 0.4, distance: 9500 }
  }
]

export default function TestPitch() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>
        <h1 style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>
          Soccer Pitch Test
        </h1>
        <SoccerPitch
          beitarPlayers={[testPlayers[0]]}
          opponentPlayers={[testPlayers[1]]}
          selectedTeams={[]}
          isAssignmentMode={true}
          leftTeam="Beitar Jerusalem"
          rightTeam="Test Opponent"
          assignedPositions={{}}
          onPlayerAssignment={(key, player) => console.log('Assignment:', key, player)}
        />
      </div>
    </div>
  )
}