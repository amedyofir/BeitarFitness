'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { isExcludedPlayer } from '../../lib/constants'
import { Loader2, X } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  InteractionItem,
  ScatterController,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Chart } from 'react-chartjs-2'

// Register Chart.js components including BarController and LineController for production deployment
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
  ChartDataLabels
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
  const [isMobile, setIsMobile] = useState(false)
  
  // Note editing states
  const [editingNote, setEditingNote] = useState<{ player: string; week: string; notes: string } | null>(null)
  const [editingMissingNote, setEditingMissingNote] = useState<{ player: string; week: string; notes: string } | null>(null)

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        // Skip excluded players
        if (isExcludedPlayer(record.player_name)) {
          return
        }
        
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
      
    } catch (err: any) {
      console.error('Error processing data:', err)
      setError(`Error processing data: ${err.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const processWeeklyData = (data: any[]): WeeklyData[] => {
    const weeklyGroups: { [key: string]: any[] } = {}
    
    data.forEach(record => {
      // Skip excluded players
      if (isExcludedPlayer(record.player_name)) {
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
            if (d.distance === 0) return 'rgba(128, 128, 128, 0.8)' // Gray for no data
            if (d.distance >= averageDistance) return 'rgba(34, 197, 94, 0.8)' // Green for above average
            return 'rgba(59, 130, 246, 0.8)' // Blue for below average
          }),
          borderColor: weekData.map(d => {
            if (d.distance === 0) return 'rgba(128, 128, 128, 1)'
            if (d.distance >= averageDistance) return 'rgba(34, 197, 94, 1)'
            return 'rgba(59, 130, 246, 1)'
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
          borderDash: [5, 5],
          datalabels: {
            display: function(context: any) {
              return isMobile && context.dataIndex === 0
            },
            color: '#FFD700',
            font: {
              size: 8,
              weight: 'bold' as const
            },
            formatter: (value: number) => Math.round(value),
            anchor: 'end' as const,
            align: 'top' as const
          }
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
          pointRadius: isMobile ? 5 : 8,
          pointHoverRadius: isMobile ? 7 : 10,
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
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'Distance' : `Distance - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'Distance (m)',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
      }
    }
  }

  const meterageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'Meterage per Minute' : `Meterage per Minute - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'Meterage per Minute (m/min)',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
      }
    }
  }

  const highSpeedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'High Speed Distance' : `High Speed Distance - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'High Speed Distance (m)',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
      }
    }
  }

  const sprintChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'Sprint Distance' : `Sprint Distance - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'Sprint Distance (m)',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
      }
    }
  }

  const accelerationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'Accelerations' : `Acceleration Efforts - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'Acceleration Efforts',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
      }
    }
  }

  const decelerationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'Decelerations' : `Deceleration Efforts - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'Deceleration Efforts',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
      }
    }
  }

  const maxVelocityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: false // Default to false, individual datasets will override
      },
      legend: {
        position: isMobile ? 'bottom' as const : 'top' as const,
        labels: {
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 14,
            weight: 'bold' as const
          },
          padding: isMobile ? 8 : 12,
          usePointStyle: true,
          pointStyle: 'rect'
        }
      },
      title: {
        display: true,
        text: isMobile ? 'Maximum Velocity' : `Maximum Velocity - ${selectedWeek}`,
        color: '#FFD700',
        font: {
          size: isMobile ? 14 : 18,
          weight: 'bold' as const
        },
        padding: isMobile ? 10 : 20
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
            size: isMobile ? 4 : 12,
            weight: 'bold' as const
          },
          maxRotation: isMobile ? 90 : 45,
          minRotation: isMobile ? 90 : 45
        },
        grid: {
          color: 'rgba(255, 215, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          display: !isMobile, // Hide y-axis ticks on mobile
          color: '#FFD700',
          font: {
            size: isMobile ? 10 : 12
          }
        },
        grid: {
          display: !isMobile, // Hide y-axis grid lines on mobile
          color: 'rgba(255, 215, 0, 0.1)'
        },
        title: {
          display: !isMobile, // Hide y-axis title on mobile
          text: 'Maximum Velocity (km/h)',
          color: '#FFD700',
          font: {
            size: isMobile ? 12 : 14,
            weight: 'bold' as const
          }
        }
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 10,
        right: isMobile ? 0 : 10,
        top: isMobile ? 0 : 10,
        bottom: isMobile ? 60 : 40
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
      <div className="chart-controls" style={{ 
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 1rem' : '0'
      }}>
        <div className="week-selector" style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '0.5rem' : '1rem'
        }}>
          <label htmlFor="week-select" style={{
            fontSize: isMobile ? '14px' : '16px',
            fontWeight: 'bold',
            color: '#FFD700'
          }}>Select Week:</label>
          <select
            id="week-select"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="week-select-dropdown"
            style={{
              fontSize: isMobile ? '14px' : '16px',
              padding: isMobile ? '0.5rem' : '0.75rem',
              borderRadius: '4px',
              border: '1px solid #FFD700',
              backgroundColor: '#1a1a1a',
              color: '#FFD700',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            {weeks.map((week, index) => (
              <option key={week} value={week}>
                W{index + 1} - {week}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart-container" style={{
        height: isMobile ? '400px' : '500px',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {chartData && (
          <Chart type="bar" data={chartData} options={chartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ 
        height: isMobile ? '400px' : '500px',
        marginTop: isMobile ? '1rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {meterageChartData && (
          <Chart type="bar" data={meterageChartData} options={meterageChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ 
        height: isMobile ? '400px' : '500px',
        marginTop: isMobile ? '1rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {highSpeedChartData && (
          <Chart type="bar" data={highSpeedChartData} options={highSpeedChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ 
        height: isMobile ? '400px' : '500px',
        marginTop: isMobile ? '1rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {sprintChartData && (
          <Chart type="bar" data={sprintChartData} options={sprintChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ 
        height: isMobile ? '400px' : '500px',
        marginTop: isMobile ? '1rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {accelerationChartData && (
          <Chart type="bar" data={accelerationChartData} options={accelerationChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ 
        height: isMobile ? '400px' : '500px',
        marginTop: isMobile ? '1rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {decelerationChartData && (
          <Chart type="bar" data={decelerationChartData} options={decelerationChartOptions} />
        )}
      </div>

      <div className="chart-container" style={{ 
        height: isMobile ? '400px' : '500px',
        marginTop: isMobile ? '1rem' : '2rem',
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '0 0.5rem' : '0'
      }}>
        {maxVelocityChartData && (
          <Chart type="bar" data={maxVelocityChartData} options={maxVelocityChartOptions} />
        )}
      </div>

      {/* Note Management Section */}
      <div className="note-management-section" style={{ 
        marginTop: isMobile ? '1.5rem' : '2rem',
        padding: isMobile ? '0 1rem' : '0'
      }}>
        <h3 style={{ 
          color: '#FFD700', 
          marginBottom: '1rem',
          fontSize: isMobile ? '18px' : '24px',
          textAlign: isMobile ? 'center' : 'left'
        }}>Player Notes - {selectedWeek}</h3>
        
        <div className="notes-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: isMobile ? '0.75rem' : '1rem',
          marginBottom: isMobile ? '1.5rem' : '2rem'
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
                padding: isMobile ? '0.75rem' : '1rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? '0.5rem' : '0'
                }}>
                  <strong style={{ 
                    color: hasData ? '#FFD700' : '#999',
                    fontSize: isMobile ? '14px' : '16px'
                  }}>
                    {player}
                    {!hasData && ' (No training data)'}
                  </strong>
                  
                  {hasData ? (
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      <button
                        onClick={() => startEditingNote(player, selectedWeek)}
                        style={{
                          padding: isMobile ? '0.4rem 0.75rem' : '0.25rem 0.5rem',
                          backgroundColor: '#FFD700',
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: isMobile ? '14px' : '12px',
                          fontWeight: 'bold',
                          flex: isMobile ? '1' : 'none'
                        }}
                      >
                        {notes ? 'Edit' : 'Add Note'}
                      </button>
                      
                      {notes && (
                        <button
                          onClick={() => deleteNote(player, selectedWeek)}
                          style={{
                            padding: isMobile ? '0.4rem 0.75rem' : '0.25rem 0.5rem',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: isMobile ? '14px' : '12px',
                            fontWeight: 'bold',
                            flex: isMobile ? '1' : 'none'
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
                        padding: isMobile ? '0.4rem 0.75rem' : '0.25rem 0.5rem',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '14px' : '12px',
                        fontWeight: 'bold',
                        width: isMobile ? '100%' : 'auto'
                      }}
                    >
                      Add Note
                    </button>
                  )}
                </div>
                
                <div style={{ 
                  color: hasData ? '#fff' : '#ccc',
                  fontSize: isMobile ? '14px' : '16px',
                  fontStyle: notes ? 'normal' : 'italic',
                  lineHeight: '1.4'
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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #FFD700',
            borderRadius: '8px',
            padding: isMobile ? '1.5rem' : '2rem',
            maxWidth: isMobile ? '100%' : '500px',
            width: isMobile ? '100%' : '90%',
            maxHeight: isMobile ? '90vh' : 'auto',
            overflowY: isMobile ? 'auto' : 'visible'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '0.5rem' : '0'
            }}>
              <h3 style={{ 
                color: '#FFD700', 
                margin: 0,
                fontSize: isMobile ? '18px' : '20px',
                textAlign: isMobile ? 'center' : 'left'
              }}>
                Edit Note - {editingNote.player}
              </h3>
              <button
                onClick={() => setEditingNote(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFD700',
                  cursor: 'pointer',
                  fontSize: isMobile ? '20px' : '24px',
                  padding: '0.25rem'
                }}
              >
                <X size={isMobile ? 20 : 24} />
              </button>
            </div>
            
            <textarea
              value={editingNote.notes}
              onChange={(e) => setEditingNote({...editingNote, notes: e.target.value})}
              placeholder="Enter notes for this player..."
              style={{
                width: '100%',
                minHeight: isMobile ? '120px' : '100px',
                padding: isMobile ? '0.75rem' : '0.5rem',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #FFD700',
                borderRadius: '4px',
                fontSize: isMobile ? '16px' : '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={() => setEditingNote(null)}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => saveNote(editingNote.player, editingNote.week, editingNote.notes)}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                  backgroundColor: '#FFD700',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '16px' : '14px'
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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #666',
            borderRadius: '8px',
            padding: isMobile ? '1.5rem' : '2rem',
            maxWidth: isMobile ? '100%' : '500px',
            width: isMobile ? '100%' : '90%',
            maxHeight: isMobile ? '90vh' : 'auto',
            overflowY: isMobile ? 'auto' : 'visible'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '0.5rem' : '0'
            }}>
              <h3 style={{ 
                color: '#999', 
                margin: 0,
                fontSize: isMobile ? '16px' : '18px',
                textAlign: isMobile ? 'center' : 'left'
              }}>
                Add Note - {editingMissingNote.player} (No training data)
              </h3>
              <button
                onClick={() => setEditingMissingNote(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: isMobile ? '20px' : '24px',
                  padding: '0.25rem'
                }}
              >
                <X size={isMobile ? 20 : 24} />
              </button>
            </div>
            
            <textarea
              value={editingMissingNote.notes}
              onChange={(e) => setEditingMissingNote({...editingMissingNote, notes: e.target.value})}
              placeholder="Enter notes for this player..."
              style={{
                width: '100%',
                minHeight: isMobile ? '120px' : '100px',
                padding: isMobile ? '0.75rem' : '0.5rem',
                backgroundColor: '#2a2a2a',
                color: '#fff',
                border: '1px solid #666',
                borderRadius: '4px',
                fontSize: isMobile ? '16px' : '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '1rem'
              }}
            />
            
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              justifyContent: 'flex-end',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={() => setEditingMissingNote(null)}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: isMobile ? '16px' : '14px',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveMissingNote}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '16px' : '14px'
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