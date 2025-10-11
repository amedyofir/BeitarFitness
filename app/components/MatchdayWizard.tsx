'use client'

import React, { useState, useEffect } from 'react'
import { Upload, FileText, PlayCircle, CheckCircle, AlertCircle, Users, User } from 'lucide-react'
import Papa from 'papaparse'
import MatchdayReport from './MatchdayReport'
import { saveMatchGpsData, checkMatchweekExists, fetchAvailableMatchweeks } from '@/lib/matchGpsService'
import type { MatchGpsData, MatchMetadata } from '@/lib/matchGpsService'
import { saveTeamMatchStatistics, parseTeamCsvRow, checkTeamMatchweekExists, fetchTeamMatchMetadata, fetchTeamMatchStatistics, saveAggregatedTeamStatistics, checkAggregatedDataExists } from '@/lib/teamMatchService'
import type { TeamMatchStatistics, TeamMatchMetadata } from '@/lib/teamMatchService'
import { parseOurTeamMetricsCsvRow, mergeOpponentStatistics } from '@/lib/opponentDataService'

interface MatchdayWizardProps {}

export default function MatchdayWizard({}: MatchdayWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [matchdayNumber, setMatchdayNumber] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvFile2, setCsvFile2] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvData1, setCsvData1] = useState<any[]>([])
  const [csvData2, setCsvData2] = useState<any[]>([])
  const [showReport, setShowReport] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [opponent, setOpponent] = useState('')
  const [matchType, setMatchType] = useState<'home' | 'away'>('home')
  const [existingMatchweeks, setExistingMatchweeks] = useState<any[]>([])
  const [dataExists, setDataExists] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [csvDataType, setCsvDataType] = useState<'player' | 'team' | 'aggregated' | null>(null)
  const [teamDataExists, setTeamDataExists] = useState(false)
  const [uploadMode, setUploadMode] = useState<'individual' | 'aggregated'>('individual')
  const [showHistoricalReports, setShowHistoricalReports] = useState(false)
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [currentReportIndex, setCurrentReportIndex] = useState(0)
  const [uploadedAggregatedExists, setUploadedAggregatedExists] = useState(false)

  // Israeli Premier League teams list
  const israeliClubs = [
    'Hapoel Be\'er Sheva',
    'Hapoel Haifa',
    'Hapoel Jerusalem',
    'Maccabi Haifa',
    'Maccabi Tel Aviv',
    'Ashdod',
    'Beitar Jerusalem',
    'Bnei Raina',
    'Ironi Kiryat Shmona',
    'Maccabi Netanya',
    'Hapoel Tel Aviv',
    'Bnei Sakhnin',
    'Ironi Tiberias',
    'Maccabi Bnei Raina',
    'Hapoel Petah Tikva',
  ].sort()

  // Helper function to generate date from matchday number
  const getMatchDateFromMatchday = (matchday: number): string => {
    // Validate matchday input
    if (!matchday || isNaN(matchday) || matchday < 1 || matchday > 36) {
      return new Date().toISOString().split('T')[0] // Return today's date as fallback
    }

    // Season 2024/25 started approximately August 17, 2024
    // Assuming roughly one matchweek per week
    const seasonStart = new Date('2024-08-17')
    const weeksToAdd = matchday - 1
    const matchDate = new Date(seasonStart)
    matchDate.setDate(seasonStart.getDate() + (weeksToAdd * 7))

    // Validate the resulting date
    if (isNaN(matchDate.getTime())) {
      return new Date().toISOString().split('T')[0] // Return today's date as fallback
    }

    return matchDate.toISOString().split('T')[0] // Returns YYYY-MM-DD format
  }

  const steps = [
    { number: 1, title: 'Select Matchday', icon: PlayCircle },
    { number: 2, title: 'Upload CSV', icon: Upload },
    { number: 3, title: 'Generate Report', icon: FileText },
    { number: 4, title: 'Complete', icon: CheckCircle }
  ]

  useEffect(() => {
    // Fetch existing matchweeks on component mount
    const loadExistingMatchweeks = async () => {
      try {
        // Try to fetch both player GPS and team statistics matchweeks for all season formats
        const gpsMatchweeks2025 = await fetchAvailableMatchweeks('2025-2026').catch((error) => {
          console.warn('GPS 2025-2026 fetch failed:', error.message)
          return []
        })
        const gpsMatchweeks2024 = await fetchAvailableMatchweeks('2024-2025').catch((error) => {
          console.warn('GPS 2024-2025 fetch failed:', error.message)
          return []
        })
        const gpsMatchweeks2024Alt = await fetchAvailableMatchweeks('2024/25').catch((error) => {
          console.warn('GPS 2024/25 fetch failed:', error.message)
          return []
        })
        const { fetchTeamMatchMetadata } = await import('@/lib/teamMatchService')
        const teamMatchweeks2025 = await fetchTeamMatchMetadata('2025-2026').catch((error) => {
          console.warn('Team 2025-2026 fetch failed:', error.message)
          return []
        })
        const teamMatchweeks2024 = await fetchTeamMatchMetadata('2024-2025').catch((error) => {
          console.warn('Team 2024-2025 fetch failed:', error.message)
          return []
        })
        const teamMatchweeks2024Alt = await fetchTeamMatchMetadata('2024/25').catch((error) => {
          console.warn('Team 2024/25 fetch failed:', error.message)
          return []
        })
        
        console.log('GPS 2025-2026:', gpsMatchweeks2025)
        console.log('GPS 2024-2025:', gpsMatchweeks2024)
        console.log('GPS 2024/25:', gpsMatchweeks2024Alt)
        console.log('Team 2025-2026:', teamMatchweeks2025)
        console.log('Team 2024-2025:', teamMatchweeks2024)
        console.log('Team 2024/25:', teamMatchweeks2024Alt)
        
        // Also try to load from CSV reports (which is where your data is likely stored)
        const { CSVReportService } = await import('@/lib/csvReportService')
        const csvReports = await CSVReportService.getAllReports().catch((error) => {
          console.warn('CSV reports fetch failed:', error.message)
          return { success: false, data: [] }
        })
        
        let csvMatchweeks: any[] = []
        if (csvReports.success && csvReports.data) {
          csvMatchweeks = csvReports.data.map((report: any) => ({
            matchweek: parseInt(report.matchday_number),
            match_date: report.match_date,
            opponent: report.opponent_team,
            match_type: 'home', // Default since CSV reports don't specify
            season: report.season
          }))
          console.log('CSV Reports as Matchweeks:', csvMatchweeks)
        }
        
        const gpsMatchweeks = [...gpsMatchweeks2025, ...gpsMatchweeks2024]
        const teamMatchweeks = [...teamMatchweeks2025, ...teamMatchweeks2024]
        
        // Debug: Log the fetched data
        console.log('GPS Matchweeks:', gpsMatchweeks)
        console.log('Team Matchweeks:', teamMatchweeks)
        
        // Combine and deduplicate by matchweek, filter out aggregated data (matchweek 999)
        const allMatchweeks = [...gpsMatchweeks, ...teamMatchweeks, ...csvMatchweeks]
        console.log('All Matchweeks before dedup:', allMatchweeks)
        
        const uniqueMatchweeks = allMatchweeks.reduce((acc: any[], current: any) => {
          const existing = acc.find((item: any) => item.matchweek === current.matchweek)
          if (!existing && current.matchweek !== 999) { // Exclude aggregated data from regular listings
            acc.push(current)
          }
          return acc
        }, [])
        
        console.log('Unique Matchweeks after dedup:', uniqueMatchweeks)
        setExistingMatchweeks(uniqueMatchweeks)

        // Check if uploaded aggregated data exists
        try {
          const { checkAggregatedDataExists } = await import('@/lib/teamMatchService')
          const hasUploadedAggregated = await checkAggregatedDataExists()
          setUploadedAggregatedExists(hasUploadedAggregated)
        } catch (error) {
          console.error('Error checking for uploaded aggregated data:', error)
        }
      } catch (error) {
        console.error('Error fetching matchweeks:', error)
      }
    }
    
    loadExistingMatchweeks()
  }, [])

  const handleMatchdaySubmit = async () => {
    if (matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36) {
      // Check if data already exists for this matchweek (both player and team)
      const playerExists = await checkMatchweekExists(parseInt(matchdayNumber))
      const teamExists = await checkTeamMatchweekExists(parseInt(matchdayNumber))
      setDataExists(playerExists)
      setTeamDataExists(teamExists)
      setCurrentStep(2)
    }
  }

  const handleCsv1Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setIsProcessing(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string

        // Parse CSV using Papa Parse
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV 1 parsing completed:', results.data)

            // Detect data type based on column headers
            const headers = Object.keys(results.data[0] || {})
            const isTeamData = headers.includes('teamFullName') || headers.includes('Team') || headers.includes('teamId')
            const isPlayerData = headers.includes('Player') || headers.includes('player_name') || headers.includes('Minutes') || headers.includes('minutes_played')

            if (isTeamData) {
              // Set data type based on upload mode
              setCsvDataType(uploadMode === 'aggregated' ? 'aggregated' : 'team')
              console.log(`Detected team statistics data - Mode: ${uploadMode === 'aggregated' ? 'aggregated' : 'individual'}`)
              // Process team data using the team service parsing function
              const processedData = results.data.map((row: any) => parseTeamCsvRow(row))
              setCsvData1(processedData)

              // If CSV 2 is already uploaded, merge them (rename fields to opp_)
              if (csvData2.length > 0) {
                const merged = mergeOpponentStatistics(processedData, csvData2).map((team: any) => {
                  const {
                    our_avg_sequence_time,
                    our_long_ball_percentage,
                    our_s1e3,
                    our_s1e2,
                    our_s1,
                    our_a1_to_a2_a3_percentage, // Remove if exists
                    opp_a1_to_a2_a3_percentage, // Remove if exists
                    ...restTeam
                  } = team as any

                  console.log(`Team ${team.team_full_name}: s1e3=${our_s1e3}, s1e2=${our_s1e2}, s1=${our_s1}`)

                  return {
                    ...restTeam,
                    opp_avg_sequence_time: our_avg_sequence_time,
                    opp_long_ball_percentage: our_long_ball_percentage,
                    opp_s1e3: our_s1e3,
                    opp_s1e2: our_s1e2,
                    opp_s1: our_s1
                  }
                })
                setCsvData(merged)
                setCurrentStep(3)
              }
            } else if (isPlayerData) {
              setCsvDataType('player')
              console.log('Detected player GPS data')
              // Convert numeric strings to numbers for calculations (existing logic for player data)
              const processedData = results.data.map((row: any) => {
                const processedRow: any = { ...row }

                // Convert numeric fields for player data
                const numericFields = [
                  'Minutes', 'minutes_played', 'Distance', 'total_distance', 'HSR Distance', 'hsr_distance',
                  'Sprint Distance', 'sprint_distance', 'Accelerations', 'accelerations', 'Decelerations', 'decelerations',
                  'Max Speed', 'max_speed', 'Avg Speed', 'avg_speed', 'Sprints', 'sprints',
                  'Top Speed %', 'top_speed_percentage', 'Metabolic Power', 'metabolic_power',
                  'HMLD', 'hmld', 'DSL', 'dynamic_stress_load', 'Total Loading', 'total_loading',
                  'Fatigue Index', 'fatigue_index'
                ]

                numericFields.forEach(field => {
                  if (processedRow[field] && !isNaN(parseFloat(processedRow[field]))) {
                    processedRow[field] = parseFloat(processedRow[field])
                  }
                })

                return processedRow
              })
              setCsvData(processedData)
              setCurrentStep(3) // Player data only needs one CSV
            } else {
              // Fallback - try to detect based on content
              setCsvDataType('team') // Default to team for the provided sample
              console.log('Could not detect data type, defaulting to team statistics')
              const processedData = results.data.map((row: any) => parseTeamCsvRow(row))
              setCsvData1(processedData)

              // If CSV 2 is already uploaded, merge them (rename fields to opp_)
              if (csvData2.length > 0) {
                const merged = mergeOpponentStatistics(processedData, csvData2).map((team: any) => {
                  const {
                    our_avg_sequence_time,
                    our_long_ball_percentage,
                    our_s1e3,
                    our_s1e2,
                    our_s1,
                    our_a1_to_a2_a3_percentage, // Remove if exists
                    opp_a1_to_a2_a3_percentage, // Remove if exists
                    ...restTeam
                  } = team as any

                  console.log(`Team ${team.team_full_name}: s1e3=${our_s1e3}, s1e2=${our_s1e2}, s1=${our_s1}`)

                  return {
                    ...restTeam,
                    opp_avg_sequence_time: our_avg_sequence_time,
                    opp_long_ball_percentage: our_long_ball_percentage,
                    opp_s1e3: our_s1e3,
                    opp_s1e2: our_s1e2,
                    opp_s1: our_s1
                  }
                })
                setCsvData(merged)
                setCurrentStep(3)
              }
            }

            setIsProcessing(false)
          },
          error: (error: any) => {
            console.error('Error parsing CSV 1:', error)
            alert('Error parsing CSV file 1. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
    }
  }

  const handleCsv2Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile2(file)
      setIsProcessing(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('CSV 2 parsing completed:', results.data)

            // Process opponent metrics data
            const processedData = results.data.map((row: any) => parseOurTeamMetricsCsvRow(row))
            setCsvData2(processedData)

            setIsProcessing(false)

            // If CSV 1 is already uploaded, merge them (rename fields to opp_)
            if (csvData1.length > 0) {
              const merged = mergeOpponentStatistics(csvData1, processedData).map(team => {
                const {
                  our_avg_sequence_time,
                  our_long_ball_percentage,
                  our_s1e3,
                  our_s1e2,
                  our_s1,
                  our_a1_to_a2_a3_percentage,
                  opp_a1_to_a2_a3_percentage,
                  ...restTeam
                } = team as any

                console.log(`CSV2-first: Team ${team.team_full_name}: s1e3=${our_s1e3}, s1e2=${our_s1e2}, s1=${our_s1}`)

                return {
                  ...restTeam,
                  opp_avg_sequence_time: our_avg_sequence_time,
                  opp_long_ball_percentage: our_long_ball_percentage,
                  opp_s1e3: our_s1e3,
                  opp_s1e2: our_s1e2,
                  opp_s1: our_s1
                }
              })
              setCsvData(merged)
              setCurrentStep(3)
            }
          },
          error: (error: any) => {
            console.error('Error parsing CSV 2:', error)
            alert('Error parsing CSV file 2. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
    }
  }

  // Keep old handler name for compatibility
  const handleCsvUpload = handleCsv1Upload

  const generateReport = async () => {
    setIsProcessing(true)
    setSaveError(null)
    
    try {
      if (csvDataType === 'aggregated') {
        // Handle aggregated team statistics data
        const teamData: TeamMatchStatistics[] = csvData.map((row: any) => ({
          ...row,
          season: '2025-2026'
        }))

        // Save aggregated data to Supabase
        await saveAggregatedTeamStatistics(teamData)
        console.log('Successfully saved aggregated season statistics to Supabase')
        
      } else if (csvDataType === 'team') {
        const matchday = parseInt(matchdayNumber)
        const generatedMatchDate = getMatchDateFromMatchday(matchday)
        // Handle team statistics data
        const teamData: TeamMatchStatistics[] = csvData.map((row: any) => ({
          ...row,
          matchweek: matchday,
          match_date: generatedMatchDate,
          season: '2025-2026'
        }))

        // Prepare team metadata
        const teamMetadata: TeamMatchMetadata = {
          matchweek: matchday,
          match_date: generatedMatchDate,
          competition: 'Ligat Ha\'al',
          league_name: 'Ligat Ha\'al (Israel)',
          csv_filename: csvFile?.name || '',
          season: '2025-2026',
          teams_count: teamData.length
        }

        // Save team data to Supabase
        await saveTeamMatchStatistics(teamData, teamMetadata)
        console.log('Successfully saved team statistics to Supabase')
        
      } else {
        // Handle player GPS data (existing logic)
        const matchday = parseInt(matchdayNumber)
        const generatedMatchDate = getMatchDateFromMatchday(matchday)
        
        const gpsData: MatchGpsData[] = csvData.map((row: any) => ({
          matchweek: matchday,
          match_date: generatedMatchDate,
          opponent: opponent,
          match_type: matchType,
          player_name: row['Player'] || row['player_name'] || '',
          position: row['Position'] || row['position'] || '',
          minutes_played: parseFloat(row['Minutes'] || row['minutes_played'] || 0),
          total_distance: parseFloat(row['Distance'] || row['total_distance'] || 0),
          hsr_distance: parseFloat(row['HSR Distance'] || row['hsr_distance'] || 0),
          sprint_distance: parseFloat(row['Sprint Distance'] || row['sprint_distance'] || 0),
          accelerations: parseInt(row['Accelerations'] || row['accelerations'] || 0),
          decelerations: parseInt(row['Decelerations'] || row['decelerations'] || 0),
          max_speed: parseFloat(row['Max Speed'] || row['max_speed'] || 0),
          avg_speed: parseFloat(row['Avg Speed'] || row['avg_speed'] || 0),
          sprints: parseInt(row['Sprints'] || row['sprints'] || 0),
          top_speed_percentage: parseFloat(row['Top Speed %'] || row['top_speed_percentage'] || 0),
          metabolic_power: parseFloat(row['Metabolic Power'] || row['metabolic_power'] || 0),
          hmld: parseFloat(row['HMLD'] || row['hmld'] || 0),
          dynamic_stress_load: parseFloat(row['DSL'] || row['dynamic_stress_load'] || 0),
          total_loading: parseFloat(row['Total Loading'] || row['total_loading'] || 0),
          fatigue_index: parseFloat(row['Fatigue Index'] || row['fatigue_index'] || 0),
          season: '2025-2026'
        }))

        // Prepare player metadata
        const metadata: MatchMetadata = {
          matchweek: matchday,
          match_date: generatedMatchDate,
          opponent: opponent,
          match_type: matchType,
          csv_filename: csvFile?.name || '',
          season: '2025-2026'
        }

        // Save player GPS data to Supabase
        await saveMatchGpsData(gpsData, metadata)
        console.log('Successfully saved match GPS data to Supabase')
      }
      
      // Update existing matchweeks list based on data type
      try {
        if (csvDataType === 'team') {
          // For team data, fetch team matchweeks
          const { fetchTeamMatchMetadata } = await import('@/lib/teamMatchService')
          const updatedMatchweeks = await fetchTeamMatchMetadata()
          setExistingMatchweeks(updatedMatchweeks)
        } else {
          // For player GPS data, fetch GPS matchweeks
          const updatedMatchweeks = await fetchAvailableMatchweeks()
          setExistingMatchweeks(updatedMatchweeks)
        }
      } catch (fetchError) {
        console.log('Note: Could not update matchweeks list, but data was saved successfully')
      }
      
      setIsProcessing(false)
      setShowReport(true)
      setCurrentStep(4)
    } catch (error) {
      console.error('Error saving data:', error)
      setSaveError('Failed to save data to database. Please try again.')
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setMatchdayNumber('')
    setOpponent('')
    setCsvFile(null)
    setCsvData([])
    setIsProcessing(false)
    setShowReport(false)
    setCsvDataType(null)
    setDataExists(false)
    setTeamDataExists(false)
    setSaveError(null)
    setShowHistoricalReports(false)
    setLoadingHistorical(false)
    setCurrentReportIndex(0)
  }

  const loadHistoricalReport = async (matchweek: number, dataType: 'team' | 'player') => {
    setLoadingHistorical(true)
    try {
      if (dataType === 'team') {
        // Load team statistics data
        const data = await fetchTeamMatchStatistics(matchweek)
        if (data && data.length > 0) {
          setCsvData(data)
          setCsvDataType('team')
          setMatchdayNumber(matchweek.toString())
          setShowReport(true)
          setShowHistoricalReports(false)
          setCurrentStep(4)
        } else {
          alert('No team data found for this matchweek')
        }
      } else {
        // Load player GPS data
        const { fetchMatchGpsData } = await import('@/lib/matchGpsService')
        const data = await fetchMatchGpsData(matchweek)
        if (data && data.length > 0) {
          setCsvData(data)
          setCsvDataType('player')
          setMatchdayNumber(matchweek.toString())
          setShowReport(true)
          setShowHistoricalReports(false)
          setCurrentStep(4)
        } else {
          alert('No player data found for this matchweek')
        }
      }
    } catch (error) {
      console.error('Error loading historical report:', error)
      alert('Failed to load historical report')
    }
    setLoadingHistorical(false)
  }

  const nextReport = () => {
    setCurrentReportIndex((prev) => (prev + 1) % existingMatchweeks.length)
  }

  const prevReport = () => {
    setCurrentReportIndex((prev) => (prev - 1 + existingMatchweeks.length) % existingMatchweeks.length)
  }

  const goToReport = (index: number) => {
    setCurrentReportIndex(index)
  }

  const loadAggregatedReport = async () => {
    setLoadingHistorical(true)
    try {
      // Get all team data and aggregate it
      const allTeamData: any[] = []
      const matchdayNumbers = Array.from(new Set(existingMatchweeks.map((mw: any) => mw.matchweek)))
      
      for (const matchweek of matchdayNumbers) {
        try {
          const data = await fetchTeamMatchStatistics(matchweek)
          if (data && data.length > 0) {
            allTeamData.push(...data.map(team => ({ ...team, source_matchweek: matchweek })))
          }
        } catch (error) {
          console.log(`No team data for matchweek ${matchweek}`)
        }
      }

      if (allTeamData.length > 0) {
        // Create aggregated data - average stats for each team across all matchdays
        const teamAggregates: any = {}

        allTeamData.forEach((team: any) => {
          const teamName = team.team_full_name
          if (!teamAggregates[teamName]) {
            teamAggregates[teamName] = {
              ...team,
              matchdays_count: 0,
              source_matchweeks: []
            }
          }
          
          const agg = teamAggregates[teamName]
          agg.matchdays_count += 1
          agg.source_matchweeks.push(team.source_matchweek)
          
          // Aggregate numeric fields
          const numericFields = [
            'goals_scored', 'expected_assists', 'expected_goals_per_shot', 'expected_goals',
            'ground_duels', 'dribbles_successful', 'start_a3_end_box', 'start_a2_end_box',
            'pass_completed_to_box', 'end_box_using_corner', 'start_a2_end_a3',
            'start_a1_end_box', 'start_a2_end_a3_alt', 'start_a1_end_a3', 'start_a1_end_a2',
            'seq_start_att_3rd', 'seq_start_mid_3rd', 'seq_start_a1', 'aerial_percentage',
            'ground_percentage', 'cross_open', 'pass_from_assist_to_golden', 'pass_assist_zone',
            'shots_on_goal_penalty_area', 'shots_on_goal_from_box', 'shot_from_golden',
            'shot_from_box', 'shots_on_goal', 'shots_including_blocked', 'actual_goals',
            'touches', 'touch_opponent_box', 'drop_forward_up_percentage',
            'possession_won_opponent_half', 'avg_sequence_time', 'ppda_40'
          ]
          
          numericFields.forEach(field => {
            if (team[field] !== null && team[field] !== undefined && !isNaN(parseFloat(team[field]))) {
              if (agg.matchdays_count === 1) {
                agg[field] = parseFloat(team[field])
              } else {
                agg[field] = ((agg[field] * (agg.matchdays_count - 1)) + parseFloat(team[field])) / agg.matchdays_count
              }
            }
          })
        })

        const aggregatedData = Object.values(teamAggregates)
        setCsvData(aggregatedData)
        setCsvDataType('team')
        setMatchdayNumber(`Season (${matchdayNumbers.length} matchdays)`)
        setShowReport(true)
        setCurrentStep(4)
      } else {
        alert('No team statistics data found to aggregate')
      }
    } catch (error) {
      console.error('Error loading aggregated report:', error)
      alert('Failed to load aggregated report')
    }
    setLoadingHistorical(false)
  }

  return (
    <div className="wizard-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Beitar Logo */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img 
          src="/Beitarlogo.png" 
          alt="Beitar Jerusalem Logo" 
          style={{ 
            width: '80px', 
            height: '80px', 
            objectFit: 'contain',
            marginBottom: '10px' 
          }}
        />
        <h2 style={{ 
          color: '#FFD700', 
          fontFamily: 'Montserrat', 
          fontWeight: '600',
          marginBottom: '5px' 
        }}>
          Matchday Football Stats Wizard
        </h2>
        <p style={{ 
          color: 'var(--secondary-text)', 
          fontSize: '14px',
          fontFamily: 'Montserrat' 
        }}>
          Create detailed matchday reports from your CSV data
        </p>
        
      </div>

      {/* Progress Steps */}
      <div className="wizard-steps" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '40px',
        gap: '20px' 
      }}>
        {steps.map((step, _index) => {
          const IconComponent = step.icon
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          
          return (
            <div 
              key={step.number}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: isActive || isCompleted ? 1 : 0.5
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: isCompleted 
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                  : isActive 
                    ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                    : 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                border: isActive ? '2px solid #FFD700' : 'none'
              }}>
                <IconComponent 
                  size={24} 
                  color={isCompleted ? '#fff' : isActive ? '#000' : '#fff'} 
                />
              </div>
              <span style={{
                fontSize: '12px',
                color: isActive ? '#FFD700' : isCompleted ? '#22c55e' : 'var(--secondary-text)',
                fontFamily: 'Montserrat',
                fontWeight: isActive ? '600' : '400',
                textAlign: 'center'
              }}>
                {step.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Historical Reports Carousel - Always Visible */}
      {existingMatchweeks.length > 0 && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ color: '#FFD700', marginBottom: '15px', fontFamily: 'Montserrat', fontSize: '16px', textAlign: 'center' }}>
            📊 Previously Saved Reports ({currentReportIndex + 1} of {existingMatchweeks.length})
          </h3>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Previous Arrow */}
            <button
              onClick={prevReport}
              disabled={existingMatchweeks.length <= 1}
              style={{
                background: existingMatchweeks.length <= 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 215, 0, 0.2)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: existingMatchweeks.length <= 1 ? 'not-allowed' : 'pointer',
                color: existingMatchweeks.length <= 1 ? '#666' : '#FFD700',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ←
            </button>

            {/* Current Report Card */}
            <div style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              position: 'relative'
            }}>
              {(() => {
                const matchweek = existingMatchweeks[currentReportIndex]
                return (
                  <>
                    <h4 style={{ color: '#FFD700', margin: '0 0 8px 0', fontFamily: 'Montserrat', fontSize: '18px', fontWeight: '600' }}>
                      Matchday {matchweek.matchweek}
                    </h4>
                    <p style={{ color: 'var(--secondary-text)', margin: '0 0 12px 0', fontFamily: 'Montserrat', fontSize: '14px' }}>
                      {matchweek.match_date && !isNaN(new Date(matchweek.match_date).getTime())
                        ? new Date(matchweek.match_date).toLocaleDateString('en-GB')
                        : 'Date not available'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                      {matchweek.opponent && (
                        <span style={{ 
                          background: 'rgba(59, 130, 246, 0.2)', 
                          color: '#3b82f6', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          fontFamily: 'Montserrat',
                          fontWeight: '500'
                        }}>
                          vs {matchweek.opponent}
                        </span>
                      )}
                      <span style={{ 
                        background: matchweek.teams_count ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                        color: matchweek.teams_count ? '#22c55e' : '#3b82f6', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '12px',
                        fontFamily: 'Montserrat',
                        fontWeight: '500'
                      }}>
                        {matchweek.teams_count ? `${matchweek.teams_count} Teams` : 'Player GPS'}
                      </span>
                    </div>
                    <button
                      onClick={() => loadHistoricalReport(matchweek.matchweek, matchweek.teams_count ? 'team' : 'player')}
                      disabled={loadingHistorical}
                      style={{
                        background: loadingHistorical ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                        color: loadingHistorical ? 'var(--secondary-text)' : '#000',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600',
                        cursor: loadingHistorical ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        minWidth: '120px'
                      }}
                    >
                      {loadingHistorical ? 'Loading...' : '👁️ View Report'}
                    </button>
                  </>
                )
              })()}
            </div>

            {/* Next Arrow */}
            <button
              onClick={nextReport}
              disabled={existingMatchweeks.length <= 1}
              style={{
                background: existingMatchweeks.length <= 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 215, 0, 0.2)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: existingMatchweeks.length <= 1 ? 'not-allowed' : 'pointer',
                color: existingMatchweeks.length <= 1 ? '#666' : '#FFD700',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              →
            </button>
          </div>

          {/* Dots Navigation */}
          {existingMatchweeks.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '15px' }}>
              {existingMatchweeks.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToReport(index)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: 'none',
                    background: index === currentReportIndex ? '#FFD700' : 'rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          )}

          {/* Aggregated Report Button - only show if multiple team matchweeks exist AND no uploaded aggregated data */}
          {existingMatchweeks.filter(mw => mw.teams_count).length > 1 && !uploadedAggregatedExists && (
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255, 215, 0, 0.2)' }}>
              <button
                onClick={loadAggregatedReport}
                disabled={loadingHistorical}
                style={{
                  background: loadingHistorical ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: loadingHistorical ? 'var(--secondary-text)' : '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: loadingHistorical ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <span>📊</span>
                {loadingHistorical ? 'Generating...' : 'Season Summary Report'}
              </button>
              <p style={{ 
                color: 'var(--secondary-text)', 
                fontSize: '11px', 
                marginTop: '8px', 
                fontFamily: 'Montserrat',
                fontStyle: 'italic'
              }}>
                View averaged statistics across all {existingMatchweeks.filter(mw => mw.teams_count).length} matchdays
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step Content */}
      <div className="glass-card" style={{ padding: '30px', minHeight: '300px' }}>
        {/* Step 1: Select Matchday */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              {uploadMode === 'individual' ? 'Select Matchday Number' : 'Upload Aggregated Season Data'}
            </h3>
            
            {/* Upload Mode Selector */}
            <div style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
                <button
                  onClick={() => setUploadMode('individual')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: uploadMode === 'individual' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                    background: uploadMode === 'individual' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: uploadMode === 'individual' ? '#FFD700' : 'var(--secondary-text)',
                    fontFamily: 'Montserrat',
                    fontWeight: uploadMode === 'individual' ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📊 Individual Match
                </button>
                <button
                  onClick={() => setUploadMode('aggregated')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: uploadMode === 'aggregated' ? '2px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.3)',
                    background: uploadMode === 'aggregated' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: uploadMode === 'aggregated' ? '#22c55e' : 'var(--secondary-text)',
                    fontFamily: 'Montserrat',
                    fontWeight: uploadMode === 'aggregated' ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🏆 Season Summary
                </button>
              </div>
              
              <p style={{ 
                color: 'var(--secondary-text)', 
                fontSize: '12px', 
                fontFamily: 'Montserrat',
                fontStyle: 'italic' 
              }}>
                {uploadMode === 'individual' 
                  ? 'Upload data for a specific matchday (1-36)'
                  : 'Upload aggregated season statistics (overwrites existing summary)'}
              </p>
            </div>

{uploadMode === 'individual' ? (
              <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
                Choose the matchday number for your football stats report (1-36)
              </p>
            ) : (
              <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
                Upload season-long aggregated statistics for all teams. This will overwrite any existing season summary data.
              </p>
            )}
            
            {uploadMode === 'individual' && (
              <>
                {/* Show existing matchweeks */}
                {existingMatchweeks.length > 0 && (
                  <div style={{
                    background: 'rgba(255, 215, 0, 0.05)',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                    maxWidth: '400px',
                    margin: '0 auto 20px'
                  }}>
                    <p style={{ color: '#FFD700', fontSize: '12px', marginBottom: '8px', fontFamily: 'Montserrat' }}>
                      Existing Matchweeks:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                      {existingMatchweeks.map(mw => (
                        <span key={mw.matchweek} style={{
                          background: 'rgba(255, 215, 0, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'var(--primary-text)',
                          fontFamily: 'Montserrat'
                        }}>
                          MW{mw.matchweek}: {mw.opponent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div style={{ maxWidth: '400px', margin: '0 auto', marginBottom: '30px' }}>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={matchdayNumber}
                    onChange={(e) => setMatchdayNumber(e.target.value)}
                    placeholder="Enter matchday number"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--primary-text)',
                      fontSize: '16px',
                      fontFamily: 'Montserrat',
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}
                  />
                  
                  <select
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--primary-text)',
                      fontSize: '14px',
                      fontFamily: 'Montserrat',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}>
                      Select opponent (optional for team stats)
                    </option>
                    {israeliClubs.map(club => (
                      <option 
                        key={club} 
                        value={club}
                        style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}
                      >
                        {club}
                      </option>
                    ))}
                  </select>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setMatchType('home')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: matchType === 'home' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                        background: matchType === 'home' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: matchType === 'home' ? '#FFD700' : 'var(--secondary-text)',
                        fontFamily: 'Montserrat',
                        fontWeight: matchType === 'home' ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Home
                    </button>
                    <button
                      onClick={() => setMatchType('away')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '6px',
                        border: matchType === 'away' ? '2px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                        background: matchType === 'away' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        color: matchType === 'away' ? '#FFD700' : 'var(--secondary-text)',
                        fontFamily: 'Montserrat',
                        fontWeight: matchType === 'away' ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Away
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleMatchdaySubmit}
                  disabled={!matchdayNumber || parseInt(matchdayNumber) < 1 || parseInt(matchdayNumber) > 36}
                  style={{
                    background: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    color: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                      ? '#000' 
                      : 'var(--secondary-text)',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontFamily: 'Montserrat',
                    fontWeight: '600',
                    cursor: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                      ? 'pointer' 
                      : 'not-allowed',
                    fontSize: '14px'
                  }}
                >
                  Continue to CSV Upload
                </button>
              </>
            )}
            
            {uploadMode === 'aggregated' && (
              <div style={{ maxWidth: '500px', margin: '0 auto', marginBottom: '30px' }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ color: '#22c55e', marginBottom: '10px', fontFamily: 'Montserrat', fontSize: '16px' }}>
                    🏆 Season Summary Mode
                  </h4>
                  <p style={{ color: 'var(--primary-text)', fontSize: '14px', fontFamily: 'Montserrat', marginBottom: '10px' }}>
                    This mode allows you to upload pre-aggregated season statistics that represent the full season performance for all teams.
                  </p>
                  <ul style={{ color: 'var(--secondary-text)', fontSize: '12px', fontFamily: 'Montserrat', marginLeft: '20px' }}>
                    <li>Upload will overwrite any existing season summary data</li>
                    <li>Data should contain aggregated statistics (not individual match data)</li>
                    <li>CSV format should match team statistics structure</li>
                    <li>No matchday number or opponent selection needed</li>
                  </ul>
                </div>
                
                <button
                  onClick={() => {
                    setCsvDataType('aggregated')
                    setMatchdayNumber('Season Summary')
                    setCurrentStep(2)
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontFamily: 'Montserrat',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Continue to CSV Upload
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              {uploadMode === 'aggregated' ? 'Upload Aggregated Season Data CSV' : 'Upload Football Stats CSV'}
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              {uploadMode === 'aggregated' 
                ? 'Upload your aggregated season statistics CSV file containing team performance data'
                : `Upload your matchday ${matchdayNumber} CSV file containing player and team statistics`
              }
            </p>
            
            {(dataExists || teamDataExists) && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="#fbbf24" />
                <p style={{ color: '#fbbf24', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  {dataExists && teamDataExists 
                    ? `Both player GPS and team statistics data exist for matchweek ${matchdayNumber}. New data will replace existing.`
                    : dataExists 
                      ? `Player GPS data exists for matchweek ${matchdayNumber}. New data will replace existing.`
                      : `Team statistics data exists for matchweek ${matchdayNumber}. New data will replace existing.`
                  }
                </p>
              </div>
            )}
            
            {csvDataType && (
              <div style={{
                background: csvDataType === 'team' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                border: csvDataType === 'team' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                {csvDataType === 'team' ? <Users size={16} color="#22c55e" /> : <User size={16} color="#3b82f6" />}
                <p style={{ color: csvDataType === 'team' ? '#22c55e' : '#3b82f6', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Detected: {csvDataType === 'team' ? 'Team Statistics Data' : 'Player GPS Data'} ({csvData.length} {csvDataType === 'team' ? 'teams' : 'players'})
                </p>
              </div>
            )}
            
            {/* Show single CSV upload for player data, two CSVs for team data */}
            {csvDataType === 'player' ? (
              <>
                <div style={{
                  border: '2px dashed rgba(255, 215, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '40px',
                  marginBottom: '30px',
                  background: 'rgba(255, 215, 0, 0.05)'
                }}>
                  <Upload size={48} color="#FFD700" style={{ marginBottom: '16px' }} />
                  <p style={{ color: 'var(--primary-text)', marginBottom: '16px', fontFamily: 'Montserrat' }}>
                    Drag and drop your CSV file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    style={{ display: 'none' }}
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
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

                {csvFile && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px'
                  }}>
                    <p style={{ color: '#22c55e', fontSize: '14px', fontFamily: 'Montserrat' }}>
                      ✓ {csvFile.name} uploaded successfully
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Two CSV uploads for team statistics */}
                {csvData.length > 0 && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <Users size={16} color="#22c55e" />
                    <p style={{ color: '#22c55e', fontSize: '14px', fontFamily: 'Montserrat' }}>
                      ✓ Both CSVs merged successfully! ({csvData.length} teams)
                    </p>
                  </div>
                )}

                {/* CSV 1 Upload */}
                <div style={{
                  border: '2px dashed rgba(255, 215, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '30px',
                  marginBottom: '20px',
                  background: 'rgba(255, 215, 0, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <span style={{
                      background: '#FFD700',
                      color: '#000',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      fontFamily: 'Montserrat'
                    }}>
                      CSV 1
                    </span>
                  </div>
                  <Upload size={36} color="#FFD700" style={{ marginBottom: '12px' }} />
                  <p style={{ color: 'var(--primary-text)', marginBottom: '12px', fontFamily: 'Montserrat', fontSize: '14px' }}>
                    Team Metrics (ppda40, poswonopponenthalf)
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsv1Upload}
                    style={{ display: 'none' }}
                    id="csv1-upload"
                  />
                  <label
                    htmlFor="csv1-upload"
                    style={{
                      background: csvFile ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      color: csvFile ? '#22c55e' : '#000',
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
                    {csvFile ? `✓ ${csvFile.name}` : 'Choose CSV File 1'}
                  </label>
                </div>

                {/* CSV 2 Upload */}
                <div style={{
                  border: '2px dashed rgba(255, 215, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '30px',
                  marginBottom: '30px',
                  background: 'rgba(255, 215, 0, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                    <span style={{
                      background: '#FFD700',
                      color: '#000',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      fontFamily: 'Montserrat'
                    }}>
                      CSV 2
                    </span>
                  </div>
                  <Upload size={36} color="#FFD700" style={{ marginBottom: '12px' }} />
                  <p style={{ color: 'var(--primary-text)', marginBottom: '12px', fontFamily: 'Montserrat', fontSize: '14px' }}>
                    Opponent Metrics (AvgSeqTime, LongBall%, S1E2, S1E3, s1)
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsv2Upload}
                    style={{ display: 'none' }}
                    id="csv2-upload"
                  />
                  <label
                    htmlFor="csv2-upload"
                    style={{
                      background: csvFile2 ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      color: csvFile2 ? '#22c55e' : '#000',
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
                    {csvFile2 ? `✓ ${csvFile2.name}` : 'Choose CSV File 2'}
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Generate Report */}
        {currentStep === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              {csvDataType === 'aggregated' ? 'Save Aggregated Season Data' : 'Generate Matchday Report'}
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              {csvDataType === 'aggregated' 
                ? 'Ready to save your aggregated season statistics to the database'
                : `Ready to generate your comprehensive matchday ${matchdayNumber} report`
              }
            </p>
            
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#FFD700', marginBottom: '10px', fontFamily: 'Montserrat' }}>
                  {csvDataType === 'aggregated' ? 'Upload Details' : 'Report Details'}
                </h4>
                <p style={{ color: 'var(--primary-text)', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  {csvDataType === 'aggregated' ? (
                    <>
                      Upload Type: Season Summary (Aggregated)<br />
                      CSV File: {csvFile?.name}<br />
                      Data Points: {csvData.length} teams<br />
                      Season: 2025-2026<br />
                      Action: Will overwrite existing season summary
                    </>
                  ) : (
                    <>
                      Matchday: {matchdayNumber}<br />
                      Date: {new Date(getMatchDateFromMatchday(parseInt(matchdayNumber))).toLocaleDateString('en-GB')} (auto-generated)<br />
                      {csvDataType === 'player' && (
                        <>Opponent: {opponent} ({matchType})<br /></>
                      )}
                      CSV File: {csvFile?.name}<br />
                      Data Type: {csvDataType === 'team' ? 'Team Statistics' : 'Player GPS Data'}<br />
                      Data Points: {csvData.length} {csvDataType === 'team' ? 'teams' : 'players'}
                    </>
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={generateReport}
              disabled={isProcessing}
              style={{
                background: isProcessing 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: isProcessing ? 'var(--secondary-text)' : '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
{isProcessing 
                ? (csvDataType === 'aggregated' ? 'Saving Aggregated Data...' : 'Saving & Generating Report...')
                : (csvDataType === 'aggregated' ? 'Save Aggregated Data' : 'Save & Generate Report')
              }
            </button>
            
            {saveError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '20px'
              }}>
                <p style={{ color: '#ef4444', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  {saveError}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} color="#22c55e" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              {csvDataType === 'aggregated' ? 'Aggregated Data Saved Successfully!' : 'Report Generated & Saved Successfully!'}
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              {csvDataType === 'aggregated' 
                ? 'Your season summary statistics have been uploaded and saved to the database, overwriting any previous aggregated data.'
                : `Your matchday ${matchdayNumber} football stats report has been created and saved to the database.`
              }
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={resetWizard}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--primary-text)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Create New Report
              </button>
              <button
                onClick={() => setShowReport(true)}
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                View Report
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Show Report */}
      {showReport && csvData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowReport(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFD700',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ← Back to Wizard
            </button>
          </div>
          <MatchdayReport csvData={csvData} matchdayNumber={matchdayNumber} />
        </div>
      )}
      
      {/* Historical Reports Modal */}
      {showHistoricalReports && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid #333'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', fontWeight: '600', margin: 0 }}>
                📊 Historical Reports
              </h3>
              <button
                onClick={() => setShowHistoricalReports(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ color: 'var(--secondary-text)', marginBottom: '20px', fontFamily: 'Montserrat', fontSize: '14px' }}>
              Select a previously saved matchday report to view
            </p>
            
            {existingMatchweeks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                <p style={{ fontFamily: 'Montserrat' }}>No historical reports found</p>
                <p style={{ fontFamily: 'Montserrat', fontSize: '12px' }}>Create your first report using the wizard above</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {existingMatchweeks.map((matchweek, index) => (
                  <div key={`${matchweek.matchweek}-${index}`} style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ color: '#FFD700', margin: '0 0 4px 0', fontFamily: 'Montserrat', fontSize: '14px' }}>
                        Matchday {matchweek.matchweek}
                      </h4>
                      <p style={{ color: 'var(--secondary-text)', margin: '0 0 4px 0', fontFamily: 'Montserrat', fontSize: '12px' }}>
                        {matchweek.match_date && !isNaN(new Date(matchweek.match_date).getTime())
                          ? new Date(matchweek.match_date).toLocaleDateString('en-GB')
                          : 'Date not available'}
                      </p>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {matchweek.opponent && (
                          <span style={{ 
                            background: 'rgba(59, 130, 246, 0.2)', 
                            color: '#3b82f6', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '10px',
                            fontFamily: 'Montserrat'
                          }}>
                            vs {matchweek.opponent}
                          </span>
                        )}
                        <span style={{ 
                          background: matchweek.teams_count ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                          color: matchweek.teams_count ? '#22c55e' : '#3b82f6', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '10px',
                          fontFamily: 'Montserrat'
                        }}>
                          {matchweek.teams_count ? `${matchweek.teams_count} Teams` : 'Player GPS'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => loadHistoricalReport(matchweek.matchweek, matchweek.teams_count ? 'team' : 'player')}
                      disabled={loadingHistorical}
                      style={{
                        background: loadingHistorical ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                        color: loadingHistorical ? 'var(--secondary-text)' : '#000',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600',
                        cursor: loadingHistorical ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {loadingHistorical ? 'Loading...' : 'View Report'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}