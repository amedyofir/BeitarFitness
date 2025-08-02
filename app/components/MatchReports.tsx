'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { Trophy, Calendar, Users, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Formation position definitions (updated for 2x height pitch)
const FORMATION_POSITIONS: {[key: string]: {[key: string]: {x: number, y: number, label: string}}} = {
  '4-3-3': {
    'RB': { x: 85, y: 70, label: 'RB' },
    'RCB': { x: 65, y: 77, label: 'RCB' },
    'LCB': { x: 35, y: 77, label: 'LCB' },
    'LB': { x: 15, y: 70, label: 'LB' },
    'DMC': { x: 50, y: 57, label: 'DMC' },
    'RAM': { x: 65, y: 37, label: 'RAM' },
    'LAM': { x: 35, y: 37, label: 'LAM' },
    'RW': { x: 80, y: 17, label: 'RW' },
    'ST': { x: 50, y: 7, label: 'ST' },
    'LW': { x: 20, y: 17, label: 'LW' }
  },
  '4-4-2': {
    'RB': { x: 80, y: 77, label: 'RB' },
    'RCB': { x: 65, y: 77, label: 'RCB' },
    'LCB': { x: 35, y: 77, label: 'LCB' },
    'LB': { x: 20, y: 77, label: 'LB' },
    'RM': { x: 85, y: 52, label: 'RM' },
    'RCM': { x: 65, y: 52, label: 'RCM' },
    'LCM': { x: 35, y: 52, label: 'LCM' },
    'LM': { x: 15, y: 52, label: 'LM' },
    'RST': { x: 60, y: 12, label: 'RST' },
    'LST': { x: 40, y: 12, label: 'LST' }
  },
  '4-2-3-1': {
    'RB': { x: 80, y: 77, label: 'RB' },
    'RCB': { x: 65, y: 77, label: 'RCB' },
    'LCB': { x: 35, y: 77, label: 'LCB' },
    'LB': { x: 20, y: 77, label: 'LB' },
    'RCDM': { x: 60, y: 62, label: 'RCDM' },
    'LCDM': { x: 40, y: 62, label: 'LCDM' },
    'RAM': { x: 75, y: 32, label: 'RAM' },
    'CAM': { x: 50, y: 27, label: 'CAM' },
    'LAM': { x: 25, y: 32, label: 'LAM' },
    'ST': { x: 50, y: 10, label: 'ST' }
  }
}

interface MatchInfo {
  match_id: string
  match_date: string
  rival_name: string
  rival_photo_url?: string
  score?: string
  competition?: string
  round_info?: string
  formation?: string
}

interface CatapultMatchData {
  id: string
  match_id: string
  player_id: string
  player_name?: string
  total_duration: string
  total_distance: number
  meterage_per_minute: number
  high_speed_distance: number
  sprint_distance: number
  accelerations: number
  decelerations: number
  max_velocity: number
  intensity: number
  status?: string
  game_position?: string
  squad_players?: {
    first_name: string
    last_name: string
    profile_picture_url?: string
    full_name?: string
  }
}

interface MatchWithData extends MatchInfo {
  player_data: CatapultMatchData[]
}

interface PositionBenchmark {
  distance: number // meters per 100 minutes
  highSpeed: number // meters per 100 minutes
  sprint: number // meters per 100 minutes
  intensity: number // percentage
}

interface PlayerScore {
  distanceScore: number
  intensityScore: number
}

// Position benchmarks for 100 minutes of play
const POSITION_BENCHMARKS: { [key: string]: PositionBenchmark } = {
  // Central Backs
  'RCB': { distance: 9500, highSpeed: 450, sprint: 50, intensity: 5.26 },
  'LCB': { distance: 9500, highSpeed: 450, sprint: 50, intensity: 5.26 },
  'CB': { distance: 9500, highSpeed: 450, sprint: 50, intensity: 5.26 },
  
  // Full Backs
  'RB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  'LB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  'RWB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  'LWB': { distance: 11000, highSpeed: 900, sprint: 150, intensity: 9.55 },
  
  // Defensive Midfielders
  'DMC': { distance: 10500, highSpeed: 500, sprint: 100, intensity: 5.71 },
  'RCDM': { distance: 10500, highSpeed: 500, sprint: 100, intensity: 5.71 },
  'LCDM': { distance: 10500, highSpeed: 500, sprint: 100, intensity: 5.71 },
  
  // Central Midfielders
  'RCM': { distance: 11000, highSpeed: 700, sprint: 100, intensity: 7.27 },
  'LCM': { distance: 11000, highSpeed: 700, sprint: 100, intensity: 7.27 },
  'CM': { distance: 11000, highSpeed: 700, sprint: 100, intensity: 7.27 },
  'CAM': { distance: 11000, highSpeed: 700, sprint: 100, intensity: 7.27 },
  
  // Wingers
  'RW': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'LW': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'RM': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'LM': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'RAM': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  'LAM': { distance: 10500, highSpeed: 800, sprint: 150, intensity: 9.05 },
  
  // Strikers
  'ST': { distance: 10000, highSpeed: 650, sprint: 150, intensity: 8.0 },
  'RST': { distance: 10000, highSpeed: 650, sprint: 150, intensity: 8.0 },
  'LST': { distance: 10000, highSpeed: 650, sprint: 150, intensity: 8.0 },
  'CF': { distance: 10000, highSpeed: 650, sprint: 150, intensity: 8.0 }
}

export default function MatchReports() {
  const [matches, setMatches] = useState<MatchWithData[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  // Manual highlighting state
  // Format: { matchId: { playerId: { columnName: 'good' | 'bad' | null } } }
  const [manualHighlights, setManualHighlights] = useState<{[matchId: string]: {[playerId: string]: {[column: string]: 'good' | 'bad' | null}}}>({})
  
  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const page1Ref = useRef<HTMLDivElement>(null)
  const page2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMatches()
  }, [])

  // Navigation functions
  const goToPreviousMatch = () => {
    if (currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1)
    }
  }

  const goToNextMatch = () => {
    if (currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (matches.length === 0) return
      
      if (event.key === 'ArrowLeft') {
        goToPreviousMatch()
      } else if (event.key === 'ArrowRight') {
        goToNextMatch()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentMatchIndex, matches.length])

  const fetchMatches = async () => {
    try {
      setLoading(true)
      
      // Fetch all matches with their player data
      const { data: matchesData, error: matchesError } = await supabase
        .from('match_info')
        .select('*')
        .order('match_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (matchesError) throw matchesError

      const matchesWithData: MatchWithData[] = []

      for (const match of matchesData || []) {
        const { data: playerData, error: playerError } = await supabase
          .from('catapult_match_data')
          .select(`
            *,
            squad_players (
              first_name,
              last_name,
              profile_picture_url,
              full_name
            )
          `)
          .eq('match_id', match.match_id)
          .order('player_name')

        if (playerError) throw playerError

        // Debug logging
        console.log('=== MATCH REPORTS DEBUG ===')
        console.log('Match player data:', playerData)
        playerData?.forEach(player => {
          console.log(`Player: ${player.player_name}, ID: ${player.player_id}`)
          console.log(`  Squad data:`, player.squad_players)
          console.log(`  Profile pic: ${player.squad_players?.profile_picture_url || 'No profile URL'}`)
        })
        
        // Check how many players have profile pictures in this match
        const playersWithPics = playerData?.filter(p => p.squad_players?.profile_picture_url).length || 0
        console.log(`Match players with profile pictures: ${playersWithPics}/${playerData?.length || 0}`)
        console.log('=== END MATCH REPORTS DEBUG ===')

        matchesWithData.push({
          ...match,
          player_data: playerData || []
        })
      }

      setMatches(matchesWithData)
      
      // Set current match to the most recent one
      if (matchesWithData.length > 0) {
        setCurrentMatchIndex(0)
      }
    } catch (err) {
      console.error('Error fetching matches:', err)
      setError('Failed to load match data')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (duration: string): string => {
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      return `${hours * 60 + minutes}'`;
    }
    return duration;
  }

  const formatCompactDuration = (duration: string): string => {
    const parts = duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      return `${hours * 60 + minutes}'`;
    }
    return duration;
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateTeamAverages = (playerData: CatapultMatchData[]) => {
    // Only include players who actually played (starters and substitutes)
    const playersWhoPlayed = playerData.filter(player => player.status !== 'unused')
    
    if (playersWhoPlayed.length === 0) return null

    const totals = playersWhoPlayed.reduce((acc, player) => ({
      total_distance: acc.total_distance + player.total_distance,
      meterage_per_minute: acc.meterage_per_minute + player.meterage_per_minute,
      high_speed_distance: acc.high_speed_distance + player.high_speed_distance,
      sprint_distance: acc.sprint_distance + player.sprint_distance,
      accelerations: acc.accelerations + player.accelerations,
      decelerations: acc.decelerations + player.decelerations,
      max_velocity: Math.max(acc.max_velocity, player.max_velocity),
      intensity: acc.intensity + player.intensity
    }), {
      total_distance: 0,
      meterage_per_minute: 0,
      high_speed_distance: 0,
      sprint_distance: 0,
      accelerations: 0,
      decelerations: 0,
      max_velocity: 0,
      intensity: 0
    })

    const playerCount = playersWhoPlayed.length

    return {
      avg_total_distance: totals.total_distance / playerCount,
      avg_meterage_per_minute: totals.meterage_per_minute / playerCount,
      avg_high_speed_distance: totals.high_speed_distance / playerCount,
      avg_sprint_distance: totals.sprint_distance / playerCount,
      avg_accelerations: totals.accelerations / playerCount,
      avg_decelerations: totals.decelerations / playerCount,
      max_velocity: totals.max_velocity,
      avg_intensity: totals.intensity / playerCount,
      player_count: playerCount,
      total_distance: totals.total_distance,
      total_high_speed_distance: totals.high_speed_distance,
      total_sprint_distance: totals.sprint_distance,
      total_accelerations: totals.accelerations,
      total_decelerations: totals.decelerations
    }
  }

  const getSelectedMatchData = (): MatchWithData | null => {
    return matches[currentMatchIndex] || null
  }

  const getStartingPlayers = (matchData: MatchWithData) => {
    return matchData.player_data.filter(player => player.status === 'starter')
  }

  const getSubstitutePlayers = (matchData: MatchWithData) => {
    return matchData.player_data.filter(player => player.status === 'substitute')
  }

  const getUnusedPlayers = (matchData: MatchWithData) => {
    return matchData.player_data.filter(player => player.status === 'unused')
  }

  const getPlayerInPosition = (position: string, players: CatapultMatchData[]) => {
    return players.find(player => player.game_position === position)
  }

  const calculatePlayerScore = (player: CatapultMatchData): PlayerScore => {
    const position = player.game_position || 'ST' // Default to striker if no position
    const benchmark = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS['ST']
    
    // Parse match duration to get actual minutes played
    const timeParts = player.total_duration.split(':')
    const actualMinutes = timeParts.length === 3 
      ? parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]) + parseInt(timeParts[2]) / 60
      : 90 // Default to 90 minutes if parse fails
    
    // Normalize player stats to 100 minutes
    const normalizedDistance = (player.total_distance / actualMinutes) * 100
    const actualIntensity = player.intensity * 100 // Convert to percentage
    
    // Calculate raw performance ratios
    const distanceRatio = normalizedDistance / benchmark.distance
    const intensityRatio = actualIntensity / benchmark.intensity
    
    // Apply very restrictive scoring curve:
    // - 100% of benchmark = 100 score
    // - 90% of benchmark = ~73 score (much more restrictive)
    // - 80% of benchmark = ~51 score (heavily penalized)
    // - 110% of benchmark = 110 score
    // Uses a more aggressive quadratic curve
    const calculateRealisticScore = (ratio: number): number => {
      if (ratio >= 1.0) {
        // Above benchmark: linear scaling
        return Math.round(100 * ratio)
      } else {
        // Below benchmark: gentler curve
        // Using a less aggressive power (1.5 instead of 2)
        // This makes: 0.9 → ~80, 0.8 → ~65, 0.7 → ~52
        return Math.round(100 * Math.pow(ratio, 1.5))
      }
    }
    
    const distanceScore = calculateRealisticScore(distanceRatio)
    const intensityScore = calculateRealisticScore(intensityRatio)
    
    return {
      distanceScore,
      intensityScore
    }
  }

  // Manual highlighting functions
  const handleCellClick = (playerId: string, column: string, matchId: string) => {
    setManualHighlights(prev => {
      const matchHighlights = prev[matchId] || {}
      const playerHighlights = matchHighlights[playerId] || {}
      const currentHighlight = playerHighlights[column]
      
      let newHighlight: 'good' | 'bad' | null = null
      
      // Cycle through: null -> good -> bad -> null
      if (currentHighlight === null || currentHighlight === undefined) {
        newHighlight = 'good'
      } else if (currentHighlight === 'good') {
        newHighlight = 'bad'
      } else {
        newHighlight = null
      }
      
      return {
        ...prev,
        [matchId]: {
          ...matchHighlights,
          [playerId]: {
            ...playerHighlights,
            [column]: newHighlight
          }
        }
      }
    })
  }

  const getCellHighlight = (playerId: string, column: string, matchId: string): 'good' | 'bad' | null => {
    return manualHighlights[matchId]?.[playerId]?.[column] || null
  }

  const clearAllHighlights = (matchId: string) => {
    setManualHighlights(prev => ({
      ...prev,
      [matchId]: {}
    }))
  }

  const getScoreStyle = (score: number) => {
    if (score >= 90) {
      return { color: '#4CAF50' } // green
    } else if (score >= 80) {
      return { color: '#FFA726' } // orange
    } else {
      return { color: '#F44336' } // red
    }
  }

  const getCellStyle = (playerId: string, column: string, matchId: string, defaultColor?: string) => {
    const highlight = getCellHighlight(playerId, column, matchId)
    
    if (highlight === 'good') {
      return {
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
        border: '2px solid #4CAF50',
        color: '#2E7D32',
        cursor: 'pointer'
      }
    } else if (highlight === 'bad') {
      return {
        backgroundColor: 'rgba(244, 67, 54, 0.3)',
        border: '2px solid #F44336',
        color: '#C62828',
        cursor: 'pointer'
      }
    } else {
      // For distance and intensity columns, use score-based coloring
      if ((column === 'distance' || column === 'intensity') && selectedMatchData) {
        const player = selectedMatchData.player_data.find(p => p.id === playerId)
        if (player) {
          const scores = calculatePlayerScore(player)
          const score = column === 'distance' ? scores.distanceScore : scores.intensityScore
          if (score >= 90) {
            return { color: '#4CAF50', cursor: 'pointer' } // green
          } else if (score >= 80) {
            return { color: '#FFA726', cursor: 'pointer' } // orange
          } else {
            return { color: '#F44336', cursor: 'pointer' } // red
          }
        }
      }
      
      return {
        color: defaultColor,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }
    }
  }

  // PDF Generation Function
  const generatePDF = async () => {
    if (!page1Ref.current || !page2Ref.current || !selectedMatchData) return
    
    setGeneratingPdf(true)
    
    try {
      // Create PDF instance
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Get match info for filename
      const matchDate = new Date(selectedMatchData.match_date).toLocaleDateString('en-GB').replace(/\//g, '-')
      const opponent = selectedMatchData.rival_name.replace(/\s+/g, '_')
      
      // Page 1: Header + Pitch
      const page1Element = page1Ref.current
      const page1Canvas = await html2canvas(page1Element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1a1a1a',
        width: page1Element.scrollWidth,
        height: page1Element.scrollHeight
      })
      
      const page1ImgData = page1Canvas.toDataURL('image/png')
      const page1Width = 210 // A4 width in mm
      const page1Height = (page1Canvas.height * page1Width) / page1Canvas.width
      
      // Add page 1
      pdf.addImage(page1ImgData, 'PNG', 0, 0, page1Width, page1Height)
      
      // Page 2: Table
      pdf.addPage()
      const page2Element = page2Ref.current
      const page2Canvas = await html2canvas(page2Element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#1a1a1a',
        width: page2Element.scrollWidth,
        height: page2Element.scrollHeight
      })
      
      const page2ImgData = page2Canvas.toDataURL('image/png')
      const page2Width = 210 // A4 width in mm
      const page2Height = (page2Canvas.height * page2Width) / page2Canvas.width
      
      // Add page 2
      pdf.addImage(page2ImgData, 'PNG', 0, 0, page2Width, page2Height)
      
      // Save PDF
      const filename = `Match_Report_${matchDate}_vs_${opponent}.pdf`
      pdf.save(filename)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="match-reports loading">
        <div className="loading-spinner">Loading match reports...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="match-reports error">
        <div className="error-message">{error}</div>
      </div>
    )
  }

  const selectedMatchData = getSelectedMatchData()
  const teamAverages = selectedMatchData ? calculateTeamAverages(selectedMatchData.player_data) : null

  return (
    <div className="match-reports">
      <div className="reports-header">
        <div className="header-content">
          <div className="header-text">
            <h3>Match Reports</h3>
            <p>Analyze team and individual player performance</p>
          </div>
          {selectedMatchData && (
            <button 
              className="pdf-export-btn"
              onClick={generatePDF}
              disabled={generatingPdf}
            >
              <Download size={20} />
              {generatingPdf ? 'Generating PDF...' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="no-matches">
          <Trophy size={48} />
          <h4>No matches uploaded yet</h4>
          <p>Upload your first match data to see reports here</p>
        </div>
      ) : (
        <div className="reports-content">
          {/* Match Navigation */}
          <div className="match-navigation">
            {matches.length > 0 && (
              <div className="match-navigator">
                <div className="current-match-info">
                  <div className="match-counter">
                    {currentMatchIndex + 1} of {matches.length}
                  </div>
                  <div className="match-title">
                    {formatDate(matches[currentMatchIndex].match_date)} vs {matches[currentMatchIndex].rival_name}
                    {matches[currentMatchIndex].score && ` (${matches[currentMatchIndex].score})`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Navigation Arrows */}
          {matches.length > 1 && typeof document !== 'undefined' && createPortal(
            <>
              <button 
                className="floating-nav-arrow floating-nav-left"
                onClick={goToPreviousMatch}
                disabled={currentMatchIndex === 0}
                title="Previous Match"
              >
                <ChevronLeft size={24} />
              </button>
              
              <button 
                className="floating-nav-arrow floating-nav-right"
                onClick={goToNextMatch}
                disabled={currentMatchIndex === matches.length - 1}
                title="Next Match"
              >
                <ChevronRight size={24} />
              </button>
            </>,
            document.body
          )}

          {selectedMatchData && (
            <div className="match-details">
              {/* PAGE 1: Header + Pitch */}
              <div ref={page1Ref} className="pdf-page-1">
                {/* Formation & Player Pitch View with Match Info */}
                <div className="formation-pitch-card">
                <div className="match-formation-header">
                  <div className="professional-match-header">
                    <div className="match-header-content">
                      {/* Team vs Team with Logos and Score */}
                      <div className="teams-and-score">
                        <div className="home-team">
                          <img src="/beitar-logo.png" alt="Beitar Jerusalem" className="team-logo home-logo" />
                          <span className="team-name home-name">BEITAR JERUSALEM</span>
                        </div>
                        
                        <div className="match-score-display">
                          {selectedMatchData.score ? (
                            <>
                              <span className="score-number">{selectedMatchData.score.split('-')[0] || '0'}</span>
                              <span className="score-separator">:</span>
                              <span className="score-number">{selectedMatchData.score.split('-')[1] || '0'}</span>
                            </>
                          ) : (
                            <span className="vs-text">VS</span>
                          )}
                        </div>
                        
                        <div className="away-team">
                          <span className="team-name away-name">{selectedMatchData.rival_name.toUpperCase()}</span>
                          {selectedMatchData.rival_photo_url && (
                            <img src={selectedMatchData.rival_photo_url} alt={selectedMatchData.rival_name} className="team-logo away-logo" />
                          )}
                        </div>
                      </div>
                      
                      {/* Match Details */}
                      <div className="match-meta-info">
                        <span className="match-date">{formatDate(selectedMatchData.match_date)}</span>
                        {selectedMatchData.competition && (
                          <span className="match-competition">• {selectedMatchData.competition}</span>
                        )}
                        {selectedMatchData.round_info && (
                          <span className="match-round">• {selectedMatchData.round_info}</span>
                        )}
                      </div>
                      

                    </div>
                  </div>
                </div>
                  
                  {/* Pitch Visualization */}
                  {selectedMatchData.formation && (
                    <div className="pitch-container">
                      {/* Formation Label on Pitch */}
                      <div className="pitch-formation-label">
                        <span className="formation-label">Formation:</span>
                        <span className="formation-value">{selectedMatchData.formation}</span>
                      </div>
                      <div className="pitch">
                        {FORMATION_POSITIONS[selectedMatchData.formation] && Object.entries(FORMATION_POSITIONS[selectedMatchData.formation]).map(([position, coords]) => {
                        const assignedPlayer = getPlayerInPosition(position, getStartingPlayers(selectedMatchData))
                        return (
                          <div
                            key={position}
                            className={`position-slot ${assignedPlayer ? 'filled' : 'empty'}`}
                            style={{
                              left: `${coords.x}%`,
                              top: `${coords.y}%`
                            }}
                          >
                            {assignedPlayer ? (
                              <>
                                {(() => {
                                  console.log(`Rendering player ${assignedPlayer.player_name}, profile pic: ${assignedPlayer.squad_players?.profile_picture_url}`)
                                  return null
                                })()}
                                <div className="player-duration-overlay">
                                  {formatCompactDuration(assignedPlayer.total_duration)}
                                </div>
                                {assignedPlayer.squad_players?.profile_picture_url ? (
                                  <img 
                                    src={assignedPlayer.squad_players.profile_picture_url} 
                                    alt={assignedPlayer.squad_players.full_name || assignedPlayer.player_name || 'Player'}
                                    className="player-profile-pic"
                                    onError={(e) => {
                                      console.log(`Failed to load image for ${assignedPlayer.player_name}: ${assignedPlayer.squad_players?.profile_picture_url}`)
                                      e.currentTarget.style.display = 'none'
                                    }}
                                    onLoad={() => {
                                      console.log(`Successfully loaded image for ${assignedPlayer.player_name}`)
                                    }}
                                  />
                                ) : (
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'rgba(255, 215, 0, 0.8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2em',
                                    fontWeight: 'bold',
                                    color: '#000'
                                  }}>
                                    {assignedPlayer.squad_players ? 
                                     (assignedPlayer.squad_players.full_name?.split(' ').map(n => n.charAt(0)).join('') || 
                                      assignedPlayer.squad_players.first_name.charAt(0) + assignedPlayer.squad_players.last_name.charAt(0)) : 
                                     (assignedPlayer.player_name?.split(' ').map(n => n.charAt(0)).join('') || 'P')}
                                  </div>
                                )}
                                <div className="player-name-overlay">
                                  {assignedPlayer.squad_players ? 
                                   (assignedPlayer.squad_players.full_name?.split(' ').pop() || assignedPlayer.squad_players.last_name) : 
                                   (assignedPlayer.player_name?.split(' ').pop() || 'Player')}
                                </div>
                                                                 <div className="player-stats-overlay">
                                   {(() => {
                                     const scores = calculatePlayerScore(assignedPlayer);
                                     return (
                                       <>
                                                                                 <div className="player-stat-item player-stat-score-distance" style={{
                                          background: scores.distanceScore >= 90 ? 'linear-gradient(135deg, #4CAF50, #2E7D32)' :
                                                     scores.distanceScore >= 80 ? 'linear-gradient(135deg, #FF9800, #F57C00)' :
                                                     'linear-gradient(135deg, #FF5722, #D32F2F)'
                                        }}>
                                           Distance: {Math.round(assignedPlayer.total_distance)}m{scores.distanceScore >= 110 ? ' ⭐' : ''}
                                         </div>
                                         <div className="player-stat-item player-stat-score-intensity" style={{
                                           background: scores.intensityScore >= 90 ? 'linear-gradient(135deg, #4CAF50, #2E7D32)' : 
                                                      scores.intensityScore >= 80 ? 'linear-gradient(135deg, #FF9800, #F57C00)' : 
                                                      'linear-gradient(135deg, #FF5722, #D32F2F)'
                                         }}>
                                                                                       Intensity %: {Math.round(scores.intensityScore)}{scores.intensityScore >= 110 ? ' ⭐' : ''}
                                         </div>
                                       </>
                                     );
                                   })()}
                                 </div>
                              </>
                            ) : (
                              <div style={{fontSize: '0.7em', fontWeight: 'bold', color: '#FFD700'}}>
                                {coords.label}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                    )}


                </div>
              </div>
              {/* END PAGE 1 */}

              {/* PAGE 2: Substitutes + Player Table */}
              <div ref={page2Ref} className="pdf-page-2">
                {/* Substitutes Section for PDF */}
                <div className="pdf-substitutes-section">
                  {getSubstitutePlayers(selectedMatchData).length > 0 && (
                    <div className="substitute-section">
                      <h6>Substitutes</h6>
                      <div className="bench-players-grid">
                        {getSubstitutePlayers(selectedMatchData).map(player => (
                          <div key={player.id} className="bench-player substitute">
                            <div className="bench-player-photo">
                              {player.squad_players?.profile_picture_url ? (
                                <img 
                                  src={player.squad_players.profile_picture_url} 
                                  alt={player.squad_players ? `${player.squad_players.first_name} ${player.squad_players.last_name}` : (player.player_name || 'Player')}
                                  className="bench-player-profile-pic"
                                />
                              ) : (
                                <div className="bench-player-initials">
                                  {player.squad_players ? 
                                   player.squad_players.first_name.charAt(0) + player.squad_players.last_name.charAt(0) : 
                                   (player.player_name?.split(' ').map(n => n.charAt(0)).join('') || 'P')}
                                </div>
                              )}
                            </div>
                            <div className="bench-player-info">
                              <div className="bench-player-name">
                                {player.squad_players ? 
                                 (player.squad_players.full_name || `${player.squad_players.first_name} ${player.squad_players.last_name}`) : 
                                 (player.player_name || 'Unknown Player')}
                              </div>
                              <div className="bench-player-stats">
                                <span style={getScoreStyle(calculatePlayerScore(player).distanceScore)}>
                                  {(player.total_distance / 1000).toFixed(1)}km
                                </span>
                                {' • '}
                                <span style={getScoreStyle(calculatePlayerScore(player).intensityScore)}>
                                  {(player.intensity * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Individual Player Data */}
                <div className="players-data-card">
                <div className="players-table-container">
                  <table className="players-table">
                                                            <thead>
                      <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Time Played ⏱️</th>
                        <th>Distance (m)</th>
                        <th>Intensity (%)</th>
                        <th>High Speed (m)</th>
                        <th>Sprint (m)</th>
                        <th>Acc</th>
                        <th>Dec</th>
                        <th>Max Velocity (km/h)</th>
                        <th>MPM (m/min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Starters */}
                      {[...selectedMatchData.player_data]
                        .filter(player => player.status === 'starter')
                        .sort((a, b) => b.total_distance - a.total_distance)
                        .map((player, index) => (
                          <tr key={player.id}>
                            <td className="rank">{index + 1}</td>
                            <td className={`player-name player-name-${player.status || 'starter'}`}>
                              {player.squad_players ? 
                               (player.squad_players.full_name || `${player.squad_players.first_name} ${player.squad_players.last_name}`) : 
                               (player.player_name || 'Unknown Player')}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'time', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'time', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {(() => {
                                const timeParts = player.total_duration.split(':');
                                const hours = parseInt(timeParts[0]);
                                const minutes = parseInt(timeParts[1]) + (hours * 60);
                                return `${minutes}⏱️`;
                              })()}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'distance', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'distance', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.total_distance.toFixed(0)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'intensity', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'intensity', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {(player.intensity * 100).toFixed(1)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'high_speed', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'high_speed', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.high_speed_distance.toFixed(0)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'sprint', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'sprint', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.sprint_distance.toFixed(0)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'accelerations', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'accelerations', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.accelerations}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'decelerations', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'decelerations', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.decelerations}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'max_velocity', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'max_velocity', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.max_velocity.toFixed(1)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'mpm', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'mpm', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.meterage_per_minute.toFixed(0)}
                            </td>
                          </tr>
                        ))}
                      
                      {/* Separator Row */}
                      {selectedMatchData.player_data.filter(player => player.status === 'substitute').length > 0 && (
                        <tr className="separator-row">
                          <td colSpan={11}>
                            <div className="group-separator">
                              <span className="separator-label">SUBSTITUTES</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      
                      {/* Substitutes */}
                      {[...selectedMatchData.player_data]
                        .filter(player => player.status === 'substitute')
                        .sort((a, b) => b.total_distance - a.total_distance)
                        .map((player, index) => (
                          <tr key={player.id}>
                            <td className="rank">{index + 1}</td>
                            <td className={`player-name player-name-${player.status || 'starter'}`}>
                              {player.squad_players ? 
                               (player.squad_players.full_name || `${player.squad_players.first_name} ${player.squad_players.last_name}`) : 
                               (player.player_name || 'Unknown Player')}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'time', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'time', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {(() => {
                                const timeParts = player.total_duration.split(':');
                                const hours = parseInt(timeParts[0]);
                                const minutes = parseInt(timeParts[1]) + (hours * 60);
                                return `${minutes}⏱️`;
                              })()}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'distance', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'distance', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.total_distance.toFixed(0)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'intensity', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'intensity', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {(player.intensity * 100).toFixed(1)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'high_speed', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'high_speed', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.high_speed_distance.toFixed(0)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'sprint', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'sprint', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.sprint_distance.toFixed(0)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'accelerations', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'accelerations', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.accelerations}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'decelerations', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'decelerations', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.decelerations}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'max_velocity', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'max_velocity', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.max_velocity.toFixed(1)}
                            </td>
                            <td 
                              style={getCellStyle(player.id, 'mpm', selectedMatchData.match_id)}
                              onClick={() => handleCellClick(player.id, 'mpm', selectedMatchData.match_id)}
                              title="Click to mark as good/bad"
                            >
                              {player.meterage_per_minute.toFixed(0)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      {teamAverages && (
                        <tr className="summary-row">
                          <td><strong>Team</strong></td>
                          <td><strong>{teamAverages.player_count} Players</strong></td>
                          <td><strong>
                            {(() => {
                              const playersWhoPlayed = selectedMatchData.player_data.filter(player => player.status !== 'unused')
                              const maxMinutes = Math.max(...playersWhoPlayed.map(player => {
                                const timeParts = player.total_duration.split(':');
                                const hours = parseInt(timeParts[0]);
                                const minutes = parseInt(timeParts[1]) + (hours * 60);
                                return minutes;
                              }));
                              return `${maxMinutes}⏱️`;
                            })()}
                          </strong></td>
                          <td><strong>{teamAverages.total_distance.toFixed(0)}m</strong></td>
                          <td><strong>{(((teamAverages.total_high_speed_distance + teamAverages.total_sprint_distance) / teamAverages.total_distance) * 100).toFixed(1)}%</strong></td>
                          <td><strong>{teamAverages.total_high_speed_distance.toFixed(0)}m</strong></td>
                          <td><strong>{teamAverages.total_sprint_distance.toFixed(0)}m</strong></td>
                          <td><strong>{teamAverages.total_accelerations}</strong></td>
                          <td><strong>{teamAverages.total_decelerations}</strong></td>
                          <td><strong>{teamAverages.max_velocity.toFixed(1)}</strong></td>
                          <td><strong>
                            {(() => {
                              const playersWhoPlayed = selectedMatchData.player_data.filter(player => player.status !== 'unused')
                              const maxMinutes = Math.max(...playersWhoPlayed.map(player => {
                                const timeParts = player.total_duration.split(':');
                                const hours = parseInt(timeParts[0]);
                                const minutes = parseInt(timeParts[1]) + (hours * 60);
                                return minutes;
                              }));
                              return (teamAverages.total_distance / maxMinutes).toFixed(0);
                            })()}
                          </strong></td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>
              </div>
              {/* END PAGE 2 */}
              
              {/* Manual Highlighting Controls - Only for Screen View */}
              <div className="screen-only-controls">
                <div className="manual-highlighting-controls">
                  <div className="highlighting-info">
                    <span className="info-text">💡 Click any data cell to mark performance:</span>
                    <div className="highlight-examples">
                      <span className="highlight-example good">🟢 Good</span>
                      <span className="highlight-example bad">🔴 Bad</span>
                      <span className="highlight-example neutral">⚪ Normal</span>
                    </div>
                  </div>
                  <button 
                    className="clear-highlights-btn"
                    onClick={() => clearAllHighlights(selectedMatchData.match_id)}
                  >
                    Clear All Highlights
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 