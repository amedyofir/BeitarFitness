'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Calendar, TrendingUp, Users, Loader2, Edit2, Save, X } from 'lucide-react'

interface WeeklyData {
  player_name: string
  week: string
  total_distance: number
  vir_intensity: number
  target_km: number
  target_intensity: number
  date: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      total_distance: number
      vir_intensity: number
      target_km: number
      target_intensity: number
    }
  }
}

interface EditingTarget {
  week: string
  target_km: number
  target_intensity: number
}

export default function WeeklyAnalysis() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [weekTargets, setWeekTargets] = useState<{[week: string]: {target_km: number, target_intensity: number}}>({})

  // Helper function to get week start date from a date
  const getWeekStartDate = (date: Date): Date => {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    return weekStart
  }

  // Helper function to generate consistent week string
  const generateWeekString = (date: Date): string => {
    const weekStart = getWeekStartDate(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    
    return `${weekStart.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }

  // Helper function to extract start date from week string
  const getStartDateFromWeekString = (weekString: string): Date => {
    const startDateStr = weekString.split(' - ')[0]
    return new Date(startDateStr)
  }

  useEffect(() => {
    fetchWeeklyData()
  }, [])

  const fetchWeeklyData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data from supabase
      const { data, error } = await supabase
        .from('weekly_load')
        .select('*')
        .order('date', { ascending: true })

      if (error) {
        setError(`Error fetching data: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        setError('No data found. Please upload some fitness data first.')
        return
      }

      // Process data similar to your SQL query
      const processedData = processWeeklyData(data)
      setWeeklyData(processedData)
      
      // Organize data by player and week
      const playerWeeklyData: PlayerWeeklyData = {}
      const weekSet = new Set<string>()
      const playerSet = new Set<string>()
      const weekTargetsMap: {[week: string]: {target_km: number, target_intensity: number}} = {}

      processedData.forEach(record => {
        if (!playerWeeklyData[record.player_name]) {
          playerWeeklyData[record.player_name] = {}
        }
        
        playerWeeklyData[record.player_name][record.week] = {
          total_distance: record.total_distance,
          vir_intensity: record.vir_intensity,
          target_km: record.target_km,
          target_intensity: record.target_intensity
        }
        
        // Store week targets (they should be the same for all players in a week)
        weekTargetsMap[record.week] = {
          target_km: record.target_km,
          target_intensity: record.target_intensity
        }
        
        weekSet.add(record.week)
        playerSet.add(record.player_name)
      })

      // Sort weeks chronologically by their start date
      const sortedWeeks = Array.from(weekSet)
        .sort((a, b) => {
          const dateA = getStartDateFromWeekString(a)
          const dateB = getStartDateFromWeekString(b)
          return dateA.getTime() - dateB.getTime()
        })

      setPlayerData(playerWeeklyData)
      setWeeks(sortedWeeks)
      setPlayers(Array.from(playerSet).sort())
      setWeekTargets(weekTargetsMap)
      
    } catch (err) {
      console.error('Error processing data:', err)
      setError('Error processing data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const processWeeklyData = (data: any[]): WeeklyData[] => {
    const weeklyGroups: { [key: string]: any[] } = {}
    
    // Group by player and week
    data.forEach(record => {
      const date = new Date(record.date)
      const week = generateWeekString(date)
      
      const key = `${record.player_name}_${week}`
      
      if (!weeklyGroups[key]) {
        weeklyGroups[key] = []
      }
      
      weeklyGroups[key].push(record)
    })

    // Calculate aggregations for each group
    const result: WeeklyData[] = []
    
    Object.entries(weeklyGroups).forEach(([key, records]) => {
      const [player_name, week] = key.split('_', 2)
      
      const totalDistance = records.reduce((sum, record) => sum + (record.total_distance || 0), 0)
      const maxVelocity = Math.max(...records.map(r => r.maximum_velocity || 0))
      const accelerationEfforts = records.reduce((sum, record) => sum + (record.acceleration_b3_efforts_gen2 || 0), 0)
      const decelerationEfforts = records.reduce((sum, record) => sum + (record.deceleration_b3_efforts_gen2 || 0), 0)
      const hsrDistance = records.reduce((sum, record) => sum + (record.high_speed_running_total_distance_b6 || 0), 0)
      const sprintDistance = records.reduce((sum, record) => sum + (record.very_high_speed_running_total_distance_b7 || 0), 0)
      
      // Calculate virtual intensity (similar to your SQL query)
      const virTotalDistance = totalDistance / 10000
      const virSprintDistance = sprintDistance / 100
      const virHighSpeedRunning = hsrDistance / 600
      const virAccelerationDeceleration = (accelerationEfforts + decelerationEfforts) / 65
      const virAcceleration = accelerationEfforts / 30
      const virDeceleration = decelerationEfforts / 35
      
      const virIntensity = (virAcceleration + virDeceleration + virHighSpeedRunning) / 3
      
      // Use the first record's target values (they should be consistent for the same player/week)
      const targetKm = records[0].target_km || 0
      const targetIntensity = records[0].target_intensity || 0
      
      result.push({
        player_name,
        week,
        total_distance: totalDistance,
        vir_intensity: virIntensity,
        target_km: targetKm,
        target_intensity: targetIntensity,
        date: records[0].date
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Target editing functions
  const startEditingTarget = (week: string) => {
    const currentData = weekTargets[week]
    setEditingTarget({
      week,
      target_km: (currentData?.target_km || 0) * 1000, // Convert km to meters for editing
      target_intensity: currentData?.target_intensity || 0
    })
  }

  const cancelEditingTarget = () => {
    setEditingTarget(null)
  }

  const saveTarget = async () => {
    if (!editingTarget) return
    
    setIsUpdating(true)
    try {
      // Convert meters back to kilometers for database storage
      const targetKmForDb = editingTarget.target_km / 1000
      
      // Update all records for this week
      const startDate = getStartDateFromWeekString(editingTarget.week)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      
      const { error } = await supabase
        .from('weekly_load')
        .update({
          target_km: targetKmForDb,
          target_intensity: editingTarget.target_intensity
        })
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

      if (error) {
        console.error('Error updating targets:', error)
        setError(`Error updating targets: ${error.message}`)
      } else {
        // Update local state for week targets (store in km)
        setWeekTargets(prev => ({
          ...prev,
          [editingTarget.week]: {
            target_km: targetKmForDb,
            target_intensity: editingTarget.target_intensity
          }
        }))
        
        // Update player data for all players in this week
        setPlayerData(prev => {
          const updated = { ...prev }
          Object.keys(updated).forEach(playerName => {
            if (updated[playerName][editingTarget.week]) {
              updated[playerName][editingTarget.week] = {
                ...updated[playerName][editingTarget.week],
                target_km: targetKmForDb,
                target_intensity: editingTarget.target_intensity
              }
            }
          })
          return updated
        })
        
        setEditingTarget(null)
      }
    } catch (err) {
      console.error('Error saving target:', err)
      setError('Error saving target. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDistance = (distance: number): string => {
    return distance.toFixed(0) + 'm'
  }

  const formatIntensity = (intensity: number): string => {
    return (intensity * 100).toFixed(0) + '%'
  }

  const getPerformanceClass = (actualValue: number, targetValue: number, type: string = ''): string => {
    // Debug logging
    console.log(`Performance check - ${type}:`, { actualValue, targetValue, percentage: targetValue > 0 ? (actualValue / targetValue) * 100 : 0 })
    
    if (targetValue === 0 || targetValue === null || targetValue === undefined) {
      return 'performance-none'
    }
    
    const percentage = (actualValue / targetValue) * 100
    
    if (percentage < 20) return 'performance-critical'  // Yellow - Very low performance
    if (percentage >= 100) return 'performance-excellent'  // Green - Meets or exceeds target
    return 'performance-below'  // Red - Below target but above 20%
  }

  if (loading) {
    return (
      <div className="loading">
        <Loader2 />
        <span>Loading weekly analysis...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={fetchWeeklyData} className="btn btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="analysis-section">
      <h2>Weekly Analysis</h2>
      <p>
        Player performance by week showing total distance and intensity scores
      </p>

      {/* Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <Users color="var(--primary-accent)" />
            </div>
            <div className="stat-info">
              <h3>Total Players</h3>
              <p>{players.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <Calendar color="var(--success-accent)" />
            </div>
            <div className="stat-info">
              <h3>Total Weeks</h3>
              <p>{weeks.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon">
              <TrendingUp color="var(--secondary-accent)" />
            </div>
            <div className="stat-info">
              <h3>Total Records</h3>
              <p>{weeklyData.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Analysis Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Player Weekly Performance</h3>
          <p>Click on target values to edit weekly targets</p>
        </div>
        
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sticky-column">Player</th>
                {weeks.map(week => (
                  <th key={week}>{week}</th>
                ))}
              </tr>
              <tr>
                <th className="sticky-column week-number-header">Week #</th>
                {weeks.map((week, index) => (
                  <th key={`week-${index}`} className="week-number-header">
                    Week {index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Target Row */}
              <tr className="target-row-table">
                <td className="sticky-column target-label">TARGETS</td>
                {weeks.map(week => {
                  const data = weekTargets[week]
                  const isEditing = editingTarget && editingTarget.week === week
                  
                  return (
                    <td key={week} className="target-cell-table">
                      {isEditing ? (
                        <div className="target-editing-inline">
                          <input
                            type="number"
                            value={editingTarget.target_km}
                            onChange={(e) => setEditingTarget({
                              ...editingTarget,
                              target_km: parseInt(e.target.value) || 0
                            })}
                            className="target-input-inline"
                            placeholder="Distance (m)"
                            min="0"
                          />
                          <input
                            type="number"
                            value={editingTarget.target_intensity}
                            onChange={(e) => setEditingTarget({
                              ...editingTarget,
                              target_intensity: parseFloat(e.target.value) || 0
                            })}
                            className="target-input-inline"
                            placeholder="Intensity (%)"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                          <div className="target-buttons-inline">
                            <button
                              onClick={saveTarget}
                              disabled={isUpdating}
                              className="btn-save-inline"
                              title="Save"
                            >
                              {isUpdating ? <Loader2 className="spin" /> : <Save />}
                            </button>
                            <button
                              onClick={cancelEditingTarget}
                              className="btn-cancel-inline"
                              title="Cancel"
                            >
                              <X />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="target-display-inline"
                          onClick={() => startEditingTarget(week)}
                          title="Click to edit targets"
                        >
                          <div className="target-distance-inline">
                            Target Distance: {(data?.target_km || 0) * 1000}m
                          </div>
                          <div className="target-intensity-inline">
                            Target Intensity: {data?.target_intensity || 0}%
                          </div>
                          <Edit2 className="edit-icon-inline" />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
              
              {/* Player Performance Rows */}
              {players.map(player => (
                <tr key={player}>
                  <td className="sticky-column player-name">{player}</td>
                  {weeks.map(week => {
                    const data = playerData[player]?.[week]
                    
                    return (
                      <td key={week} className="performance-cell">
                        {data ? (
                          <div className="performance-content">
                            <div className={`distance-badge ${getPerformanceClass(data.total_distance, data.target_km * 1000, 'distance')}`}>
                              {formatDistance(data.total_distance)}
                            </div>
                            <div className={`intensity-badge ${getPerformanceClass(data.vir_intensity * 100, data.target_intensity, 'intensity')}`}>
                              {formatIntensity(data.vir_intensity)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--secondary-text)' }}>-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="notes-section">
        <h4>Legend:</h4>
        <ul>
          <li><strong>Targets Row:</strong> Click on target values to edit weekly targets for all players</li>
          <li><strong>Performance Rows:</strong> Show actual distance and intensity scores achieved by each player</li>
          <li><strong>Performance Colors:</strong> Green (≥100% of target), Red (20-99% of target), Yellow (&lt;20% of target)</li>
          <li><strong>Target Format:</strong> Distance in kilometers, Intensity as percentage</li>
        </ul>
      </div>
    </div>
  )
} 