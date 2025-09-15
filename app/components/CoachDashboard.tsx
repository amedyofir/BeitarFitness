'use client'

import React, { useState, useEffect } from 'react'
import MatchReports from './MatchReports'
import WeeklyAnalysis from './WeeklyAnalysis'
import LatestDataBand from './LatestDataBand'
import BarChartView from './BarChartView'
import CoachNutritionTab from './CoachNutritionTab'
import MatchdayReport from './MatchdayReport'
import MatchGPSLeagueTab from './MatchGPSLeagueTab'
import IntensityView from './IntensityView'
import DistanceView from './DistanceView'
import { fetchTeamMatchStatistics, fetchTeamMatchMetadata, fetchAggregatedTeamStatistics, checkAggregatedDataExists } from '@/lib/teamMatchService'
import { BarChart3, Trophy, Scale, FileText, Activity, Zap, Route } from 'lucide-react'

export default function CoachDashboard() {
  const [activeCoachTab, setActiveCoachTab] = useState<'weekly-running' | 'match-reports' | 'nutrition' | 'match-stats' | 'match-gps-league' | 'training-gps'>('weekly-running')
  const [activeNutritionTab, setActiveNutritionTab] = useState<'by-player' | 'team-overview'>('by-player')
  const [activeTrainingTab, setActiveTrainingTab] = useState<'distance' | 'intensity'>('distance')
  const [availableMatches, setAvailableMatches] = useState<any[]>([])
  const [selectedMatchweek, setSelectedMatchweek] = useState<number | string | null>(null)
  const [matchStatsData, setMatchStatsData] = useState<any[]>([])
  const [loadingMatchStats, setLoadingMatchStats] = useState(false)
  const [aggregatedDataExists, setAggregatedDataExists] = useState(false)

  // Load available matches when component mounts or when match-stats tab is selected
  useEffect(() => {
    if (activeCoachTab === 'match-stats') {
      loadAvailableMatches()
    }
  }, [activeCoachTab])

  const loadAvailableMatches = async () => {
    try {
      const matches = await fetchTeamMatchMetadata()
      setAvailableMatches(matches.sort((a, b) => b.matchweek - a.matchweek)) // Sort by most recent first
      
      // Check if aggregated data exists
      const hasAggregatedData = await checkAggregatedDataExists()
      setAggregatedDataExists(hasAggregatedData)
      
      // Auto-select the most recent match or aggregated data if available
      if (!selectedMatchweek) {
        if (hasAggregatedData) {
          setSelectedMatchweek('uploaded-aggregated')
          loadUploadedAggregatedData()
        } else if (matches.length > 0) {
          const mostRecent = Math.max(...matches.map(m => m.matchweek))
          setSelectedMatchweek(mostRecent)
          loadMatchData(mostRecent)
        }
      }
    } catch (error) {
      console.error('Error loading available matches:', error)
    }
  }

  const loadMatchData = async (matchweek: number) => {
    setLoadingMatchStats(true)
    try {
      const data = await fetchTeamMatchStatistics(matchweek)
      setMatchStatsData(data)
    } catch (error) {
      console.error('Error loading match data:', error)
      setMatchStatsData([])
    }
    setLoadingMatchStats(false)
  }

  const loadAggregatedData = async () => {
    setLoadingMatchStats(true)
    try {
      // Get all team data and aggregate it
      const allTeamData = []
      const matchdayNumbers = Array.from(new Set(availableMatches.map(mw => mw.matchweek)))
      
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
        const teamAggregates: { [key: string]: any } = {}
        
        allTeamData.forEach(team => {
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
        setMatchStatsData(aggregatedData)
      } else {
        setMatchStatsData([])
      }
    } catch (error) {
      console.error('Error loading aggregated data:', error)
      setMatchStatsData([])
    }
    setLoadingMatchStats(false)
  }

  const loadUploadedAggregatedData = async () => {
    setLoadingMatchStats(true)
    try {
      const data = await fetchAggregatedTeamStatistics()
      setMatchStatsData(data)
    } catch (error) {
      console.error('Error loading uploaded aggregated data:', error)
      setMatchStatsData([])
    }
    setLoadingMatchStats(false)
  }

  const handleMatchSelect = (value: string) => {
    if (value === 'aggregated') {
      setSelectedMatchweek('aggregated')
      loadAggregatedData()
    } else if (value === 'uploaded-aggregated') {
      setSelectedMatchweek('uploaded-aggregated')
      loadUploadedAggregatedData()
    } else {
      const matchweek = parseInt(value)
      setSelectedMatchweek(matchweek)
      loadMatchData(matchweek)
    }
  }

  return (
    <div className="coach-dashboard">
      <div className="coach-dashboard-header">
        <h2>Coach Dashboard</h2>
      </div>

      <nav className="coach-tab-nav">
        <button
          onClick={() => setActiveCoachTab('weekly-running')}
          className={`tab-button ${activeCoachTab === 'weekly-running' ? 'active' : ''}`}
        >
          <BarChart3 />
          Weekly GPS
        </button>
        <button
          onClick={() => setActiveCoachTab('match-reports')}
          className={`tab-button ${activeCoachTab === 'match-reports' ? 'active' : ''}`}
        >
          <Trophy />
          Match GPS Data
        </button>
        <button
          onClick={() => setActiveCoachTab('nutrition')}
          className={`tab-button ${activeCoachTab === 'nutrition' ? 'active' : ''}`}
        >
          <Scale />
          Fat %
        </button>
        <button
          onClick={() => setActiveCoachTab('match-stats')}
          className={`tab-button ${activeCoachTab === 'match-stats' ? 'active' : ''}`}
        >
          <FileText />
          Match Stats
        </button>
        <button
          onClick={() => setActiveCoachTab('match-gps-league')}
          className={`tab-button ${activeCoachTab === 'match-gps-league' ? 'active' : ''}`}
        >
          <Activity />
          Match GPS League
        </button>
        <button
          onClick={() => setActiveCoachTab('training-gps')}
          className={`tab-button ${activeCoachTab === 'training-gps' ? 'active' : ''}`}
        >
          <Route />
          Training GPS Data
        </button>
      </nav>

      <div className="coach-tab-content">
        {activeCoachTab === 'weekly-running' && (
          <>
            <LatestDataBand />
            <BarChartView />
          </>
        )}
        {activeCoachTab === 'match-reports' && <MatchReports />}
        {activeCoachTab === 'nutrition' && (
          <CoachNutritionTab 
            activeNutritionTab={activeNutritionTab}
            setActiveNutritionTab={setActiveNutritionTab}
          />
        )}
        {activeCoachTab === 'match-stats' && (
          <div className="match-stats-tab">
            {/* Match Selector */}
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
                📊 Select Match Report
              </h3>
              
              {availableMatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                  <p style={{ fontFamily: 'Montserrat' }}>No match statistics available</p>
                  <p style={{ fontFamily: 'Montserrat', fontSize: '12px' }}>Upload team data using the Matchday Wizard</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ 
                    color: 'var(--primary-text)', 
                    fontFamily: 'Montserrat', 
                    fontWeight: '500',
                    fontSize: '14px'
                  }}>
                    Match:
                  </label>
                  <select
                    value={selectedMatchweek || ''}
                    onChange={(e) => handleMatchSelect(e.target.value)}
                    disabled={loadingMatchStats}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'var(--primary-text)',
                      fontFamily: 'Montserrat',
                      fontSize: '14px',
                      cursor: loadingMatchStats ? 'not-allowed' : 'pointer',
                      minWidth: '250px'
                    }}
                  >
                    {/* Uploaded Aggregated Data Option */}
                    {aggregatedDataExists && (
                      <option 
                        value="uploaded-aggregated"
                        style={{ background: '#1a1a1a', color: '#10b981', fontWeight: 'bold' }}
                      >
                        🏆 Season Summary (Uploaded Aggregated Data)
                      </option>
                    )}
                    
                    {/* Calculated Aggregated Option - only show if multiple matches available AND no uploaded aggregated data */}
                    {availableMatches.length > 1 && !aggregatedDataExists && (
                      <option 
                        value="aggregated"
                        style={{ background: '#1a1a1a', color: '#22c55e', fontWeight: 'bold' }}
                      >
                        📊 Season Summary ({availableMatches.length} matches averaged)
                      </option>
                    )}
                    
                    {/* Individual Match Options */}
                    {availableMatches.map(match => (
                      <option 
                        key={match.matchweek} 
                        value={match.matchweek}
                        style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}
                      >
                        Matchday {match.matchweek} - {new Date(match.match_date).toLocaleDateString('en-GB')} {match.teams_count && `(${match.teams_count} teams)`}
                      </option>
                    ))}
                  </select>
                  
                  {loadingMatchStats && (
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
              )}
            </div>

            {/* Match Report Display */}
            {selectedMatchweek && matchStatsData.length > 0 && !loadingMatchStats && (
              <div style={{ marginTop: '20px' }}>
                <MatchdayReport 
                  csvData={matchStatsData} 
                  matchdayNumber={
                    selectedMatchweek === 'aggregated' 
                      ? `Season (${availableMatches.length} matchdays)` 
                      : selectedMatchweek === 'uploaded-aggregated'
                        ? 'Season Summary'
                        : selectedMatchweek.toString()
                  } 
                />
              </div>
            )}

            {selectedMatchweek && matchStatsData.length === 0 && !loadingMatchStats && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#888',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontFamily: 'Montserrat' }}>
                  {selectedMatchweek === 'aggregated' 
                    ? 'No data available for season aggregation' 
                    : selectedMatchweek === 'uploaded-aggregated'
                      ? 'No uploaded aggregated data available'
                      : `No data available for Matchday ${selectedMatchweek}`
                  }
                </p>
              </div>
            )}
          </div>
        )}
        {activeCoachTab === 'match-gps-league' && (
          <div className="match-gps-league-tab">
            <MatchGPSLeagueTab />
          </div>
        )}
        {activeCoachTab === 'training-gps' && (
          <div className="training-gps-tab">
            {/* Sub-navigation for Training GPS Data */}
            <nav className="sub-tab-nav" style={{ 
              marginBottom: '20px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <button
                onClick={() => setActiveTrainingTab('distance')}
                className={`sub-tab-button ${activeTrainingTab === 'distance' ? 'active' : ''}`}
                style={{
                  background: activeTrainingTab === 'distance' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                  color: activeTrainingTab === 'distance' ? '#FFD700' : 'var(--secondary-text)',
                  border: `1px solid ${activeTrainingTab === 'distance' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginRight: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Route size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Distance
              </button>
              <button
                onClick={() => setActiveTrainingTab('intensity')}
                className={`sub-tab-button ${activeTrainingTab === 'intensity' ? 'active' : ''}`}
                style={{
                  background: activeTrainingTab === 'intensity' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                  color: activeTrainingTab === 'intensity' ? '#FFD700' : 'var(--secondary-text)',
                  border: `1px solid ${activeTrainingTab === 'intensity' ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Zap size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Intensity
              </button>
            </nav>

            {/* Content based on active sub-tab */}
            {activeTrainingTab === 'distance' && (
              <div className="training-distance-content">
                <DistanceView />
              </div>
            )}
            {activeTrainingTab === 'intensity' && (
              <div className="training-intensity-content">
                <IntensityView />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 