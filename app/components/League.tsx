'use client'

import React, { useState } from 'react'
import { FileText, Calendar, Trophy, BarChart3, Upload, Archive, Database, TrendingUp } from 'lucide-react'
import Papa from 'papaparse'
import ComprehensiveMatchdayReport from './ComprehensiveMatchdayReport'
import SimpleCSVReportsManager from './SimpleCSVReportsManager'
import RunningReportDashboard from './RunningReportDashboard'
import EnhancedTeamAverageReport from './EnhancedTeamAverageReport'
import TopPlayersReport from './TopPlayersReport'

export default function League() {
  const [activeTab, setActiveTab] = useState<'matchday-reports' | 'running-dashboard' | 'team-average' | 'top-players'>('matchday-reports')
  const [runningData, setRunningData] = useState<any[]>([])
  const [matchdayNumber, setMatchdayNumber] = useState('')
  const [selectedOpponent, setSelectedOpponent] = useState('')
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleRunningCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            console.log('Running CSV parsing completed:', results.data)
            
            // Convert numeric fields for running data
            const processedData = results.data.map((row: any) => {
              const processedRow: any = { ...row }
              
              const numericFields = [
                'Min', 'OutPossHighDecels', 'OutPossHighAccels', 'OutPossDistSprint',
                'OutPossDistHSRun', 'DistanceRunOutPoss', 'InPossHighDecels', 'InPossHighAccels',
                'InPossDistSprint', 'InPossDistHSRun', 'DistanceRunInPoss', 'TopSpeed',
                'ScndHalfHighDecels', 'ScndHalfHighAccels', 'ScndHalfDistSprint', 'ScndHalfDistHSRun',
                'DistanceRunScndHalf', 'FirstHalfHighDecels', 'FirstHalfHighAccels', 'FirstHalfDistSprint',
                'FirstHalfDistHSRun', 'DistanceRunFirstHalf'
              ]
              
              numericFields.forEach(field => {
                if (processedRow[field] && !isNaN(parseFloat(processedRow[field]))) {
                  processedRow[field] = parseFloat(processedRow[field])
                }
              })
              
              return processedRow
            })
            
            setRunningData(processedData)
            
            // Set predefined opponent teams
            const predefinedOpponents = [
              'Hapoel Be\'er Sheva',
              'Maccabi Haifa', 
              'Hapoel Jerusalem',
              'Ironi Tiberias',
              'Hapoel Tel Aviv',
              'Ashdod',
              'Maccabi Netanya',
              'Hapoel Haifa',
              'Ironi Kiryat Shmona',
              'Bnei Sakhnin',
              'Maccabi Bnei Raina'
            ]
            setAvailableTeams(predefinedOpponents)
            
            setIsProcessing(false)
          },
          error: (error: any) => {
            console.error('Error parsing running CSV:', error)
            alert('Error parsing running CSV file. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
      event.target.value = ''
    }
  }

  return (
    <div className="league-container">
      <div className="section-header">
        <h2>League</h2>
        <p>League standings, fixtures, and matchday analytics</p>
      </div>

      {/* League Tab Navigation */}
      <nav className="tab-nav">
        <button
          onClick={() => setActiveTab('matchday-reports')}
          className={`tab-button ${activeTab === 'matchday-reports' ? 'active' : ''}`}
        >
          <FileText />
          Running Report
        </button>
        <button
          onClick={() => setActiveTab('running-dashboard')}
          className={`tab-button ${activeTab === 'running-dashboard' ? 'active' : ''}`}
        >
          <Database />
          Saved Reports
        </button>
        <button
          onClick={() => setActiveTab('team-average')}
          className={`tab-button ${activeTab === 'team-average' ? 'active' : ''}`}
        >
          <TrendingUp />
          Team Average
        </button>
        <button
          onClick={() => setActiveTab('top-players')}
          className={`tab-button ${activeTab === 'top-players' ? 'active' : ''}`}
        >
          <Trophy />
          Top Players
        </button>
      </nav>
      
      <div className="league-content">
        {activeTab === 'matchday-reports' && (
          <>
            {runningData.length === 0 ? (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '20px' }}>
                  Upload Beitar Players Running Data
                </h3>
                
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={matchdayNumber}
                    onChange={(e) => setMatchdayNumber(e.target.value)}
                    placeholder="Enter matchday number (1-36)"
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 215, 0, 0.3)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--primary-text)',
                      fontSize: '16px',
                      fontFamily: 'Montserrat',
                      width: '250px',
                      textAlign: 'center'
                    }}
                  />
                </div>
                
                <div style={{
                  border: '2px dashed rgba(255, 215, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '40px',
                  marginBottom: '20px',
                  background: 'rgba(255, 215, 0, 0.05)'
                }}>
                  <Upload size={48} color="#FFD700" style={{ marginBottom: '16px' }} />
                  <p style={{ color: 'var(--primary-text)', marginBottom: '16px', fontFamily: 'Montserrat' }}>
                    Upload Running Data CSV (Running26.csv)
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleRunningCsvUpload}
                    style={{ display: 'none' }}
                    id="running-csv-upload"
                    disabled={!matchdayNumber || parseInt(matchdayNumber) < 1 || parseInt(matchdayNumber) > 36}
                  />
                  <label
                    htmlFor="running-csv-upload"
                    style={{
                      background: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                        ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                        ? '#000'
                        : 'var(--secondary-text)',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontFamily: 'Montserrat',
                      fontWeight: '600',
                      cursor: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                        ? 'pointer'
                        : 'not-allowed',
                      fontSize: '14px',
                      display: 'inline-block'
                    }}
                  >
                    {matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                      ? 'Choose Running CSV File'
                      : 'Enter Matchday Number First'}
                  </label>
                </div>
                
                {isProcessing && (
                  <p style={{ color: '#FFD700', fontFamily: 'Montserrat' }}>
                    Processing running data...
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setRunningData([])
                      setMatchdayNumber('')
                      setSelectedOpponent('')
                      setAvailableTeams([])
                    }}
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
                    ← Upload New Data
                  </button>
                  
                  {availableTeams.length > 0 && (
                    <select
                      value={selectedOpponent}
                      onChange={(e) => setSelectedOpponent(e.target.value)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        background: selectedOpponent ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        color: selectedOpponent ? '#22c55e' : 'var(--primary-text)',
                        fontSize: '14px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Show All Teams</option>
                      <option value="" disabled>──────────</option>
                      {availableTeams.map(team => (
                        <option key={team} value={team}>Beitar vs {team}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                {selectedOpponent ? (
                  <ComprehensiveMatchdayReport 
                    runningData={runningData}
                    matchdayNumber={matchdayNumber}
                    selectedOpponent={selectedOpponent}
                  />
                ) : (
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                    <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat' }}>
                      Please select Beitar's opponent to view the complete report
                    </h3>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'running-dashboard' && (
          <RunningReportDashboard />
        )}

        {activeTab === 'team-average' && (
          <EnhancedTeamAverageReport />
        )}

        {activeTab === 'top-players' && (
          <TopPlayersReport />
        )}
      </div>
    </div>
  )
}