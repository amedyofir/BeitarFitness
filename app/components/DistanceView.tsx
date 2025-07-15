'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Save, X } from 'lucide-react'

interface WeeklyData {
  player_name: string
  week: string
  total_distance: number
  target_km: number
  date: string
  notes?: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      total_distance: number
      target_km: number
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

export default function DistanceView() {
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
          total_distance: record.total_distance,
          target_km: record.target_km,
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
      
      const totalDistance = records.reduce((sum, record) => sum + (record.total_distance || 0), 0)
      const targetKm = records[0].target_km || 0
      const firstNote = records.find(r => r.notes && r.notes.trim())?.notes || ''
      
      result.push({
        player_name,
        week,
        total_distance: totalDistance,
        target_km: targetKm,
        date: records[0].date,
        notes: firstNote
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const formatDistance = (distance: number): string => {
    return (distance / 1000).toFixed(1) + 'km'
  }

  const getPerformanceClass = (actualValue: number, targetValue: number): string => {
    if (targetValue === 0) return 'performance-none'
    const percentage = (actualValue / targetValue) * 100
    if (percentage < 20) return 'performance-critical'
    if (percentage >= 100) return 'performance-excellent'
    return 'performance-below'
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
          ...prevData[editingMissingNote.player],
          [editingMissingNote.week]: {
            total_distance: 0,
            target_km: 0,
            notes: editingMissingNote.notes
          }
        }
      }))

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
        <span>Loading distance data...</span>
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
    <div className="distance-view-section">
      <div className="distance-grid">
        <div className="grid-header">
          <div className="player-header">Player</div>
          {weeks.map((week, index) => {
            // Get target from first available player data for this week
            const weekTarget = players.find(player => playerData[player]?.[week])
              ? playerData[players.find(player => playerData[player]?.[week])!][week]?.target_km || 0
              : 0
            
            return (
              <div key={week} className="week-header-distance">
                <div className="week-number">W{index + 1}</div>
                <div className="week-dates">
                  {week.split(' - ')[0].split(' ').slice(0, 2).join(' ')}
                </div>
                <div className="week-target">
                  Target: {weekTarget}km
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid-body">
          {/* Average Row */}
          <div className="player-row average-row">
            <div className="player-name-distance average-label">AVERAGE</div>
            {weeks.map(week => {
              // Calculate average for players who have data in this week
              const playersWithData = players.filter(player => playerData[player]?.[week])
              
              // Filter out zero values from distance calculation
              const validDistances = playersWithData
                .map(player => playerData[player][week]?.total_distance || 0)
                .filter(distance => distance > 0)
              
              const avgDistance = validDistances.length > 0 ? 
                validDistances.reduce((sum, distance) => sum + distance, 0) / validDistances.length : 0
              const weekTarget = playersWithData.find(player => playerData[player]?.[week])
                ? playerData[playersWithData.find(player => playerData[player]?.[week])!][week]?.target_km || 0
                : 0
              
              return (
                <div key={week} className="data-cell-distance average-cell">
                  {validDistances.length > 0 ? (
                    <div className="cell-content-distance">
                      <div className={`distance-large ${getPerformanceClass(avgDistance, weekTarget * 1000)}`}>
                        {formatDistance(avgDistance)}
                      </div>
                      <div className="player-count">({validDistances.length} players)</div>
                    </div>
                  ) : (
                    <div className="missing-cell">No data</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Player Performance Rows */}
          {players.map(player => (
            <div key={player} className="player-row">
              <div className="player-name-distance">{player}</div>
              {weeks.map(week => {
                const data = playerData[player]?.[week]
                return (
                  <div key={week} className="data-cell-distance">
                    {data ? (
                      <div className="cell-content-distance">
                        <div className={`distance-large ${getPerformanceClass(data.total_distance, data.target_km * 1000)}`}>
                          {formatDistance(data.total_distance)}
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
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 