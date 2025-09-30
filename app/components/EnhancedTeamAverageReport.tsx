'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Calendar, RefreshCw, AlertCircle, Download, TrendingUp, Users, Target, Upload, Database, Filter, Play } from 'lucide-react'
import html2canvas from 'html2canvas'
import Papa from 'papaparse'
import { CSVReportService } from '../../lib/csvReportService'

interface MatchdayData {
  matchdayNumber: string
  opponent: string
  date: string
  data: any[]
}

interface TeamAverageData {
  season: string
  totalMatches: number
  totalPlayers: number
  aggregatedData: any[]
  matchesList: Array<{
    matchday: string
    opponent: string
    date?: string
  }>
}

export default function EnhancedTeamAverageReport() {
  const [averageData, setAverageData] = useState<TeamAverageData | null>(null)
  const [matchdaysData, setMatchdaysData] = useState<MatchdayData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedSeason, setSelectedSeason] = useState('2025-2026')
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['2025-2026'])
  const [selectedOpponent, setSelectedOpponent] = useState<string>('')
  const [availableOpponents, setAvailableOpponents] = useState<string[]>([])
  const [selectedMatchdays, setSelectedMatchdays] = useState<string[]>([])
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [newMatchdayNumber, setNewMatchdayNumber] = useState('')
  const [newOpponent, setNewOpponent] = useState('')
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAvailableSeasons()
    loadAvailableMatchdays()
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      loadAvailableMatchdays()
    }
  }, [selectedSeason])

  useEffect(() => {
    if (matchdaysData.length > 0) {
      calculateDynamicAverages()
    }
  }, [matchdaysData, selectedOpponent, selectedMatchdays])

  const loadAvailableSeasons = async () => {
    try {
      const result = await CSVReportService.getSeasonsList()
      if (result.success && result.data) {
        setAvailableSeasons(result.data)
      }
    } catch (error) {
      console.error('Error loading seasons:', error)
    }
  }

  const loadAvailableMatchdays = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Load all saved reports for the season
      const result = await CSVReportService.getAllSavedReports()

      if (result.success && result.data) {
        const seasonReports = result.data.filter(report =>
          report.season === selectedSeason ||
          (!report.season && selectedSeason === '2025-2026')
        )

        const matchdays: MatchdayData[] = []
        const opponents = new Set<string>()

        for (const report of seasonReports) {
          try {
            const reportData = await CSVReportService.getReportData(report.id)
            if (reportData.success && reportData.data) {
              matchdays.push({
                matchdayNumber: report.matchday,
                opponent: report.opponent,
                date: report.date || '',
                data: reportData.data
              })
              opponents.add(report.opponent)
            }
          } catch (error) {
            console.warn(`Failed to load data for report ${report.id}:`, error)
          }
        }

        setMatchdaysData(matchdays)
        setAvailableOpponents(Array.from(opponents).sort())

        // Select all matchdays by default
        setSelectedMatchdays(matchdays.map(m => m.matchdayNumber))

      } else {
        setError('No saved reports found for this season')
        setMatchdaysData([])
        setAvailableOpponents([])
      }
    } catch (error: any) {
      console.error('Error loading matchdays:', error)
      setError('Failed to load matchday data')
      setMatchdaysData([])
      setAvailableOpponents([])
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDynamicAverages = () => {
    if (matchdaysData.length === 0) return

    // Filter matchdays based on selections
    let filteredMatchdays = matchdaysData.filter(m =>
      selectedMatchdays.includes(m.matchdayNumber)
    )

    if (selectedOpponent) {
      filteredMatchdays = filteredMatchdays.filter(m =>
        m.opponent === selectedOpponent
      )
    }

    if (filteredMatchdays.length === 0) {
      setAverageData(null)
      return
    }

    // Aggregate data across selected matchdays
    const allPlayerData: any[] = []
    const matchesList = filteredMatchdays.map(m => ({
      matchday: m.matchdayNumber,
      opponent: m.opponent,
      date: m.date
    }))

    filteredMatchdays.forEach(matchday => {
      matchday.data.forEach(player => {
        allPlayerData.push({
          ...player,
          matchday: matchday.matchdayNumber,
          opponent: matchday.opponent
        })
      })
    })

    // Group by team and player, then calculate averages
    const teamGroups: { [teamName: string]: any[] } = {}
    const playerGroups: { [key: string]: any[] } = {}

    allPlayerData.forEach(player => {
      const teamName = player.Team || 'Unknown Team'
      if (!teamGroups[teamName]) teamGroups[teamName] = []
      teamGroups[teamName].push(player)

      const playerKey = `${teamName}_${player.Player}`
      if (!playerGroups[playerKey]) playerGroups[playerKey] = []
      playerGroups[playerKey].push(player)
    })

    // Calculate team averages
    const teamAverages = Object.entries(teamGroups).map(([teamName, players]) => {
      const matchCount = new Set(players.map(p => p.matchday)).size

      // Sum numeric fields
      const totals = players.reduce((acc, player) => {
        Object.keys(player).forEach(key => {
          if (typeof player[key] === 'number') {
            acc[key] = (acc[key] || 0) + player[key]
          }
        })
        return acc
      }, {})

      // Calculate averages
      const averages: any = {
        teamName,
        Position: 'TEAM',
        matchesPlayed: matchCount,
        uniquePlayers: new Set(players.map(p => p.Player)).size
      }

      Object.keys(totals).forEach(key => {
        averages[key] = totals[key] / matchCount
      })

      return averages
    })

    // Calculate player averages
    const playerAverages = Object.entries(playerGroups).map(([playerKey, playerData]) => {
      const [teamName, playerName] = playerKey.split('_')
      const matchCount = playerData.length

      const totals = playerData.reduce((acc, data) => {
        Object.keys(data).forEach(key => {
          if (typeof data[key] === 'number') {
            acc[key] = (acc[key] || 0) + data[key]
          }
        })
        return acc
      }, {})

      const averages: any = {
        teamName,
        Player: playerName,
        matchesPlayed: matchCount
      }

      Object.keys(totals).forEach(key => {
        averages[key] = totals[key] / matchCount
      })

      return averages
    })

    setAverageData({
      season: selectedSeason,
      totalMatches: filteredMatchdays.length,
      totalPlayers: playerAverages.length,
      aggregatedData: [...teamAverages, ...playerAverages],
      matchesList
    })
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !newMatchdayNumber || !newOpponent) {
      alert('Please fill in all fields before uploading')
      return
    }

    setIsProcessingUpload(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Process the data for preview
          const processedData = results.data.map((row: any) => {
            const processedRow: any = { ...row }

            // Convert numeric fields
            const numericFields = [
              'Min', 'MinIncET', 'OutPossHighDecels', 'OutPossHighAccels', 'OutPossDistSprint',
              'OutPossDistHSRun', 'DistanceRunOutPoss', 'InPossHighDecels', 'InPossHighAccels',
              'InPossDistSprint', 'InPossDistHSRun', 'DistanceRunInPoss', 'TopSpeed',
              'ScndHalfHighDecels', 'ScndHalfHighAccels', 'ScndHalfDistSprint', 'ScndHalfDistHSRun',
              'DistanceRunScndHalf', 'FirstHalfHighDecels', 'FirstHalfHighAccels', 'FirstHalfDistSprint',
              'FirstHalfDistHSRun', 'DistanceRunFirstHalf', 'KMHSPEED'
            ]

            numericFields.forEach(field => {
              if (processedRow[field] && !isNaN(parseFloat(processedRow[field]))) {
                processedRow[field] = parseFloat(processedRow[field])
              }
            })

            return processedRow
          })

          setPreviewData(processedData)
          setShowPreview(true)
          setIsProcessingUpload(false)
        },
        error: (error: any) => {
          console.error('Error parsing CSV:', error)
          alert('Error parsing CSV file. Please check the file format.')
          setIsProcessingUpload(false)
        }
      })
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const confirmUpload = async () => {
    if (previewData.length === 0) return

    setIsProcessingUpload(true)

    try {
      // Save to CSV service
      const saveResult = await CSVReportService.saveReport({
        matchday: newMatchdayNumber,
        opponent: newOpponent,
        season: selectedSeason,
        date: new Date().toISOString().split('T')[0]
      }, previewData)

      if (saveResult.success) {
        // Reload data
        await loadAvailableMatchdays()

        // Reset form
        setShowUploadForm(false)
        setShowPreview(false)
        setPreviewData([])
        setNewMatchdayNumber('')
        setNewOpponent('')

        alert(`Successfully uploaded data for Matchday ${newMatchdayNumber} vs ${newOpponent}`)
      } else {
        throw new Error(saveResult.error || 'Failed to save data')
      }
    } catch (error: any) {
      console.error('Error saving data:', error)
      alert('Error saving data: ' + error.message)
    } finally {
      setIsProcessingUpload(false)
    }
  }

  const cancelUpload = () => {
    setShowPreview(false)
    setPreviewData([])
    setIsProcessingUpload(false)
  }

  const handleDownloadPNG = async () => {
    if (!exportRef.current) return

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#242b3d',
        useCORS: true,
        allowTaint: true,
        scale: 2,
        width: exportRef.current.scrollWidth,
        height: exportRef.current.scrollHeight
      })

      const link = document.createElement('a')
      const filename = selectedOpponent
        ? `team-average-vs-${selectedOpponent}-${selectedSeason}.png`
        : `team-average-${selectedMatchdays.length}matchdays-${selectedSeason}.png`
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating PNG:', error)
      alert('Failed to generate PNG. Please try again.')
    }
  }

  // Helper functions (same as original)
  const formatDistance = (distance: number) => {
    return `${Math.round(distance).toLocaleString()}m`
  }

  const formatSpeed = (speed: number | undefined) => {
    if (speed === undefined || speed === null) return '-'
    if (typeof speed === 'string') return speed
    return speed.toFixed(1)
  }

  if (isLoading && matchdaysData.length === 0) {
    return (
      <div className="team-average-loading">
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <RefreshCw size={32} style={{ color: '#FFD700', marginBottom: '16px' }} className="animate-spin" />
          <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '12px' }}>
            Loading Available Matchdays
          </h3>
          <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat' }}>
            Scanning saved reports for {selectedSeason}...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="enhanced-team-average-report">
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h2 style={{ color: '#FFD700', fontSize: '24px', margin: 0 }}>
            Enhanced Team Average Report
          </h2>
          <p style={{ color: 'var(--secondary-text)', margin: '8px 0 0 0' }}>
            Dynamic analysis with opponent selection and CSV upload
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '14px',
              fontFamily: 'Montserrat'
            }}
          >
            {availableSeasons.map(season => (
              <option key={season} value={season}>Season {season}</option>
            ))}
          </select>

          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            style={{
              backgroundColor: showUploadForm ? '#ef4444' : '#22c55e',
              color: '#fff',
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
            {showUploadForm ? <Database size={16} /> : <Upload size={16} />}
            {showUploadForm ? 'View Reports' : 'Upload CSV'}
          </button>

          {averageData && (
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
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ color: '#FFD700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} />
            Upload New Matchday Data
          </h3>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ color: '#fff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Matchday Number
              </label>
              <input
                type="number"
                min="1"
                max="38"
                value={newMatchdayNumber}
                onChange={(e) => setNewMatchdayNumber(e.target.value)}
                placeholder="e.g., 26"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ flex: '2', minWidth: '200px' }}>
              <label style={{ color: '#fff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Opponent
              </label>
              <select
                value={newOpponent}
                onChange={(e) => setNewOpponent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="">Select opponent...</option>
                {availableOpponents.map(opponent => (
                  <option key={opponent} value={opponent}>{opponent}</option>
                ))}
                <option value="" disabled>──────────</option>
                <option value="Hapoel Be'er Sheva">Hapoel Be'er Sheva</option>
                <option value="Maccabi Haifa">Maccabi Haifa</option>
                <option value="Hapoel Jerusalem">Hapoel Jerusalem</option>
                <option value="Ironi Tiberias">Ironi Tiberias</option>
                <option value="Hapoel Tel Aviv">Hapoel Tel Aviv</option>
                <option value="Ashdod">Ashdod</option>
                <option value="Maccabi Netanya">Maccabi Netanya</option>
                <option value="Hapoel Haifa">Hapoel Haifa</option>
                <option value="Ironi Kiryat Shmona">Ironi Kiryat Shmona</option>
                <option value="Bnei Sakhnin">Bnei Sakhnin</option>
                <option value="Maccabi Bnei Raina">Maccabi Bnei Raina</option>
                <option value="Maccabi Tel Aviv">Maccabi Tel Aviv</option>
                <option value="Hapoel Katamon">Hapoel Katamon</option>
                <option value="MS Ashdod">MS Ashdod</option>
                <option value="Maccabi Petah Tikva">Maccabi Petah Tikva</option>
              </select>
            </div>

            <div style={{ flex: '2', minWidth: '200px' }}>
              <label style={{ color: '#fff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Running Data CSV
              </label>
              <div style={{
                border: '2px dashed rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                background: newMatchdayNumber && newOpponent ? 'rgba(255, 215, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                textAlign: 'center',
                position: 'relative'
              }}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={!newMatchdayNumber?.trim() || !newOpponent?.trim() || isProcessingUpload}
                  style={{
                    display: 'none'
                  }}
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '2px solid rgba(255, 215, 0, 0.3)',
                    background: newMatchdayNumber?.trim() && newOpponent?.trim()
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: newMatchdayNumber?.trim() && newOpponent?.trim() ? '#000' : '#888',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: newMatchdayNumber?.trim() && newOpponent?.trim() && !isProcessingUpload ? 'pointer' : 'not-allowed',
                    textAlign: 'center',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {newMatchdayNumber?.trim() && newOpponent?.trim()
                    ? '📁 Click to Browse CSV File'
                    : '🚫 Fill in Matchday & Opponent First'
                  }
                </label>

                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '12px',
                  color: newMatchdayNumber?.trim() && newOpponent?.trim() ? '#22c55e' : '#888',
                  fontStyle: 'italic'
                }}>
                  {newMatchdayNumber?.trim() && newOpponent?.trim()
                    ? '✓ Ready to upload Running Data CSV'
                    : `Missing: ${!newMatchdayNumber?.trim() ? 'Matchday' : ''} ${!newOpponent?.trim() ? 'Opponent' : ''}`.trim()}
                </p>

                {/* Debug info - can remove later */}
                <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                  Debug: Matchday="{newMatchdayNumber}" | Opponent="{newOpponent}" | Processing={isProcessingUpload.toString()}
                </div>
              </div>
            </div>
          </div>

          {isProcessingUpload && (
            <p style={{ color: '#FFD700', marginTop: '12px', fontStyle: 'italic' }}>
              Processing and saving data...
            </p>
          )}
        </div>
      )}

      {/* Data Preview Window */}
      {showPreview && previewData.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #FFD700'
          }}>
            {/* Preview Header */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2 style={{ color: '#FFD700', fontSize: '24px', margin: '0 0 8px 0' }}>
                📊 Data Preview
              </h2>
              <p style={{ color: '#fff', margin: '0 0 16px 0' }}>
                Matchday {newMatchdayNumber} vs {newOpponent} • {previewData.length} players
              </p>

              {/* Summary Stats */}
              <div style={{
                display: 'flex',
                gap: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: '20px'
              }}>
                {(() => {
                  const teams = [...new Set(previewData.map(p => p.Team || 'Unknown'))].filter(Boolean)
                  const totalDistance = previewData.reduce((sum, p) =>
                    sum + ((p.DistanceRunFirstHalf || 0) + (p.DistanceRunScndHalf || 0)), 0)
                  const avgDistance = Math.round(totalDistance / previewData.length)
                  const totalMinutes = previewData.reduce((sum, p) => sum + (p.MinIncET || p.Min || 0), 0)

                  return (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#22c55e', fontSize: '20px', fontWeight: '700' }}>{teams.length}</div>
                        <div style={{ color: '#888', fontSize: '12px' }}>Teams</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '700' }}>{previewData.length}</div>
                        <div style={{ color: '#888', fontSize: '12px' }}>Players</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#f59e0b', fontSize: '20px', fontWeight: '700' }}>{avgDistance.toLocaleString()}m</div>
                        <div style={{ color: '#888', fontSize: '12px' }}>Avg Distance</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#ef4444', fontSize: '20px', fontWeight: '700' }}>{Math.round(totalMinutes)}min</div>
                        <div style={{ color: '#888', fontSize: '12px' }}>Total Minutes</div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Data Table Preview */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  position: 'sticky',
                  top: 0
                }}>
                  <tr>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Player</th>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Team</th>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Minutes</th>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Distance</th>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Speed</th>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>In Poss</th>
                    <th style={{ padding: '10px 8px', color: '#FFD700', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Out Poss</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((player, index) => {
                    const totalDistance = (player.DistanceRunFirstHalf || 0) + (player.DistanceRunScndHalf || 0)
                    const minutes = player.MinIncET || player.Min || 0
                    const speed = player.KMHSPEED || player.TopSpeed || 0
                    const inPoss = player.DistanceRunInPoss || 0
                    const outPoss = player.DistanceRunOutPoss || 0
                    const isBeitarPlayer = (player.Team || '').toLowerCase().includes('beitar')

                    return (
                      <tr key={index} style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isBeitarPlayer ? 'rgba(255, 215, 0, 0.05)' : 'transparent'
                      }}>
                        <td style={{ padding: '8px', color: '#fff', fontWeight: isBeitarPlayer ? '600' : '400' }}>
                          {player.Player || 'N/A'}
                        </td>
                        <td style={{ padding: '8px', color: isBeitarPlayer ? '#FFD700' : '#fff' }}>
                          {player.Team || 'N/A'}
                        </td>
                        <td style={{ padding: '8px', color: '#fff', textAlign: 'center' }}>
                          {minutes}min
                        </td>
                        <td style={{ padding: '8px', color: '#22c55e', textAlign: 'center', fontWeight: '600' }}>
                          {Math.round(totalDistance).toLocaleString()}m
                        </td>
                        <td style={{ padding: '8px', color: '#3b82f6', textAlign: 'center' }}>
                          {typeof speed === 'number' ? speed.toFixed(1) : speed}
                        </td>
                        <td style={{ padding: '8px', color: '#22c55e', textAlign: 'center' }}>
                          {Math.round(inPoss).toLocaleString()}m
                        </td>
                        <td style={{ padding: '8px', color: '#ef4444', textAlign: 'center' }}>
                          {Math.round(outPoss).toLocaleString()}m
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={cancelUpload}
                disabled={isProcessingUpload}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  cursor: isProcessingUpload ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={isProcessingUpload}
                style={{
                  background: isProcessingUpload
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: isProcessingUpload ? '#888' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  cursor: isProcessingUpload ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isProcessingUpload ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    ✓ Confirm Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      {!showUploadForm && matchdaysData.length > 0 && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={20} style={{ color: '#FFD700' }} />
              <h4 style={{ color: '#FFD700', margin: 0 }}>Filters & Analysis</h4>
            </div>

            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ color: '#fff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Focus on Opponent (Optional)
              </label>
              <select
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: selectedOpponent ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedOpponent ? '#22c55e' : '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="">All Opponents</option>
                {availableOpponents.map(opponent => (
                  <option key={opponent} value={opponent}>{opponent}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#fff', fontSize: '14px' }}>
                {selectedMatchdays.length} / {matchdaysData.length} matchdays
              </span>
              <button
                onClick={() => setSelectedMatchdays(
                  selectedMatchdays.length === matchdaysData.length ? [] : matchdaysData.map(m => m.matchdayNumber)
                )}
                style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  color: '#FFD700',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {selectedMatchdays.length === matchdaysData.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Matchday Selection */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ color: '#fff', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Select Matchdays to Include:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {matchdaysData.map(matchday => (
                <label key={matchday.matchdayNumber} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: selectedMatchdays.includes(matchday.matchdayNumber)
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  border: selectedMatchdays.includes(matchday.matchdayNumber)
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: selectedMatchdays.includes(matchday.matchdayNumber) ? '#22c55e' : '#fff'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedMatchdays.includes(matchday.matchdayNumber)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMatchdays([...selectedMatchdays, matchday.matchdayNumber])
                      } else {
                        setSelectedMatchdays(selectedMatchdays.filter(m => m !== matchday.matchdayNumber))
                      }
                    }}
                    style={{ margin: 0 }}
                  />
                  MD{matchday.matchdayNumber} vs {matchday.opponent}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!showUploadForm && matchdaysData.length === 0 && !isLoading && (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <Database size={48} style={{ color: '#888', marginBottom: '16px' }} />
          <h3 style={{ color: '#888', fontFamily: 'Montserrat', marginBottom: '12px' }}>
            No Saved Reports Found
          </h3>
          <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', marginBottom: '20px' }}>
            Upload CSV data to start building team averages for {selectedSeason}
          </p>
          <button
            onClick={() => setShowUploadForm(true)}
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            <Upload size={20} />
            Upload First Matchday
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {!showUploadForm && averageData && (
        <>
          {/* Data Summary */}
          <div className="glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h4 style={{ color: '#FFD700', margin: '0 0 8px 0' }}>Analysis Summary</h4>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: '#22c55e' }} />
                    <span style={{ color: '#fff', fontSize: '14px' }}>
                      {averageData.totalMatches} matches analyzed
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} style={{ color: '#3b82f6' }} />
                    <span style={{ color: '#fff', fontSize: '14px' }}>
                      {averageData.totalPlayers} players tracked
                    </span>
                  </div>
                  {selectedOpponent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Target size={16} style={{ color: '#f59e0b' }} />
                      <span style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '600' }}>
                        Focus: vs {selectedOpponent}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {averageData.matchesList.map((match, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'rgba(255, 215, 0, 0.1)',
                      color: '#FFD700',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    MD{match.matchday} vs {match.opponent}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Report Content - Reuse the same rendering logic from TeamAverageReport */}
          <div ref={exportRef} style={{
            background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)',
            borderRadius: '12px',
            padding: '16px',
            color: '#fff',
            fontFamily: 'sans-serif',
            minHeight: 'auto',
            overflow: 'visible',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {/* Report Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
              <img
                src="/beitar-logo.png"
                alt="Beitar Jerusalem"
                style={{
                  height: '50px',
                  width: 'auto'
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <h1 style={{
                  color: '#FFD700',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: 0,
                  letterSpacing: '2px'
                }}>
                  FCBJ DATA
                </h1>
                {selectedOpponent && (
                  <p style={{
                    color: '#f59e0b',
                    fontSize: '16px',
                    margin: '4px 0 0 0',
                    fontWeight: '600'
                  }}>
                    Analysis vs {selectedOpponent}
                  </p>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{
                color: '#FFD700',
                fontSize: '20px',
                fontWeight: '600',
                margin: 0
              }}>
                {selectedOpponent ? `Performance vs ${selectedOpponent}` : `Season Average (${averageData.totalMatches} matches)`}
              </h2>
            </div>

            {/* Team Analysis Tables */}
            {(() => {
              // Process data same as original TeamAverageReport
              const runningData = averageData.aggregatedData
              const teamAverages = runningData.filter(item => item.Position === 'TEAM')
              const playerAverages = runningData.filter(item => item.Position !== 'TEAM')

              // Convert team averages to the format expected by the report
              const teams = teamAverages.map(teamData => {
                const totalDistance = (teamData.DistanceRunFirstHalf || 0) + (teamData.DistanceRunScndHalf || 0)
                const inPoss = teamData.DistanceRunInPoss || 0
                const outPoss = teamData.DistanceRunOutPoss || 0
                const firstHalfHSR = teamData.FirstHalfDistHSRun || 0
                const firstHalfSprint = teamData.FirstHalfDistSprint || 0
                const secondHalfHSR = teamData.ScndHalfDistHSRun || 0
                const secondHalfSprint = teamData.ScndHalfDistSprint || 0
                const inPossHSR = teamData.InPossDistHSRun || 0
                const outPossHSR = teamData.OutPossDistHSRun || 0
                const inPossSprint = teamData.InPossDistSprint || 0
                const outPossSprint = teamData.OutPossDistSprint || 0

                const totalMinutesET = teamData.MinIncET || teamData.Min || 0
                const avgMPM = totalMinutesET > 0 ? (totalDistance / totalMinutesET) : 0

                return {
                  team: teamData.teamName,
                  totalDistance: totalDistance,
                  totalFirstHalf: teamData.DistanceRunFirstHalf || 0,
                  totalSecondHalf: teamData.DistanceRunScndHalf || 0,
                  totalInPoss: inPoss,
                  totalOutPoss: outPoss,
                  avgInPossIntensity: inPoss > 0 ? ((inPossHSR + inPossSprint) / inPoss * 100) : 0,
                  avgOutPossIntensity: outPoss > 0 ? ((outPossHSR + outPossSprint) / outPoss * 100) : 0,
                  avgMPM: avgMPM,
                  avgIntensity: totalDistance > 0 ?
                    ((firstHalfHSR + firstHalfSprint + secondHalfHSR + secondHalfSprint) / totalDistance * 100) : 0,
                  avgSpeed: teamData.KMHSPEED || teamData.TopSpeed || 0,
                  playerCount: teamData.uniquePlayers || 0,
                  players: playerAverages.filter(p => p.teamName === teamData.teamName),
                  totalFirstHalfHSR: firstHalfHSR,
                  totalFirstHalfSprint: firstHalfSprint,
                  totalSecondHalfHSR: secondHalfHSR,
                  totalSecondHalfSprint: secondHalfSprint,
                  speedFirstHalf: teamData.KMHSPEED || teamData.TopSpeed || 0,
                  speedSecondHalf: teamData.KMHSPEED || teamData.TopSpeed || 0,
                  maxGameTime: totalMinutesET,
                  almogScore: 0
                }
              })

              // Calculate ALMOG scores
              const mpmValues = teams.map(t => t.avgMPM).filter(v => v > 0)
              const speedValues = teams.map(t => t.avgSpeed).filter(v => v > 0)
              const intensityValues = teams.map(t => t.avgIntensity).filter(v => v > 0)

              const minMPM = Math.min(...mpmValues)
              const maxMPM = Math.max(...mpmValues)
              const minSpeed = Math.min(...speedValues)
              const maxSpeed = Math.max(...speedValues)
              const minIntensity = Math.min(...intensityValues)
              const maxIntensity = Math.max(...intensityValues)

              teams.forEach(team => {
                const mpmScore = maxMPM > minMPM ?
                  ((team.avgMPM - minMPM) / (maxMPM - minMPM)) * 100 : 50
                const speedScore = maxSpeed > minSpeed ?
                  ((team.avgSpeed - minSpeed) / (maxSpeed - minSpeed)) * 100 : 50
                const intensityScore = maxIntensity > minIntensity ?
                  ((team.avgIntensity - minIntensity) / (maxIntensity - minIntensity)) * 100 : 50

                team.almogScore = (mpmScore * 0.3) + (speedScore * 0.3) + (intensityScore * 0.4)
              })

              const allTeams = teams.sort((a, b) => b.almogScore - a.almogScore)
              const maxInPoss = Math.max(...allTeams.map(t => t.totalInPoss))
              const maxOutPoss = Math.max(...allTeams.map(t => t.totalOutPoss))

              const renderProgressBar = (value: number, maxValue: number, color: 'green' | 'red') => {
                const percentage = maxValue > 0 ? (value / maxValue * 100) : 0
                const gradient = color === 'green'
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)'

                return (
                  <div style={{
                    flex: 1,
                    height: '14px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '7px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: gradient,
                      borderRadius: '7px',
                      transition: 'width 0.3s ease'
                    }} />
                    <span style={{
                      position: 'absolute',
                      right: '4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '16px',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {formatDistance(value)}
                    </span>
                  </div>
                )
              }

              return (
                <>
                  {/* Teams Comparison Table */}
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{
                      color: '#FFD700',
                      fontSize: '20px',
                      fontWeight: '600',
                      marginBottom: '15px',
                      textAlign: 'center'
                    }}>
                      {selectedOpponent ? `Performance vs ${selectedOpponent}` : 'Team Performance Analysis'}
                    </h2>

                    <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
                      <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '16px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #FFD700', background: 'rgba(255, 215, 0, 0.05)' }}>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>RANK</th>
                            <th style={{ padding: '8px 4px', textAlign: 'left', color: '#FFD700', fontSize: '10px', width: '140px' }}>TEAM</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>AVG DISTANCE</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>AVG INTENSITY</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>AVG SPEED</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>DISTANCE</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>INTENSITY %</th>
                            <th style={{ padding: '8px 4px', textAlign: 'center', color: '#FFD700', fontSize: '10px' }}>ALMOG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTeams.map((team, index) => {
                            const isBeitarRow = team.team.toLowerCase().includes('beitar')

                            return (
                              <tr
                                key={team.team}
                                style={{
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                  background: isBeitarRow ? 'rgba(255, 215, 0, 0.15)' : 'transparent'
                                }}
                              >
                                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                                  {index + 1}
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'left', color: '#fff', fontWeight: '500', width: '140px', fontSize: '16px' }}>
                                  {team.team}
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                                  {formatDistance(team.totalDistance)}
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#fff' }}>
                                  {team.avgIntensity.toFixed(1)}%
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontWeight: '600' }}>
                                  {formatSpeed(team.avgSpeed)}
                                </td>
                                <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                                  <div style={{ marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '10px', color: '#888', width: '45px' }}>In Poss</span>
                                      {renderProgressBar(team.totalInPoss, maxInPoss, 'green')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontSize: '10px', color: '#888', width: '45px' }}>Out Poss</span>
                                      {renderProgressBar(team.totalOutPoss, maxOutPoss, 'red')}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 8px', minWidth: '160px' }}>
                                  <div style={{ marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                                      <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>In Poss</span>
                                      <div style={{
                                        flex: 1,
                                        height: '14px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '7px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          width: `${Math.min(team.avgInPossIntensity * 8, 100)}%`,
                                          height: '100%',
                                          background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                                          borderRadius: '7px'
                                        }} />
                                        <span style={{
                                          position: 'absolute',
                                          right: '4px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          fontSize: '16px',
                                          color: '#fff',
                                          fontWeight: '600'
                                        }}>
                                          {team.avgInPossIntensity.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <span style={{ fontSize: '12px', color: '#888', width: '35px' }}>Out Poss</span>
                                      <div style={{
                                        flex: 1,
                                        height: '14px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '7px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          width: `${Math.min(team.avgOutPossIntensity * 8, 100)}%`,
                                          height: '100%',
                                          background: 'linear-gradient(90deg, #ef4444, #dc2626)',
                                          borderRadius: '7px'
                                        }} />
                                        <span style={{
                                          position: 'absolute',
                                          right: '4px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          fontSize: '16px',
                                          color: '#fff',
                                          fontWeight: '600'
                                        }}>
                                          {team.avgOutPossIntensity.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 4px', textAlign: 'center', color: '#FFD700', fontSize: '18px', fontWeight: '700' }}>
                                  {team.almogScore.toFixed(1)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}