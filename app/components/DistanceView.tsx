'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Save, X, Download } from 'lucide-react'
import generatePDF from 'react-to-pdf'
import html2canvas from 'html2canvas'

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
  const targetRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = () => {
    if (targetRef.current) {
      generatePDF(() => targetRef.current, {
        filename: 'distance-report.pdf',
        page: { margin: 20 }
      })
    }
  }

  const handleDownloadImage = () => {
    if (targetRef.current) {
      html2canvas(targetRef.current, {
        backgroundColor: '#000000',
        useCORS: true,
        allowTaint: true,
        scale: 2
      }).then(canvas => {
        const link = document.createElement('a')
        link.download = 'distance-report.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      })
    }
  }
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
  const formatDateToDDMMYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${month}-${year}`
  }

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
      
      // Fetch all data using pagination to bypass Supabase limits
      const fetchAllData = async () => {
        let allData = []
        let from = 0
        const pageSize = 1000
        
        while (true) {
          const { data: pageData, error: pageError } = await supabase
            .from('weekly_load')
            .select('*')
            .order('date', { ascending: true })
            .range(from, from + pageSize - 1)
          
          if (pageError) throw pageError
          if (!pageData || pageData.length === 0) break
          
          allData.push(...pageData)
          
          if (pageData.length < pageSize) break
          from += pageSize
        }
        
        return allData
      }
      
      const data = await fetchAllData()
      const error = null
      
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
        // Skip excluded players (including name variations)
        const excludedPlayers = ['Zohar Zasno', 'Zohar Zesano', 'Silva Kani', 'Dabush', 'Deri', 'Nehorai Dabush', 'Liel Deri']
        if (excludedPlayers.includes(record.player_name)) {
          return
        }
        
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
      // Skip excluded players (including name variations)
      const excludedPlayers = ['Zohar Zasno', 'Zohar Zesano', 'Silva Kani', 'Dabush', 'Deri', 'Nehorai Dabush', 'Liel Deri']
      if (excludedPlayers.includes(record.player_name)) {
        return
      }
      
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
      const underscoreIndex = key.indexOf('_')
      const player_name = key.substring(0, underscoreIndex)
      const week = key.substring(underscoreIndex + 1)
      
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
    // Format the distance as an integer with thousands separator
    return Math.round(distance).toLocaleString('en-US')
  }

  const getPerformanceClass = (actualValue: number, targetValue: number): string => {
    if (targetValue === 0) return 'performance-none'
    const percentage = (actualValue / targetValue) * 100
    if (percentage >= 97) return 'performance-excellent'  // Green: 97% and above
    if (percentage >= 85) return 'performance-warning'    // Orange: 85%-97%  
    return 'performance-critical'                          // Red: below 85%
  }

  const formatPlayerName = (fullName: string): string => {
    // Special cases for Cohen family
    if (fullName === 'Yarden Cohen') return 'Y. COHEN'
    if (fullName === 'Gil Cohen') return 'G. COHEN'
          // Special case for Ben Shimol
      if (fullName === 'Ziv Ben shimol') return 'BEN SHIMOL'

    // For all other players, show only last name in uppercase
    const nameParts = fullName.split(' ')
    if (nameParts.length > 1) {
      return nameParts[nameParts.length - 1].toUpperCase()
    }
    return fullName.toUpperCase()
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
      <div className="distance-header-actions">
        <button onClick={handleDownloadPDF} className="download-btn">
          <Download size={16} />
          PDF
        </button>
        <button onClick={handleDownloadImage} className="download-btn">
          <Download size={16} />
          PNG
        </button>
      </div>
      <div ref={targetRef}>
        <div className="pdf-header">
          <div className="pdf-header-content">
            <img src="/beitar-logo.png" alt="FCBJ Logo" className="pdf-header-logo" />
            <h1 className="pdf-header-title">FCBJ - Scouting & Data</h1>
          </div>
        </div>
        <div className="distance-horizontal-container">
          {/* Header Row */}
          <div className="distance-header-row">
            <div className="player-column-header">Player</div>
            <div className="weeks-scroll-container">
              <div className="weeks-header">
                {weeks.map((week, index) => {
                  // Get target from first available player data for this week
                  const weekTarget = players.find(player => playerData[player]?.[week])
                    ? playerData[players.find(player => playerData[player]?.[week])!][week]?.target_km || 0
                    : 0
                  
                  return (
                    <div key={week} className="week-header-horizontal">
                      <div className="week-number">W{index + 1}</div>
                      <div className="week-dates">
                        {week}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Average Row */}
          <div className="distance-player-row average-row">
            <div className="player-column-name average-label">AVERAGE</div>
            <div className="weeks-scroll-container">
              <div className="weeks-data">
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
                    <div key={week} className="week-data-cell average-cell">
                      {validDistances.length > 0 ? (
                        <div className="cell-content-horizontal">
                          <div className={`distance-compact ${getPerformanceClass(avgDistance, weekTarget * 1000)}`}>
                            {formatDistance(avgDistance)}
                          </div>
                        </div>
                      ) : (
                        <div className="missing-cell">No data</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Player Rows */}
          {players.map(player => (
            <div key={player} className="distance-player-row">
              <div className="player-column-name">{formatPlayerName(player)}</div>
              <div className="weeks-scroll-container">
                <div className="weeks-data">
                  {weeks.map(week => {
                    const data = playerData[player]?.[week]
                    return (
                      <div key={week} className="week-data-cell">
                        {data ? (
                          <div className="cell-content-horizontal">
                            <div className={`distance-compact ${getPerformanceClass(data.total_distance, data.target_km * 1000)}`}>
                              {formatDistance(data.total_distance)}
                            </div>
                          </div>
                        ) : (
                          <div className="missing-week-content">
                            <div className="missing-week-placeholder">
                              <span className="missing-indicator">-</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}