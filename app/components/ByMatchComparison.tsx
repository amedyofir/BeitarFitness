'use client'

import React, { useState, useEffect, useRef } from 'react'
import { BarChart3, RefreshCw, Sun, Moon, Download } from 'lucide-react'
import { CSVReportService } from '../../lib/csvReportService'
import { getTeamLogoUrl } from '../../lib/teamLogos'
import html2canvas from 'html2canvas'

interface MatchData {
  matchday: string
  opponent: string
  date: string
  beitarDistance: number
  opponentDistance: number
  beitarIntensity: number
  opponentIntensity: number
}

export default function ByMatchComparison() {
  const [matches, setMatches] = useState<MatchData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [isLightMode, setIsLightMode] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMatchData()
  }, [])

  const loadMatchData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const result = await CSVReportService.getAllReports()

      if (!result.success || !result.data) {
        setError('Failed to load reports')
        setIsLoading(false)
        return
      }

      const matchesData: MatchData[] = []

      // Load each report and calculate team totals
      for (const report of result.data) {
        const reportResult = await CSVReportService.loadCSVReport(
          report.matchday_number,
          report.opponent_team
        )

        if (reportResult.success && reportResult.data) {
          const parsedData = await CSVReportService.convertToRunningReportFormat(
            reportResult.data.parsed_data
          )

          // Calculate team totals
          const teamStats: { [key: string]: any } = {}

          parsedData.forEach((player: any) => {
            const teamName = player.teamName || player.newestTeam || 'Unknown'

            // Skip goalkeepers
            if (player.Position?.toLowerCase().includes('goalkeeper')) return

            const playingTime = player.MinIncET || player.Min || 0
            if (playingTime <= 0) return

            if (!teamStats[teamName]) {
              teamStats[teamName] = {
                totalDistance: 0,
                totalHSR: 0,
                totalSprint: 0
              }
            }

            const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
            const totalHSR = (player.FirstHalfDistHSRun || 0) + (player.ScndHalfDistHSRun || 0)
            const totalSprint = (player.FirstHalfDistSprint || 0) + (player.ScndHalfDistSprint || 0)

            teamStats[teamName].totalDistance += totalDistance
            teamStats[teamName].totalHSR += totalHSR
            teamStats[teamName].totalSprint += totalSprint
          })

          // Find Beitar and opponent stats
          const beitarTeam = Object.keys(teamStats).find(t => t.toLowerCase().includes('beitar'))
          const opponentTeam = Object.keys(teamStats).find(t => t === report.opponent_team)

          if (beitarTeam && opponentTeam) {
            const beitarStats = teamStats[beitarTeam]
            const opponentStats = teamStats[opponentTeam]

            const beitarIntensity = beitarStats.totalDistance > 0
              ? ((beitarStats.totalHSR + beitarStats.totalSprint) / beitarStats.totalDistance * 100)
              : 0
            const opponentIntensity = opponentStats.totalDistance > 0
              ? ((opponentStats.totalHSR + opponentStats.totalSprint) / opponentStats.totalDistance * 100)
              : 0

            matchesData.push({
              matchday: report.matchday_number,
              opponent: report.opponent_team,
              date: report.match_date || '',
              beitarDistance: beitarStats.totalDistance,
              opponentDistance: opponentStats.totalDistance,
              beitarIntensity,
              opponentIntensity
            })
          }
        }
      }

      // Sort by matchday number
      matchesData.sort((a, b) => parseInt(a.matchday) - parseInt(b.matchday))

      setMatches(matchesData)
    } catch (err: any) {
      console.error('Error loading match data:', err)
      setError(err.message || 'Failed to load match data')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(2) + 'km'
  }

  const handleExportPNG = async () => {
    if (!contentRef.current) return

    setIsExporting(true)
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: isLightMode ? '#ffffff' : '#1a1a1a',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `beitar-match-comparison-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error exporting PNG:', error)
      alert('Failed to export PNG. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ color: '#FFD700', marginBottom: '16px' }} className="animate-spin" />
        <p style={{ color: 'var(--primary-text)', fontFamily: 'Montserrat' }}>
          Loading match data...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontFamily: 'Montserrat' }}>
          Error: {error}
        </p>
        <button
          onClick={loadMatchData}
          style={{
            marginTop: '16px',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontFamily: 'Montserrat',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <BarChart3 size={48} style={{ color: '#FFD700', marginBottom: '16px' }} />
        <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '12px' }}>
          No Match Data Found
        </h3>
        <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat' }}>
          No saved reports found. Please save some match reports first.
        </p>
      </div>
    )
  }

  const maxDistance = Math.max(...matches.flatMap(m => [m.beitarDistance, m.opponentDistance]))
  const maxDistanceScale = maxDistance * 1.2 // Add 20% padding to scale like intensity

  // Calculate averages
  const avgDistanceDiff = matches.length > 0
    ? matches.reduce((sum, m) => sum + (m.beitarDistance - m.opponentDistance), 0) / matches.length
    : 0
  const avgIntensityDiff = matches.length > 0
    ? matches.reduce((sum, m) => sum + (m.beitarIntensity - m.opponentIntensity), 0) / matches.length
    : 0

  // Theme colors
  const theme = {
    background: isLightMode ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
    cardBg: isLightMode ? '#f8f9fa' : 'rgba(255, 255, 255, 0.05)',
    textPrimary: isLightMode ? '#1a1a1a' : '#fff',
    textSecondary: isLightMode ? '#666' : 'var(--secondary-text)',
    borderColor: isLightMode ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 215, 0, 0.3)',
    rowBorder: isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    barBg: isLightMode ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)',
    avgRowBg: isLightMode ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.05)',
  }

  return (
    <div className="by-match-comparison">
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#FFD700', fontSize: '24px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={28} />
              Match-by-Match Comparison
            </h2>
            <p style={{ color: theme.textSecondary, margin: '8px 0 0 0' }}>
              Compare Beitar's running performance against each opponent ({matches.length} matches)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              style={{
                background: isExporting ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#FFD700',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                opacity: isExporting ? 0.6 : 1
              }}
            >
              <Download size={18} />
              {isExporting ? 'Exporting...' : 'Export PNG'}
            </button>
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              style={{
                background: isLightMode ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#FFD700',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
            >
              {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
              {isLightMode ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>
      </div>

      <div ref={contentRef} className="glass-card" style={{
        padding: '24px',
        background: theme.cardBg,
        border: `1px solid ${theme.borderColor}`
      }}>
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <img
            src="/beitar-logo.png"
            alt="Beitar Jerusalem"
            style={{
              width: '60px',
              height: '60px',
              filter: isLightMode ? 'none' : 'brightness(1.1)'
            }}
          />
          <h2 style={{
            color: '#FFD700',
            fontSize: '24px',
            margin: 0,
            fontFamily: 'Montserrat',
            fontWeight: '700',
            letterSpacing: '1px'
          }}>
            FCBJ DATA
          </h2>
        </div>

        {/* Separator Line */}
        <div style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
          marginBottom: '32px'
        }} />

        {/* Distance Comparison Table */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{
            color: '#FFD700',
            fontSize: '20px',
            marginBottom: '16px',
            fontFamily: 'Montserrat',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Total Distance Comparison
          </h3>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Montserrat'
          }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.borderColor}` }}>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#FFD700', fontWeight: '700', width: '60px' }}>Match</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#FFD700', fontWeight: '700', width: '250px' }}>Distance</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#FFD700', fontWeight: '700', width: '100px' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const diff = match.beitarDistance - match.opponentDistance
                const isPositive = diff > 0
                const beitarPercent = (match.beitarDistance / maxDistanceScale) * 100
                const opponentPercent = (match.opponentDistance / maxDistanceScale) * 100

                return (
                  <tr key={match.matchday} style={{ borderBottom: `1px solid ${theme.rowBorder}` }}>
                    <td style={{ padding: '8px 12px', color: '#FFD700', fontWeight: '700', textAlign: 'center', fontSize: '16px' }}>
                      {match.matchday}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Beitar Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={getTeamLogoUrl('Beitar Jerusalem')}
                            alt="Beitar Jerusalem"
                            style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span style={{
                            color: '#FFD700',
                            fontSize: '10px',
                            fontWeight: '700',
                            minWidth: '90px',
                            textAlign: 'right'
                          }}>
                            Beitar Jerusalem
                          </span>
                          <div style={{
                            flex: 1,
                            height: '24px',
                            background: theme.barBg,
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${beitarPercent}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: isLightMode ? '#000' : '#fff',
                              fontSize: '11px',
                              fontWeight: '700',
                              textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {formatDistance(match.beitarDistance)}
                            </span>
                          </div>
                        </div>

                        {/* Opponent Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={getTeamLogoUrl(match.opponent)}
                            alt={match.opponent}
                            style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span style={{
                            color: '#ef4444',
                            fontSize: '10px',
                            fontWeight: '700',
                            minWidth: '90px',
                            textAlign: 'right',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {match.opponent}
                          </span>
                          <div style={{
                            flex: 1,
                            height: '24px',
                            background: theme.barBg,
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${opponentPercent}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: isLightMode ? '#000' : '#fff',
                              fontSize: '11px',
                              fontWeight: '700',
                              textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {formatDistance(match.opponentDistance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      color: isPositive ? '#22c55e' : '#ef4444',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}>
                      {isPositive ? '+' : ''}{formatDistance(diff)}
                    </td>
                  </tr>
                )
              })}
              {/* Average Row */}
              <tr style={{ borderTop: `2px solid ${theme.borderColor}`, background: theme.avgRowBg }}>
                <td style={{ padding: '12px', color: '#FFD700', fontWeight: '700', textAlign: 'center', fontSize: '16px' }}>
                  Avg
                </td>
                <td style={{ padding: '12px' }}></td>
                <td style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: avgDistanceDiff > 0 ? '#22c55e' : '#ef4444',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {avgDistanceDiff > 0 ? '+' : ''}{formatDistance(avgDistanceDiff)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Intensity Comparison Table */}
        <div>
          <h3 style={{
            color: '#FFD700',
            fontSize: '20px',
            marginBottom: '16px',
            fontFamily: 'Montserrat',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Intensity Comparison
          </h3>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Montserrat'
          }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${theme.borderColor}` }}>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#FFD700', fontWeight: '700', width: '60px' }}>Match</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#FFD700', fontWeight: '700', width: '250px' }}>Intensity</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#FFD700', fontWeight: '700', width: '100px' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => {
                const diff = match.beitarIntensity - match.opponentIntensity
                const isPositive = diff > 0
                const maxIntensity = 15 // Assuming max intensity is around 15%

                return (
                  <tr key={match.matchday} style={{ borderBottom: `1px solid ${theme.rowBorder}` }}>
                    <td style={{ padding: '8px 12px', color: '#FFD700', fontWeight: '700', textAlign: 'center', fontSize: '16px' }}>
                      {match.matchday}
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Beitar Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={getTeamLogoUrl('Beitar Jerusalem')}
                            alt="Beitar Jerusalem"
                            style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span style={{
                            color: '#FFD700',
                            fontSize: '10px',
                            fontWeight: '700',
                            minWidth: '90px',
                            textAlign: 'right'
                          }}>
                            Beitar Jerusalem
                          </span>
                          <div style={{
                            flex: 1,
                            height: '24px',
                            background: theme.barBg,
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(match.beitarIntensity / maxIntensity) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: isLightMode ? '#000' : '#fff',
                              fontSize: '11px',
                              fontWeight: '700',
                              textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {match.beitarIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Opponent Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <img
                            src={getTeamLogoUrl(match.opponent)}
                            alt={match.opponent}
                            style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                          <span style={{
                            color: '#ef4444',
                            fontSize: '10px',
                            fontWeight: '700',
                            minWidth: '90px',
                            textAlign: 'right',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {match.opponent}
                          </span>
                          <div style={{
                            flex: 1,
                            height: '24px',
                            background: theme.barBg,
                            borderRadius: '4px',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(match.opponentIntensity / maxIntensity) * 100}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: isLightMode ? '#000' : '#fff',
                              fontSize: '11px',
                              fontWeight: '700',
                              textShadow: isLightMode ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                            }}>
                              {match.opponentIntensity.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      color: isPositive ? '#22c55e' : '#ef4444',
                      fontWeight: '700',
                      fontSize: '13px'
                    }}>
                      {isPositive ? '+' : ''}{diff.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
              {/* Average Row */}
              <tr style={{ borderTop: `2px solid ${theme.borderColor}`, background: theme.avgRowBg }}>
                <td style={{ padding: '12px', color: '#FFD700', fontWeight: '700', textAlign: 'center', fontSize: '16px' }}>
                  Avg
                </td>
                <td style={{ padding: '12px' }}></td>
                <td style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: avgIntensityDiff > 0 ? '#22c55e' : '#ef4444',
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {avgIntensityDiff > 0 ? '+' : ''}{avgIntensityDiff.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
