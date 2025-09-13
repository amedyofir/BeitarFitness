'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { isExcludedPlayer } from '../../lib/constants'
import { Loader2 } from 'lucide-react'

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

export default function AllDataView() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])

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
          vir_intensity: record.vir_intensity,
          target_km: record.target_km,
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
      const accelerationEfforts = records.reduce((sum, record) => sum + (record.acceleration_b3_efforts_gen2 || 0), 0)
      const decelerationEfforts = records.reduce((sum, record) => sum + (record.deceleration_b3_efforts_gen2 || 0), 0)
      const hsrDistance = records.reduce((sum, record) => sum + (record.high_speed_running_total_distance_b6 || 0), 0)
      const sprintDistance = records.reduce((sum, record) => sum + (record.very_high_speed_running_total_distance_b7 || 0), 0)
      
      // Intensity calculation: sum(high_speed)*0.35/600 + sum(acceleration)*0.25/35 + sum(deceleration)*0.2/30 + sum(sprint)*0.2/100
      const virIntensity = (hsrDistance * 0.35 / 600) + (accelerationEfforts * 0.25 / 35) + (decelerationEfforts * 0.2 / 30) + (sprintDistance * 0.2 / 100)
      
      const targetKm = records[0].target_km || 0
      const targetIntensity = records[0].target_intensity || 0
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

  const formatDistance = (distance: number): string => {
    return (distance / 1000).toFixed(1) + 'km'
  }

  const formatIntensity = (intensity: number): string => {
    return (intensity * 100).toFixed(0) + '%'
  }

  const getPerformanceClass = (actualValue: number, targetValue: number): string => {
    if (targetValue === 0) return 'performance-none'
    const percentage = (actualValue / targetValue) * 100
    if (percentage < 20) return 'performance-critical'
    if (percentage >= 100) return 'performance-excellent'
    return 'performance-below'
  }

  const getWeekNumber = (week: string, weeks: string[]): number => {
    return weeks.indexOf(week) + 1
  }

  if (loading) {
    return (
      <div className="loading">
        <Loader2 />
        <span>Loading all data...</span>
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
    <div className="all-data-section">
      <div className="all-data-horizontal-container">
        {/* Header Row */}
        <div className="all-data-header-row">
          <div className="player-column-header">Player</div>
          <div className="weeks-scroll-container">
            <div className="weeks-header">
              {weeks.map((week, index) => (
                <div key={week} className="week-header-all-data">
                  <div className="week-number">W{index + 1}</div>
                  <div className="week-dates">
                    {week.split(' - ')[0].split(' ').slice(0, 2).join(' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Player Rows */}
        <div className="all-data-rows">
          {players.map(player => (
            <div key={player} className="all-data-player-row">
              <div className="player-name-sticky">{player}</div>
              <div className="player-weeks-scroll">
                {weeks.map(week => {
                  const data = playerData[player]?.[week]
                  return (
                    <div key={week} className="all-data-week-cell">
                      {data ? (
                        <div className="all-data-cell-content">
                          <div className={`distance-value ${getPerformanceClass(data.total_distance, data.target_km * 1000)}`}>
                            {formatDistance(data.total_distance)}
                          </div>
                          <div className={`intensity-value ${getPerformanceClass(data.vir_intensity * 100, data.target_intensity)}`}>
                            {formatIntensity(data.vir_intensity)}
                          </div>
                          {data.notes && (
                            <div className="notes-indicator" title={data.notes}>
                              📝
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="missing-data">-</div>
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