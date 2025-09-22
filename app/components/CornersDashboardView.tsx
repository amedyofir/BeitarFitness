'use client'

import React, { useState, useEffect } from 'react'
import { fetchAvailableMatchdays, fetchCornersStatistics } from '@/lib/cornersDataService'
import type { CornersStatistics, CornersMetadata } from '@/lib/cornersDataService'
import html2canvas from 'html2canvas'
import { Download } from 'lucide-react'

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

export default function CornersDashboardView() {
  const [availableMatchdays, setAvailableMatchdays] = useState<CornersMetadata[]>([])
  const [selectedMatchday, setSelectedMatchday] = useState<string>('')
  const [cornersData, setCornersData] = useState<CornersData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available matchdays on component mount
  useEffect(() => {
    loadAvailableMatchdays()
  }, [])

  const loadAvailableMatchdays = async () => {
    try {
      const matchdays = await fetchAvailableMatchdays()
      setAvailableMatchdays(matchdays)

      // Auto-select the most recent matchday
      if (matchdays.length > 0 && !selectedMatchday) {
        const mostRecent = matchdays[0] // Already sorted by upload_date desc
        setSelectedMatchday(mostRecent.matchday_number)
        loadMatchdayData(mostRecent.matchday_number)
      }
    } catch (error) {
      console.error('Error loading available matchdays:', error)
      setError('Failed to load available matchdays')
    }
  }

  const loadMatchdayData = async (matchdayNumber: string) => {
    if (!matchdayNumber) return

    setLoading(true)
    setError(null)

    try {
      const data = await fetchCornersStatistics(matchdayNumber)
      // Convert to the format expected by the wizard tables
      const convertedData: CornersData[] = data.map((team, index) => ({
        rank: index + 1,
        teamId: team.team_id || '',
        teamImageId: team.team_image_id || '',
        teamFullName: team.team_full_name,
        team: team.team || team.team_full_name,
        teamAbbrevName: team.team_abbrev_name || '',
        teamShortName: team.team_short_name || '',
        newestTeamColor: team.newest_team_color || '',
        leagueId: team.league_id || '',
        leagueName: team.league_name || '',
        gm: team.gm || 0,
        xgcornopp: team.xgcornopp || 0,
        xgcorn: team.xgcorn || 0,
        goaloppfromcorner: team.goaloppfromcorner || 0,
        goalfromcorner: team.goalfromcorner || 0,
        shotoppfromcorner: team.shotoppfromcorner || 0,
        shotfromcorner: team.shotfromcorner || 0,
        oppcorners: team.oppcorners || 0,
        corners: team.corners || 0,
        optaTeamId: team.opta_team_id || ''
      }))
      setCornersData(convertedData)
    } catch (error) {
      console.error('Error loading matchday data:', error)
      setError('Failed to load corners data')
      setCornersData([])
    }

    setLoading(false)
  }

  const handleMatchdaySelect = (matchdayNumber: string) => {
    setSelectedMatchday(matchdayNumber)
    loadMatchdayData(matchdayNumber)
  }

  // Copy the exact calculation functions from CornersView
  const formatNumber = (value: number, decimals: number = 1) => {
    if (value === null || value === undefined || isNaN(value)) return '0'
    return value.toFixed(decimals)
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
    return sortedTeams.map((team, index) => ({ ...team, finalRank: index + 1 }))
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
        const combinedScore = (attackTeam.finalScore * 0.5) + (defenseTeam.finalScore * 0.5)

        // Calculate differences (attack - defense)
        const cornersDiff = attackTeam.corners - defenseTeam.oppcorners
        const shotFromCornerDiff = attackTeam.shotfromcorner - defenseTeam.shotoppfromcorner
        const goalFromCornerDiff = attackTeam.goalfromcorner - defenseTeam.goaloppfromcorner
        const xgFromCornerDiff = attackTeam.xgcorn - defenseTeam.xgcornopp

        return {
          ...attackTeam,
          finalDefenseScore: defenseTeam.finalScore,
          combinedScore,
          cornersDiff,
          shotFromCornerDiff,
          goalFromCornerDiff,
          xgFromCornerDiff
        }
      }
      return attackTeam
    })

    // Sort by combined score and assign final ranks
    return combinedStats.sort((a, b) => b.combinedScore - a.combinedScore).map((team, index) => ({
      ...team,
      summaryRank: index + 1
    }))
  }

  const exportToPNG = async () => {
    const reportElement = document.getElementById('corners-report-full')
    if (!reportElement) return

    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#0b0b0f',
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const link = document.createElement('a')
      link.download = `corners-analysis-matchday-${selectedMatchday}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error exporting to PNG:', error)
    }
  }

  if (availableMatchdays.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#888',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '16px', fontFamily: 'Montserrat' }}>
          📊 No Corners Data Available
        </h3>
        <p style={{ fontFamily: 'Montserrat', marginBottom: '8px' }}>
          No corners analysis data has been uploaded yet.
        </p>
        <p style={{ fontFamily: 'Montserrat', fontSize: '14px', color: '#666' }}>
          Use the Corners wizard to upload CSV data first.
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Montserrat' }}>
      {/* Header with matchday selector */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(255, 215, 0, 0.2)'
      }}>
        <h3 style={{
          color: '#FFD700',
          margin: '0 0 15px 0',
          fontFamily: 'Montserrat',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          📊 Corners Analysis Dashboard
        </h3>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            color: 'var(--primary-text)',
            fontFamily: 'Montserrat',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Matchday:
          </label>
          <select
            value={selectedMatchday}
            onChange={(e) => handleMatchdaySelect(e.target.value)}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: 'var(--primary-text)',
              fontFamily: 'Montserrat',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              minWidth: '200px'
            }}
          >
            {availableMatchdays.map(matchday => (
              <option
                key={matchday.matchday_number}
                value={matchday.matchday_number}
                style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}
              >
                Matchday {matchday.matchday_number} - {matchday.total_teams} teams
              </option>
            ))}
          </select>

          {cornersData.length > 0 && (
            <button
              onClick={exportToPNG}
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: '#10b981',
                fontFamily: 'Montserrat',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={14} />
              Export PNG
            </button>
          )}

          {loading && (
            <span style={{
              color: '#FFD700',
              fontFamily: 'Montserrat',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              Loading...
            </span>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          color: '#ef4444'
        }}>
          {error}
        </div>
      )}

      {/* Exact same table structure as CornersView */}
      {cornersData.length > 0 && !loading && (
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
              Corner Analysis - Matchday {selectedMatchday}
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
                  const teamsWithStats = calculateCornerDefenseStats(cornersData)
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
                                background: isBeitar ? 'linear-gradient(90deg, #FFD700, #FFA500)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
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
                          {formatNumber(team.shotoppfromcorner > 0 ? team.oppcorners / team.shotoppfromcorner : 0, 1)}
                        </td>
                        <td style={{
                          padding: '6px 8px',
                          textAlign: 'center',
                          color: isBeitar ? '#FFD700' : '#fff',
                          fontWeight: isBeitar ? '600' : '400',
                          fontSize: '12px'
                        }}>
                          {team.goaloppfromcorner === 0 ? '∞' : formatNumber(team.oppcorners / team.goaloppfromcorner, 1)}
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>

          {/* Corner Summary Table */}
          <div>
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
                  const teamsWithStats = calculateCornerSummaryStats(cornersData)
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
      )}

      {/* No data message */}
      {selectedMatchday && cornersData.length === 0 && !loading && !error && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#888',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ fontFamily: 'Montserrat' }}>
            No corners data available for Matchday {selectedMatchday}
          </p>
        </div>
      )}
    </div>
  )
}