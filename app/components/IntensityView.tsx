'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Save, X } from 'lucide-react'

interface WeeklyData {
  player_name: string
  week: string
  vir_intensity: number
  target_intensity: number
  date: string
  notes?: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      vir_intensity: number
      target_intensity: number
      notes?: string
    }
  }
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

export default function IntensityView() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null)
  const [editingMissingNote, setEditingMissingNote] = useState<EditingMissingNote | null>(null)
  const [isUpdatingNote, setIsUpdatingNote] = useState(false)
  const [isUpdatingMissingNote, setIsUpdatingMissingNote] = useState(false)

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

      const processedData = processWeeklyData(data)
      setWeeklyData(processedData)
      
      const playerWeeklyData: PlayerWeeklyData = {}
      const weekSet = new Set<string>()
      const playerSet = new Set<string>()

      processedData.forEach(record => {
        if (!playerWeeklyData[record.player_name]) {
          playerWeeklyData[record.player_name] = {}
        }
        
        playerWeeklyData[record.player_name][record.week] = {
          vir_intensity: record.vir_intensity,
          target_intensity: record.target_intensity,
          notes: record.notes || ''
        }
        
        weekSet.add(record.week)
        playerSet.add(record.player_name)
      })

      const sortedWeeks = Array.from(weekSet)
        .sort((a, b) => {
          const dateA = getStartDateFromWeekString(a)
          const dateB = getStartDateFromWeekString(b)
          return dateA.getTime() - dateB.getTime()
        })

      setPlayerData(playerWeeklyData)
      setWeeks(sortedWeeks)
      setPlayers(Array.from(playerSet).sort())
      
    } catch (err) {
      console.error('Error processing data:', err)
      setError('Error processing data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const processWeeklyData = (data: any[]): WeeklyData[] => {
    const weeklyGroups: { [key: string]: any[] } = {}
    
    data.forEach(record => {
      const date = new Date(record.date)
      const week = generateWeekString(date)
      
      const key = `${record.player_name}_${week}`
      
      if (!weeklyGroups[key]) {
        weeklyGroups[key] = []
      }
      
      weeklyGroups[key].push(record)
    })

    const result: WeeklyData[] = []
    
    Object.entries(weeklyGroups).forEach(([key, records]) => {
      const [player_name, week] = key.split('_', 2)
      
      // Calculate totals for the weighted intensity formula
      const accelerationEfforts = records.reduce((sum, record) => sum + (record.acceleration_b3_efforts_gen2 || 0), 0)
      const decelerationEfforts = records.reduce((sum, record) => sum + (record.deceleration_b3_efforts_gen2 || 0), 0)
      const hsrDistance = records.reduce((sum, record) => sum + (record.high_speed_running_total_distance_b6 || 0), 0)
      const sprintDistance = records.reduce((sum, record) => sum + (record.very_high_speed_running_total_distance_b7 || 0), 0)
      
      // Calculate virtual intensity components with proper transformations
      const avgVirAcceleration = accelerationEfforts / records.length / 30
      const avgVirDeceleration = decelerationEfforts / records.length / 35
      const avgVirHighSpeedRunning = hsrDistance / records.length / 600
      const avgVirSprintDistance = sprintDistance / records.length
      
      // New weighted intensity formula: (avg(vir_acceleration)*0.25 + avg(vir_deceleration)*0.2 + avg(vir_high_speed_running)*0.35 + avg(vir_sprint_distance))*0.2
      const virIntensity = (avgVirAcceleration * 0.25 + avgVirDeceleration * 0.2 + avgVirHighSpeedRunning * 0.35 + avgVirSprintDistance) * 0.2
      
      const targetIntensity = records[0].target_intensity || 0
      const firstNote = records.find(r => r.notes && r.notes.trim())?.notes || ''
      
      result.push({
        player_name,
        week,
        vir_intensity: virIntensity,
        target_intensity: targetIntensity,
        date: records[0].date,
        notes: firstNote
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const formatIntensity = (intensity: number): string => {
    return (intensity * 100).toFixed(0) + '%'
  }

  const getPerformanceClass = (actualValue: number, targetValue: number): string => {
    if (targetValue === 0 || targetValue === null || targetValue === undefined) {
      return 'performance-none'
    }
    
    const percentage = (actualValue / targetValue) * 100
    
    if (percentage < 20) return 'performance-critical'  // Yellow - Very low performance
    if (percentage >= 100) return 'performance-excellent'  // Green - Meets or exceeds target
    return 'performance-below'  // Red - Below target but above 20%
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
        target_km: 0,
        target_intensity: 0,
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
          ...(prevData[editingMissingNote.player] || {}), // Handle case where player doesn't exist yet
          [editingMissingNote.week]: {
            vir_intensity: 0,
            target_intensity: 0,
            notes: editingMissingNote.notes
          }
        }
      }))

      // Refresh data to ensure NOTE_ONLY records are properly loaded
      await fetchWeeklyData()

      setEditingMissingNote(null)
    } catch (error) {
      console.error('Error saving missing note:', error)
      alert('Failed to save note')
    } finally {
      setIsUpdatingMissingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <Loader2 />
        <span>Loading intensity data...</span>
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
    <div className="intensity-view-section">
      <div className="intensity-horizontal-container">
        {/* Header Row */}
        <div className="intensity-header-row">
          <div className="player-column-header">Player</div>
          <div className="weeks-scroll-container">
            <div className="weeks-header">
              {weeks.map((week, index) => {
                // Get target from first available player data for this week
                const weekTarget = players.find(player => playerData[player]?.[week])
                  ? playerData[players.find(player => playerData[player]?.[week])!][week]?.target_intensity || 0
                  : 0
                
                return (
                  <div key={week} className="week-header-intensity">
                    <div className="week-number">W{index + 1}</div>
                    <div className="week-dates">
                      {week.split(' - ')[0].split(' ').slice(0, 2).join(' ')}
                    </div>
                    <div className="week-target">
                      Target: {weekTarget}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Player Rows */}
        <div className="intensity-rows">
          {/* Average Row */}
          <div className="intensity-player-row average-row">
            <div className="player-name-sticky average-label">AVERAGE</div>
            <div className="player-weeks-scroll">
              {weeks.map(week => {
                // Calculate average for players who have data in this week
                const playersWithData = players.filter(player => playerData[player]?.[week])
                
                // Filter out zero values from intensity calculation
                const validIntensities = playersWithData
                  .map(player => playerData[player][week]?.vir_intensity || 0)
                  .filter(intensity => intensity > 0)
                
                const avgIntensity = validIntensities.length > 0 ? 
                  validIntensities.reduce((sum, intensity) => sum + intensity, 0) / validIntensities.length : 0
                const weekTarget = playersWithData.find(player => playerData[player]?.[week])
                  ? playerData[playersWithData.find(player => playerData[player]?.[week])!][week]?.target_intensity || 0
                  : 0
                
                return (
                  <div key={week} className="intensity-week-cell average-cell">
                    {validIntensities.length > 0 ? (
                      <div className="intensity-cell-content">
                        <div className={`intensity-large ${getPerformanceClass(avgIntensity * 100, weekTarget)}`}>
                          {formatIntensity(avgIntensity)}
                        </div>
                        <div className="player-count">({validIntensities.length} players)</div>
                      </div>
                    ) : (
                      <div className="missing-data">No data</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Player Performance Rows */}
          {players.map(player => (
            <div key={player} className="intensity-player-row">
              <div className="player-name-sticky">{player}</div>
              <div className="player-weeks-scroll">
                {weeks.map(week => {
                  const data = playerData[player]?.[week]
                  return (
                    <div key={week} className="intensity-week-cell">
                      {data ? (
                        <div className="intensity-cell-content">
                          <div className={`intensity-large ${getPerformanceClass(data.vir_intensity * 100, data.target_intensity)}`}>
                            {formatIntensity(data.vir_intensity)}
                          </div>
                          
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
                                    className="btn btn-primary btn-save"
                                    disabled={isUpdatingNote}
                                  >
                                    {isUpdatingNote ? <Loader2 className="spin" /> : <Save />}
                                  </button>
                                  <button
                                    onClick={cancelEditingNote}
                                    className="btn btn-secondary btn-cancel"
                                  >
                                    <X />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="notes-display"
                                onClick={() => startEditingNote(player, week)}
                                title="Click to edit notes"
                              >
                                {data.notes ? (
                                  <div className="note-content">
                                    <span className="note-indicator">💬</span>
                                    <span className="note-text">{data.notes}</span>
                                  </div>
                                ) : (
                                  <div className="note-placeholder">
                                    <span className="note-hint">💭 Add note</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="missing-week-content">
                          {editingMissingNote && editingMissingNote.player === player && editingMissingNote.week === week ? (
                            <div className="note-editing">
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
                                  className="btn btn-primary btn-save"
                                  disabled={isUpdatingMissingNote}
                                >
                                  {isUpdatingMissingNote ? <Loader2 className="spin" /> : <Save />}
                                </button>
                                <button
                                  onClick={cancelEditingMissingNote}
                                  className="btn btn-secondary btn-cancel"
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
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 