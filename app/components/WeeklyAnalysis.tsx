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
  notes?: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      total_distance: number
      vir_intensity: number
      target_km: number
      target_intensity: number
      notes?: string
    }
  }
}

interface EditingTarget {
  week: string
  target_km: number
  target_intensity: number
}

interface EditingNote {
  player: string
  week: string
  notes: string
}

interface EditingMissingNote {
  player: string
  week: string
  notes: string
}



export default function WeeklyAnalysis() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null)
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null)
  const [editingMissingNote, setEditingMissingNote] = useState<EditingMissingNote | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUpdatingNote, setIsUpdatingNote] = useState(false)
  const [isUpdatingMissingNote, setIsUpdatingMissingNote] = useState(false)
  const [weekTargets, setWeekTargets] = useState<{[week: string]: {target_km: number, target_intensity: number}}>({})


  // Helper function to get week start date from a date
  const getWeekStartDate = (date: Date): Date => {
    const weekStart = new Date(date)
    const dayOfWeek = weekStart.getDay() // 0 = Sunday, 1 = Monday, etc.
    weekStart.setDate(weekStart.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0) // Reset time to start of day
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
    console.log('Original week string:', weekString)
    console.log('Start date string:', startDateStr)
    
    // Parse the date string more carefully to avoid timezone issues
    const dateParts = startDateStr.split(' ')
    const month = dateParts[0]
    const day = parseInt(dateParts[1].replace(',', ''))
    const year = parseInt(dateParts[2])
    
    console.log('Parsed components:', { month, day, year })
    
    // Create date in local timezone at noon to avoid timezone edge cases
    const date = new Date(year, getMonthIndex(month), day, 12, 0, 0, 0)
    
    console.log('Final date:', date)
    console.log('Day of week:', date.getDay(), '(0=Sunday)')
    console.log('Date for database:', date.toISOString().split('T')[0])
    
    return date
  }

  // Helper function to get month index from month name
  const getMonthIndex = (monthName: string): number => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']
    return months.indexOf(monthName)
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
          target_intensity: record.target_intensity,
          notes: record.notes || ''
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
      // Combine notes from all records for this player/week
      const allNotes = records.map(r => r.notes).filter(note => note && note.trim()).join('; ')
      
      result.push({
        player_name,
        week,
        total_distance: totalDistance,
        vir_intensity: virIntensity,
        target_km: targetKm,
        target_intensity: targetIntensity,
        date: records[0].date,
        notes: allNotes
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

  // Note editing functions
  const startEditingNote = (player: string, week: string) => {
    const currentNotes = playerData[player]?.[week]?.notes || ''
    setEditingNote({
      player,
      week,
      notes: currentNotes
    })
  }

  const cancelEditingNote = () => {
    setEditingNote(null)
  }

  const saveNote = async () => {
    if (!editingNote) return

    setIsUpdatingNote(true)
    try {
      // Update all records for this player/week with the new note
      const weekStart = getStartDateFromWeekString(editingNote.week)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const { error } = await supabase
        .from('weekly_load')
        .update({ notes: editingNote.notes })
        .eq('player_name', editingNote.player)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lt('date', weekEnd.toISOString().split('T')[0])

      if (error) {
        console.error('Error updating note:', error)
        alert('Failed to update note')
        return
      }

      // Update local state
      setPlayerData(prevData => ({
        ...prevData,
        [editingNote.player]: {
          ...prevData[editingNote.player],
          [editingNote.week]: {
            ...prevData[editingNote.player][editingNote.week],
            notes: editingNote.notes
          }
        }
      }))

      setEditingNote(null)
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note')
    } finally {
      setIsUpdatingNote(false)
    }
  }

  // Missing week note functions
  const startEditingMissingNote = (player: string, week: string) => {
    setEditingMissingNote({
      player,
      week,
      notes: ''
    })
  }

  const cancelEditingMissingNote = () => {
    setEditingMissingNote(null)
  }

  const saveMissingNote = async () => {
    if (!editingMissingNote) return

    setIsUpdatingMissingNote(true)
    try {
      // Get the first date of the week
      const weekStart = getStartDateFromWeekString(editingMissingNote.week)
      
      // Create a new record with minimal data and the note
      const newRecord = {
        player_name: editingMissingNote.player,
        period_name: 'NOTE_ONLY',
        period_number: 0,
        date: weekStart.toISOString().split('T')[0],
        day_name: weekStart.toLocaleDateString('en-US', { weekday: 'long' }),
        activity_name: 'Missing Week Note',
        total_duration: '00:00:00',
        total_distance: 0,
        maximum_velocity: 0,
        acceleration_b3_efforts_gen2: 0,
        deceleration_b3_efforts_gen2: 0,
        rhie_total_bouts: 0,
        meterage_per_minute: 0,
        high_speed_running_total_distance_b6: 0,
        velocity_b4_plus_total_efforts_gen2: 0,
        very_high_speed_running_total_distance_b7: 0,
        running_imbalance: 0,
        hmld_gen2: 0,
        hmld_per_min_gen2: 0,
        target_km: weekTargets[editingMissingNote.week]?.target_km || 0,
        target_intensity: weekTargets[editingMissingNote.week]?.target_intensity || 0,
        notes: editingMissingNote.notes
      }

      const { error } = await supabase
        .from('weekly_load')
        .insert([newRecord])

      if (error) {
        console.error('Error creating missing note record:', error)
        alert('Failed to save note')
        return
      }

      // Update local state to show the new note
      setPlayerData(prevData => ({
        ...prevData,
        [editingMissingNote.player]: {
          ...prevData[editingMissingNote.player],
          [editingMissingNote.week]: {
            total_distance: 0,
            vir_intensity: 0,
            target_km: weekTargets[editingMissingNote.week]?.target_km || 0,
            target_intensity: weekTargets[editingMissingNote.week]?.target_intensity || 0,
            notes: editingMissingNote.notes
          }
        }
      }))

      setEditingMissingNote(null)
      
      // Optionally refresh the data to ensure consistency
      // fetchWeeklyData()
    } catch (error) {
      console.error('Error saving missing note:', error)
      alert('Failed to save note')
    } finally {
      setIsUpdatingMissingNote(false)
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
      {/* Weekly Analysis Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Player Weekly Performance</h3>
          <p>Click on target values to edit weekly targets • Click on notes to add explanations • Click on missing weeks to add notes</p>
        </div>
        
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Player</th>
                {weeks.map(week => (
                  <th key={week}>{week}</th>
                ))}
              </tr>
              <tr>
                <th className="week-number-header">Week #</th>
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
                <td className="target-label">TARGETS</td>
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
                            className="target-input-km"
                            placeholder="KM"
                          />
                          <input
                            type="number"
                            value={editingTarget.target_intensity}
                            onChange={(e) => setEditingTarget({
                              ...editingTarget,
                              target_intensity: parseInt(e.target.value) || 0
                            })}
                            className="target-input-intensity"
                            placeholder="Intensity"
                          />
                          <div className="target-buttons">
                            <button
                              onClick={saveTarget}
                              disabled={isUpdating}
                              className="btn-save-target"
                              title="Save target"
                            >
                              {isUpdating ? <Loader2 className="spin" /> : <Save />}
                            </button>
                            <button
                              onClick={cancelEditingTarget}
                              className="btn-cancel-target"
                              title="Cancel"
                            >
                              <X />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="target-display"
                          onClick={() => startEditingTarget(week)}
                        >
                          <div className="target-badge distance-target">
                            {data?.target_km || 0} KM
                          </div>
                          <div className="target-badge intensity-target">
                            {data?.target_intensity || 0}%
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
              
              {/* Average Row */}
              <tr className="average-row-table">
                <td className="average-label">AVERAGE</td>
                {weeks.map(week => {
                  // Calculate average for players who have data in this week (excluding zeros)
                  const playersWithData = players.filter(player => playerData[player]?.[week])
                  
                  // Filter out zero values for distance
                  const validDistances = playersWithData
                    .map(player => playerData[player][week]?.total_distance || 0)
                    .filter(distance => distance > 0)
                  
                  // Filter out zero values for intensity
                  const validIntensities = playersWithData
                    .map(player => playerData[player][week]?.vir_intensity || 0)
                    .filter(intensity => intensity > 0)
                  
                  const totalDistance = validDistances.reduce((sum, distance) => sum + distance, 0)
                  const totalIntensity = validIntensities.reduce((sum, intensity) => sum + intensity, 0)
                  
                  const avgDistance = validDistances.length > 0 ? totalDistance / validDistances.length : 0
                  const avgIntensity = validIntensities.length > 0 ? totalIntensity / validIntensities.length : 0
                  
                  const weekTargetData = weekTargets[week]
                  
                  return (
                    <td key={week} className="average-cell-table">
                      {(validDistances.length > 0 || validIntensities.length > 0) ? (
                        <div className="average-content">
                          <div className={`distance-badge ${getPerformanceClass(avgDistance, (weekTargetData?.target_km || 0) * 1000, 'distance')}`}>
                            {formatDistance(avgDistance)}
                          </div>
                          <div className={`intensity-badge ${getPerformanceClass(avgIntensity * 100, weekTargetData?.target_intensity || 0, 'intensity')}`}>
                            {formatIntensity(avgIntensity)}
                          </div>
                          <div className="player-count">({Math.max(validDistances.length, validIntensities.length)} players)</div>
                        </div>
                      ) : (
                        <div className="no-data-average">No data</div>
                      )}
                    </td>
                  )
                })}
              </tr>
              
              {/* Player Performance Rows */}
              {players.map(player => (
                <tr key={player}>
                  <td className="player-name">{player}</td>
                  {weeks.map(week => {
                    const data = playerData[player]?.[week]
                    
                    return (
                      <td key={week} className="performance-cell">
                        {data ? (
                          <div className="performance-content">
                            <div className="distance-badge">
                              {formatDistance(data.total_distance)}
                            </div>
                            <div className="intensity-badge">
                              {formatIntensity(data.vir_intensity)}
                            </div>
                            {/* Notes Section */}
                            <div className="notes-cell">
                              {editingNote && editingNote.player === player && editingNote.week === week ? (
                                <div className="note-editing">
                                  <textarea
                                    value={editingNote.notes}
                                    onChange={(e) => setEditingNote({
                                      ...editingNote,
                                      notes: e.target.value
                                    })}
                                    className="note-input"
                                    placeholder="Add notes..."
                                    rows={2}
                                  />
                                  <div className="note-buttons">
                                    <button
                                      onClick={saveNote}
                                      disabled={isUpdatingNote}
                                      className="btn-save-note"
                                      title="Save note"
                                    >
                                      {isUpdatingNote ? <Loader2 className="spin" /> : <Save />}
                                    </button>
                                    <button
                                      onClick={cancelEditingNote}
                                      className="btn-cancel-note"
                                      title="Cancel"
                                    >
                                      <X />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="note-display"
                                  onClick={() => startEditingNote(player, week)}
                                  title={data.notes ? `Notes: ${data.notes}` : "Click to add notes"}
                                >
                                  {data.notes ? (
                                    <div className="note-text">📝 {data.notes}</div>
                                  ) : (
                                    <div className="note-placeholder">💭 Add note</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="missing-week-content">
                            {editingMissingNote && editingMissingNote.player === player && editingMissingNote.week === week ? (
                              <div className="missing-note-editing">
                                <textarea
                                  value={editingMissingNote.notes}
                                  onChange={(e) => setEditingMissingNote({
                                    ...editingMissingNote,
                                    notes: e.target.value
                                  })}
                                  className="note-input"
                                  placeholder="Add notes for missing week..."
                                  rows={2}
                                />
                                <div className="note-buttons">
                                  <button
                                    onClick={saveMissingNote}
                                    disabled={isUpdatingMissingNote}
                                    className="btn-save-note"
                                    title="Save note"
                                  >
                                    {isUpdatingMissingNote ? <Loader2 className="spin" /> : <Save />}
                                  </button>
                                  <button
                                    onClick={cancelEditingMissingNote}
                                    className="btn-cancel-note"
                                    title="Cancel"
                                  >
                                    <X />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="missing-week-placeholder"
                                onClick={() => startEditingMissingNote(player, week)}
                                title="Click to add notes for this missing week"
                              >
                                <span className="missing-indicator">❌ Missing</span>
                                <span className="add-note-hint">💭 Add note</span>
                              </div>
                            )}
                          </div>
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
    </div>
  )
} 