'use client'

import React, { useState, useEffect } from 'react'
import { Flag, Target, TrendingUp, Trophy, Activity, Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
import { saveCornersStatistics, fetchAvailableMatchdays, fetchCornersStatistics, checkCornersDataExists, parseCornersCSVRow } from '@/lib/cornersDataService'
import type { CornersStatistics, CornersMetadata } from '@/lib/cornersDataService'

interface CornersData {
  rank: number
  teamId: string
  teamImageId: string
  teamFullName: string
  team: string
  teamAbbrevName: string
  teamShortName: string
  newestTeamColor: string
  leagueId: string
  leagueName: string
  gm: number
  xgcornopp: number
  xgcorn: number
  goaloppfromcorner: number
  goalfromcorner: number
  shotoppfromcorner: number
  shotfromcorner: number
  oppcorners: number
  corners: number
  optaTeamId: string
}

interface CornersStats {
  xgPerCorner: number
  xgPerCornerDiff: number
  cornersGoalPerCorners: number
  cornersGoalsDiff: number
  oppCornerGoalsDiff: number
  oppCornerShotsDiff: number
  xgDiff: number
  chanceToGoalFromCorner: number
  chanceToShotFromCorner: number
}

export default function CornersView() {
  const [currentStep, setCurrentStep] = useState(1)
  const [matchdayNumber, setMatchdayNumber] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [cornersData, setCornersData] = useState<CornersData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [existingMatchdays, setExistingMatchdays] = useState<any[]>([])
  const [dataExists, setDataExists] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const steps = [
    { number: 1, title: 'Matchday Number', icon: Target },
    { number: 2, title: 'Upload CSV', icon: Upload },
    { number: 3, title: 'Generate Report', icon: FileText },
    { number: 4, title: 'Complete', icon: CheckCircle }
  ]

  useEffect(() => {
    // Fetch existing matchdays on component mount
    const loadExistingMatchdays = async () => {
      try {
        const matchdays = await fetchAvailableMatchdays()
        console.log('Available matchdays:', matchdays)
        setExistingMatchdays(matchdays)
      } catch (error) {
        console.error('Error fetching matchdays:', error)
      }
    }

    loadExistingMatchdays()
  }, [])

  const handleMatchdaySubmit = async () => {
    if (matchdayNumber) {
      // Check if data already exists for this matchday
      const exists = await checkCornersDataExists(matchdayNumber)
      setDataExists(exists)
      setCurrentStep(2)
    }
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setIsProcessing(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Corners CSV parsing completed:', results.data)

            // Process corners data with flexible field mapping
            const processedData = results.data.map((row: any) => {
              // Helper function to get field value with multiple possible field names
              const getFieldValue = (fieldNames: string[], defaultValue: any = 0) => {
                for (const fieldName of fieldNames) {
                  if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
                    return fieldName.includes('rank') ? parseInt(row[fieldName]) :
                           typeof defaultValue === 'number' ? parseFloat(row[fieldName]) : row[fieldName]
                  }
                }
                return defaultValue
              }

              return {
                rank: getFieldValue(['rank', 'Rank'], 0),
                teamId: getFieldValue(['teamId', 'teamid', 'team_id'], ''),
                teamImageId: getFieldValue(['teamImageId', 'teamimageid'], ''),
                teamFullName: getFieldValue(['teamFullName', 'teamfullname', 'team_full_name', 'Team'], ''),
                team: getFieldValue(['team', 'Team', 'teamFullName'], ''),
                teamAbbrevName: getFieldValue(['teamAbbrevName', 'teamabbrevname', 'team_abbrev_name'], ''),
                teamShortName: getFieldValue(['teamShortName', 'teamshortname', 'team_short_name'], ''),
                newestTeamColor: getFieldValue(['newestTeamColor', 'newestteamcolor'], ''),
                leagueId: getFieldValue(['leagueId', 'leagueid', 'league_id'], ''),
                leagueName: getFieldValue(['leagueName', 'leaguename', 'league_name'], ''),
                gm: getFieldValue(['gm', 'GM'], 0),
                xgcornopp: getFieldValue(['xgcornopp', 'xg_corner_opp'], 0),
                xgcorn: getFieldValue(['xgcorn', 'xg_corner', 'xg from corner'], 0),
                goaloppfromcorner: getFieldValue(['goaloppfromcorner', 'goal_opp_from_corner'], 0),
                goalfromcorner: getFieldValue(['goalfromcorner', 'goal_from_corner'], 0),
                shotoppfromcorner: getFieldValue(['shotoppfromcorner', 'shot_opp_from_corner'], 0),
                shotfromcorner: getFieldValue(['shotfromcorner', 'shot_from_corner'], 0),
                oppcorners: getFieldValue(['oppcorners', 'opp_corners'], 0),
                corners: getFieldValue(['corners', 'Corners'], 0),
                optaTeamId: getFieldValue(['optaTeamId', 'optateamid'], '')
              }
            })
            setCornersData(processedData)

            setIsProcessing(false)
            setCurrentStep(3)
          },
          error: (error: any) => {
            console.error('Error parsing CSV:', error)
            setError('Error parsing CSV file. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
    }
  }

  const generateReport = async () => {
    setIsProcessing(true)
    setSaveError(null)

    try {
      // Convert corners data to the format expected by Supabase
      const cornersStatistics: CornersStatistics[] = cornersData.map((team: any) => ({
        matchday_number: matchdayNumber,
        season: '2025-2026',
        team_id: team.teamId,
        team_image_id: team.teamImageId,
        team_full_name: team.teamFullName || team.team,
        team: team.team,
        team_abbrev_name: team.teamAbbrevName,
        team_short_name: team.teamShortName,
        newest_team_color: team.newestTeamColor,
        league_id: team.leagueId,
        league_name: team.leagueName,
        gm: team.gm,
        xgcornopp: team.xgcornopp,
        xgcorn: team.xgcorn,
        goaloppfromcorner: team.goaloppfromcorner,
        goalfromcorner: team.goalfromcorner,
        shotoppfromcorner: team.shotoppfromcorner,
        shotfromcorner: team.shotfromcorner,
        oppcorners: team.oppcorners,
        corners: team.corners,
        opta_team_id: team.optaTeamId
      }))

      // Prepare metadata
      const cornersMetadata: CornersMetadata = {
        matchday_number: matchdayNumber,
        season: '2025-2026',
        csv_filename: csvFile?.name || '',
        total_teams: cornersData.length,
        notes: `Corner analysis for matchday ${matchdayNumber} with ${cornersData.length} teams`
      }

      // Save to Supabase (overwrites existing)
      await saveCornersStatistics(cornersStatistics, cornersMetadata)
      console.log('Successfully saved corner data to Supabase')

      // Update existing matchdays list
      try {
        const updatedMatchdays = await fetchAvailableMatchdays()
        setExistingMatchdays(updatedMatchdays)
      } catch (fetchError) {
        console.log('Note: Could not update matchdays list, but data was saved successfully')
      }

      setIsProcessing(false)
      setShowReport(true)
      setCurrentStep(4)
    } catch (error) {
      console.error('Error saving corner data:', error)
      setSaveError('Failed to save corner data to database. Please try again.')
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setMatchdayNumber('')
    setCsvFile(null)
    setCornersData([])
    setIsProcessing(false)
    setShowReport(false)
    setError('')
    setDataExists(false)
    setSaveError(null)
  }

  const loadHistoricalData = async (matchday: string) => {
    try {
      const data = await fetchCornersStatistics(matchday)
      if (data && data.length > 0) {
        // Convert Supabase data back to component format
        const convertedData = data.map(item => ({
          rank: 0, // Will be calculated
          teamId: item.team_id || '',
          teamImageId: item.team_image_id || '',
          teamFullName: item.team_full_name,
          team: item.team || '',
          teamAbbrevName: item.team_abbrev_name || '',
          teamShortName: item.team_short_name || '',
          newestTeamColor: item.newest_team_color || '',
          leagueId: item.league_id || '',
          leagueName: item.league_name || '',
          gm: item.gm || 0,
          xgcornopp: item.xgcornopp || 0,
          xgcorn: item.xgcorn || 0,
          goaloppfromcorner: item.goaloppfromcorner || 0,
          goalfromcorner: item.goalfromcorner || 0,
          shotoppfromcorner: item.shotoppfromcorner || 0,
          shotfromcorner: item.shotfromcorner || 0,
          oppcorners: item.oppcorners || 0,
          corners: item.corners || 0,
          optaTeamId: item.opta_team_id || ''
        }))

        setCornersData(convertedData)
        setMatchdayNumber(matchday)
        setShowReport(true)
        setCurrentStep(4)
      } else {
        alert('No data found for this matchday')
      }
    } catch (error) {
      console.error('Error loading historical data:', error)
      alert('Failed to load historical data')
    }
  }

  const calculateCornerAttackStats = (teams: CornersData[]) => {
    const teamsWithStats = teams.map(team => {
      const xgPerCorner = team.corners > 0 ? team.xgcorn / team.corners : 0
      const chanceToGoalFromCorner = team.corners > 0 ? (team.goalfromcorner / team.corners) * 100 : 0
      const cornerToShot = team.shotfromcorner > 0 ? team.corners / team.shotfromcorner : 0
      const cornerToGoal = team.goalfromcorner > 0 ? team.corners / team.goalfromcorner : 0
      return { ...team, xgPerCorner, chanceToGoalFromCorner, cornerToShot, cornerToGoal }
    })

    // Get all values for normalization
    const xgPerCornerValues = teamsWithStats.map(team => team.xgPerCorner)
    const cornerToGoalValues = teamsWithStats.filter(team => team.goalfromcorner > 0).map(team => team.cornerToGoal)

    // Find min/max for normalization
    const minXgPerCorner = Math.min(...xgPerCornerValues)
    const maxXgPerCorner = Math.max(...xgPerCornerValues)
    const minCornerToGoal = cornerToGoalValues.length > 0 ? Math.min(...cornerToGoalValues) : 1
    const maxCornerToGoal = cornerToGoalValues.length > 0 ? Math.max(...cornerToGoalValues) : 1

    const teamsWithScores = teamsWithStats.map(team => {
      // Normalize xG per corner (0-100, higher is better)
      const xgPerCornerScore = maxXgPerCorner > minXgPerCorner ?
        ((team.xgPerCorner - minXgPerCorner) / (maxXgPerCorner - minXgPerCorner)) * 100 : 50

      // Normalize corner to goal (0-100, lower is better - so we invert it)
      let cornerToGoalScore = 0 // teams with 0 goals get the worst score
      if (team.goalfromcorner > 0 && maxCornerToGoal > minCornerToGoal) {
        cornerToGoalScore = ((maxCornerToGoal - team.cornerToGoal) / (maxCornerToGoal - minCornerToGoal)) * 100
      }

      // Final score: 50% xG per corner + 50% corner to goal
      const finalScore = (xgPerCornerScore * 0.5) + (cornerToGoalScore * 0.5)

      return { ...team, finalScore, xgPerCornerScore, cornerToGoalScore }
    })

    const sortedTeams = teamsWithScores.sort((a, b) => b.finalScore - a.finalScore)
    return sortedTeams.map((team, index) => ({ ...team, finalRank: index + 1 }))
  }

  const calculateCornerDefenseStats = (teams: CornersData[]) => {
    const teamsWithStats = teams.map(team => {
      const xgPerCornerOpp = team.oppcorners > 0 ? team.xgcornopp / team.oppcorners : 0
      const chanceToGoalFromCornerOpp = team.oppcorners > 0 ? (team.goaloppfromcorner / team.oppcorners) * 100 : 0
      const cornerToShotOpp = team.shotoppfromcorner > 0 ? team.oppcorners / team.shotoppfromcorner : 0
      const cornerToGoalOpp = team.goaloppfromcorner > 0 ? team.oppcorners / team.goaloppfromcorner : 0
      return { ...team, xgPerCornerOpp, chanceToGoalFromCornerOpp, cornerToShotOpp, cornerToGoalOpp }
    })

    // Get all values for normalization
    const xgPerCornerOppValues = teamsWithStats.map(team => team.xgPerCornerOpp)
    const cornerToGoalOppValues = teamsWithStats.filter(team => team.goaloppfromcorner > 0).map(team => team.cornerToGoalOpp)

    // Find min/max for normalization
    const minXgPerCornerOpp = Math.min(...xgPerCornerOppValues)
    const maxXgPerCornerOpp = Math.max(...xgPerCornerOppValues)
    const minCornerToGoalOpp = cornerToGoalOppValues.length > 0 ? Math.min(...cornerToGoalOppValues) : 1
    const maxCornerToGoalOpp = cornerToGoalOppValues.length > 0 ? Math.max(...cornerToGoalOppValues) : 1

    const teamsWithScores = teamsWithStats.map(team => {
      // Normalize xG per corner opponent (0-100, lower is better - so we invert it)
      const xgPerCornerOppScore = maxXgPerCornerOpp > minXgPerCornerOpp ?
        ((maxXgPerCornerOpp - team.xgPerCornerOpp) / (maxXgPerCornerOpp - minXgPerCornerOpp)) * 100 : 50

      // Normalize corner to goal opponent (0-100, higher is better)
      let cornerToGoalOppScore = 100 // teams with 0 goals conceded get the best score
      if (team.goaloppfromcorner > 0 && maxCornerToGoalOpp > minCornerToGoalOpp) {
        cornerToGoalOppScore = ((team.cornerToGoalOpp - minCornerToGoalOpp) / (maxCornerToGoalOpp - minCornerToGoalOpp)) * 100
      }

      // Final score: 50% xG per corner opponent + 50% corner to goal opponent
      const finalScore = (xgPerCornerOppScore * 0.5) + (cornerToGoalOppScore * 0.5)

      return { ...team, finalScore, xgPerCornerOppScore, cornerToGoalOppScore }
    })

    const sortedTeams = teamsWithScores.sort((a, b) => b.finalScore - a.finalScore)
    return sortedTeams.map((team, index) => ({
      ...team,
      finalRank: index + 1,
      finalDefenseScore: team.finalScore,
      finalDefenseRank: index + 1
    }))
  }

  const calculateCornerSummaryStats = (teams: CornersData[]) => {
    // Get attack and defense stats
    const attackStats = calculateCornerAttackStats(teams)
    const defenseStats = calculateCornerDefenseStats(teams)

    // Combine both stats for each team
    const combinedStats = attackStats.map(attackTeam => {
      const defenseTeam = defenseStats.find(d => d.teamId === attackTeam.teamId || d.teamFullName === attackTeam.teamFullName)

      if (defenseTeam) {
        // Calculate combined score (50% attack + 50% defense)
        const combinedScore = (attackTeam.finalScore * 0.5) + (defenseTeam.finalDefenseScore * 0.5)

        // Calculate differences (attack - defense)
        const cornersDiff = attackTeam.corners - defenseTeam.oppcorners
        const shotFromCornerDiff = attackTeam.shotfromcorner - defenseTeam.shotoppfromcorner
        const goalFromCornerDiff = attackTeam.goalfromcorner - defenseTeam.goaloppfromcorner
        const xgFromCornerDiff = attackTeam.xgcorn - defenseTeam.xgcornopp

        return {
          ...attackTeam,
          finalDefenseScore: defenseTeam.finalDefenseScore,
          combinedScore,
          cornersDiff,
          shotFromCornerDiff,
          goalFromCornerDiff,
          xgFromCornerDiff
        }
      }

      // If no defense team found, return with default values
      return {
        ...attackTeam,
        finalDefenseScore: 0,
        combinedScore: attackTeam.finalScore * 0.5,
        cornersDiff: attackTeam.corners,
        shotFromCornerDiff: attackTeam.shotfromcorner,
        goalFromCornerDiff: attackTeam.goalfromcorner,
        xgFromCornerDiff: attackTeam.xgcorn
      }
    })

    // Sort by combined score and assign final ranks
    return combinedStats.sort((a, b) => b.combinedScore - a.combinedScore).map((team, index) => ({
      ...team,
      summaryRank: index + 1
    }))
  }

  const formatNumber = (num: number | undefined | null, decimals: number = 2): string => {
    if (num === undefined || num === null || isNaN(num)) return '0.00'
    return num.toFixed(decimals)
  }

  const getValueColor = (value: number): string => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const exportToPNG = async () => {
    const reportElement = document.getElementById('corners-report-full')
    if (!reportElement) return

    try {
      console.log('Starting PNG export...')

      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default

      // Capture the element as canvas with high quality
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#0b0b0f',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        imageTimeout: 15000,
        logging: false,
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight
      })

      // Convert to PNG and download
      const link = document.createElement('a')
      link.download = `Corner_Analysis_Matchday_${matchdayNumber}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      console.log('PNG export completed')

    } catch (error) {
      console.error('PNG export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  return (
    <div className="wizard-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Beitar Logo */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img
          src="/beitar-logo.png"
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
          Corners Analysis
        </h2>
        <p style={{
          color: 'var(--secondary-text)',
          fontSize: '14px',
          fontFamily: 'Montserrat'
        }}>
          Analyze corners data for specific matchday
        </p>
      </div>

      {/* Progress Steps */}
      <div className="wizard-steps" style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '40px',
        gap: '20px'
      }}>
        {steps.map((step, index) => {
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

      {/* Step Content */}
      <div className="glass-card" style={{ padding: '30px', minHeight: '300px' }}>
        {/* Step 1: Matchday Number */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Enter Matchday Number
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Enter the matchday number for corners analysis
            </p>

            {/* Show existing matchdays */}
            {existingMatchdays.length > 0 && (
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
                  Previously Analyzed Matchdays:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {existingMatchdays.map(matchday => (
                    <button
                      key={matchday.matchday_number}
                      onClick={() => loadHistoricalData(matchday.matchday_number)}
                      style={{
                        background: 'rgba(255, 215, 0, 0.1)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--primary-text)',
                        fontFamily: 'Montserrat',
                        cursor: 'pointer'
                      }}
                    >
                      MD {matchday.matchday_number}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ maxWidth: '400px', margin: '0 auto', marginBottom: '30px' }}>
              <input
                type="text"
                value={matchdayNumber}
                onChange={(e) => setMatchdayNumber(e.target.value)}
                placeholder="Enter matchday number (e.g., 1, 2, 3...)"
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
            </div>

            <button
              onClick={handleMatchdaySubmit}
              disabled={!matchdayNumber}
              style={{
                background: matchdayNumber
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: matchdayNumber ? '#000' : 'var(--secondary-text)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: matchdayNumber ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Continue to CSV Upload
            </button>
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Upload Corners Data CSV
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Upload CSV data for matchday {matchdayNumber} corners analysis
            </p>

            {dataExists && (
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
                  Data exists for matchday {matchdayNumber}. New data will replace existing.
                </p>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="#ef4444" />
                <p style={{ color: '#ef4444', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  {error}
                </p>
              </div>
            )}

            {cornersData.length > 0 && (
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
                <Flag size={16} color="#22c55e" />
                <p style={{ color: '#22c55e', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Detected: Corners Data ({cornersData.length} teams)
                </p>
              </div>
            )}

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
          </div>
        )}

        {/* Step 3: Generate Report */}
        {currentStep === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Generate Corners Analysis
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Ready to generate comprehensive corners analysis for matchday {matchdayNumber}
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
                  Analysis Details
                </h4>
                <p style={{ color: 'var(--primary-text)', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Matchday: {matchdayNumber}<br />
                  CSV File: {csvFile?.name}<br />
                  Data Type: Corners Statistics<br />
                  Teams: {cornersData.length}
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
              {isProcessing ? 'Saving & Generating Analysis...' : 'Save & Generate Analysis'}
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
              Corners Analysis Generated Successfully!
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Your corners analysis for matchday {matchdayNumber} has been created.
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
                Analyze Another Matchday
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
                View Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Show Report */}
      {showReport && cornersData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
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
              ← Back to Corners Analysis
            </button>
            <button
              onClick={exportToPNG}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Download size={14} />
              Export PNG
            </button>
          </div>

          {/* Corners Report Table */}
          <div id="corners-report-full" style={{
            background: '#0b0b0f',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #333',
            marginTop: '20px'
          }}>
            {/* Single Header for All Tables */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                <img
                  src="/beitar-logo.png"
                  alt="Beitar Logo"
                  style={{
                    width: '60px',
                    height: '60px',
                    objectFit: 'contain'
                  }}
                />
                <span style={{ fontSize: '20px', color: '#FFD700', fontWeight: '600' }}>
                  FCBJ DATA
                </span>
              </div>
              <div style={{ fontSize: '14px', color: '#FFD700', fontWeight: '600' }}>
                Corner Analysis - Matchday {matchdayNumber}
              </div>
            </div>

            {/* Corner Attack Table */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '16px', color: '#FFD700', marginBottom: '16px', textAlign: 'center', fontWeight: '600' }}>
                Corner Attack Analysis
              </div>

              <table style={{
                width: '100%',
                fontSize: '13px',
                borderCollapse: 'collapse',
                tableLayout: 'auto',
                margin: '0 auto',
                background: '#0b0b0f'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>SCORE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>SHOTS FROM<br/>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>GOALS FROM<br/>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>xG FROM<br/>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNER TO<br/>SHOT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNER TO<br/>GOAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const teamsWithStats = calculateCornerAttackStats(cornersData)
                    return teamsWithStats.map((team, index) => {
                      const isBeitar = team.teamFullName?.toLowerCase().includes('beitar') ||
                                     team.teamAbbrevName?.toLowerCase().includes('beitar')

                      return (
                        <tr key={team.teamId || index} style={{
                          borderBottom: '1px solid #222',
                          background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                        }}>
                          <td style={{
                            padding: '6px 8px',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.finalRank}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            <div>{team.teamFullName || team.team}</div>
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            <div style={{ position: 'relative', width: '60px', margin: '0 auto' }}>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${team.finalScore}%`,
                                  height: '100%',
                                  background: isBeitar ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <div style={{ fontSize: '8px', marginTop: '2px', textAlign: 'center' }}>
                                {formatNumber(team.finalScore, 1)}
                              </div>
                            </div>
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.corners}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.shotfromcorner}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.goalfromcorner}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {formatNumber(team.xgcorn, 2)}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {formatNumber(team.cornerToShot, 1)}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.goalfromcorner === 0 ? '∞' : formatNumber(team.cornerToGoal, 1)}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* Corner Defense Table */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '16px', color: '#FFD700', marginBottom: '16px', textAlign: 'center', fontWeight: '600' }}>
                Corner Defense Analysis
              </div>

              <table style={{
                width: '100%',
                fontSize: '13px',
                borderCollapse: 'collapse',
                tableLayout: 'auto',
                margin: '0 auto',
                background: '#0b0b0f'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>SCORE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNERS<br/>CONCEDED</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>SHOTS FROM<br/>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>GOALS FROM<br/>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>xG FROM<br/>CORNERS</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNER TO<br/>SHOT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNER TO<br/>GOAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const teamsWithDefenseStats = calculateCornerDefenseStats(cornersData)
                    return teamsWithDefenseStats.map((team, index) => {
                      const isBeitar = team.teamFullName?.toLowerCase().includes('beitar') ||
                                     team.teamAbbrevName?.toLowerCase().includes('beitar')

                      return (
                        <tr key={`defense-${team.teamId || index}`} style={{
                          borderBottom: '1px solid #222',
                          background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                        }}>
                          <td style={{
                            padding: '6px 8px',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.finalDefenseRank}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            <div>{team.teamFullName || team.team}</div>
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            <div style={{ position: 'relative', width: '60px', margin: '0 auto' }}>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${team.finalDefenseScore}%`,
                                  height: '100%',
                                  background: isBeitar ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <div style={{ fontSize: '8px', marginTop: '2px', textAlign: 'center' }}>
                                {formatNumber(team.finalDefenseScore, 1)}
                              </div>
                            </div>
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.oppcorners}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.shotoppfromcorner}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.goaloppfromcorner}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {formatNumber(team.xgcornopp, 2)}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {formatNumber(team.cornerToShotOpp, 1)}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.goaloppfromcorner === 0 ? '∞' : formatNumber(team.cornerToGoalOpp, 1)}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* Corner Summary Table */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '16px', color: '#FFD700', marginBottom: '16px', textAlign: 'center', fontWeight: '600' }}>
                Corner Summary Analysis
              </div>

              <table style={{
                width: '100%',
                fontSize: '13px',
                borderCollapse: 'collapse',
                tableLayout: 'auto',
                margin: '0 auto',
                background: '#0b0b0f'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>SCORE</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>CORNERS<br/>DIFF</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>SHOTS FROM<br/>CORNER DIFF</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>GOALS FROM<br/>CORNER DIFF</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>xG FROM<br/>CORNER DIFF</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const teamsWithSummaryStats = calculateCornerSummaryStats(cornersData)
                    return teamsWithSummaryStats.map((team, index) => {
                      const isBeitar = team.teamFullName?.toLowerCase().includes('beitar') ||
                                     team.teamAbbrevName?.toLowerCase().includes('beitar')

                      return (
                        <tr key={`summary-${team.teamId || index}`} style={{
                          borderBottom: '1px solid #222',
                          background: isBeitar ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                        }}>
                          <td style={{
                            padding: '6px 8px',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.summaryRank}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            <div>{team.teamFullName || team.team}</div>
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: isBeitar ? '#FFD700' : '#fff',
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            <div style={{ position: 'relative', width: '60px', margin: '0 auto' }}>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${team.combinedScore}%`,
                                  height: '100%',
                                  background: isBeitar ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                              <div style={{ fontSize: '8px', marginTop: '2px', textAlign: 'center' }}>
                                {formatNumber(team.combinedScore, 1)}
                              </div>
                            </div>
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: team.cornersDiff > 0 ? '#22c55e' : team.cornersDiff < 0 ? '#ef4444' : (isBeitar ? '#FFD700' : '#fff'),
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.cornersDiff > 0 ? '+' : ''}{team.cornersDiff}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: team.shotFromCornerDiff > 0 ? '#22c55e' : team.shotFromCornerDiff < 0 ? '#ef4444' : (isBeitar ? '#FFD700' : '#fff'),
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.shotFromCornerDiff > 0 ? '+' : ''}{team.shotFromCornerDiff}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: team.goalFromCornerDiff > 0 ? '#22c55e' : team.goalFromCornerDiff < 0 ? '#ef4444' : (isBeitar ? '#FFD700' : '#fff'),
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.goalFromCornerDiff > 0 ? '+' : ''}{team.goalFromCornerDiff}
                          </td>
                          <td style={{
                            padding: '6px 8px',
                            textAlign: 'center',
                            color: team.xgFromCornerDiff > 0 ? '#22c55e' : team.xgFromCornerDiff < 0 ? '#ef4444' : (isBeitar ? '#FFD700' : '#fff'),
                            fontWeight: isBeitar ? '600' : '400',
                            fontSize: '12px'
                          }}>
                            {team.xgFromCornerDiff > 0 ? '+' : ''}{formatNumber(team.xgFromCornerDiff, 2)}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}