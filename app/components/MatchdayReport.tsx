'use client'

import React from 'react'
import { Shield, Download, FileText } from 'lucide-react'
import { exportElementForWhatsApp, downloadImage, validateImageForWhatsApp } from '../../utils/whatsappExport'
import { getTeamLogoUrl } from '../../lib/teamLogos'

interface MatchdayReportProps {
  csvData: any[]
  matchdayNumber: string
  isOpponentAnalysis?: boolean
  selectedOpponent?: string
  showSimpleControls?: boolean
}

export default function MatchdayReport({ csvData, matchdayNumber, isOpponentAnalysis = false, selectedOpponent, showSimpleControls = false }: MatchdayReportProps) {
  if (!csvData || csvData.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#fff' }}>
        <p>No data available for Matchday {matchdayNumber}</p>
      </div>
    )
  }

  const downloadReport = async () => {
    const reportElement = document.getElementById('matchday-report-full')
    if (!reportElement) return

    try {
      console.log('Starting WhatsApp-optimized export...')
      
      // Export with WhatsApp optimization
      const result: any = await exportElementForWhatsApp(reportElement, {
        backgroundColor: '#0b0b0f',
        filename: `Matchday_${matchdayNumber}_Report`,
        dualFormat: true,
        captureWidth: 900,  // Match the actual report width
        maintainAspectRatio: true,
        scale: 3  // Higher scale for better quality
      })
      
      // Validate PNG for WhatsApp
      const pngValidation: any = await validateImageForWhatsApp(result.png)
      console.log('PNG validation:', pngValidation)
      
      // Download primary format (PNG)
      downloadImage(
        result.png, 
        `Matchday_${matchdayNumber}_Report.png`,
        { showMetadata: true }
      )
      
      // If PNG is too large or has issues, also offer JPEG
      if (!pngValidation.isValid && result.jpeg) {
        console.log('PNG has issues, also providing JPEG fallback')
        setTimeout(() => {
          downloadImage(
            result.jpeg, 
            `Matchday_${matchdayNumber}_Report.jpg`,
            { showMetadata: true }
          )
        }, 1000)
      }
      
      console.log('Export completed:', {
        pngSize: `${(result.metadata.pngSize / 1024 / 1024).toFixed(1)}MB`,
        jpegSize: result.metadata.jpegSize ? `${(result.metadata.jpegSize / 1024 / 1024).toFixed(1)}MB` : 'N/A',
        dimensions: `${result.metadata.width}x${result.metadata.height}`,
        whatsappReady: pngValidation.isValid
      })
      
    } catch (error) {
      console.error('Enhanced export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const downloadPDF = async () => {
    const reportElement = document.getElementById('matchday-report-full')
    if (!reportElement) return

    try {
      console.log('Starting PDF export...')
      
      // Dynamic import of jsPDF and html2canvas
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      
      // Capture the element as canvas with high quality
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#0b0b0f',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        imageTimeout: 15000,
        logging: false
      })
      
      // Calculate dimensions
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      const aspectRatio = canvasWidth / canvasHeight
      
      // PDF page dimensions (A4 landscape)
      const pageWidth = 297 // A4 landscape width in mm
      const pageHeight = 210 // A4 landscape height in mm
      
      // Calculate optimal image size to fit page with margins
      const margin = 10
      const maxWidth = pageWidth - (margin * 2)
      const maxHeight = pageHeight - (margin * 2)
      
      let imgWidth, imgHeight
      
      if (aspectRatio > (maxWidth / maxHeight)) {
        // Image is wider - constrain by width
        imgWidth = maxWidth
        imgHeight = maxWidth / aspectRatio
      } else {
        // Image is taller - constrain by height
        imgHeight = maxHeight
        imgWidth = maxHeight * aspectRatio
      }
      
      // Center the image on the page
      const x = (pageWidth - imgWidth) / 2
      const y = (pageHeight - imgHeight) / 2
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      // Add metadata
      pdf.setProperties({
        title: `Matchday ${matchdayNumber} Report`,
        subject: 'Beitar Jerusalem FC - Data Analysis Report',
        author: 'FCBJ Data Platform',
        creator: 'Claude Code'
      })
      
      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      
      // Add image to PDF
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight)
      
      // Save PDF
      const filename = `Matchday_${matchdayNumber}_Report.pdf`
      pdf.save(filename)
      
      console.log('PDF export completed:', {
        filename,
        dimensions: `${imgWidth.toFixed(1)}x${imgHeight.toFixed(1)}mm`,
        pageSize: `${pageWidth}x${pageHeight}mm`
      })
      
    } catch (error) {
      console.error('PDF export failed:', error)
      alert('PDF export failed. Please try again.')
    }
  }

  // Find Beitar in the data - check multiple possible field names
  const beitarData = csvData.find(team => 
    team.teamFullName?.toLowerCase().includes('beitar') || 
    team.Team?.toLowerCase().includes('beitar') ||
    team.team_full_name?.toLowerCase().includes('beitar') ||
    team.name?.toLowerCase().includes('beitar') ||
    JSON.stringify(team).toLowerCase().includes('beitar')
  )

  // Helper functions to get field values from either format
  const getTeamName = (team: any) => team.Team || team.team_full_name || team.teamFullName || 'Unknown'
  const getTeamRank = (team: any) => team.Rank || team.team_rank || 0
  const isBeitar = (team: any) => getTeamName(team).toLowerCase().includes('beitar')
  
  // Function to determine if a team should be highlighted
  const shouldHighlightTeam = (team: any) => {
    if (isOpponentAnalysis && selectedOpponent) {
      // In opponent analysis, highlight only the selected opponent team
      const teamName = getTeamName(team)
      const isSelectedOpponent = teamName.toLowerCase().includes(selectedOpponent.toLowerCase()) ||
                                selectedOpponent.toLowerCase().includes(teamName.toLowerCase())
      console.log(`🎯 Opponent Analysis: Team ${teamName} - Selected opponent: ${selectedOpponent} - Match: ${isSelectedOpponent}`)
      return isSelectedOpponent
    } else if (isOpponentAnalysis) {
      // Fallback: highlight all teams if no specific opponent selected
      console.log(`🎯 Opponent Analysis: Highlighting all teams (no specific opponent)`)
      return true
    } else {
      // In regular analysis, highlight only Beitar Jerusalem
      const isBeitarTeam = isBeitar(team)
      console.log(`⚽ Regular Analysis: Team ${getTeamName(team)} - Beitar: ${isBeitarTeam}`)
      return isBeitarTeam
    }
  }
  
  // Field mapping for both formats
  const getField = (team: any, field: string) => {
    const fieldMap: {[key: string]: string[]} = {
      'ppda40': ['ppda40', 'ppda_40'],
      'poswonopponenthalf': ['poswonopponenthalf', 'possession_won_opponent_half'],
      'ground_duels': ['ground_duels', 'ground_duels'],
      'dribblesuccessful': ['dribblesuccessful', 'dribbles_successful'],
      'TouchOpBox': ['TouchOpBox', 'touch_opponent_box'],
      'Touches': ['Touches', 'touches'],
      'ExpG': ['ExpG', 'expected_goals'],
      'xA': ['xA', 'expected_assists'],
      'SOG': ['SOG', 'shots_on_goal'],
      'ShtIncBl': ['ShtIncBl', 'shots_including_blocked'],
      'xG': ['xG', 'actual_goals'],
      'AvgSeqTime': ['AvgSeqTime', 'avg_sequence_time'],
      'ground%': ['ground%', 'ground_percentage'],
      'Aerial%': ['Aerial%', 'aerial_percentage'],
      'passfromassisttogolden': ['passfromassisttogolden', 'pass_from_assist_to_golden'],
      'shotfromgolden': ['shotfromgolden', 'shot_from_golden'],
      'CrossOpen': ['CrossOpen', 'cross_open'],
      'SOG_from_penalty_area': ['SOG_from_penalty_area', 'shots_on_goal_penalty_area'],
      'SOG_from_box': ['SOG_from_box', 'shots_on_goal_from_box'],
      'shotfrombox': ['shotfrombox', 'shot_from_box'],
      'Starta1enda2/': ['Starta1enda2/', 'start_a1_end_a2'],
      'Starta1enda3/': ['Starta1enda3/', 'start_a1_end_a3'],
      'SeqStartA1': ['SeqStartA1', 'seq_start_a1'],
      'Starta2enda3/': ['Starta2enda3/', 'start_a2_end_a3_alt'],
      'SeqStartMid3rd': ['SeqStartMid3rd', 'seq_start_mid_3rd'],
      'Starta1endbox/': ['Starta1endbox/', 'start_a1_end_box'],
      'Starta2endbox/': ['Starta2endbox/', 'start_a2_end_box'],
      'Starta3endbox /': ['Starta3endbox /', 'start_a3_end_box'],
      'SeqStartAtt3rd': ['SeqStartAtt3rd', 'seq_start_att_3rd']
    }
    
    const possibleFields = fieldMap[field] || [field]
    for (const possibleField of possibleFields) {
      if (team[possibleField] !== undefined && team[possibleField] !== null) {
        return team[possibleField]
      }
    }
    return 0
  }

  // Skip Beitar validation for opponent analysis mode
  if (!beitarData && !isOpponentAnalysis) {
    return (
      <div style={{ padding: '20px', color: '#fff' }}>
        <p>No Beitar data found for Matchday {matchdayNumber}</p>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
          <p>Available teams:</p>
          {csvData.slice(0, 5).map((team, i) => (
            <div key={i}>
              {team.teamFullName || team.Team || team.team_full_name || 'Unknown team'}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Sort teams by rank - handle both original CSV format and processed format
  const sortedTeams = [...csvData].sort((a, b) => {
    return getTeamRank(a) - getTeamRank(b)
  })

  // Calculate Press Scores (1-100 proportional)
  const calculatePressScores = () => {
    // Determine which fields to use based on context
    const avgSeqField = isOpponentAnalysis ? 'our_avg_sequence_time' : 'opp_avg_sequence_time'
    const longBallField = isOpponentAnalysis ? 'our_long_ball_percentage' : 'opp_long_ball_percentage'
    const s1e3Field = isOpponentAnalysis ? 'our_s1e3' : 'opp_s1e3'
    const s1e2Field = isOpponentAnalysis ? 'our_s1e2' : 'opp_s1e2'
    const s1Field = isOpponentAnalysis ? 'our_s1' : 'opp_s1'

    // Helper to calculate A1→A2+A3 percentage
    const calcA1ToA2A3 = (team: any) => {
      const s1e3 = parseFloat(getField(team, s1e3Field)) || 0
      const s1e2 = parseFloat(getField(team, s1e2Field)) || 0
      const s1 = parseFloat(getField(team, s1Field)) || 0
      return s1 > 0 ? ((s1e3 + s1e2) / s1) * 100 : 0
    }

    // Get all values for normalization
    const ppda40Values = sortedTeams.map(t => parseFloat(getField(t, 'ppda40')) || 0)
    const ourAvgSeqTimeValues = sortedTeams.map(t => parseFloat(getField(t, avgSeqField)) || 0)
    const ourLongBallValues = sortedTeams.map(t => parseFloat(getField(t, longBallField)) || 0)
    const ourA1ToA2A3Values = sortedTeams.map(t => calcA1ToA2A3(t))
    const posWonValues = sortedTeams.map(t => parseFloat(getField(t, 'poswonopponenthalf')) || 0)

    // Get min/max for normalization
    const ppda40Min = Math.min(...ppda40Values)
    const ppda40Max = Math.max(...ppda40Values)
    const ourAvgSeqMin = Math.min(...ourAvgSeqTimeValues)
    const ourAvgSeqMax = Math.max(...ourAvgSeqTimeValues)
    const ourLongBallMin = Math.min(...ourLongBallValues)
    const ourLongBallMax = Math.max(...ourLongBallValues)
    const ourA1ToA2A3Min = Math.min(...ourA1ToA2A3Values)
    const ourA1ToA2A3Max = Math.max(...ourA1ToA2A3Values)
    const posWonMin = Math.min(...posWonValues)
    const posWonMax = Math.max(...posWonValues)

    return sortedTeams.map(team => {
      const ppda40 = parseFloat(getField(team, 'ppda40')) || 0
      const ourAvgSeq = parseFloat(getField(team, avgSeqField)) || 0
      const ourLongBall = parseFloat(getField(team, longBallField)) || 0
      const ourA1ToA2A3 = calcA1ToA2A3(team)
      const posWon = parseFloat(getField(team, 'poswonopponenthalf')) || 0

      let ppda40Score, ourAvgSeqScore, ourLongBallScore, ourA1ToA2A3Score, posWonScore

      if (isOpponentAnalysis) {
        // OPPONENT VIEW: Measure how WE are being pressed (defensive resistance)
        // Lower scores = better for us = green | Higher scores = worse for us = red

        // ppda40 → lower is better (opponent can't build against us)
        ppda40Score = ppda40Max > ppda40Min ?
          ((ppda40Max - ppda40) / (ppda40Max - ppda40Min)) * 99 + 1 : 50

        // AvgSeqTime → lower is better (we move ball quickly under their press)
        ourAvgSeqScore = ourAvgSeqMax > ourAvgSeqMin ?
          ((ourAvgSeqMax - ourAvgSeq) / (ourAvgSeqMax - ourAvgSeqMin)) * 99 + 1 : 50

        // LongBall% → higher % = higher score = worse (forced to play long)
        ourLongBallScore = ourLongBallMax > ourLongBallMin ?
          ((ourLongBall - ourLongBallMin) / (ourLongBallMax - ourLongBallMin)) * 99 + 1 : 50

        // A1→A2+A3 → higher % = lower score = better (we progress from A1 to A2+A3)
        ourA1ToA2A3Score = ourA1ToA2A3Max > ourA1ToA2A3Min ?
          ((ourA1ToA2A3Max - ourA1ToA2A3) / (ourA1ToA2A3Max - ourA1ToA2A3Min)) * 99 + 1 : 50

        // posWon → higher = higher score = worse (opponent wins ball in our half)
        posWonScore = posWonMax > posWonMin ?
          ((posWon - posWonMin) / (posWonMax - posWonMin)) * 99 + 1 : 50

      } else {
        // MATCHDAY WIZARD: Measure how EACH TEAM presses (offensive press quality)
        // Higher scores = better press = green | Lower scores = worse press = red

        // ppda40 → lower is better press (opponent can't build)
        ppda40Score = ppda40Max > ppda40Min ?
          ((ppda40Max - ppda40) / (ppda40Max - ppda40Min)) * 99 + 1 : 50

        // AvgSeqTime (opponent) → lower is better (opponent moves ball quickly = bad press)
        ourAvgSeqScore = ourAvgSeqMax > ourAvgSeqMin ?
          ((ourAvgSeqMax - ourAvgSeq) / (ourAvgSeqMax - ourAvgSeqMin)) * 99 + 1 : 50

        // LongBall% (opponent) → higher is better (we force opponent to play long)
        ourLongBallScore = ourLongBallMax > ourLongBallMin ?
          ((ourLongBall - ourLongBallMin) / (ourLongBallMax - ourLongBallMin)) * 99 + 1 : 50

        // A1→A2+A3 (opponent) → lower is better (opponent stuck in their third, can't progress)
        ourA1ToA2A3Score = ourA1ToA2A3Max > ourA1ToA2A3Min ?
          ((ourA1ToA2A3Max - ourA1ToA2A3) / (ourA1ToA2A3Max - ourA1ToA2A3Min)) * 99 + 1 : 50

        // posWon → higher is better (we win ball in opponent half)
        posWonScore = posWonMax > posWonMin ?
          ((posWon - posWonMin) / (posWonMax - posWonMin)) * 99 + 1 : 50
      }

      // Weighted press score calculation
      // ppda40 → 30%, AvgSeqTime → 10%, LongBall% → 10%, חילוצי יריבה → 20%, A1→A2+A3 → 30%
      const pressScore = (
        ppda40Score * 0.30 +
        ourAvgSeqScore * 0.10 +
        ourLongBallScore * 0.10 +
        posWonScore * 0.20 +
        ourA1ToA2A3Score * 0.30
      )

      return {
        ...team,
        ppda40Score,
        ourAvgSeqScore,
        ourLongBallScore,
        ourA1ToA2A3Score,
        posWonScore,
        pressScore
      }
    })
  }

  const teamsWithPressScores = calculatePressScores().sort((a, b) => b.pressScore - a.pressScore)

  // Calculate Duels Scores (1-100 proportional)
  const calculateDuelsScores = () => {
    // Get all values for normalization
    const groundValues = sortedTeams.map(t => parseFloat(getField(t, 'ground%')) || 0)
    const aerialValues = sortedTeams.map(t => parseFloat(getField(t, 'Aerial%')) || 0)

    // Get min/max for normalization
    const groundMin = Math.min(...groundValues)
    const groundMax = Math.max(...groundValues)
    const aerialMin = Math.min(...aerialValues)
    const aerialMax = Math.max(...aerialValues)

    return sortedTeams.map(team => {
      const ground = parseFloat(getField(team, 'ground%')) || 0
      const aerial = parseFloat(getField(team, 'Aerial%')) || 0

      // Calculate proportional scores (1-100) - higher is better for both
      const groundScore = groundMax > groundMin ? 
        ((ground - groundMin) / (groundMax - groundMin)) * 99 + 1 : 50

      const aerialScore = aerialMax > aerialMin ? 
        ((aerial - aerialMin) / (aerialMax - aerialMin)) * 99 + 1 : 50

      // Weighted average: 70% ground + 30% aerial
      const duelsScore = (groundScore * 0.7) + (aerialScore * 0.3)

      return {
        ...team,
        groundScore,
        aerialScore,
        duelsScore
      }
    })
  }

  const teamsWithDuelsScores = calculateDuelsScores().sort((a, b) => b.duelsScore - a.duelsScore)

  // Calculate Assist Zone Scores (1-100 proportional)
  const calculateAssistZoneScores = () => {
    // Get all values for normalization
    const passAssistValues = sortedTeams.map(t => parseFloat(getField(t, 'passfromassisttogolden')) || 0)
    const shotFromGoldenValues = sortedTeams.map(t => parseFloat(getField(t, 'shotfromgolden')) || 0)
    const crossPassRatioValues = sortedTeams.map(t => {
      const crossOpen = parseFloat(getField(t, 'CrossOpen')) || 0
      const passAssist = parseFloat(getField(t, 'passfromassisttogolden')) || 1
      return crossOpen / passAssist
    })

    // Get min/max for normalization
    const passAssistMin = Math.min(...passAssistValues)
    const passAssistMax = Math.max(...passAssistValues)
    const shotFromGoldenMin = Math.min(...shotFromGoldenValues)
    const shotFromGoldenMax = Math.max(...shotFromGoldenValues)
    const crossPassRatioMin = Math.min(...crossPassRatioValues)
    const crossPassRatioMax = Math.max(...crossPassRatioValues)

    return sortedTeams.map(team => {
      const passAssist = parseFloat(getField(team, 'passfromassisttogolden')) || 0
      const shotFromGolden = parseFloat(getField(team, 'shotfromgolden')) || 0
      const crossOpen = parseFloat(getField(team, 'CrossOpen')) || 0
      const crossPassRatio = crossOpen / (passAssist || 1)

      // Calculate proportional scores (1-100) - higher is better for all
      const passAssistScore = passAssistMax > passAssistMin ? 
        ((passAssist - passAssistMin) / (passAssistMax - passAssistMin)) * 99 + 1 : 50

      const shotFromGoldenScore = shotFromGoldenMax > shotFromGoldenMin ? 
        ((shotFromGolden - shotFromGoldenMin) / (shotFromGoldenMax - shotFromGoldenMin)) * 99 + 1 : 50

      const crossPassRatioScore = crossPassRatioMax > crossPassRatioMin ? 
        ((crossPassRatio - crossPassRatioMin) / (crossPassRatioMax - crossPassRatioMin)) * 99 + 1 : 50

      // Weighted average: 40% pass assist + 20% shot from golden + 40% cross/pass ratio
      const assistZoneScore = (passAssistScore * 0.4) + (shotFromGoldenScore * 0.2) + (crossPassRatioScore * 0.4)

      return {
        ...team,
        passAssistScore,
        shotFromGoldenScore,
        crossPassRatioScore,
        crossPassRatio,
        assistZoneScore
      }
    })
  }

  const teamsWithAssistZoneScores = calculateAssistZoneScores().sort((a, b) => b.assistZoneScore - a.assistZoneScore)

  // Calculate Shot Location Scores (1-100 proportional)
  const calculateShotLocationScores = () => {
    // Get all values for normalization
    const sogPenaltyValues = sortedTeams.map(t => parseFloat(getField(t, 'SOG_from_penalty_area')) || 0)
    const sogBoxValues = sortedTeams.map(t => parseFloat(getField(t, 'SOG_from_box')) || 0)
    const shotFromBoxValues = sortedTeams.map(t => parseFloat(getField(t, 'shotfrombox')) || 0)
    const shotFromGoldenPercentValues = sortedTeams.map(t => {
      const shotFromGolden = parseFloat(getField(t, 'shotfromgolden')) || 0
      const totalShots = parseFloat(getField(t, 'ShtIncBl')) || 1
      return (shotFromGolden / totalShots) * 100
    })

    // Get min/max for normalization
    const sogPenaltyMin = Math.min(...sogPenaltyValues)
    const sogPenaltyMax = Math.max(...sogPenaltyValues)
    const sogBoxMin = Math.min(...sogBoxValues)
    const sogBoxMax = Math.max(...sogBoxValues)
    const shotFromBoxMin = Math.min(...shotFromBoxValues)
    const shotFromBoxMax = Math.max(...shotFromBoxValues)
    const shotFromGoldenPercentMin = Math.min(...shotFromGoldenPercentValues)
    const shotFromGoldenPercentMax = Math.max(...shotFromGoldenPercentValues)

    return sortedTeams.map(team => {
      const sogPenalty = parseFloat(getField(team, 'SOG_from_penalty_area')) || 0
      const sogBox = parseFloat(getField(team, 'SOG_from_box')) || 0
      const shotFromBox = parseFloat(getField(team, 'shotfrombox')) || 0
      const shotFromGolden = parseFloat(getField(team, 'shotfromgolden')) || 0
      const totalShots = parseFloat(getField(team, 'ShtIncBl')) || 1
      const shotFromGoldenPercent = (shotFromGolden / totalShots) * 100

      // Calculate proportional scores (1-100) - higher is better for all
      const sogPenaltyScore = sogPenaltyMax > sogPenaltyMin ? 
        ((sogPenalty - sogPenaltyMin) / (sogPenaltyMax - sogPenaltyMin)) * 99 + 1 : 50

      const sogBoxScore = sogBoxMax > sogBoxMin ? 
        ((sogBox - sogBoxMin) / (sogBoxMax - sogBoxMin)) * 99 + 1 : 50

      const shotFromBoxScore = shotFromBoxMax > shotFromBoxMin ? 
        ((shotFromBox - shotFromBoxMin) / (shotFromBoxMax - shotFromBoxMin)) * 99 + 1 : 50

      const shotFromGoldenPercentScore = shotFromGoldenPercentMax > shotFromGoldenPercentMin ? 
        ((shotFromGoldenPercent - shotFromGoldenPercentMin) / (shotFromGoldenPercentMax - shotFromGoldenPercentMin)) * 99 + 1 : 50

      // Location score is based only on Shot from Golden %
      const locationScore = shotFromGoldenPercentScore

      return {
        ...team,
        sogPenaltyScore,
        sogBoxScore,
        shotFromBoxScore,
        shotFromGoldenPercent,
        shotFromGoldenPercentScore,
        locationScore
      }
    })
  }

  const teamsWithShotLocationScores = calculateShotLocationScores().sort((a, b) => b.shotFromGoldenPercent - a.shotFromGoldenPercent)

  // Calculate Shot Quality Scores (1-100 proportional)
  const calculateShotQualityScores = () => {
    // Get all values for normalization - Quality score is SOG_from_penalty_area / ShtIncBl
    const qualityPercentValues = sortedTeams.map(t => {
      const sogPenalty = parseFloat(getField(t, 'SOG_from_penalty_area')) || 0
      const totalShots = parseFloat(getField(t, 'ShtIncBl')) || 1
      return (sogPenalty / totalShots) * 100
    })

    // Get min/max for normalization
    const qualityPercentMin = Math.min(...qualityPercentValues)
    const qualityPercentMax = Math.max(...qualityPercentValues)

    return sortedTeams.map(team => {
      const sogPenalty = parseFloat(getField(team, 'SOG_from_penalty_area')) || 0
      const totalShots = parseFloat(getField(team, 'ShtIncBl')) || 1
      const qualityPercent = (sogPenalty / totalShots) * 100

      // Calculate proportional score (1-100) - higher is better
      const qualityScore = qualityPercentMax > qualityPercentMin ? 
        ((qualityPercent - qualityPercentMin) / (qualityPercentMax - qualityPercentMin)) * 99 + 1 : 50

      return {
        ...team,
        qualityPercent,
        qualityScore
      }
    })
  }

  const teamsWithShotQualityScores = calculateShotQualityScores().sort((a, b) => b.qualityPercent - a.qualityPercent)

  // Helper functions
  const formatPercentage = (value: any) => {
    if (typeof value === 'string' && value.includes('%')) return value
    if (!value || isNaN(value)) return '0%'
    return `${parseFloat(value).toFixed(1)}%`
  }

  const getScoreColor = (score: number) => {
    if (score >= 66) return '#22c55e' // Green - Good
    if (score >= 33) return '#f59e0b' // Orange - Middle
    return '#ef4444' // Red - Bad
  }

  // Inverted colors for opponent press analysis (higher press score = worse for us = red)
  const getPressScoreColor = (score: number) => {
    if (score >= 66) return '#ef4444' // Red - High press (bad for us)
    if (score >= 33) return '#f59e0b' // Orange - Medium press
    return '#22c55e' // Green - Low press (good for us)
  }

  const getColorByValue = (value: number, min: number, max: number, inverse = false) => {
    const ratio = (value - min) / (max - min)
    const adjustedRatio = inverse ? 1 - ratio : ratio
    
    if (adjustedRatio >= 0.75) return '#22c55e' // Green
    if (adjustedRatio >= 0.5) return '#3b82f6' // Blue  
    if (adjustedRatio >= 0.25) return '#f59e0b' // Orange
    return '#ef4444' // Red
  }

  const getProgressBarColor = (team: any, field: string) => {
    const values = sortedTeams.map(t => parseFloat(t[field]) || 0)
    const value = parseFloat(team[field]) || 0
    const min = Math.min(...values)
    const max = Math.max(...values)
    return getColorByValue(value, min, max)
  }

  return (
    <div style={{ position: 'relative', width: '100%', margin: '0', padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#000000' }}>
      {/* Download Buttons */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px'
      }}>
        {/* PNG Download Button */}
        <button
          onClick={downloadReport}
          style={{
            background: 'rgba(255, 215, 0, 0.9)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Download as PNG"
        >
          <Download size={20} color="#000" />
        </button>
        
        {/* PDF Download Button */}
        <button
          onClick={downloadPDF}
          style={{
            background: 'rgba(239, 68, 68, 0.9)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Download as PDF"
        >
          <FileText size={20} color="#fff" />
        </button>
      </div>

      <div id="matchday-report-full" style={{
        background: '#000000',
        padding: '20px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '900px',
        margin: '0 auto',
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch'
      }}>
        {/* Header */}
        <div style={{
          background: '#000000',
          borderRadius: '8px',
          padding: '30px 20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
            <img
              src="/beitar-logo.png"
              alt="Beitar Logo"
              style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <span style={{ color: '#FFD700', fontSize: '24px', fontWeight: '700', letterSpacing: '2px' }}>FCBJ DATA</span>
          </div>

          {/* Gold Separator Line */}
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
            marginBottom: '16px'
          }} />

          <h1 style={{
            color: '#FFD700',
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            {matchdayNumber.includes('Season') ? '🏆 Season Summary Report' :
             isOpponentAnalysis ? (
               <>
                 <span style={{ color: '#FFD700' }}>Opponent View</span>
                 <br />
                 <span style={{ color: '#888', fontSize: '14px', fontWeight: '400' }}>How other teams performed against this team</span>
               </>
             ) :
             `Matchday ${matchdayNumber} Report`}
          </h1>
          
          {matchdayNumber.includes('Season') && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              <p style={{ 
                color: '#22c55e', 
                fontSize: '11px', 
                margin: 0,
                fontFamily: 'Montserrat',
                fontWeight: '500'
              }}>
                📈 Averaged Statistics Across Multiple Matchdays
              </p>
            </div>
          )}

          {/* Press Metrics Section */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '16px', color: '#FFD700', marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
              Press Metrics & Scoring
            </div>
            <div style={{
              width: '100%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
              marginBottom: '12px'
            }} />
            
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>PRESS<br/>SCORE</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888' }}>PPDA40<br/>(30%)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontSize: '9px' }}>AvgSeqTime {isOpponentAnalysis ? '' : '(opp)'}<br/>(10%)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontSize: '9px' }}>LongBall% {isOpponentAnalysis ? '' : '(opp)'}<br/>(10%)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontSize: '9px' }}>Ball Recovery Opp Half<br/>(20%)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', fontSize: '9px' }}>A1→A2+A3 {isOpponentAnalysis ? '' : '(opp)'}<br/>(30%)</th>
                </tr>
              </thead>
              <tbody>
                {teamsWithPressScores.map((team, index) => {
                  const teamShouldHighlight = shouldHighlightTeam(team)
                  
                  return (
                    <tr key={team.teamId} style={{ 
                      borderBottom: '1px solid #222',
                      background: teamShouldHighlight ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                    }}>
                      <td style={{ 
                        padding: '8px 12px', 
                        color: teamShouldHighlight ? '#FFD700' : '#fff',
                        fontWeight: '600'
                      }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: teamShouldHighlight ? '#FFD700' : '#fff', fontWeight: teamShouldHighlight ? '600' : '400' }}>
                            {getTeamName(team)}
                          </span>
                          <img
                            src={getTeamLogoUrl(getTeamName(team))}
                            alt={getTeamName(team)}
                            style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ 
                        padding: '8px 12px', 
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '6px',
                          justifyContent: 'center'
                        }}>
                          <div style={{
                            width: '50px',
                            height: '12px',
                            background: '#222',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${team.pressScore}%`,
                              height: '100%',
                              background: isOpponentAnalysis ? getPressScoreColor(team.pressScore) : getScoreColor(team.pressScore),
                              borderRadius: '6px'
                            }} />
                          </div>
                          <span style={{
                            color: isOpponentAnalysis ? getPressScoreColor(team.pressScore) : getScoreColor(team.pressScore),
                            fontSize: '9px',
                            fontWeight: '600'
                          }}>
                            {team.pressScore.toFixed(0)}
                          </span>
                        </div>
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        color: isOpponentAnalysis ? getPressScoreColor(team.ppda40Score) : getScoreColor(team.ppda40Score),
                        fontWeight: '600'
                      }}>
                        {parseFloat(getField(team, 'ppda40') || 0).toFixed(2)}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        color: isOpponentAnalysis ? getPressScoreColor(team.ourAvgSeqScore) : getScoreColor(team.ourAvgSeqScore),
                        fontWeight: '600'
                      }}>
                        {parseFloat(getField(team, isOpponentAnalysis ? 'our_avg_sequence_time' : 'opp_avg_sequence_time') || 0).toFixed(1)}s
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        color: isOpponentAnalysis ? getPressScoreColor(team.ourLongBallScore) : getScoreColor(team.ourLongBallScore),
                        fontWeight: '600'
                      }}>
                        {parseFloat(getField(team, isOpponentAnalysis ? 'our_long_ball_percentage' : 'opp_long_ball_percentage') || 0).toFixed(1)}%
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        color: isOpponentAnalysis ? getPressScoreColor(team.posWonScore) : getScoreColor(team.posWonScore),
                        fontWeight: '600'
                      }}>
                        {getField(team, 'poswonopponenthalf') || 0}
                      </td>
                      <td style={{
                        padding: '8px 12px',
                        textAlign: 'center',
                        color: isOpponentAnalysis ? getPressScoreColor(team.ourA1ToA2A3Score) : getScoreColor(team.ourA1ToA2A3Score),
                        fontWeight: '600'
                      }}>
                        {(() => {
                          const s1e3Field = isOpponentAnalysis ? 'our_s1e3' : 'opp_s1e3'
                          const s1e2Field = isOpponentAnalysis ? 'our_s1e2' : 'opp_s1e2'
                          const s1Field = isOpponentAnalysis ? 'our_s1' : 'opp_s1'
                          const s1e3 = parseFloat(getField(team, s1e3Field)) || 0
                          const s1e2 = parseFloat(getField(team, s1e2Field)) || 0
                          const s1 = parseFloat(getField(team, s1Field)) || 0
                          const percentage = s1 > 0 ? ((s1e3 + s1e2) / s1) * 100 : 0
                          return `${percentage.toFixed(1)}%`
                        })()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Duels Section */}
        <div style={{
          background: '#000000',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', color: '#FFD700', marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
            Duels
          </h3>
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
            marginBottom: '12px'
          }} />
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '25%' }}>DUELS SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '18%' }}>GROUND % (70%)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '19%' }}>AERIAL % (30%)</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithDuelsScores.map((team, index) => {
                const teamShouldHighlight = shouldHighlightTeam(team)
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: teamShouldHighlight ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: teamShouldHighlight ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: teamShouldHighlight ? '#FFD700' : '#fff', fontWeight: teamShouldHighlight ? '600' : '400' }}>
                          {getTeamName(team)}
                        </span>
                        <img
                          src={getTeamLogoUrl(getTeamName(team))}
                          alt={getTeamName(team)}
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.duelsScore}%`,
                            height: '100%',
                            background: getScoreColor(team.duelsScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.duelsScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.duelsScore.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      color: getScoreColor(team.groundScore),
                      fontWeight: '600'
                    }}>
                      {formatPercentage(getField(team, 'ground%'))}
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      color: getScoreColor(team.aerialScore),
                      fontWeight: '600'
                    }}>
                      {formatPercentage(getField(team, 'Aerial%'))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Assist Zone Section */}
        <div style={{
          background: '#000000',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', color: '#FFD700', marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
            Assist Zone
          </h3>
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
            marginBottom: '12px'
          }} />
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '22%' }}>ASSIST ZONE SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '16%' }}>ASSIST FROM<br/>PASSES (40%)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '15%' }}>SHOT FROM<br/>GOLDEN (20%)</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '15%' }}>A2PASS/CROSS<br/>(40%)</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithAssistZoneScores.map((team, index) => {
                const teamShouldHighlight = shouldHighlightTeam(team)
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: teamShouldHighlight ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: teamShouldHighlight ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: teamShouldHighlight ? '#FFD700' : '#fff', fontWeight: teamShouldHighlight ? '600' : '400' }}>
                          {getTeamName(team)}
                        </span>
                        <img
                          src={getTeamLogoUrl(getTeamName(team))}
                          alt={getTeamName(team)}
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.assistZoneScore}%`,
                            height: '100%',
                            background: getScoreColor(team.assistZoneScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.assistZoneScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.assistZoneScore.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      color: getScoreColor(team.passAssistScore),
                      fontWeight: '600'
                    }}>
                      {getField(team, 'passfromassisttogolden') || 0}
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      color: getScoreColor(team.shotFromGoldenScore),
                      fontWeight: '600'
                    }}>
                      {getField(team, 'shotfromgolden') || 0}
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      textAlign: 'center',
                      color: getScoreColor(team.crossPassRatioScore),
                      fontWeight: '600'
                    }}>
                      {team.crossPassRatio.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Shot Locations Section */}
        <div style={{
          background: '#000000',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', color: '#FFD700', marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
            Shot Locations
          </h3>
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
            marginBottom: '12px'
          }} />
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '24%' }}>LOCATION SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '13%' }}>SHOTS</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '13%' }}>SHOTS FROM<br/>BOX</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '14%' }}>SHOTS FROM<br/>GOLDEN</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithShotLocationScores.map((team, index) => {
                const teamShouldHighlight = shouldHighlightTeam(team)
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: teamShouldHighlight ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: teamShouldHighlight ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: teamShouldHighlight ? '#FFD700' : '#fff', fontWeight: teamShouldHighlight ? '600' : '400' }}>
                          {getTeamName(team)}
                        </span>
                        <img
                          src={getTeamLogoUrl(getTeamName(team))}
                          alt={getTeamName(team)}
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.locationScore}%`,
                            height: '100%',
                            background: getScoreColor(team.locationScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.locationScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.shotFromGoldenPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'ShtIncBl') || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'shotfrombox') || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'shotfromgolden') || 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Shot Quality Section */}
        <div style={{
          background: '#000000',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', color: '#FFD700', marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
            Shot Quality
          </h3>
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
            marginBottom: '12px'
          }} />
          
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>RANK</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#888' }}>TEAM</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '22%' }}>QUALITY SCORE</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '11%' }}>SHOTS</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '12%' }}>SHOTS ON<br/>TARGET</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '11%' }}>SHOTS FROM<br/>BOX</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: '#888', width: '11%' }}>SHOTS FROM<br/>GOLDEN</th>
              </tr>
            </thead>
            <tbody>
              {teamsWithShotQualityScores.map((team, index) => {
                const teamShouldHighlight = shouldHighlightTeam(team)
                
                return (
                  <tr key={team.teamId} style={{ 
                    borderBottom: '1px solid #222',
                    background: teamShouldHighlight ? 'rgba(255, 215, 0, 0.08)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '6px 8px', 
                      color: teamShouldHighlight ? '#FFD700' : '#fff',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: teamShouldHighlight ? '#FFD700' : '#fff', fontWeight: teamShouldHighlight ? '600' : '400' }}>
                          {getTeamName(team)}
                        </span>
                        <img
                          src={getTeamLogoUrl(getTeamName(team))}
                          alt={getTeamName(team)}
                          style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '12px',
                          background: '#222',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${team.qualityScore}%`,
                            height: '100%',
                            background: getScoreColor(team.qualityScore),
                            borderRadius: '6px'
                          }} />
                        </div>
                        <span style={{ 
                          color: getScoreColor(team.qualityScore),
                          fontSize: '9px',
                          fontWeight: '600'
                        }}>
                          {team.qualityPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'ShtIncBl') || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'SOG') || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'SOG_from_box') || 0}
                    </td>
                    <td style={{ 
                      padding: '6px 8px', 
                      textAlign: 'center',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {getField(team, 'SOG_from_penalty_area') || 0}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Progressions Section */}
        <div style={{
          background: '#000000',
          borderRadius: '8px',
          padding: '10px',
          border: '1px solid #333',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}>
          <h3 style={{ fontSize: '16px', color: '#FFD700', marginBottom: '8px', textAlign: 'center', fontWeight: '700' }}>
            Field Progression Analysis
          </h3>
          <div style={{
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
            marginBottom: '12px'
          }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {/* A1 → A2 THIRD */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>A1 → A2 THIRD</h4>
              <div style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>DEFENSIVE THIRD</div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
                <tbody>
                  {(() => {
                    // Calculate A1→A2 percentages and sort
                    const teamsWithA1A2 = sortedTeams.map(team => {
                      const numerator = (parseFloat(getField(team, 'Starta1enda2/')) || 0) + 
                                      (parseFloat(getField(team, 'Starta1enda3/')) || 0)
                      const denominator = parseFloat(getField(team, 'SeqStartA1')) || 1
                      const percentage = (numerator / denominator) * 100
                      return { ...team, a1a2Percentage: percentage }
                    }).sort((a, b) => b.a1a2Percentage - a.a1a2Percentage)

                    return teamsWithA1A2.map((team, index) => {
                      const teamShouldHighlight = shouldHighlightTeam(team)
                      
                      return (
                        <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ 
                            padding: '4px 8px', 
                            color: teamShouldHighlight ? '#FFD700' : '#fff',
                            fontWeight: teamShouldHighlight ? '600' : '400',
                            fontSize: '9px',
                            width: '20px'
                          }}>
                            {index + 1}.
                          </td>
                          <td style={{
                            padding: '4px',
                            minWidth: '120px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                              <span style={{
                                color: teamShouldHighlight ? '#FFD700' : '#fff',
                                fontWeight: teamShouldHighlight ? '600' : '400',
                                fontSize: '9px',
                                whiteSpace: 'nowrap'
                              }}>
                                {getTeamName(team)}
                              </span>
                              <img
                                src={getTeamLogoUrl(getTeamName(team))}
                                alt={getTeamName(team)}
                                style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ 
                            padding: '4px 8px', 
                            textAlign: 'right',
                            color: teamShouldHighlight ? '#FFD700' : '#fbbf24',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {team.a1a2Percentage.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* A2 → A3 THIRD */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>A2 → A3 THIRD</h4>
              <div style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>MIDDLE THIRD</div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
                <tbody>
                  {(() => {
                    // Calculate A2→A3 percentages and sort
                    const teamsWithA2A3 = sortedTeams.map(team => {
                      const numerator = (parseFloat(getField(team, 'Starta1enda3/')) || 0) + 
                                      (parseFloat(getField(team, 'Starta2enda3/')) || 0)
                      const denominator = (parseFloat(getField(team, 'SeqStartMid3rd')) || 0) + 
                                        (parseFloat(getField(team, 'Starta1enda2/')) || 0)
                      const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0
                      return { ...team, a2a3Percentage: percentage }
                    }).sort((a, b) => b.a2a3Percentage - a.a2a3Percentage)

                    return teamsWithA2A3.map((team, index) => {
                      const teamShouldHighlight = shouldHighlightTeam(team)
                      
                      return (
                        <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ 
                            padding: '4px 8px', 
                            color: teamShouldHighlight ? '#FFD700' : '#fff',
                            fontWeight: teamShouldHighlight ? '600' : '400',
                            fontSize: '9px',
                            width: '20px'
                          }}>
                            {index + 1}.
                          </td>
                          <td style={{
                            padding: '4px',
                            minWidth: '120px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                              <span style={{
                                color: teamShouldHighlight ? '#FFD700' : '#fff',
                                fontWeight: teamShouldHighlight ? '600' : '400',
                                fontSize: '9px',
                                whiteSpace: 'nowrap'
                              }}>
                                {getTeamName(team)}
                              </span>
                              <img
                                src={getTeamLogoUrl(getTeamName(team))}
                                alt={getTeamName(team)}
                                style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ 
                            padding: '4px 8px', 
                            textAlign: 'right',
                            color: teamShouldHighlight ? '#FFD700' : '#fbbf24',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {team.a2a3Percentage.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* A3 → BOX */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px', textAlign: 'center' }}>A3 → BOX</h4>
              <div style={{ fontSize: '8px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>ATTACKING THIRD</div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
                <tbody>
                  {(() => {
                    // Calculate A3→BOX percentages and sort
                    const teamsWithA3Box = sortedTeams.map(team => {
                      const numerator = (parseFloat(getField(team, 'Starta1endbox/')) || 0) + 
                                      (parseFloat(getField(team, 'Starta2endbox/')) || 0) + 
                                      (parseFloat(getField(team, 'Starta3endbox /')) || 0)
                      const denominator = (parseFloat(getField(team, 'SeqStartAtt3rd')) || 0) + 
                                        (parseFloat(getField(team, 'Starta1enda3/')) || 0) + 
                                        (parseFloat(getField(team, 'Starta2enda3/')) || 0)
                      const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0
                      return { ...team, a3BoxPercentage: percentage }
                    }).sort((a, b) => b.a3BoxPercentage - a.a3BoxPercentage)

                    return teamsWithA3Box.map((team, index) => {
                      const teamShouldHighlight = shouldHighlightTeam(team)
                      
                      return (
                        <tr key={team.teamId} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ 
                            padding: '4px 8px', 
                            color: teamShouldHighlight ? '#FFD700' : '#fff',
                            fontWeight: teamShouldHighlight ? '600' : '400',
                            fontSize: '9px',
                            width: '20px'
                          }}>
                            {index + 1}.
                          </td>
                          <td style={{
                            padding: '4px',
                            minWidth: '120px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                              <span style={{
                                color: teamShouldHighlight ? '#FFD700' : '#fff',
                                fontWeight: teamShouldHighlight ? '600' : '400',
                                fontSize: '9px',
                                whiteSpace: 'nowrap'
                              }}>
                                {getTeamName(team)}
                              </span>
                              <img
                                src={getTeamLogoUrl(getTeamName(team))}
                                alt={getTeamName(team)}
                                style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ 
                            padding: '4px 8px', 
                            textAlign: 'right',
                            color: teamShouldHighlight ? '#FFD700' : '#fbbf24',
                            fontWeight: '600',
                            fontSize: '12px'
                          }}>
                            {team.a3BoxPercentage.toFixed(1)}%
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
      </div>
    </div>
  )
}