'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Download, Loader2 } from 'lucide-react'
import generatePDF from 'react-to-pdf'
import html2canvas from 'html2canvas'

interface WeeklyData {
  player_name: string
  week: string
  vir_intensity: number
  target_intensity: number
  date: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      vir_intensity: number
      target_intensity: number
    }
  }
}



export default function IntensityView() {
  const targetRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = () => {
    if (targetRef.current) {
      generatePDF(() => targetRef.current, {
        filename: 'intensity-report.pdf',
        page: { margin: 20 }
      })
    }
  }

  const handleDownloadImage = () => {
    if (targetRef.current) {
      // Apply print styles temporarily for PNG export
      const printStyleSheet = document.createElement('style')
      printStyleSheet.textContent = `
        .pdf-header, 
        .intensity-horizontal-container {
          background-color: black !important;
          color: #FFD700 !important;
        }
        .intensity-header-row,
        .week-data-cell,
        .player-column-header,
        .player-name-sticky,
        .player-weeks-scroll,
        .week-header-horizontal {
          background-color: black !important;
          color: #FFD700 !important;
        }
        .week-data-cell {
          border-color: #333 !important;
        }
      `
      document.head.appendChild(printStyleSheet)
      
      // Wait a moment for styles to apply
      setTimeout(() => {
        html2canvas(targetRef.current!, {
          backgroundColor: '#000000',
          useCORS: true,
          allowTaint: true,
          scale: 2
        }).then(canvas => {
          const link = document.createElement('a')
          link.download = 'intensity-report.png'
          link.href = canvas.toDataURL('image/png')
          link.click()
          
          // Remove temporary styles
          document.head.removeChild(printStyleSheet)
        })
      }, 100)
    }
  }

  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])


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

  const formatDateToDDMMYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${month}-${year}`
  }



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
    return new Date(startDateStr)
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
        if (!playerWeeklyData[record.player_name]) {
          playerWeeklyData[record.player_name] = {}
        }
        
        playerWeeklyData[record.player_name][record.week] = {
          vir_intensity: record.vir_intensity,
          target_intensity: record.target_intensity
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
      const underscoreIndex = key.indexOf('_')
      const player_name = key.substring(0, underscoreIndex)
      const week = key.substring(underscoreIndex + 1)
      
      // Calculate totals for the weighted intensity formula
      const accelerationEfforts = records.reduce((sum, record) => sum + (record.acceleration_b3_efforts_gen2 || 0), 0)
      const decelerationEfforts = records.reduce((sum, record) => sum + (record.deceleration_b3_efforts_gen2 || 0), 0)
      const hsrDistance = records.reduce((sum, record) => sum + (record.high_speed_running_total_distance_b6 || 0), 0)
      const sprintDistance = records.reduce((sum, record) => sum + (record.very_high_speed_running_total_distance_b7 || 0), 0)
      
      // Intensity calculation: sum(high_speed)*0.35/600 + sum(acceleration)*0.25/35 + sum(deceleration)*0.2/30 + sum(sprint)*0.2/100
      const virIntensity = (hsrDistance * 0.35 / 600) + (accelerationEfforts * 0.25 / 35) + (decelerationEfforts * 0.2 / 30) + (sprintDistance * 0.2 / 100)
      
      const targetIntensity = records[0].target_intensity || 0
      
      result.push({
        player_name,
        week,
        vir_intensity: virIntensity,
        target_intensity: targetIntensity,
        date: records[0].date
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const formatIntensity = (intensity: number): string => {
    return (intensity * 100).toFixed(0) + '%'
  }

  const getPerformanceClass = (playerValue: number, weekAverage: number): string => {
    if (weekAverage === 0 || weekAverage === null || weekAverage === undefined) {
      return 'performance-none'
    }
    
    // Compare player value to average
    if (playerValue >= weekAverage) return 'performance-excellent'  // Green - Above average
    if (playerValue >= weekAverage * 0.9) return 'performance-warning'  // Orange - Within 10% of average
    return 'performance-critical'  // Red - More than 10% below average
  }

  const getIntensityPerformanceClass = (playerIntensity: number, week: string): string => {
    // Get all valid intensities for this week to calculate average
    const weekIntensities = players
      .map(player => playerData[player]?.[week]?.vir_intensity)
      .filter(intensity => intensity && intensity > 0)
    
    if (weekIntensities.length === 0) return 'performance-none'
    
    // Calculate average
    const average = weekIntensities.reduce((sum, intensity) => sum + intensity, 0) / weekIntensities.length
    
    // Compare player to average
    if (playerIntensity >= average) return 'performance-excellent'  // Green - Above average
    if (playerIntensity >= average * 0.9) return 'performance-warning'  // Orange - Within 10% of average
    return 'performance-critical'  // Red - More than 10% below average
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
        <div className="intensity-horizontal-container">
          {/* Header Row */}
          <div className="intensity-header-row">
            <div className="player-column-header">Player</div>
            <div className="weeks-scroll-container">
              <div className="weeks-header">
                {weeks.map((week, index) => {
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
          <div className="intensity-player-row average-row">
            <div className="player-name-sticky average-label">AVERAGE</div>
            <div className="player-weeks-scroll">
              <div className="weeks-data">
                {weeks.map(week => {
                  // Calculate average for players who have data in this week
                  const playersWithData = players.filter(player => playerData[player]?.[week])
                  
                  // Filter out zero values from intensity calculation
                  const validIntensities = playersWithData
                    .map(player => playerData[player][week]?.vir_intensity || 0)
                    .filter(intensity => intensity > 0)
                  
                  const avgIntensity = validIntensities.length > 0 ? 
                    validIntensities.reduce((sum, intensity) => sum + intensity, 0) / validIntensities.length : 0
                  
                  return (
                    <div key={week} className="week-data-cell average-cell">
                      {validIntensities.length > 0 ? (
                                                  <div className="cell-content-horizontal">
                            <div className="intensity-compact performance-none">
                              {Math.round(avgIntensity * 100).toLocaleString('en-US')}%
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

          {/* Player Rows */}
          {players.map(player => (
            <div key={player} className="intensity-player-row">
              <div className="player-name-sticky">{formatPlayerName(player)}</div>
              <div className="player-weeks-scroll">
                <div className="weeks-data">
                  {weeks.map(week => {
                    const data = playerData[player]?.[week]
                    return (
                      <div key={week} className="week-data-cell">
                        {data ? (
                          <div className="cell-content-horizontal">
                            <div className={`intensity-compact ${getIntensityPerformanceClass(data.vir_intensity, week)}`}>
                              {Math.round(data.vir_intensity * 100).toLocaleString('en-US')}%
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