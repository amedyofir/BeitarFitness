'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Upload, Scale, TrendingUp, BarChart3, Users, Calendar, Download, User } from 'lucide-react'
import Papa from 'papaparse'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import annotationPlugin from 'chartjs-plugin-annotation'
import html2canvas from 'html2canvas'
import { supabase } from '../../lib/supabase'
import { getPlayerBenchmark, getBenchmarkStatus } from '../../lib/fatBenchmarks'
import { 
  fetchBodyCompositionData, 
  replaceBodyCompositionData, 
  validateBodyCompositionData,
  type BodyCompositionData as ServiceBodyCompositionData 
} from '../../lib/bodyCompositionService'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
  annotationPlugin
)

interface BodyCompositionData {
  player: string
  height: number
  weight: number
  fat: number
  fatMass: number
  leanMass: number
  date: string
  dateObject: Date
}

interface PlayerProfile {
  full_name: string
  profile_picture_url: string
  position?: string
  shirt_number?: number
}

interface CoachNutritionTabProps {
  activeNutritionTab: 'by-player' | 'team-overview'
  setActiveNutritionTab: (tab: 'by-player' | 'team-overview') => void
}

export default function CoachNutritionTab({ activeNutritionTab, setActiveNutritionTab }: CoachNutritionTabProps) {
  const [bodyCompositionData, setBodyCompositionData] = useState<BodyCompositionData[]>([])
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({})
  const [sortBy, setSortBy] = useState<'value' | 'trend' | 'benchmark'>('value')
  const [displayMode, setDisplayMode] = useState<'value' | 'trend' | 'benchmark'>('value')
  const [comparisonMetric, setComparisonMetric] = useState<'fat' | 'weight' | 'leanMass'>('fat')
  const [playerMetrics, setPlayerMetrics] = useState<Record<string, 'fat' | 'weight' | 'leanMass'>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Fetch player profiles from Supabase
  useEffect(() => {
    const fetchPlayerProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('squad_players')
          .select('full_name, profile_picture_url, position, shirt_number')
        
        if (error) {
          console.error('Error fetching player profiles:', error)
          return
        }

        if (data) {
          console.log('Fetched player profiles:', data)
          const profilesMap: Record<string, PlayerProfile> = {}
          data.forEach(profile => {
            // Add both full name and variations for better matching
            const fullName = profile.full_name
            profilesMap[fullName] = {
              full_name: fullName,
              profile_picture_url: profile.profile_picture_url,
              position: profile.position,
              shirt_number: profile.shirt_number
            }
            
            // Also add trimmed version in case of whitespace issues
            const trimmedName = fullName.trim()
            if (trimmedName !== fullName) {
              profilesMap[trimmedName] = profilesMap[fullName]
            }
          })
          // Add special name variations for better matching
          // Handle Ziv Ben Shimol name variation (database has lowercase 's')
          if (profilesMap['Ziv Ben shimol']) {
            profilesMap['Ziv Ben Shimol'] = profilesMap['Ziv Ben shimol']
          }
          
          console.log('Player profiles map:', profilesMap)
          console.log('Ziv Ben Shimol profile:', profilesMap['Ziv Ben Shimol'])
          setPlayerProfiles(profilesMap)
        }
      } catch (error) {
        console.error('Error loading player profiles:', error)
      }
    }

    fetchPlayerProfiles()
    loadBodyCompositionData()
  }, [])

  // Load body composition data from Supabase
  const loadBodyCompositionData = async () => {
    try {
      setIsLoading(true)
      const data = await fetchBodyCompositionData()
      setBodyCompositionData(data)
      console.log(`Loaded ${data.length} body composition records from Supabase`)
    } catch (error) {
      console.error('Failed to load body composition data:', error)
      setUploadStatus({ type: 'error', message: 'Failed to load existing data from database' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus(null)

    Papa.parse(file, {
      complete: async (results) => {
        try {
          const data = results.data as string[][]
          const processedData: BodyCompositionData[] = []
          
          // Skip header row and process data
          for (let i = 1; i < data.length; i++) {
            const row = data[i]
            if (row.length >= 7 && row[0]?.trim()) {
              try {
                const dateObject = new Date(row[6])
                processedData.push({
                  player: row[0].trim(),
                  height: parseFloat(row[1]) || 0,
                  weight: parseFloat(row[2]) || 0,
                  fat: parseFloat(row[3]) || 0,
                  fatMass: parseFloat(row[4]) || 0,
                  leanMass: parseFloat(row[5]) || 0,
                  date: row[6],
                  dateObject
                })
              } catch (error) {
                console.warn('Error processing row:', row)
              }
            }
          }

          // Validate data
          const validation = validateBodyCompositionData(processedData)
          if (!validation.isValid) {
            setUploadStatus({ 
              type: 'error', 
              message: `Validation failed: ${validation.errors.join(', ')}` 
            })
            setIsUploading(false)
            return
          }

          // Sort by date
          processedData.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime())
          
          // Save to Supabase (this will replace all existing data)
          await replaceBodyCompositionData(processedData)
          
          // Update local state
          setBodyCompositionData(processedData)
          setUploadStatus({ 
            type: 'success', 
            message: `Successfully uploaded and saved ${processedData.length} records to database` 
          })
          
          // Clear the file input
          event.target.value = ''
          
        } catch (error) {
          console.error('Error uploading data:', error)
          setUploadStatus({ 
            type: 'error', 
            message: 'Failed to upload data to database. Please try again.' 
          })
        } finally {
          setIsUploading(false)
        }
      },
      header: false,
      skipEmptyLines: true,
    })
  }

  // Get unique players
  const uniquePlayers = Array.from(new Set(bodyCompositionData.map(data => data.player)))

  // Get player trend data
  const getPlayerTrendData = (playerName: string) => {
    return bodyCompositionData
      .filter(data => data.player === playerName)
      .sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime())
  }

  // Helper functions for metrics
  const getPlayerMetric = (playerName: string): 'fat' | 'weight' | 'leanMass' => {
    return playerMetrics[playerName] || 'fat'
  }

  const setPlayerMetric = (playerName: string, metric: 'fat' | 'weight' | 'leanMass') => {
    setPlayerMetrics(prev => ({ ...prev, [playerName]: metric }))
  }

  // Get latest data for team comparison
  const getLatestPlayerData = () => {
    const latestData: Record<string, BodyCompositionData> = {}
    
    bodyCompositionData.forEach(data => {
      const existing = latestData[data.player]
      if (!existing || data.dateObject > existing.dateObject) {
        latestData[data.player] = data
      }
    })
    
    return Object.values(latestData).sort((a, b) => a.player.localeCompare(b.player))
  }

  // Helper function to format date from yyyy-mm-dd to dd/mm/yyyy
  const formatDateForDisplay = (dateStr: string): string => {
    if (!dateStr) return dateStr
    
    // Handle both yyyy-mm-dd and dd/mm/yy formats
    if (dateStr.includes('-')) {
      // yyyy-mm-dd format from database
      const [year, month, day] = dateStr.split('-')
      return `${day}/${month}/${year}`
    } else if (dateStr.includes('/')) {
      // Already in dd/mm/yyyy or dd/mm/yy format
      return dateStr
    }
    
    return dateStr
  }

  // Get trend data for each player (change from previous measurement)
  const getPlayerTrendInfo = (playerName: string) => {
    const playerData = bodyCompositionData
      .filter(d => d.player === playerName)
      .sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime())
    
    if (playerData.length < 2) {
      return {
        trend: 0,
        isFirstMeasurement: true,
        measurementCount: playerData.length,
        dateRange: playerData.length > 0 ? playerData[0].date : null
      }
    }
    
    const latest = playerData[playerData.length - 1]
    const previous = playerData[playerData.length - 2]
    const metricValue = comparisonMetric === 'fat' ? 'fat' : comparisonMetric === 'weight' ? 'weight' : 'leanMass'
    
    return {
      trend: latest[metricValue] - previous[metricValue],
      isFirstMeasurement: false,
      measurementCount: playerData.length,
      dateRange: `${formatDateForDisplay(previous.date)} → ${formatDateForDisplay(latest.date)}`
    }
  }

  // Calculate distance from benchmark (only works for fat percentage)
  const getBenchmarkDistance = (playerName: string, fatValue: number) => {
    const benchmark = getPlayerBenchmark(playerName)
    if (!benchmark) return Infinity // Players without benchmarks go to the end
    
    if (fatValue >= benchmark.min && fatValue <= benchmark.max) {
      return 0 // On target
    } else if (fatValue < benchmark.min) {
      return benchmark.min - fatValue // Below target
    } else {
      return fatValue - benchmark.max // Above target
    }
  }

  return (
    <div className="coach-nutrition-tab">
      <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <Scale size={24} color="#FFD700" />
          <h2 style={{ color: '#fff', margin: 0 }}>Fat %</h2>
        </div>


        {/* Sub Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
          <button
            onClick={() => setActiveNutritionTab('by-player')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeNutritionTab === 'by-player' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
              background: activeNutritionTab === 'by-player' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: activeNutritionTab === 'by-player' ? '#FFD700' : '#fff',
              fontSize: '14px',
              fontWeight: activeNutritionTab === 'by-player' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            לפי שחקן
          </button>
          <button
            onClick={() => setActiveNutritionTab('team-overview')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: activeNutritionTab === 'team-overview' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
              background: activeNutritionTab === 'team-overview' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: activeNutritionTab === 'team-overview' ? '#FFD700' : '#fff',
              fontSize: '14px',
              fontWeight: activeNutritionTab === 'team-overview' ? '600' : '400',
              cursor: 'pointer'
            }}
          >
            כל הקבוצה
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Scale size={48} color="rgba(255, 215, 0, 0.5)" />
          <h3 style={{ color: '#fff', marginTop: '20px', marginBottom: '10px' }}>
            Loading Body Composition Data...
          </h3>
          <p style={{ color: 'var(--secondary-text)', margin: 0 }}>
            Fetching data from database...
          </p>
        </div>
      )}

      {!isLoading && bodyCompositionData.length === 0 && (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Scale size={48} color="rgba(255, 215, 0, 0.5)" />
          <h3 style={{ color: '#fff', marginTop: '20px', marginBottom: '10px' }}>
            No Data Available
          </h3>
          <p style={{ color: 'var(--secondary-text)', margin: 0 }}>
            Please upload a CSV file with body composition data to begin analysis.
            <br />Data will be automatically saved to the database.
          </p>
        </div>
      )}

      {/* BY PLAYER VIEW - Copy of Player Trends */}
      {activeNutritionTab === 'by-player' && !isLoading && bodyCompositionData.length > 0 && (
        <div className="glass-card" style={{ padding: '20px' }}>
          {/* Player Chart Rows */}
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {uniquePlayers.map(playerName => {
              const playerTrends = getPlayerTrendData(playerName)
              // Try to find profile with exact match first, then try trimmed version
              let profile = playerProfiles[playerName]
              if (!profile) {
                profile = playerProfiles[playerName.trim()]
              }
              // Debug: Check if profile is found
              if (!profile) {
                console.log(`No profile found for player: "${playerName}"`)
                console.log('Available profiles:', Object.keys(playerProfiles))
                // Special check for Ziv Ben Shimol
                if (playerName.includes('Shimol')) {
                  console.log('Shimol player name from CSV:', playerName)
                  console.log('Shimol name length:', playerName.length)
                  console.log('Shimol name bytes:', Array.from(playerName).map(c => c.charCodeAt(0)))
                }
              }
              
              if (playerTrends.length === 0) return null
              
              // Get player-specific metric
              const playerSelectedMetric = getPlayerMetric(playerName)
              
              // Calculate overall trend
              const firstData = playerTrends[0]
              const latestData = playerTrends[playerTrends.length - 1]
              const metricValue = playerSelectedMetric === 'fat' ? 'fat' : playerSelectedMetric === 'weight' ? 'weight' : 'leanMass'
              const currentValue = latestData[metricValue]
              const initialValue = firstData ? firstData[metricValue] : currentValue
              const trend = currentValue - initialValue
              const trendPercentage = initialValue ? ((trend / initialValue) * 100) : 0
              
              // Create chart data for this player
              const playerChartData = {
                labels: playerTrends.map(d => d.date),
                datasets: [{
                  label: playerSelectedMetric === 'fat' ? 'Body Fat %' : playerSelectedMetric === 'weight' ? 'Weight (kg)' : 'Lean Mass (kg)',
                  data: playerTrends.map(d => d[metricValue]),
                  borderColor: '#FFD700',
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                  borderWidth: 3,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  pointBackgroundColor: '#FFD700',
                  pointBorderColor: '#1a1f2e',
                  pointBorderWidth: 2
                }]
              }
              
              // Add benchmark annotations for fat percentage charts
              const benchmark = playerSelectedMetric === 'fat' ? getPlayerBenchmark(playerName) : null
              const annotations = benchmark ? {
                minLine: {
                  type: 'line' as const,
                  yMin: benchmark.min,
                  yMax: benchmark.min,
                  borderColor: 'rgba(34, 197, 94, 0.8)', // Green
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    display: true,
                    content: `Min: ${benchmark.min}%`,
                    position: 'start' as const,
                    xAdjust: -80, // Move further left to ensure visibility
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    color: '#fff',
                    font: {
                      size: 10,
                      weight: 'bold' as const
                    },
                    padding: 4
                  }
                },
                maxLine: {
                  type: 'line' as const,
                  yMin: benchmark.max,
                  yMax: benchmark.max,
                  borderColor: 'rgba(34, 197, 94, 0.8)', // Green
                  borderWidth: 2,
                  borderDash: [5, 5],
                  label: {
                    display: true,
                    content: `Max: ${benchmark.max}%`,
                    position: 'end' as const,
                    xAdjust: 80, // Move further right to ensure visibility
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    color: '#fff',
                    font: {
                      size: 10,
                      weight: 'bold' as const
                    },
                    padding: 4
                  }
                },
                targetZone: {
                  type: 'box' as const,
                  yMin: benchmark.min,
                  yMax: benchmark.max,
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderWidth: 0
                }
              } : {}

              const playerChartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                clip: false as false, // Allow labels to extend beyond chart area
                interaction: {
                  intersect: false,
                  mode: 'index' as const
                },
                elements: {
                  point: {
                    hoverRadius: 8
                  }
                },
                layout: {
                  padding: {
                    left: 120, // More padding for left benchmark labels
                    right: 120, // More padding for right benchmark labels  
                    top: 30, // Extra padding for top labels
                    bottom: 10
                  }
                },
                plugins: {
                  legend: { display: false },
                  title: { display: false },
                  annotation: {
                    annotations: annotations
                  },
                  tooltip: {
                    backgroundColor: 'rgba(26, 31, 46, 0.9)',
                    titleColor: '#FFD700',
                    bodyColor: '#fff',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    callbacks: {
                      label: (context: any) => {
                        return `${context.parsed.y.toFixed(1)}${playerSelectedMetric === 'fat' ? '%' : 'kg'}`
                      }
                    }
                  },
                  datalabels: {
                    display: true,
                    color: (context: any) => {
                      // For fat percentage, color based on benchmark status
                      if (playerSelectedMetric === 'fat' && benchmark && context.parsed && context.parsed.y !== undefined) {
                        const value = context.parsed.y
                        const isOnTarget = value >= benchmark.min && value <= benchmark.max
                        return isOnTarget ? '#22c55e' : '#ef4444' // Green if on target, red if not
                      }
                      return '#fff' // Default white for other metrics
                    },
                    font: {
                      size: 11,
                      weight: 'bold' as const
                    },
                    align: 'top' as const,
                    offset: 6,
                    clip: false, // Ensure labels are not clipped
                    formatter: (value: number) => {
                      return `${value.toFixed(1)}${playerSelectedMetric === 'fat' ? '%' : ''}`
                    },
                    backgroundColor: (context: any) => {
                      // For fat percentage, background color based on benchmark status
                      if (playerSelectedMetric === 'fat' && benchmark && context.parsed && context.parsed.y !== undefined) {
                        const value = context.parsed.y
                        const isOnTarget = value >= benchmark.min && value <= benchmark.max
                        return isOnTarget ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)' // Green bg if on target, red if not
                      }
                      return 'rgba(0, 0, 0, 0.7)' // Default dark background
                    },
                    borderColor: (context: any) => {
                      // For fat percentage, border color based on benchmark status
                      if (playerSelectedMetric === 'fat' && benchmark && context.parsed && context.parsed.y !== undefined) {
                        const value = context.parsed.y
                        const isOnTarget = value >= benchmark.min && value <= benchmark.max
                        return isOnTarget ? '#22c55e' : '#ef4444' // Green border if on target, red if not
                      }
                      return '#FFD700' // Default gold border
                    },
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: {
                      top: 2,
                      bottom: 2,
                      left: 4,
                      right: 4
                    }
                  }
                },
                scales: {
                  x: { 
                    ticks: { 
                      color: '#fff',
                      font: { size: 11 }
                    },
                    grid: { display: false },
                    border: { color: 'rgba(255, 215, 0, 0.3)' }
                  },
                  y: { 
                    ticks: { 
                      display: false // Hide all Y-axis numbers
                    },
                    grid: { display: false },
                    border: { color: 'rgba(255, 215, 0, 0.3)' },
                    // Add padding to make the chart more visible
                    min: (() => {
                      const dataValues = playerTrends.map(d => d[metricValue])
                      const minValue = Math.min(...dataValues)
                      const maxValue = Math.max(...dataValues)
                      const range = maxValue - minValue
                      const padding = Math.max(range * 0.6, playerSelectedMetric === 'fat' ? 2 : 5) // 60% padding or minimum 2%/5kg
                      
                      // For fat percentage with benchmarks, ensure we show the full benchmark range
                      if (playerSelectedMetric === 'fat' && benchmark) {
                        return Math.min(minValue - padding, benchmark.min - 1)
                      }
                      return minValue - padding
                    })(),
                    max: (() => {
                      const dataValues = playerTrends.map(d => d[metricValue])
                      const minValue = Math.min(...dataValues)
                      const maxValue = Math.max(...dataValues)
                      const range = maxValue - minValue
                      const padding = Math.max(range * 0.6, playerSelectedMetric === 'fat' ? 2 : 5) // 60% padding or minimum 2%/5kg
                      
                      // For fat percentage with benchmarks, ensure we show the full benchmark range
                      if (playerSelectedMetric === 'fat' && benchmark) {
                        return Math.max(maxValue + padding, benchmark.max + 1)
                      }
                      return maxValue + padding
                    })()
                  }
                }
              }
              
              return (
                <div 
                  key={playerName}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                    e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.2)'
                  }}
                >
                  {/* Player Header */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {profile?.profile_picture_url ? (
                        <img 
                          src={profile.profile_picture_url}
                          alt={playerName}
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid #FFD700'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(255, 215, 0, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px solid #FFD700'
                        }}>
                          <User size={28} color="#FFD700" />
                        </div>
                      )}
                      <div>
                        <h3 style={{ color: '#fff', margin: 0, fontSize: '22px', fontWeight: '700' }}>
                          {playerName}
                        </h3>
                        <p style={{ color: 'var(--secondary-text)', margin: '6px 0 0 0', fontSize: '13px' }}>
                          {playerTrends.length} measurements • {firstData?.date} → {latestData.date}
                        </p>
                      </div>
                    </div>
                    
                    {/* Current Stats */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        color: (() => {
                          // For fat percentage, color based on benchmark status
                          if (playerSelectedMetric === 'fat') {
                            const benchmark = getPlayerBenchmark(playerName)
                            if (benchmark) {
                              const isOnTarget = currentValue >= benchmark.min && currentValue <= benchmark.max
                              return isOnTarget ? '#22c55e' : '#ef4444' // Green if on target, red if not
                            }
                          }
                          return '#fff' // Default white for other metrics or no benchmark
                        })(),
                        fontSize: '28px', 
                        fontWeight: '700' 
                      }}>
                        {currentValue.toFixed(1)}{playerSelectedMetric === 'fat' ? '%' : 'kg'}
                      </div>
                      <div style={{
                        color: trend > 0 ? 
                          (playerSelectedMetric === 'leanMass' ? '#22c55e' : playerSelectedMetric === 'fat' ? '#ef4444' : '#ef4444') : 
                          (playerSelectedMetric === 'fat' ? '#22c55e' : playerSelectedMetric === 'leanMass' ? '#ef4444' : '#22c55e'),
                        fontSize: '14px',
                        fontWeight: '500',
                        marginTop: '4px'
                      }}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)} ({trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%)
                      </div>
                      
                      {/* Benchmark indicator for fat percentage */}
                      {playerSelectedMetric === 'fat' && (() => {
                        const benchmark = getPlayerBenchmark(playerName)
                        if (benchmark) {
                          const isOnTarget = currentValue >= benchmark.min && currentValue <= benchmark.max
                          return (
                            <div style={{ 
                              marginTop: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: isOnTarget ? '#22c55e' : '#ef4444'
                            }}>
                              Target: {benchmark.min}-{benchmark.max}%
                              <br />
                              {isOnTarget ? '✓ On target' : currentValue < benchmark.min ? '↓ Below target' : '↑ Above target'}
                            </div>
                          )
                        }
                        return null
                      })()}
                      
                      <div style={{ color: 'var(--secondary-text)', fontSize: '12px', marginTop: '2px' }}>
                        {playerSelectedMetric === 'fat' ? 'Body Fat' : playerSelectedMetric === 'weight' ? 'Body Weight' : 'Lean Mass'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Individual Metric Selector */}
                  <div style={{ marginBottom: '12px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setPlayerMetric(playerName, 'fat')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        border: playerSelectedMetric === 'fat' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                        background: playerSelectedMetric === 'fat' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: playerSelectedMetric === 'fat' ? '#FFD700' : '#fff',
                        fontSize: '12px',
                        fontWeight: playerSelectedMetric === 'fat' ? '600' : '400',
                        cursor: 'pointer'
                      }}
                    >
                      Fat %
                    </button>
                    <button
                      onClick={() => setPlayerMetric(playerName, 'weight')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        border: playerSelectedMetric === 'weight' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                        background: playerSelectedMetric === 'weight' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: playerSelectedMetric === 'weight' ? '#FFD700' : '#fff',
                        fontSize: '12px',
                        fontWeight: playerSelectedMetric === 'weight' ? '600' : '400',
                        cursor: 'pointer'
                      }}
                    >
                      Weight
                    </button>
                    <button
                      onClick={() => setPlayerMetric(playerName, 'leanMass')}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        border: playerSelectedMetric === 'leanMass' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                        background: playerSelectedMetric === 'leanMass' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: playerSelectedMetric === 'leanMass' ? '#FFD700' : '#fff',
                        fontSize: '12px',
                        fontWeight: playerSelectedMetric === 'leanMass' ? '600' : '400',
                        cursor: 'pointer'
                      }}
                    >
                      Lean Mass
                    </button>
                  </div>
                  
                  {/* Player Chart with proper height for labels */}
                  <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                    <Line data={playerChartData} options={playerChartOptions} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TEAM OVERVIEW VIEW - Full functionality matching dietitian dashboard */}
      {activeNutritionTab === 'team-overview' && !isLoading && bodyCompositionData.length > 0 && (() => {
        const latestPlayerData = getLatestPlayerData()
        
        // Sort players by selected criteria and add trend data
        const sortedPlayerData = latestPlayerData
          .map(player => {
            const trendInfo = getPlayerTrendInfo(player.player)
            const benchmarkDistance = comparisonMetric === 'fat' ? getBenchmarkDistance(player.player, player.fat) : 0
            return {
              ...player,
              trend: trendInfo.trend,
              isFirstMeasurement: trendInfo.isFirstMeasurement,
              measurementCount: trendInfo.measurementCount,
              dateRange: trendInfo.dateRange,
              benchmarkDistance
            }
          })
          .sort((a, b) => {
            if (sortBy === 'trend') {
              // Sort by trend (descending - highest positive change first), put first measurements at end
              if (a.isFirstMeasurement && !b.isFirstMeasurement) return 1
              if (!a.isFirstMeasurement && b.isFirstMeasurement) return -1
              if (a.isFirstMeasurement && b.isFirstMeasurement) return 0
              return b.trend - a.trend
            } else if (sortBy === 'benchmark') {
              // Sort by distance from benchmark (only for fat %, others go to end)
              if (comparisonMetric !== 'fat') {
                // If not comparing fat %, fall back to value sorting
                const metricValue = comparisonMetric === 'weight' ? 'weight' : 'leanMass'
                return a[metricValue] - b[metricValue]
              }
              // Sort by benchmark distance (descending - furthest from target first)
              return b.benchmarkDistance - a.benchmarkDistance
            } else {
              // Sort by metric value (ascending)
              const metricValue = comparisonMetric === 'fat' ? 'fat' : comparisonMetric === 'weight' ? 'weight' : 'leanMass'
              return a[metricValue] - b[metricValue]
            }
          })

        // Calculate average for the selected metric or trend
        const calculateAverage = () => {
          if (sortedPlayerData.length === 0) return 0
          if (displayMode === 'trend') {
            const sum = sortedPlayerData.reduce((acc, player) => acc + player.trend, 0)
            return sum / sortedPlayerData.length
          } else if (displayMode === 'benchmark') {
            // For benchmark distance, show average distance from target
            if (comparisonMetric !== 'fat') return 0
            const validDistances = sortedPlayerData.filter(player => player.benchmarkDistance !== Infinity)
            if (validDistances.length === 0) return 0
            const sum = validDistances.reduce((acc, player) => acc + player.benchmarkDistance, 0)
            return sum / validDistances.length
          } else {
            const metricValue = comparisonMetric === 'fat' ? 'fat' : comparisonMetric === 'weight' ? 'weight' : 'leanMass'
            const sum = sortedPlayerData.reduce((acc, player) => acc + player[metricValue], 0)
            return sum / sortedPlayerData.length
          }
        }

        const teamAverage = calculateAverage()

        const comparisonChartData = {
          labels: sortedPlayerData.map(d => {
            // Custom name formatting for specific players
            const playerName = d.player.trim()
            if (playerName === 'Gil Cohen') return 'G. Cohen'
            if (playerName === 'Yarden Cohen') return 'Y. Cohen'
            if (playerName.includes('Shimol')) return 'Ben Shimol'
            
            // Extract last name only for other players
            const nameParts = playerName.split(' ')
            return nameParts[nameParts.length - 1] // Get the last part of the name
          }),
          datasets: [{
            label: displayMode === 'trend' ? 
              `${comparisonMetric === 'fat' ? 'Body Fat %' : comparisonMetric === 'weight' ? 'Weight (kg)' : 'Lean Mass (kg)'} Change` :
              displayMode === 'benchmark' ? 'Distance from Benchmark (%)' :
              comparisonMetric === 'fat' ? 'Body Fat %' : comparisonMetric === 'weight' ? 'Weight (kg)' : 'Lean Mass (kg)',
            data: sortedPlayerData.map(d => {
              if (displayMode === 'trend') {
                return d.trend
              } else if (displayMode === 'benchmark') {
                return d.benchmarkDistance === Infinity ? 0 : d.benchmarkDistance
              } else {
                const metricValue = comparisonMetric === 'fat' ? 'fat' : comparisonMetric === 'weight' ? 'weight' : 'leanMass'
                return d[metricValue]
              }
            }),
            backgroundColor: displayMode === 'trend' ? 
              sortedPlayerData.map(d => {
                if (d.isFirstMeasurement) return 'rgba(64, 123, 255, 0.7)' // Blue for first measurement
                if (d.trend === 0) return 'rgba(128, 128, 128, 0.7)' // Gray for no change
                if (comparisonMetric === 'fat') {
                  return d.trend > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.7)' // Red for increase, Green for decrease in fat
                } else if (comparisonMetric === 'weight') {
                  return d.trend > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 197, 94, 0.7)' // Red for increase, Green for decrease in weight
                } else { // lean mass
                  return d.trend > 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)' // Green for increase, Red for decrease in lean mass
                }
              }) : displayMode === 'benchmark' ?
                // Strict color bars based on benchmark distance
                sortedPlayerData.map(d => {
                  if (d.benchmarkDistance === Infinity) return 'rgba(128, 128, 128, 0.7)' // Gray for no benchmark
                  if (d.benchmarkDistance === 0) return 'rgba(34, 197, 94, 0.7)' // Green for on target
                  
                  // Strict color coding based on distance from target
                  if (d.benchmarkDistance <= 0.3) {
                    return 'rgba(34, 197, 94, 0.7)' // Green for very close (≤0.3% off)
                  } else if (d.benchmarkDistance <= 0.8) {
                    return 'rgba(255, 215, 0, 0.7)' // Yellow for close (0.3-0.8% off)
                  } else if (d.benchmarkDistance <= 1.5) {
                    return 'rgba(255, 165, 0, 0.7)' // Orange for moderately far (0.8-1.5% off)
                  } else {
                    return 'rgba(239, 68, 68, 0.7)' // Red for far from target (>1.5% off)
                  }
                }) : (comparisonMetric === 'fat' ? 
                // Color bars based on benchmark status for fat %
                sortedPlayerData.map(d => {
                  const benchmark = getPlayerBenchmark(d.player)
                  if (!benchmark) return 'rgba(255, 215, 0, 0.7)' // Default gold if no benchmark
                  const fatValue = d.fat
                  if (fatValue >= benchmark.min && fatValue <= benchmark.max) {
                    return 'rgba(34, 197, 94, 0.7)' // Green for on target
                  } else {
                    return 'rgba(239, 68, 68, 0.7)' // Red for off target
                  }
                }) : 'rgba(255, 215, 0, 0.7)'),
            borderColor: displayMode === 'trend' ? 
              sortedPlayerData.map(d => {
                if (d.isFirstMeasurement) return '#407bff' // Blue for first measurement
                if (d.trend === 0) return '#808080' // Gray for no change
                if (comparisonMetric === 'fat') {
                  return d.trend > 0 ? '#ef4444' : '#22c55e' // Red for increase, Green for decrease in fat
                } else if (comparisonMetric === 'weight') {
                  return d.trend > 0 ? '#ef4444' : '#22c55e' // Red for increase, Green for decrease in weight
                } else { // lean mass
                  return d.trend > 0 ? '#22c55e' : '#ef4444' // Green for increase, Red for decrease in lean mass
                }
              }) : displayMode === 'benchmark' ?
                // Strict border colors based on benchmark distance
                sortedPlayerData.map(d => {
                  if (d.benchmarkDistance === Infinity) return '#808080' // Gray for no benchmark
                  if (d.benchmarkDistance === 0) return '#22c55e' // Green for on target
                  
                  // Strict border color coding based on distance from target
                  if (d.benchmarkDistance <= 0.3) {
                    return '#22c55e' // Green for very close (≤0.3% off)
                  } else if (d.benchmarkDistance <= 0.8) {
                    return '#FFD700' // Yellow for close (0.3-0.8% off)
                  } else if (d.benchmarkDistance <= 1.5) {
                    return '#FFA500' // Orange for moderately far (0.8-1.5% off)
                  } else {
                    return '#ef4444' // Red for far from target (>1.5% off)
                  }
                }) : (comparisonMetric === 'fat' ? 
                // Border colors based on benchmark status for fat %
                sortedPlayerData.map(d => {
                  const benchmark = getPlayerBenchmark(d.player)
                  if (!benchmark) return '#FFD700' // Default gold if no benchmark
                  const fatValue = d.fat
                  if (fatValue >= benchmark.min && fatValue <= benchmark.max) {
                    return '#22c55e' // Green for on target
                  } else {
                    return '#ef4444' // Red for off target
                  }
                }) : '#FFD700'),
            borderWidth: 2
          }]
        }

        const barChartOptions = {
          indexAxis: 'y' as const, // Horizontal bars
          responsive: true,
          maintainAspectRatio: false,
          clip: false as false, // Allow labels to extend beyond chart area
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: `Team ${comparisonMetric === 'fat' ? 'Body Fat %' : comparisonMetric === 'weight' ? 'Weight' : 'Lean Mass'} ${displayMode === 'trend' ? 'Change' : displayMode === 'benchmark' ? 'Benchmark Distance' : 'Comparison'}`,
              color: '#FFD700',
              font: { size: 16 }
            },
            datalabels: {
              display: true,
              color: (context: any) => {
                if (displayMode === 'benchmark') {
                  const playerIndex = context.dataIndex
                  const player = sortedPlayerData[playerIndex]
                  if (player?.benchmarkDistance === Infinity) return '#9CA3AF' // Gray for no benchmark
                  if (player?.benchmarkDistance === 0) return '#10B981' // Green for on target
                  if (player?.benchmarkDistance <= 0.8) return '#F59E0B' // Yellow for close
                  return '#EF4444' // Red for far off
                }
                return '#fff'
              },
              font: {
                size: displayMode === 'trend' ? 11 : displayMode === 'benchmark' ? 11 : 14,
                weight: 'bold' as const,
                family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
              },
              align: 'right' as const,
              anchor: 'end' as const,
              offset: displayMode === 'benchmark' ? 15 : 6,
              clip: false, // Ensure labels are never clipped
              formatter: (value: number, context: any) => {
                if (displayMode === 'trend') {
                  const playerIndex = context.dataIndex
                  const player = sortedPlayerData[playerIndex]
                  if (player?.isFirstMeasurement) {
                    return `First\n${formatDateForDisplay(player.dateRange || '')}`
                  }
                  // Format date range more elegantly for trend labels
                  const dateRange = player?.dateRange || ''
                  const [fromDate, toDate] = dateRange.split(' → ')
                  const shortRange = fromDate && toDate ? 
                    `${fromDate.split('/').slice(0,2).join('/')} → ${toDate.split('/').slice(0,2).join('/')}` : 
                    dateRange
                  return `${value > 0 ? '+' : ''}${value.toFixed(1)}\n${shortRange}`
                } else if (displayMode === 'benchmark') {
                  const playerIndex = context.dataIndex
                  const player = sortedPlayerData[playerIndex]
                  const benchmark = getPlayerBenchmark(player.player)
                  
                  if (player?.benchmarkDistance === Infinity || !benchmark) {
                    return 'No benchmark\navailable'
                  } else if (player?.benchmarkDistance === 0) {
                    return `${player.fat.toFixed(1)}%\nTarget: ${benchmark.min}-${benchmark.max}%\n✓ ON TARGET`
                  } else {
                    const status = player.fat < benchmark.min ? 'BELOW' : 'ABOVE'
                    const arrow = player.fat < benchmark.min ? '↓' : '↑'
                    return `${player.fat.toFixed(1)}%\nTarget: ${benchmark.min}-${benchmark.max}%\n${arrow} ${status} by ${value.toFixed(1)}%`
                  }
                } else {
                  return `${value.toFixed(1)}${comparisonMetric === 'fat' ? '%' : ''}`
                }
              },
              backgroundColor: displayMode === 'benchmark' ? 
                'rgba(20, 25, 35, 0.95)' : 'rgba(0, 0, 0, 0.8)',
              borderColor: displayMode === 'benchmark' ? '#3B82F6' : '#FFD700',
              borderWidth: displayMode === 'benchmark' ? 2 : 1,
              borderRadius: displayMode === 'benchmark' ? 8 : 4,
              padding: displayMode === 'trend' ? {
                top: 4,
                bottom: 4,
                left: 8,
                right: 8
              } : displayMode === 'benchmark' ? {
                top: 8,
                bottom: 8,
                left: 12,
                right: 12
              } : {
                top: 3,
                bottom: 3,
                left: 6,
                right: 6
              }
            },
            annotation: {
              annotations: {
                averageLine: {
                  type: 'line' as const,
                  scaleID: 'x',
                  value: teamAverage,
                  borderColor: '#ef4444',
                  borderWidth: 3,
                  borderDash: [5, 5],
                  label: {
                    display: true,
                    content: displayMode === 'trend' ? 
                      `Avg: ${teamAverage > 0 ? '+' : ''}${teamAverage.toFixed(1)}` :
                      displayMode === 'benchmark' ? 
                      `Avg Distance: ${teamAverage.toFixed(1)}%` :
                      `Avg: ${teamAverage.toFixed(1)}${comparisonMetric === 'fat' ? '%' : 'kg'}`,
                    position: 'start' as const,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    color: '#fff',
                    font: {
                      size: 12,
                      weight: 'bold' as const
                    },
                    padding: {
                      top: 4,
                      bottom: 4,
                      left: 8,
                      right: 8
                    },
                    borderRadius: 4
                  }
                }
              }
            }
          },
          scales: {
            x: { 
              ticks: { 
                color: '#fff',
                callback: function(value: any) {
                  return `${value}${comparisonMetric === 'fat' ? '%' : 'kg'}`
                }
              }, 
              grid: { color: 'rgba(255,255,255,0.1)' },
              beginAtZero: true
            },
            y: { 
              ticks: { 
                display: false // Hide Y-axis labels since we have names next to profile pictures
              }, 
              grid: { color: 'rgba(255,255,255,0.1)' },
              offset: true
            }
          },
          layout: {
            padding: {
              left: 0,
              right: displayMode === 'trend' ? 140 : displayMode === 'benchmark' ? 200 : 80, // Extra padding for benchmark labels
              top: 30, // Extra top padding to prevent label clipping
              bottom: 30 // Extra bottom padding
            }
          }
        }

        return (
          <div className="glass-card" style={{ padding: '20px' }}>
            {/* Date Information */}
            <div style={{ marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ 
                color: 'var(--secondary-text)', 
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Latest measurements from: {sortedPlayerData.length > 0 ? formatDateForDisplay(sortedPlayerData[0]?.date || '') : 'N/A'}
              </div>
            </div>

            {/* Comparison Controls */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: '#FFD700', fontWeight: '600' }}>Compare Metric:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setComparisonMetric('fat')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: comparisonMetric === 'fat' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                    background: comparisonMetric === 'fat' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: comparisonMetric === 'fat' ? '#FFD700' : '#fff',
                    fontSize: '14px',
                    fontWeight: comparisonMetric === 'fat' ? '600' : '400',
                    cursor: 'pointer'
                  }}
                >
                  Fat %
                </button>
                <button
                  onClick={() => setComparisonMetric('weight')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: comparisonMetric === 'weight' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                    background: comparisonMetric === 'weight' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: comparisonMetric === 'weight' ? '#FFD700' : '#fff',
                    fontSize: '14px',
                    fontWeight: comparisonMetric === 'weight' ? '600' : '400',
                    cursor: 'pointer'
                  }}
                >
                  Weight
                </button>
                <button
                  onClick={() => setComparisonMetric('leanMass')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: comparisonMetric === 'leanMass' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                    background: comparisonMetric === 'leanMass' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: comparisonMetric === 'leanMass' ? '#FFD700' : '#fff',
                    fontSize: '14px',
                    fontWeight: comparisonMetric === 'leanMass' ? '600' : '400',
                    cursor: 'pointer'
                  }}
                >
                  Lean Mass
                </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: '#FFD700', fontWeight: '600' }}>Sort By:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSortBy('value')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: sortBy === 'value' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                      background: sortBy === 'value' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: sortBy === 'value' ? '#FFD700' : '#fff',
                      fontSize: '14px',
                      fontWeight: sortBy === 'value' ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    Current Value
                  </button>
                  <button
                    onClick={() => setSortBy('trend')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: sortBy === 'trend' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                      background: sortBy === 'trend' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: sortBy === 'trend' ? '#FFD700' : '#fff',
                      fontSize: '14px',
                      fontWeight: sortBy === 'trend' ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    Trend Change
                  </button>
                  <button
                    onClick={() => setSortBy('benchmark')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: sortBy === 'benchmark' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                      background: sortBy === 'benchmark' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: sortBy === 'benchmark' ? '#FFD700' : '#fff',
                      fontSize: '14px',
                      fontWeight: sortBy === 'benchmark' ? '600' : '400',
                      cursor: 'pointer',
                      opacity: comparisonMetric !== 'fat' ? 0.5 : 1
                    }}
                    disabled={comparisonMetric !== 'fat'}
                    title={comparisonMetric !== 'fat' ? 'Only available for Fat % metric' : 'Sort by distance from benchmark targets'}
                  >
                    Distance from Benchmark
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ color: '#FFD700', fontWeight: '600' }}>Display:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setDisplayMode('value')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: displayMode === 'value' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                      background: displayMode === 'value' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: displayMode === 'value' ? '#FFD700' : '#fff',
                      fontSize: '14px',
                      fontWeight: displayMode === 'value' ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    Current Values
                  </button>
                  <button
                    onClick={() => setDisplayMode('trend')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: displayMode === 'trend' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                      background: displayMode === 'trend' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: displayMode === 'trend' ? '#FFD700' : '#fff',
                      fontSize: '14px',
                      fontWeight: displayMode === 'trend' ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    Trend Changes
                  </button>
                  <button
                    onClick={() => setDisplayMode('benchmark')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: displayMode === 'benchmark' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                      background: displayMode === 'benchmark' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: displayMode === 'benchmark' ? '#FFD700' : '#fff',
                      fontSize: '14px',
                      fontWeight: displayMode === 'benchmark' ? '600' : '400',
                      cursor: 'pointer',
                      opacity: comparisonMetric !== 'fat' ? 0.5 : 1
                    }}
                    disabled={comparisonMetric !== 'fat'}
                    title={comparisonMetric !== 'fat' ? 'Only available for Fat % metric' : 'Show distance from benchmark targets'}
                  >
                    Benchmark Distance
                  </button>
                </div>
              </div>
            </div>
            
            {/* Comparison Chart with Profile Pictures */}
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Profile Pictures and Names Column */}
              <div style={{ 
                width: '130px', // Reduced width to give more space to chart
                display: 'flex', 
                flexDirection: 'column',
                paddingTop: '40px', // Offset for chart title
                paddingBottom: '20px', // Offset for chart bottom
                paddingRight: '8px' // Reduced padding
              }}>
                {sortedPlayerData.map((playerData, index) => {
                  // Try to find profile with exact match first, then try trimmed version
                  let profile = playerProfiles[playerData.player]
                  if (!profile) {
                    profile = playerProfiles[playerData.player.trim()]
                  }
                  const rowHeight = 60 // Height for larger photos
                  const marginBottom = index < sortedPlayerData.length - 1 ? 8 : 0 // Space between rows
                  
                  return (
                    <div key={playerData.player} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      height: `${rowHeight}px`,
                      marginBottom: `${marginBottom}px`,
                      gap: '12px',
                      paddingLeft: '8px'
                    }}>
                      {/* Profile Picture */}
                      {profile?.profile_picture_url ? (
                        <img 
                          src={profile.profile_picture_url}
                          alt={playerData.player}
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #FFD700',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '50%',
                          background: 'rgba(255, 215, 0, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #FFD700',
                          flexShrink: 0
                        }}>
                          <User size={28} color="#FFD700" />
                        </div>
                      )}
                      
                      {/* Player Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          color: '#fff', 
                          fontSize: '14px', 
                          fontWeight: '600'
                        }}>
                          {(() => {
                            // Custom name formatting for specific players
                            const playerName = playerData.player.trim()
                            if (playerName === 'Gil Cohen') return 'G. Cohen'
                            if (playerName === 'Yarden Cohen') return 'Y. Cohen'
                            if (playerName.includes('Shimol')) return 'Ben Shimol'
                            
                            // Extract last name only for other players
                            const nameParts = playerName.split(' ')
                            return nameParts[nameParts.length - 1] // Get the last part of the name
                          })()}
                        </div>
                        
                        {/* Metric/Trend Indicator Below Name */}
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: displayMode === 'trend' ? '#FFD700' : (() => {
                            if (playerData.isFirstMeasurement) return '#407bff'
                            if (playerData.trend === 0) return '#888'
                            if (comparisonMetric === 'fat') {
                              return playerData.trend > 0 ? '#ef4444' : '#22c55e' // Red for increase, Green for decrease in fat
                            } else if (comparisonMetric === 'weight') {
                              return playerData.trend > 0 ? '#ef4444' : '#22c55e' // Red for increase, Green for decrease in weight
                            } else { // lean mass
                              return playerData.trend > 0 ? '#22c55e' : '#ef4444' // Green for increase, Red for decrease in lean mass
                            }
                          })(),
                          background: 'rgba(0, 0, 0, 0.6)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          marginTop: '2px',
                          display: 'inline-block'
                        }}>
                          {displayMode === 'trend' ? (
                            // Show current metric value when displaying trends
                            (() => {
                              const metricValue = comparisonMetric === 'fat' ? 'fat' : comparisonMetric === 'weight' ? 'weight' : 'leanMass'
                              return `${playerData[metricValue].toFixed(1)}${comparisonMetric === 'fat' ? '%' : ''}`
                            })()
                          ) : (
                            // Show trend when displaying values
                            playerData.isFirstMeasurement ? 'First' :
                            playerData.trend !== 0 ? `${playerData.trend > 0 ? '+' : ''}${playerData.trend.toFixed(1)}` : 'No change'
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Chart Column */}
              <div style={{ 
                flex: 1, 
                height: `${sortedPlayerData.length * 68 + 60}px`,
                overflow: 'visible',
                minWidth: displayMode === 'benchmark' ? '600px' : '400px' // Extra width for benchmark labels
              }}>
                <Bar data={comparisonChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}