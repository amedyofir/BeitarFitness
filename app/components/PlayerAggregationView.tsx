'use client'

import React, { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, Clock, Zap, Activity } from 'lucide-react'
import { RawMatchdayReportService } from '../../lib/rawMatchdayReportService'
import { PlayerSeasonAggregation } from '../../types/rawMatchdayReport'

export default function PlayerAggregationView() {
  const [players, setPlayers] = useState<PlayerSeasonAggregation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState('2025-2026')
  const [selectedTeam, setSelectedTeam] = useState('all')
  const [sortBy, setSortBy] = useState<keyof PlayerSeasonAggregation>('avg_total_distance')

  useEffect(() => {
    fetchPlayerData()
  }, [selectedSeason])

  const fetchPlayerData = async () => {
    setLoading(true)
    try {
      const result = await RawMatchdayReportService.getPlayerSeasonAggregation(selectedSeason)
      if (result.success && result.data) {
        setPlayers(result.data)
      }
    } catch (error) {
      console.error('Error fetching player data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString()
  }

  const formatDecimal = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals)
  }

  const filteredAndSortedPlayers = players
    .filter(player => selectedTeam === 'all' || player.team_name.toLowerCase().includes(selectedTeam.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortBy] as number
      const bVal = b[sortBy] as number
      return bVal - aVal // Descending order
    })

  const uniqueTeams = Array.from(new Set(players.map(p => p.team_name)))

  if (loading) {
    return (
      <div className="player-aggregation-loading">
        <div className="spinner"></div>
        <p>Loading player statistics...</p>
      </div>
    )
  }

  return (
    <div className="player-aggregation-view">
      <style jsx>{`
        .player-aggregation-view {
          background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
          border-radius: 12px;
          padding: 24px;
          color: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
          border-bottom: 2px solid #FFD700;
          padding-bottom: 20px;
        }

        .title {
          color: #FFD700;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .subtitle {
          color: #888;
          font-size: 14px;
          margin: 0;
        }

        .controls {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .control-label {
          font-size: 12px;
          color: #888;
          font-weight: 600;
          text-transform: uppercase;
        }

        select {
          padding: 8px 12px;
          border: 1px solid #444;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 14px;
          cursor: pointer;
        }

        .stats-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .summary-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }

        .summary-icon {
          color: #FFD700;
          margin-bottom: 8px;
        }

        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }

        .summary-label {
          font-size: 12px;
          color: #888;
          text-transform: uppercase;
        }

        .players-table {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .table-header {
          background: rgba(255, 215, 0, 0.1);
          padding: 12px 0;
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
          gap: 8px;
          align-items: center;
        }

        .header-cell {
          color: #FFD700;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          text-align: center;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .header-cell:hover {
          background: rgba(255, 215, 0, 0.1);
        }

        .header-cell.active {
          background: rgba(255, 215, 0, 0.2);
        }

        .header-cell:first-child {
          text-align: left;
        }

        .player-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
          gap: 8px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          align-items: center;
        }

        .player-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .player-cell {
          padding: 4px 8px;
          font-size: 14px;
          text-align: center;
        }

        .player-cell:first-child {
          text-align: left;
        }

        .player-name {
          color: #fff;
          font-weight: 600;
        }

        .player-team {
          color: #888;
          font-size: 12px;
          margin-top: 2px;
        }

        .metric-value {
          color: #FFD700;
          font-weight: 600;
        }

        .secondary-value {
          color: #888;
          font-size: 12px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #444;
          border-top: 4px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .player-aggregation-loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          color: #fff;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .no-data {
          text-align: center;
          padding: 60px 20px;
          color: #888;
        }
      `}</style>

      <div className="header">
        <h1 className="title">Player Season Statistics</h1>
        <p className="subtitle">Aggregated performance data across all matchdays</p>
      </div>

      <div className="controls">
        <div className="control-group">
          <label className="control-label">Season</label>
          <select value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)}>
            <option value="2025-2026">2025-2026</option>
            <option value="2023-2024">2023-2024</option>
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Team</label>
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="all">All Teams</option>
            {uniqueTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label className="control-label">Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as keyof PlayerSeasonAggregation)}>
            <option value="avg_total_distance">Avg Distance</option>
            <option value="games_played">Games Played</option>
            <option value="avg_meters_per_minute">Meters/Minute</option>
            <option value="max_speed">Max Speed</option>
            <option value="avg_sprint_distance">Avg Sprint</option>
            <option value="total_distance_season">Total Distance</option>
          </select>
        </div>
      </div>

      {filteredAndSortedPlayers.length > 0 && (
        <div className="stats-summary">
          <div className="summary-card">
            <Users className="summary-icon" size={24} />
            <div className="summary-value">{filteredAndSortedPlayers.length}</div>
            <div className="summary-label">Total Players</div>
          </div>
          
          <div className="summary-card">
            <Target className="summary-icon" size={24} />
            <div className="summary-value">
              {formatNumber(filteredAndSortedPlayers.reduce((sum, p) => sum + p.avg_total_distance, 0) / filteredAndSortedPlayers.length)}m
            </div>
            <div className="summary-label">Avg Distance</div>
          </div>
          
          <div className="summary-card">
            <Clock className="summary-icon" size={24} />
            <div className="summary-value">
              {formatDecimal(filteredAndSortedPlayers.reduce((sum, p) => sum + p.avg_minutes, 0) / filteredAndSortedPlayers.length)}
            </div>
            <div className="summary-label">Avg Minutes</div>
          </div>
          
          <div className="summary-card">
            <Zap className="summary-icon" size={24} />
            <div className="summary-value">
              {formatDecimal(Math.max(...filteredAndSortedPlayers.map(p => p.max_speed)))}
            </div>
            <div className="summary-label">Highest Speed</div>
          </div>
        </div>
      )}

      <div className="players-table">
        <div className="table-header">
          <div 
            className={`header-cell ${sortBy === 'player' ? 'active' : ''}`}
            onClick={() => setSortBy('player')}
          >
            Player
          </div>
          <div 
            className={`header-cell ${sortBy === 'games_played' ? 'active' : ''}`}
            onClick={() => setSortBy('games_played')}
          >
            Games
          </div>
          <div 
            className={`header-cell ${sortBy === 'avg_total_distance' ? 'active' : ''}`}
            onClick={() => setSortBy('avg_total_distance')}
          >
            Avg Dist (m)
          </div>
          <div 
            className={`header-cell ${sortBy === 'avg_meters_per_minute' ? 'active' : ''}`}
            onClick={() => setSortBy('avg_meters_per_minute')}
          >
            M/Min
          </div>
          <div 
            className={`header-cell ${sortBy === 'avg_sprint_distance' ? 'active' : ''}`}
            onClick={() => setSortBy('avg_sprint_distance')}
          >
            Avg Sprint
          </div>
          <div 
            className={`header-cell ${sortBy === 'avg_speed' ? 'active' : ''}`}
            onClick={() => setSortBy('avg_speed')}
          >
            Avg Speed
          </div>
          <div 
            className={`header-cell ${sortBy === 'max_speed' ? 'active' : ''}`}
            onClick={() => setSortBy('max_speed')}
          >
            Max Speed
          </div>
          <div 
            className={`header-cell ${sortBy === 'total_minutes_season' ? 'active' : ''}`}
            onClick={() => setSortBy('total_minutes_season')}
          >
            Total Min
          </div>
        </div>

        {filteredAndSortedPlayers.length === 0 ? (
          <div className="no-data">
            <p>No player data found for the selected filters.</p>
          </div>
        ) : (
          filteredAndSortedPlayers.map((player, index) => (
            <div key={`${player.player}-${player.team_name}`} className="player-row">
              <div className="player-cell">
                <div className="player-name">{player.player}</div>
                <div className="player-team">{player.team_name}</div>
              </div>
              <div className="player-cell metric-value">{player.games_played}</div>
              <div className="player-cell metric-value">{formatNumber(player.avg_total_distance)}</div>
              <div className="player-cell metric-value">{formatDecimal(player.avg_meters_per_minute)}</div>
              <div className="player-cell metric-value">{formatNumber(player.avg_sprint_distance)}</div>
              <div className="player-cell metric-value">{formatDecimal(player.avg_speed, 1)} km/h</div>
              <div className="player-cell metric-value">{formatDecimal(player.max_speed, 1)} km/h</div>
              <div className="player-cell secondary-value">{formatNumber(player.total_minutes_season)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}