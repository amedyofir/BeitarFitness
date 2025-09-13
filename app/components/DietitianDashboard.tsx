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
import { replaceBodyCompositionData, fetchBodyCompositionData } from '../../lib/bodyCompositionService'

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

// Helper function to format date from yyyy-mm-dd to dd-mm-yyyy
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

export default function DietitianDashboard() {
  const [bodyCompositionData, setBodyCompositionData] = useState<BodyCompositionData[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'comparison'>('overview')
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, PlayerProfile>>({})
  const [selectedMetric, setSelectedMetric] = useState<'fat' | 'weight' | 'leanMass'>('fat')
  const [playerMetrics, setPlayerMetrics] = useState<Record<string, 'fat' | 'weight' | 'leanMass'>>({})
  const [comparisonMetric, setComparisonMetric] = useState<'fat' | 'weight' | 'leanMass'>('fat')
  const [sortBy, setSortBy] = useState<'value' | 'trend' | 'benchmark'>('value')
  const [displayMode, setDisplayMode] = useState<'value' | 'trend' | 'benchmark'>('value')
  const exportRef = useRef<HTMLDivElement>(null)

  // Fetch body composition data from Supabase on component mount
  useEffect(() => {
    const loadBodyCompositionData = async () => {
      try {
        setIsLoadingData(true)
        const data = await fetchBodyCompositionData()
        setBodyCompositionData(data)
        console.log('Loaded body composition data:', data.length, 'records')
      } catch (error) {
        console.error('Error loading body composition data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    loadBodyCompositionData()
  }, [])

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
        console.error('Error fetching player profiles:', error)
      }
    }
    
    fetchPlayerProfiles()
  }, [])

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setIsProcessing(true)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Body composition CSV parsing completed:', results.data)
            
            const processedData: BodyCompositionData[] = results.data.map((row: any) => {
              // Parse date - handle both DD/MM/YY and DD/MM/YYYY formats
              let dateStr = row.Date || row.date || ''
              let dateObject: Date
              
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/')
                const fullYear = year.length === 2 ? `20${year}` : year
                dateObject = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
              } else {
                dateObject = new Date(dateStr)
              }
              
              return {
                player: row.Player || row.player || '',
                height: parseFloat(row.Height || row.height || '0'),
                weight: parseFloat(row.Weight || row.weight || '0'),
                fat: parseFloat(row.Fat || row.fat || '0'),
                fatMass: parseFloat(row['Fat Mass'] || row.fatMass || row['Fat_Mass'] || '0'),
                leanMass: parseFloat(row['Lean Mass'] || row.leanMass || row['Lean_Mass'] || '0'),
                date: dateStr,
                dateObject
              }
            }).filter(item => item.player && item.weight > 0) // Filter out invalid entries
            
            // Sort by date
            processedData.sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime())
            
            // Save to Supabase database
            replaceBodyCompositionData(processedData)
              .then(() => {
                console.log('Successfully saved body composition data to Supabase')
                setBodyCompositionData(processedData)
                setIsProcessing(false)
              })
              .catch((error) => {
                console.error('Failed to save body composition data:', error)
                alert(`Failed to save data to database: ${error.message}`)
                setIsProcessing(false)
              })
          },
          error: (error: any) => {
            console.error('Error parsing body composition CSV:', error)
            alert('Error parsing CSV file. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
      event.target.value = ''
    }
  }

  const handleDownloadPNG = async () => {
    if (!exportRef.current) return
    
    try {
      // Wait a moment for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#0b0b0f',
        scale: 2, // Reduced back to 2 for better compatibility
        logging: true, // Enable logging to debug issues
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false, // Disabled for better Chart.js compatibility
        imageTimeout: 0, // Remove timeout
        removeContainer: false, // Keep container
        ignoreElements: (element) => {
          // Skip problematic elements
          return element.tagName === 'IFRAME' || element.classList.contains('chartjs-render-monitor')
        }
      })
      
      // Check if canvas is valid
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has zero dimensions')
      }
      
      const link = document.createElement('a')
      link.download = `FCBJ-Dietitian-${activeView}-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png', 0.95) // Slightly reduced quality for better compatibility
      link.click()
      
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error.message}. Please try again.`)
    }
  }

  // Get unique players for selection
  const uniquePlayers = Array.from(new Set(bodyCompositionData.map(d => d.player))).sort()

  // Get latest data for each player
  const getLatestDataForPlayers = () => {
    const latestData: { [key: string]: BodyCompositionData } = {}
    
    bodyCompositionData.forEach(entry => {
      if (!latestData[entry.player] || entry.dateObject > latestData[entry.player].dateObject) {
        latestData[entry.player] = entry
      }
    })
    
    return Object.values(latestData).sort((a, b) => a.player.localeCompare(b.player))
  }

  // Get trend data for selected player
  const getPlayerTrendData = (playerName: string) => {
    return bodyCompositionData
      .filter(d => d.player === playerName)
      .sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime())
  }

  // Get all players trend data for unified view
  const getAllPlayersTrendData = () => {
    const playerTrends: Record<string, BodyCompositionData[]> = {}
    
    uniquePlayers.forEach(player => {
      playerTrends[player] = bodyCompositionData
        .filter(d => d.player === player)
        .sort((a, b) => a.dateObject.getTime() - b.dateObject.getTime())
    })
    
    return playerTrends
  }

  // Get unique dates for x-axis
  const getUniqueDates = () => {
    const dates = Array.from(new Set(bodyCompositionData.map(d => d.date)))
    return dates.sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/')
      const [dayB, monthB, yearB] = b.split('/')
      const dateA = new Date(`20${yearA}-${monthA}-${dayA}`)
      const dateB = new Date(`20${yearB}-${monthB}-${dayB}`)
      return dateA.getTime() - dateB.getTime()
    })
  }

  // Get or set metric for specific player
  const getPlayerMetric = (playerName: string): 'fat' | 'weight' | 'leanMass' => {
    return playerMetrics[playerName] || 'fat' // Default to fat
  }

  const setPlayerMetric = (playerName: string, metric: 'fat' | 'weight' | 'leanMass') => {
    setPlayerMetrics(prev => ({ ...prev, [playerName]: metric }))
  }

  const latestPlayerData = getLatestDataForPlayers()
  const selectedPlayerTrend = selectedPlayer ? getPlayerTrendData(selectedPlayer) : []

  // Chart configurations
  const trendChartData = selectedPlayerTrend.length > 0 ? {
    labels: selectedPlayerTrend.map(d => formatDateForDisplay(d.date)),
    datasets: [
      {
        label: 'Weight (kg)',
        data: selectedPlayerTrend.map(d => d.weight),
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Fat %',
        data: selectedPlayerTrend.map(d => d.fat),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      },
      {
        label: 'Lean Mass (kg)',
        data: selectedPlayerTrend.map(d => d.leanMass),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        yAxisID: 'y'
      }
    ]
  } : null

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
        dateRange: playerData.length > 0 ? formatDateForDisplay(playerData[0].date) : null
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
          // Color bars based on benchmark distance
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
          // Border colors based on benchmark distance
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

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#fff' }
      },
      title: {
        display: true,
        text: selectedPlayer ? `${selectedPlayer} - Body Composition Trends` : 'Team Body Composition Comparison',
        color: '#FFD700',
        font: { size: 16 }
      }
    },
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      y: { 
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.1)' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: { color: '#fff' },
        grid: { drawOnChartArea: false }
      }
    }
  }

  const barChartOptions = {
    indexAxis: 'y' as const, // Horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    clip: false, // Allow labels to extend beyond chart area
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
          weight: 'bold',
          family: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        },
        align: 'right',
        anchor: 'end',
        offset: displayMode === 'benchmark' ? 15 : 6,
        clip: false, // Ensure labels are never clipped
        formatter: (value: number, context: any) => {
          if (displayMode === 'trend') {
            const playerIndex = context.dataIndex
            const player = sortedPlayerData[playerIndex]
            if (player?.isFirstMeasurement) {
              return `First\n${player.dateRange}`
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
        },
        // Add shadow for benchmark labels
        ...(displayMode === 'benchmark' && {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
        })
      },
      annotation: {
        annotations: {
          averageLine: {
            type: 'line',
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
              position: 'start',
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              color: '#fff',
              font: {
                size: 12,
                weight: 'bold'
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
        right: displayMode === 'trend' ? 140 : displayMode === 'benchmark' ? 200 : 80, // Much more padding for benchmark labels
        top: 30, // Extra top padding to prevent label clipping
        bottom: 30 // Extra bottom padding
      }
    }
  }

  return (
    <div className="dietitian-dashboard">
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <div>
          <h2 style={{ color: '#FFD700', fontSize: '24px', margin: 0 }}>
            Dietitian Dashboard
          </h2>
          <p style={{ color: 'var(--secondary-text)', margin: '8px 0 0 0' }}>
            Body composition analysis and nutritional tracking
          </p>
        </div>
        {bodyCompositionData.length > 0 && (
          <button 
            onClick={handleDownloadPNG}
            style={{
              backgroundColor: '#FFD700',
              color: '#1a1f2e',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            <Download size={16} />
            Download PNG
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoadingData ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '20px' }}>
            Loading Body Composition Data...
          </h3>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 215, 0, 0.3)',
            borderTop: '4px solid #FFD700',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      ) : 
      /* Upload Section - Show if no data exists */
      bodyCompositionData.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '20px' }}>
            Upload Body Composition Data
          </h3>
          
          <div style={{
            border: '2px dashed rgba(255, 215, 0, 0.3)',
            borderRadius: '12px',
            padding: '40px',
            marginBottom: '20px',
            background: 'rgba(255, 215, 0, 0.05)'
          }}>
            <Scale size={48} color="#FFD700" style={{ marginBottom: '16px' }} />
            <p style={{ color: 'var(--primary-text)', marginBottom: '16px', fontFamily: 'Montserrat' }}>
              Upload CSV with columns: Player, Height, Weight, Fat, Fat Mass, Lean Mass, Date
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: 'none' }}
              id="body-composition-upload"
            />
            <label
              htmlFor="body-composition-upload"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'inline-block'
              }}
            >
              Choose CSV File
            </label>
          </div>
          
          {isProcessing && (
            <p style={{ color: '#FFD700', fontFamily: 'Montserrat' }}>
              Processing body composition data...
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Upload Section - Compact version when data exists */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', margin: 0, fontSize: '18px' }}>
                  Update Body Composition Data
                </h3>
                <p style={{ color: 'var(--secondary-text)', margin: '4px 0 0 0', fontSize: '14px' }}>
                  Upload new CSV to replace existing data
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  style={{ display: 'none' }}
                  id="body-composition-update"
                />
                <label
                  htmlFor="body-composition-update"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    color: '#000',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontFamily: 'Montserrat',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Upload size={16} />
                  Upload CSV
                </label>
              </div>
            </div>
            
            {isProcessing && (
              <p style={{ color: '#FFD700', fontFamily: 'Montserrat', marginTop: '16px', marginBottom: 0 }}>
                Processing body composition data...
              </p>
            )}
          </div>

          {/* View Navigation */}
          <nav className="tab-nav" style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setActiveView('overview')}
              className={`tab-button ${activeView === 'overview' ? 'active' : ''}`}
            >
              <Users />
              Overview
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`tab-button ${activeView === 'trends' ? 'active' : ''}`}
            >
              <TrendingUp />
              Player Trends
            </button>
            <button
              onClick={() => setActiveView('comparison')}
              className={`tab-button ${activeView === 'comparison' ? 'active' : ''}`}
            >
              <BarChart3 />
              Team Comparison
            </button>
          </nav>

          {/* Export Container */}
          <div ref={exportRef} style={{ 
            background: '#0b0b0f', // Use explicit color instead of CSS variable
            padding: '20px',
            borderRadius: '12px',
            minHeight: '400px',
            position: 'relative',
            overflow: 'visible'
          }}>
            
            {/* Report Header with Beitar Logo */}
            <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <img 
                src="/beitar-logo.png" 
                alt="Beitar Jerusalem" 
                style={{ 
                  height: '40px',
                  width: 'auto'
                }}
              />
              <h1 style={{ 
                color: '#FFD700', 
                fontSize: '22px',
                fontWeight: '700',
                margin: 0,
                letterSpacing: '1px'
              }}>
                FCBJ DATA - DIETITIAN DASHBOARD
              </h1>
            </div>

            {/* Content based on active view */}
            {activeView === 'overview' && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ color: '#FFD700', marginBottom: '20px', textAlign: 'center' }}>
                  Latest Body Composition Data
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', color: '#FFD700' }}>Player</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Height (m)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Weight (kg)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Fat %</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Target Range</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Status</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Fat Mass (kg)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Lean Mass (kg)</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>BMI</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestPlayerData.map((data, index) => {
                        const bmi = data.height > 0 ? (data.weight / (data.height * data.height)) : 0
                        const benchmark = getPlayerBenchmark(data.player)
                        const benchmarkStatus = getBenchmarkStatus(data.player, data.fat)
                        
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <td style={{ padding: '12px 8px', color: '#fff', fontWeight: '500' }}>{data.player}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff' }}>{data.height.toFixed(2)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff' }}>{data.weight.toFixed(1)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff', fontWeight: '600' }}>{data.fat.toFixed(1)}%</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#FFD700', fontSize: '12px' }}>
                              {benchmark ? `${benchmark.min}-${benchmark.max}%` : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: benchmarkStatus.color, fontSize: '12px', fontWeight: '600' }}>
                              {benchmark ? (
                                data.fat >= benchmark.min && data.fat <= benchmark.max ? '✓ On target' : 
                                data.fat < benchmark.min ? '↓ Below' : '↑ Above'
                              ) : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff' }}>{data.fatMass.toFixed(1)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff' }}>{data.leanMass.toFixed(1)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff' }}>{bmi.toFixed(1)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', color: '#fff' }}>{formatDateForDisplay(data.date)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'trends' && (
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
                        console.log('Shimol name bytes:', [...playerName].map(c => c.charCodeAt(0)))
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
                      labels: playerTrends.map(d => formatDateForDisplay(d.date)),
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
                          position: 'start',
                          xAdjust: -80, // Move further left to ensure visibility
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          color: '#fff',
                          font: {
                            size: 10,
                            weight: 'bold'
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
                          position: 'end',
                          xAdjust: 80, // Move further right to ensure visibility
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          color: '#fff',
                          font: {
                            size: 10,
                            weight: 'bold'
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
                      clip: false, // Allow labels to extend beyond chart area
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
                            weight: 'bold'
                          },
                          align: 'top',
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
                                {playerTrends.length} measurements • {formatDateForDisplay(firstData?.date || '')} → {formatDateForDisplay(latestData.date)}
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
                                (playerSelectedMetric === 'leanMass' ? '#22c55e' : '#ef4444') : 
                                (playerSelectedMetric === 'fat' ? '#22c55e' : '#ef4444'),
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

            {activeView === 'comparison' && (
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
                      // Debug logging for Ziv Ben Shimol
                      if (playerData.player.includes('Shimol')) {
                        console.log('Looking up profile for:', playerData.player)
                        console.log('Found profile:', profile)
                        console.log('Available Shimol profiles:', Object.keys(playerProfiles).filter(k => k.includes('Shimol')))
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
            )}
          </div>
        </>
      )}
    </div>
  )
}