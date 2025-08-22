'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, User, Calendar } from 'lucide-react'

interface PlayerMatchData {
  match_id: string
  match_date: string
  rival_name: string
  total_distance: number
  intensity: number
  high_speed_distance: number
  sprint_distance: number
  accelerations: number
  decelerations: number
  max_velocity: number
  meterage_per_minute: number
  total_duration: string
  game_position?: string
  status?: string
}

interface PositionBenchmark {
  distance: number // meters per 100 minutes
  highSpeed: number // meters per 100 minutes
  sprint: number // meters per 100 minutes
  intensity: number // percentage
}

interface PlayerScore {
  match_id: string
  rival_name: string
  distanceScore: number
  intensityScore: number
  highSpeedScore: number
  sprintScore: number
  overallScore: number
}

interface SquadPlayer {
  player_id: string
  first_name: string
  last_name: string
  full_name?: string
}

// Position benchmarks for 100 minutes of play
const POSITION_BENCHMARKS: { [key: string]: PositionBenchmark } = {
  // Central Backs
  'RCB': { distance: 9500, highSpeed: 600, sprint: 80, intensity: 7.15 },
  'LCB': { distance: 9500, highSpeed: 600, sprint: 80, intensity: 7.15 },
  'CB': { distance: 9500, highSpeed: 600, sprint: 80, intensity: 7.15 },
  
  // Full Backs
  'RB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  'LB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  'RWB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  'LWB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  
  // Defensive Midfielders
  'DMC': { distance: 10500, highSpeed: 500, sprint: 100, intensity: 5.71 },
  'RCDM': { distance: 10500, highSpeed: 500, sprint: 100, intensity: 5.71 },
  'LCDM': { distance: 10500, highSpeed: 500, sprint: 100, intensity: 5.71 },
  
  // Central Midfielders
  'RCM': { distance: 11000, highSpeed: 750, sprint: 100, intensity: 7.77 },
  'LCM': { distance: 11000, highSpeed: 750, sprint: 100, intensity: 7.77 },
  'CM': { distance: 11000, highSpeed: 750, sprint: 100, intensity: 7.77 },
  'CAM': { distance: 11000, highSpeed: 750, sprint: 100, intensity: 7.77 },
  
  // Wingers
  'RW': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'LW': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'RM': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'LM': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'RAM': { distance: 11000, highSpeed: 750, sprint: 100, intensity: 7.77 },
  'LAM': { distance: 11000, highSpeed: 750, sprint: 100, intensity: 7.77 },
  
  // Strikers
  'ST': { distance: 10500, highSpeed: 650, sprint: 150, intensity: 7.6 },
  'RST': { distance: 10500, highSpeed: 650, sprint: 150, intensity: 7.6 },
  'LST': { distance: 10500, highSpeed: 650, sprint: 150, intensity: 7.6 },
  'CF': { distance: 10500, highSpeed: 650, sprint: 150, intensity: 7.6 }
}

export default function PlayerAnalysis() {
  const [players, setPlayers] = useState<SquadPlayer[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [playerData, setPlayerData] = useState<PlayerMatchData[]>([])
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  useEffect(() => {
    if (selectedPlayerId) {
      fetchPlayerMatchData(selectedPlayerId)
    }
  }, [selectedPlayerId])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('squad_players')
        .select('player_id, first_name, last_name, full_name')
        .order('first_name')

      if (error) throw error

      setPlayers(data || [])
    } catch (err) {
      console.error('Error fetching players:', err)
      setError('Failed to load players')
    }
  }

  const calculatePlayerScores = (matchData: PlayerMatchData[]): PlayerScore[] => {
    return matchData.map(match => {
      const position = match.game_position || 'ST' // Default to striker if no position
      const benchmark = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS['ST']
      
      // Parse match duration to get actual minutes played
      const timeParts = match.total_duration.split(':')
      const actualMinutes = timeParts.length === 3 
        ? parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60
        : 90 // Default to 90 minutes if parse fails
      
      // Normalize player stats to 100 minutes
      const normalizedDistance = (match.total_distance / actualMinutes) * 100
      const normalizedHighSpeed = (match.high_speed_distance / actualMinutes) * 100
      const normalizedSprint = (match.sprint_distance / actualMinutes) * 100
      const actualIntensity = match.intensity // Already in percentage
      
      // Calculate raw performance ratios
      const distanceRatio = normalizedDistance / benchmark.distance
      const intensityRatio = actualIntensity / benchmark.intensity
      const highSpeedRatio = normalizedHighSpeed / benchmark.highSpeed
      const sprintRatio = normalizedSprint / benchmark.sprint
      
      // Apply very restrictive scoring curve:
      // - 100% of benchmark = 100 score
      // - 90% of benchmark = ~73 score (much more restrictive)
      // - 80% of benchmark = ~51 score (heavily penalized)
      // - 110% of benchmark = 110 score
      const calculateRealisticScore = (ratio: number): number => {
        if (ratio >= 1.0) {
          // Above benchmark: linear scaling
          return Math.round(100 * ratio)
        } else {
          // Below benchmark: very restrictive quadratic curve
          // Formula: 100 * (ratio^2) makes 0.9 → 81, 0.8 → 64, 0.7 → 49
          // Then apply additional penalty: score * 0.9 to make it even more restrictive
          const baseScore = 100 * Math.pow(ratio, 2)
          return Math.round(baseScore * 0.9)
        }
      }
      
      const distanceScore = calculateRealisticScore(distanceRatio)
      const intensityScore = calculateRealisticScore(intensityRatio)
      const highSpeedScore = calculateRealisticScore(highSpeedRatio)
      const sprintScore = calculateRealisticScore(sprintRatio)
      
      // Calculate overall score (average of all metrics)
      const overallScore = Math.round((distanceScore + intensityScore + highSpeedScore + sprintScore) / 4)
      
      return {
        match_id: match.match_id,
        rival_name: match.rival_name,
        distanceScore,
        intensityScore,
        highSpeedScore,
        sprintScore,
        overallScore
      }
    })
  }

  const fetchPlayerMatchData = async (playerId: string) => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('catapult_match_data')
        .select(`
          match_id,
          total_distance,
          intensity,
          high_speed_distance,
          sprint_distance,
          accelerations,
          decelerations,
          max_velocity,
          meterage_per_minute,
          total_duration,
          game_position,
          status,
          match_info (
            match_date,
            rival_name
          )
        `)
        .eq('player_id', playerId)
        .order('match_info(match_date)', { ascending: true })

      if (error) throw error

      const formattedData = (data || []).map(match => ({
        match_id: match.match_id,
        match_date: (match as any).match_info?.match_date || '',
        rival_name: (match as any).match_info?.rival_name || 'Unknown',
        total_distance: match.total_distance,
        intensity: match.intensity * 100, // Convert to percentage
        high_speed_distance: match.high_speed_distance,
        sprint_distance: match.sprint_distance,
        accelerations: match.accelerations,
        decelerations: match.decelerations,
        max_velocity: match.max_velocity,
        meterage_per_minute: match.meterage_per_minute,
        total_duration: match.total_duration,
        game_position: match.game_position,
        status: match.status
      }))

      setPlayerData(formattedData)
      
      // Calculate position-based scores
      const scores = calculatePlayerScores(formattedData)
      setPlayerScores(scores)
    } catch (err) {
      console.error('Error fetching player data:', err)
      setError('Failed to load player match data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getPlayerName = (player: SquadPlayer): string => {
    return player.full_name || `${player.first_name} ${player.last_name}`
  }

  const selectedPlayer = players.find(p => p.player_id === selectedPlayerId)

  return (
    <div className="player-analysis">
      <div className="player-analysis-header">
        <h3>Player Performance Analysis</h3>
        <p>Track individual player metrics across all matches</p>
      </div>

      {/* Player Selection */}
      <div className="player-selector-card">
        <div className="selector-header">
          <User size={20} />
          <label>Select Player</label>
        </div>
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="player-select"
        >
          <option value="">Choose a player...</option>
          {players.map(player => (
            <option key={player.player_id} value={player.player_id}>
              {getPlayerName(player)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {loading && (
        <div className="loading-spinner">Loading player data...</div>
      )}

      {selectedPlayerId && !loading && playerData.length > 0 && (
        <div className="charts-container">
          <div className="charts-header">
            <h4>
              <TrendingUp size={20} />
              {getPlayerName(selectedPlayer!)} - Performance Trends
            </h4>
            <p>{playerData.length} matches analyzed</p>
          </div>

          <div className="charts-grid">
            {/* Distance Chart */}
            <div className="chart-card">
              <h5>Total Distance (m)</h5>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={playerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="rival_name" 
                    stroke="#ccc"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ccc" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `vs ${label}`}
                    formatter={(value: number) => [`${value.toFixed(0)}m`, 'Distance']}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #FFD700' }}
                  />
                  <Line type="monotone" dataKey="total_distance" stroke="#FFD700" strokeWidth={3} dot={{ fill: '#FFD700', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Intensity Chart */}
            <div className="chart-card">
              <h5>Intensity (%)</h5>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={playerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="rival_name" 
                    stroke="#ccc"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ccc" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `vs ${label}`}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Intensity']}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #FF6B35' }}
                  />
                  <Line type="monotone" dataKey="intensity" stroke="#FF6B35" strokeWidth={3} dot={{ fill: '#FF6B35', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* High Speed Distance Chart */}
            <div className="chart-card">
              <h5>High Speed Distance (m)</h5>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={playerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="rival_name" 
                    stroke="#ccc"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ccc" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `vs ${label}`}
                    formatter={(value: number) => [`${value.toFixed(0)}m`, 'High Speed']}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #4CAF50' }}
                  />
                  <Bar dataKey="high_speed_distance" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sprint Distance Chart */}
            <div className="chart-card">
              <h5>Sprint Distance (m)</h5>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={playerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="rival_name" 
                    stroke="#ccc"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ccc" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `vs ${label}`}
                    formatter={(value: number) => [`${value.toFixed(0)}m`, 'Sprint']}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #E91E63' }}
                  />
                  <Bar dataKey="sprint_distance" fill="#E91E63" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Accelerations Chart */}
            <div className="chart-card">
              <h5>Accelerations</h5>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={playerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="rival_name" 
                    stroke="#ccc"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ccc" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `vs ${label}`}
                    formatter={(value: number) => [value, 'Accelerations']}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2196F3' }}
                  />
                  <Bar dataKey="accelerations" fill="#2196F3" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Max Velocity Chart */}
            <div className="chart-card">
              <h5>Max Velocity (km/h)</h5>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={playerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="rival_name" 
                    stroke="#ccc"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#ccc" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(label) => `vs ${label}`}
                    formatter={(value: number) => [`${value.toFixed(1)} km/h`, 'Max Speed']}
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #9C27B0' }}
                  />
                  <Line type="monotone" dataKey="max_velocity" stroke="#9C27B0" strokeWidth={3} dot={{ fill: '#9C27B0', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Position-Based Performance Scores */}
            <div className="scores-section">
              <h4>Position-Based Performance Scores (100 = Benchmark)</h4>
              <p>Scores based on {selectedPlayer && playerData[0]?.game_position ? `${playerData[0].game_position} position` : 'position'} benchmarks</p>
              
              <div className="score-charts-grid">
                {/* Overall Score Chart */}
                <div className="chart-card">
                  <h5>Overall Performance Score</h5>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={playerScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="rival_name" 
                        stroke="#ccc"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#ccc" fontSize={12} domain={[0, 150]} />
                      <Tooltip 
                        labelFormatter={(label) => `vs ${label}`}
                        formatter={(value: number) => [`${value}`, 'Score']}
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #FFD700' }}
                      />
                      <Line type="monotone" dataKey="overallScore" stroke="#FFD700" strokeWidth={4} dot={{ fill: '#FFD700', strokeWidth: 2, r: 5 }} />
                      {/* Benchmark line at 100 */}
                      <Line type="monotone" dataKey={() => 100} stroke="#666" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Distance Score Chart */}
                <div className="chart-card">
                  <h5>Distance Score</h5>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={playerScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="rival_name" 
                        stroke="#ccc"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#ccc" fontSize={12} domain={[0, 150]} />
                      <Tooltip 
                        labelFormatter={(label) => `vs ${label}`}
                        formatter={(value: number) => [`${value}`, 'Distance Score']}
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #4CAF50' }}
                      />
                      <Bar dataKey="distanceScore" fill="#4CAF50" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Intensity Score Chart */}
                <div className="chart-card">
                  <h5>Intensity Score</h5>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={playerScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="rival_name" 
                        stroke="#ccc"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#ccc" fontSize={12} domain={[0, 150]} />
                      <Tooltip 
                        labelFormatter={(label) => `vs ${label}`}
                        formatter={(value: number) => [`${value}`, 'Intensity Score']}
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #FF9800' }}
                      />
                      <Bar dataKey="intensityScore" fill="#FF9800" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* High Speed Score Chart */}
                <div className="chart-card">
                  <h5>High Speed Running Score</h5>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={playerScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="rival_name" 
                        stroke="#ccc"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#ccc" fontSize={12} domain={[0, 150]} />
                      <Tooltip 
                        labelFormatter={(label) => `vs ${label}`}
                        formatter={(value: number) => [`${value}`, 'High Speed Score']}
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #2196F3' }}
                      />
                      <Bar dataKey="highSpeedScore" fill="#2196F3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Sprint Score Chart */}
                <div className="chart-card">
                  <h5>Sprint Distance Score</h5>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={playerScores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis 
                        dataKey="rival_name" 
                        stroke="#ccc"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#ccc" fontSize={12} domain={[0, 150]} />
                      <Tooltip 
                        labelFormatter={(label) => `vs ${label}`}
                        formatter={(value: number) => [`${value}`, 'Sprint Score']}
                        contentStyle={{ background: '#1a1a1a', border: '1px solid #E91E63' }}
                      />
                      <Bar dataKey="sprintScore" fill="#E91E63" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedPlayerId && !loading && playerData.length === 0 && (
        <div className="no-data">
          <Calendar size={48} />
          <h4>No match data found</h4>
          <p>This player hasn't played in any uploaded matches yet</p>
        </div>
      )}
    </div>
  )
} 