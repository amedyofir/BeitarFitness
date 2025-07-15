'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, X } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  InteractionItem,
  ScatterController,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
)

interface WeeklyData {
  player_name: string
  week: string
  total_distance: number
  total_duration: string
  high_speed_distance: number
  sprint_distance: number
  acceleration_efforts: number
  deceleration_efforts: number
  max_velocity: number
  target_km: number
  date: string
  notes?: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      total_distance: number
      total_duration: string
      high_speed_distance: number
      sprint_distance: number
      acceleration_efforts: number
      deceleration_efforts: number
      max_velocity: number
      target_km: number
      notes?: string
    }
  }
}

export default function BarChartView() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  
  // Note editing states
  const [editingNote, setEditingNote] = useState<{ player: string; week: string; notes: string } | null>(null)
  const [editingMissingNote, setEditingMissingNote] = useState<{ player: string; week: string; notes: string } | null>(null)


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

  // Helper function to parse duration string (HH:MM:SS) to total minutes
  const parseDurationToMinutes = (duration: string): number => {
    if (!duration || duration === '00:00:00') return 0
    
    const parts = duration.split(':')
    if (parts.length !== 3) return 0
    
    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseInt(parts[2]) || 0
    
    return hours * 60 + minutes + seconds / 60
  }

  // Note editing functions
  const saveNote = async (player: string, week: string, notes: string) => {
    try {
      const weekStartDate = getStartDateFromWeekString(week)
      const dateString = weekStartDate.toISOString().split('T')[0]
      
      const { error } = await supabase
        .from('weekly_load')
        .update({ notes })
        .eq('player_name', player)
        .eq('date', dateString)
        .eq('period_name', 'Session')
      
      if (error) throw error
      
      // Update local state
      setPlayerData(prevData => ({
        ...prevData,
        [player]: {
          ...prevData[player],
          [week]: {
            ...prevData[player][week],
            notes
          }
        }
      }))
      
      setEditingNote(null)
      await fetchWeeklyData()
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const deleteNote = async (player: string, week: string) => {
    try {
      const weekStartDate = getStartDateFromWeekString(week)
      const dateString = weekStartDate.toISOString().split('T')[0]
      
      const { error } = await supabase
        .from('weekly_load')
        .update({ notes: null })
        .eq('player_name', player)
        .eq('date', dateString)
        .eq('period_name', 'Session')
      
      if (error) throw error
      
      // Update local state
      setPlayerData(prevData => ({
        ...prevData,
        [player]: {
          ...prevData[player],
          [week]: {
            ...prevData[player][week],
            notes: ''
          }
        }
      }))
      
      await fetchWeeklyData()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const saveMissingNote = async () => {
    if (!editingMissingNote) return
    
    try {
      const weekStartDate = getStartDateFromWeekString(editingMissingNote.week)
      const dateString = weekStartDate.toISOString().split('T')[0]
      
      // Create a new record with all metrics set to 0 but with the note
      const { error } = await supabase
        .from('weekly_load')
        .insert({
          player_name: editingMissingNote.player,
          date: dateString,
          period_name: 'NOTE_ONLY',
          total_distance: 0,
          total_duration: '00:00:00',
          high_speed_running_total_distance_b6: 0,
          very_high_speed_running_total_distance_b7: 0,
          acceleration_b3_efforts_gen2: 0,
          deceleration_b3_efforts_gen2: 0,
          maximum_velocity: 0,
          target_km: 0,
          notes: editingMissingNote.notes
        })
      
      if (error) throw error
      
      // Update local state to show the new note
      setPlayerData(prevData => ({
        ...prevData,
        [editingMissingNote.player]: {
          ...(prevData[editingMissingNote.player] || {}), // Handle case where player doesn't exist yet
          [editingMissingNote.week]: {
            total_distance: 0,
            total_duration: '00:00:00',
            high_speed_distance: 0,
            sprint_distance: 0,
            acceleration_efforts: 0,
            deceleration_efforts: 0,
            max_velocity: 0,
            target_km: 0,
            notes: editingMissingNote.notes
          }
        }
      }))

      // Refresh data to ensure NOTE_ONLY records are properly loaded
      await fetchWeeklyData()

      setEditingMissingNote(null)
    } catch (error) {
      console.error('Error saving missing note:', error)
    }
  }

  const startEditingNote = (player: string, week: string) => {
    const currentNotes = playerData[player]?.[week]?.notes || ''
    setEditingNote({ player, week, notes: currentNotes })
  }

  const startEditingMissingNote = (player: string, week: string) => {
    setEditingMissingNote({ player, week, notes: '' })
  }

  useEffect(() => {
    fetchWeeklyData()
  }, [])

  useEffect(() => {
    if (weeks.length > 0 && !selectedWeek) {
      setSelectedWeek(weeks[weeks.length - 1]) // Default to most recent week
    }
  }, [weeks, selectedWeek])



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
          total_duration: record.total_duration,
          high_speed_distance: record.high_speed_distance,
          sprint_distance: record.sprint_distance,
          acceleration_efforts: record.acceleration_efforts,
          deceleration_efforts: record.deceleration_efforts,
          max_velocity: record.max_velocity,
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
      const highSpeedDistance = records.reduce((sum, record) => sum + (record.high_speed_running_total_distance_b6 || 0), 0)
      const sprintDistance = records.reduce((sum, record) => sum + (record.very_high_speed_running_total_distance_b7 || 0), 0)
      const accelerationEfforts = records.reduce((sum, record) => sum + (record.acceleration_b3_efforts_gen2 || 0), 0)
      const decelerationEfforts = records.reduce((sum, record) => sum + (record.deceleration_b3_efforts_gen2 || 0), 0)
      const maxVelocity = records.reduce((max, record) => Math.max(max, record.maximum_velocity || 0), 0)
      const targetKm = records[0].target_km || 0
      const firstNote = records.find(r => r.notes && r.notes.trim())?.notes || ''
      
      // Calculate total duration for the week
      const totalDurationMinutes = records.reduce((sum, record) => {
        return sum + parseDurationToMinutes(record.total_duration || '00:00:00')
      }, 0)
      
      // Convert back to HH:MM:SS format
      const hours = Math.floor(totalDurationMinutes / 60)
      const minutes = Math.floor(totalDurationMinutes % 60)
      const seconds = Math.floor((totalDurationMinutes % 1) * 60)
      const totalDurationString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      
      result.push({
        player_name,
        week,
        total_distance: totalDistance,
        total_duration: totalDurationString,
        high_speed_distance: highSpeedDistance,
        sprint_distance: sprintDistance,
        acceleration_efforts: accelerationEfforts,
        deceleration_efforts: decelerationEfforts,
        max_velocity: maxVelocity,
        target_km: targetKm,
        date: records[0].date,
        notes: firstNote
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      return {
        player,
        distance: data?.total_distance || 0,
        target: (data?.target_km || 0) * 1000, // Convert km to meters for consistent units
        notes: data?.notes || ''
      }
    })

    // Sort by actual distance (ascending order)
    weekData.sort((a, b) => a.distance - b.distance)

    // Keep distances in meters
    const distances = weekData.map(d => d.distance)
    const targets = weekData.map(d => d.target)
    
    // Calculate average distance (excluding zeros)
    const validDistances = distances.filter(d => d > 0)
    const averageDistance = validDistances.length > 0 ? validDistances.reduce((sum, d) => sum + d, 0) / validDistances.length : 0
    const averages = weekData.map(() => averageDistance)
    
    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'Total Distance (m)',
          data: distances,
          backgroundColor: weekData.map(d => {
            if (d.target === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no target
            const percentage = (d.distance / d.target) * 100
            if (percentage >= 100) return 'rgba(34, 197, 94, 0.8)' // Green for exceeding target
            if (percentage >= 80) return 'rgba(255, 215, 0, 0.8)' // Gold for close to target
            return 'rgba(239, 68, 68, 0.8)' // Red for below target
          }),
          borderColor: weekData.map(d => {
            if (d.target === 0) return 'rgba(128, 128, 128, 1)'
            const percentage = (d.distance / d.target) * 100
            if (percentage >= 100) return 'rgba(34, 197, 94, 1)'
            if (percentage >= 80) return 'rgba(255, 215, 0, 1)'
            return 'rgba(239, 68, 68, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Target (m)',
          data: targets,
          backgroundColor: 'rgba(255, 215, 0, 0.2)',
          borderColor: 'rgba(255, 215, 0, 1)',
          borderWidth: 2,
          type: 'line' as const,
          tension: 0.4,
          pointBackgroundColor: 'rgba(255, 215, 0, 1)',
          pointBorderColor: 'rgba(255, 215, 0, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false
        },
        {
          label: 'Average (m)',
          data: averages,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: 'rgba(59, 130, 246, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.distance * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const getMeteragePerMinuteChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      const distance = data?.total_distance || 0
      const duration = data?.total_duration || '00:00:00'
      const durationMinutes = parseDurationToMinutes(duration)
      
      return {
        player,
        meteragePerMinute: durationMinutes > 0 ? distance / durationMinutes : 0,
        notes: data?.notes || ''
      }
    })

    // Sort by meterage per minute (ascending order)
    weekData.sort((a, b) => a.meteragePerMinute - b.meteragePerMinute)

    const meteragePerMinutes = weekData.map(d => d.meteragePerMinute)
    
    // Calculate average meterage per minute (excluding zeros)
    const validMeteragePerMinutes = meteragePerMinutes.filter(d => d > 0)
    const averageMeteragePerMinute = validMeteragePerMinutes.length > 0 ? 
      validMeteragePerMinutes.reduce((sum, d) => sum + d, 0) / validMeteragePerMinutes.length : 0
    const averages = weekData.map(() => averageMeteragePerMinute)

    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'Meterage per Minute (m/min)',
          data: meteragePerMinutes,
          backgroundColor: weekData.map(d => {
            // Use a gradient based on meterage per minute values
            if (d.meteragePerMinute === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.meteragePerMinute >= averageMeteragePerMinute) return 'rgba(34, 197, 94, 0.8)' // Green for above average
            return 'rgba(59, 130, 246, 0.8)' // Blue for below average
          }),
          borderColor: weekData.map(d => {
            if (d.meteragePerMinute === 0) return 'rgba(128, 128, 128, 1)'
            if (d.meteragePerMinute >= averageMeteragePerMinute) return 'rgba(34, 197, 94, 1)'
            return 'rgba(59, 130, 246, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Average (m/min)',
          data: averages,
          backgroundColor: 'rgba(255, 165, 0, 0.2)',
          borderColor: 'rgba(255, 165, 0, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(255, 165, 0, 1)',
          pointBorderColor: 'rgba(255, 165, 0, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.meteragePerMinute * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const getHighSpeedDistanceChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      return {
        player,
        highSpeedDistance: data?.high_speed_distance || 0,
        notes: data?.notes || ''
      }
    })

    // Sort by high speed distance (ascending order)
    weekData.sort((a, b) => a.highSpeedDistance - b.highSpeedDistance)

    const highSpeedDistances = weekData.map(d => d.highSpeedDistance)
    
    // Calculate average high speed distance (excluding zeros)
    const validHighSpeedDistances = highSpeedDistances.filter(d => d > 0)
    const averageHighSpeedDistance = validHighSpeedDistances.length > 0 ? 
      validHighSpeedDistances.reduce((sum, d) => sum + d, 0) / validHighSpeedDistances.length : 0
    const averages = weekData.map(() => averageHighSpeedDistance)

    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'High Speed Distance (m)',
          data: highSpeedDistances,
          backgroundColor: weekData.map(d => {
            if (d.highSpeedDistance === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.highSpeedDistance >= averageHighSpeedDistance) return 'rgba(255, 99, 132, 0.8)' // Red for above average
            return 'rgba(147, 51, 234, 0.8)' // Purple for below average
          }),
          borderColor: weekData.map(d => {
            if (d.highSpeedDistance === 0) return 'rgba(128, 128, 128, 1)'
            if (d.highSpeedDistance >= averageHighSpeedDistance) return 'rgba(255, 99, 132, 1)'
            return 'rgba(147, 51, 234, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Average (m)',
          data: averages,
          backgroundColor: 'rgba(236, 72, 153, 0.2)',
          borderColor: 'rgba(236, 72, 153, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(236, 72, 153, 1)',
          pointBorderColor: 'rgba(236, 72, 153, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.highSpeedDistance * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const getSprintDistanceChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      return {
        player,
        sprintDistance: data?.sprint_distance || 0,
        notes: data?.notes || ''
      }
    })

    // Sort by sprint distance (ascending order)
    weekData.sort((a, b) => a.sprintDistance - b.sprintDistance)

    const sprintDistances = weekData.map(d => d.sprintDistance)
    
    // Calculate average sprint distance (excluding zeros)
    const validSprintDistances = sprintDistances.filter(d => d > 0)
    const averageSprintDistance = validSprintDistances.length > 0 ? 
      validSprintDistances.reduce((sum, d) => sum + d, 0) / validSprintDistances.length : 0
    const averages = weekData.map(() => averageSprintDistance)

    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'Sprint Distance (m)',
          data: sprintDistances,
          backgroundColor: weekData.map(d => {
            if (d.sprintDistance === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.sprintDistance >= averageSprintDistance) return 'rgba(255, 193, 7, 0.8)' // Amber for above average
            return 'rgba(156, 39, 176, 0.8)' // Purple for below average
          }),
          borderColor: weekData.map(d => {
            if (d.sprintDistance === 0) return 'rgba(128, 128, 128, 1)'
            if (d.sprintDistance >= averageSprintDistance) return 'rgba(255, 193, 7, 1)'
            return 'rgba(156, 39, 176, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Average (m)',
          data: averages,
          backgroundColor: 'rgba(255, 87, 34, 0.2)',
          borderColor: 'rgba(255, 87, 34, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(255, 87, 34, 1)',
          pointBorderColor: 'rgba(255, 87, 34, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.sprintDistance * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const getAccelerationChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      return {
        player,
        accelerationEfforts: data?.acceleration_efforts || 0,
        notes: data?.notes || ''
      }
    })

    // Sort by acceleration efforts (ascending order)
    weekData.sort((a, b) => a.accelerationEfforts - b.accelerationEfforts)

    const accelerationEfforts = weekData.map(d => d.accelerationEfforts)
    
    // Calculate average acceleration efforts (excluding zeros)
    const validAccelerationEfforts = accelerationEfforts.filter(d => d > 0)
    const averageAccelerationEfforts = validAccelerationEfforts.length > 0 ? 
      validAccelerationEfforts.reduce((sum, d) => sum + d, 0) / validAccelerationEfforts.length : 0
    const averages = weekData.map(() => averageAccelerationEfforts)

    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'Acceleration Efforts',
          data: accelerationEfforts,
          backgroundColor: weekData.map(d => {
            if (d.accelerationEfforts === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.accelerationEfforts >= averageAccelerationEfforts) return 'rgba(76, 175, 80, 0.8)' // Green for above average
            return 'rgba(33, 150, 243, 0.8)' // Blue for below average
          }),
          borderColor: weekData.map(d => {
            if (d.accelerationEfforts === 0) return 'rgba(128, 128, 128, 1)'
            if (d.accelerationEfforts >= averageAccelerationEfforts) return 'rgba(76, 175, 80, 1)'
            return 'rgba(33, 150, 243, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Average',
          data: averages,
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(76, 175, 80, 1)',
          pointBorderColor: 'rgba(76, 175, 80, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.accelerationEfforts * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const getDecelerationChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      return {
        player,
        decelerationEfforts: data?.deceleration_efforts || 0,
        notes: data?.notes || ''
      }
    })

    // Sort by deceleration efforts (ascending order)
    weekData.sort((a, b) => a.decelerationEfforts - b.decelerationEfforts)

    const decelerationEfforts = weekData.map(d => d.decelerationEfforts)
    
    // Calculate average deceleration efforts (excluding zeros)
    const validDecelerationEfforts = decelerationEfforts.filter(d => d > 0)
    const averageDecelerationEfforts = validDecelerationEfforts.length > 0 ? 
      validDecelerationEfforts.reduce((sum, d) => sum + d, 0) / validDecelerationEfforts.length : 0
    const averages = weekData.map(() => averageDecelerationEfforts)

    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'Deceleration Efforts',
          data: decelerationEfforts,
          backgroundColor: weekData.map(d => {
            if (d.decelerationEfforts === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.decelerationEfforts >= averageDecelerationEfforts) return 'rgba(255, 152, 0, 0.8)' // Orange for above average
            return 'rgba(103, 58, 183, 0.8)' // Deep purple for below average
          }),
          borderColor: weekData.map(d => {
            if (d.decelerationEfforts === 0) return 'rgba(128, 128, 128, 1)'
            if (d.decelerationEfforts >= averageDecelerationEfforts) return 'rgba(255, 152, 0, 1)'
            return 'rgba(103, 58, 183, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Average',
          data: averages,
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          borderColor: 'rgba(255, 152, 0, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(255, 152, 0, 1)',
          pointBorderColor: 'rgba(255, 152, 0, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.decelerationEfforts * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const getMaxVelocityChartData = () => {
    if (!selectedWeek) return null

    const weekData = players.map(player => {
      const data = playerData[player]?.[selectedWeek]
      return {
        player,
        maxVelocity: data?.max_velocity || 0,
        notes: data?.notes || ''
      }
    })

    // Sort by maximum velocity (ascending order)
    weekData.sort((a, b) => a.maxVelocity - b.maxVelocity)

    const maxVelocities = weekData.map(d => d.maxVelocity)
    
    // Calculate average max velocity (excluding zeros)
    const validMaxVelocities = maxVelocities.filter(d => d > 0)
    const averageMaxVelocity = validMaxVelocities.length > 0 ? 
      validMaxVelocities.reduce((sum, d) => sum + d, 0) / validMaxVelocities.length : 0
    const averages = weekData.map(() => averageMaxVelocity)

    return {
      labels: weekData.map(d => d.player),
      datasets: [
        {
          label: 'Maximum Velocity (km/h)',
          data: maxVelocities,
          backgroundColor: weekData.map(d => {
            if (d.maxVelocity === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.maxVelocity >= averageMaxVelocity) return 'rgba(255, 20, 147, 0.8)' // Deep pink for above average
            return 'rgba(138, 43, 226, 0.8)' // Blue violet for below average
          }),
          borderColor: weekData.map(d => {
            if (d.maxVelocity === 0) return 'rgba(128, 128, 128, 1)'
            if (d.maxVelocity >= averageMaxVelocity) return 'rgba(255, 20, 147, 1)'
            return 'rgba(138, 43, 226, 1)'
          }),
          borderWidth: 2,
          borderRadius: 4,
          // Store notes data for click handling
          notes: weekData.map(d => d.notes)
        },
        {
          label: 'Average (km/h)',
          data: averages,
          backgroundColor: 'rgba(255, 140, 0, 0.2)',
          borderColor: 'rgba(255, 140, 0, 1)',
          borderWidth: 3,
          type: 'line' as const,
          tension: 0,
          pointBackgroundColor: 'rgba(255, 140, 0, 1)',
          pointBorderColor: 'rgba(255, 140, 0, 1)',
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderDash: [5, 5]
        },
        {
          label: 'Has Notes',
          data: weekData.map(d => d.notes && d.notes.trim() ? d.maxVelocity * 1.05 : null),
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderColor: 'rgba(255, 255, 255, 1)',
          borderWidth: 2,
          type: 'scatter' as const,
          pointBackgroundColor: 'rgba(0, 0, 0, 1)',
          pointBorderColor: 'rgba(255, 255, 255, 1)',
          pointRadius: 8,
          pointHoverRadius: 10,
          pointStyle: 'circle',
          showLine: false
        }
      ]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `Player Performance - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 3), show the note content
            if (datasetIndex === 3) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  distance: data?.total_distance || 0,
                  target: (data?.target_km || 0) * 1000,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.distance - b.distance)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y + (context.dataset.label.includes('Distance') ? 'm' : '')
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 3) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  distance: data?.total_distance || 0,
                  target: (data?.target_km || 0) * 1000,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.distance - b.distance)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Distance (m)',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  const meterageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `Meterage per Minute - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 2), show the note content
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                const distance = data?.total_distance || 0
                const duration = data?.total_duration || '00:00:00'
                const durationMinutes = parseDurationToMinutes(duration)
                
                return {
                  player,
                  meteragePerMinute: durationMinutes > 0 ? distance / durationMinutes : 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.meteragePerMinute - b.meteragePerMinute)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y + (context.dataset.label.includes('m/min') ? ' m/min' : '')
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                const distance = data?.total_distance || 0
                const duration = data?.total_duration || '00:00:00'
                const durationMinutes = parseDurationToMinutes(duration)
                
                return {
                  player,
                  meteragePerMinute: durationMinutes > 0 ? distance / durationMinutes : 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.meteragePerMinute - b.meteragePerMinute)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Meterage per Minute (m/min)',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  const highSpeedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `High Speed Distance - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 2), show the note content
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  highSpeedDistance: data?.high_speed_distance || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.highSpeedDistance - b.highSpeedDistance)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y + (context.dataset.label.includes('Distance') ? 'm' : '')
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  highSpeedDistance: data?.high_speed_distance || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.highSpeedDistance - b.highSpeedDistance)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'High Speed Distance (m)',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  const sprintChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `Sprint Distance - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 2), show the note content
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  sprintDistance: data?.sprint_distance || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.sprintDistance - b.sprintDistance)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y + (context.dataset.label.includes('Distance') ? 'm' : '')
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  sprintDistance: data?.sprint_distance || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.sprintDistance - b.sprintDistance)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Sprint Distance (m)',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  const accelerationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `Acceleration Efforts - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 2), show the note content
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  accelerationEfforts: data?.acceleration_efforts || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.accelerationEfforts - b.accelerationEfforts)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  accelerationEfforts: data?.acceleration_efforts || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.accelerationEfforts - b.accelerationEfforts)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Acceleration Efforts',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  const decelerationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `Deceleration Efforts - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 2), show the note content
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  decelerationEfforts: data?.deceleration_efforts || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.decelerationEfforts - b.decelerationEfforts)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  decelerationEfforts: data?.deceleration_efforts || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.decelerationEfforts - b.decelerationEfforts)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Deceleration Efforts',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  const maxVelocityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      },
      title: {
        display: true,
        text: `Maximum Velocity - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: 18,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#FFD700',
        bodyColor: '#FFFFFF',
        borderColor: '#FFD700',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            
            // For note indicators (dataset 2), show the note content
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  maxVelocity: data?.max_velocity || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.maxVelocity - b.maxVelocity)
              
              const playerName = currentWeekData[dataIndex]?.player
              const notes = currentWeekData[dataIndex]?.notes
              
              if (notes && notes.trim()) {
                return `📝 ${notes}`
              }
            }
            
            // Default behavior for other datasets
            return context.dataset.label + ': ' + context.parsed.y + (context.dataset.label.includes('km/h') ? ' km/h' : '')
          },
          title: function(context: any) {
            const datasetIndex = context[0].datasetIndex
            const dataIndex = context[0].dataIndex
            
            // For note indicators, show player name
            if (datasetIndex === 2) {
              const currentWeekData = players.map(player => {
                const data = playerData[player]?.[selectedWeek]
                return {
                  player,
                  maxVelocity: data?.max_velocity || 0,
                  notes: data?.notes || ''
                }
              }).sort((a, b) => a.maxVelocity - b.maxVelocity)
              
              return currentWeekData[dataIndex]?.player || context[0].label
            }
            
            return context[0].label
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFD700',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFD700',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Maximum Velocity (km/h)',
          color: '#FFD700',
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <Loader2 />
        <span>Loading chart data...</span>
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

  const chartData = getChartData()
  const meterageChartData = getMeteragePerMinuteChartData()
  const highSpeedChartData = getHighSpeedDistanceChartData()
  const sprintChartData = getSprintDistanceChartData()
  const accelerationChartData = getAccelerationChartData()
  const decelerationChartData = getDecelerationChartData()
  const maxVelocityChartData = getMaxVelocityChartData()

  return (
    <div className="bar-chart-view-section" style={{ position: 'relative' }}>
      <div className="chart-controls">
        <div className="week-selector">
          <label htmlFor="week-select">Select Week:</label>
          <select
            id="week-select"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="week-select-dropdown"
          >
            {weeks.map((week, index) => (
              <option key={week} value={week}>
                W{index + 1} - {week}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart-container">
        {chartData && (
          <Chart type="bar" data={chartData} options={chartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        {meterageChartData && (
          <Chart type="bar" data={meterageChartData} options={meterageChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        {highSpeedChartData && (
          <Chart type="bar" data={highSpeedChartData} options={highSpeedChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        {sprintChartData && (
          <Chart type="bar" data={sprintChartData} options={sprintChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        {accelerationChartData && (
          <Chart type="bar" data={accelerationChartData} options={accelerationChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        {decelerationChartData && (
          <Chart type="bar" data={decelerationChartData} options={decelerationChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ marginTop: '2rem' }}>
        {maxVelocityChartData && (
          <Chart type="bar" data={maxVelocityChartData} options={maxVelocityChartOptions} />
        )}
      </div>

      {/* Note Management Section */}
      <div className="note-management-section" style={{ marginTop: '2rem' }}>
        <h3 style={{ color: '#FFD700', marginBottom: '1rem' }}>Player Notes - {selectedWeek}</h3>
        
        <div className="notes-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {players.map(player => {
            const playerWeekData = playerData[player]?.[selectedWeek]
            const hasData = playerWeekData && (
              playerWeekData.total_distance > 0 ||
              playerWeekData.high_speed_distance > 0 ||
              playerWeekData.sprint_distance > 0 ||
              playerWeekData.acceleration_efforts > 0 ||
              playerWeekData.deceleration_efforts > 0 ||
              playerWeekData.max_velocity > 0
            )
            const notes = playerWeekData?.notes || ''
            
            return (
              <div key={player} style={{
                backgroundColor: hasData ? 'rgba(255, 215, 0, 0.1)' : 'rgba(128, 128, 128, 0.1)',
                border: hasData ? '1px solid #FFD700' : '1px solid #666',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  <strong style={{ color: hasData ? '#FFD700' : '#999' }}>
                    {player}
                    {!hasData && ' (No training data)'}
                  </strong>
                  
                  {hasData ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => startEditingNote(player, selectedWeek)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#FFD700',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        {notes ? 'Edit' : 'Add Note'}
                      </button>
                      
                      {notes && (
                        <button
                          onClick={() => deleteNote(player, selectedWeek)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditingMissingNote(player, selectedWeek)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Add Note
                    </button>
                  )}
                </div>
                
                <div style={{ 
                  color: hasData ? '#fff' : '#ccc',
                  fontSize: '0.9rem',
                  fontStyle: notes ? 'normal' : 'italic'
                }}>
                  {notes || 'No notes'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit Note Modal */}
      {editingNote && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #FFD700',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ color: '#FFD700', margin: 0 }}>
                Edit Note - {editingNote.player}
              </h3>
              <button
                onClick={() => setEditingNote(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFD700',
                  cursor: 'pointer',
                  fontSize: '1.5rem'
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <textarea
              value={editingNote.notes}
              onChange={(e) => setEditingNote({...editingNote, notes: e.target.value})}
              placeholder="Enter notes for this player..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.5rem',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #FFD700',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingNote(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveNote(editingNote.player, editingNote.week, editingNote.notes)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#FFD700',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Missing Note Modal */}
      {editingMissingNote && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #666',
            borderRadius: '8px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ color: '#999', margin: 0 }}>
                Add Note - {editingMissingNote.player} (No training data)
              </h3>
              <button
                onClick={() => setEditingMissingNote(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: '1.5rem'
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <textarea
              value={editingMissingNote.notes}
              onChange={(e) => setEditingMissingNote({...editingMissingNote, notes: e.target.value})}
              placeholder="Enter notes for this player..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.5rem',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #666',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingMissingNote(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveMissingNote}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 