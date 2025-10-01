'use client'

import React, { useMemo, useState } from 'react'
import { TrendingUp, Upload } from 'lucide-react'
import Papa from 'papaparse'
import ComprehensiveMatchdayReport from './ComprehensiveMatchdayReport'

interface RunningSeasonReportProps {
  runningData: any[]
  onDataUpload?: (data: any[]) => void
}

export default function RunningSeasonReport({ runningData, onDataUpload }: RunningSeasonReportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedOpponent, setSelectedOpponent] = useState('')

  const availableTeams = [
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
    'Maccabi Bnei Raina',
    'Hapoel Petah Tikva',
  ]

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            const processedData = results.data.map((row: any) => {
              const processedRow: any = { ...row }

              const numericFields = [
                'Min', 'OutPossHighDecels', 'OutPossHighAccels', 'OutPossDistSprint',
                'OutPossDistHSRun', 'DistanceRunOutPoss', 'InPossHighDecels', 'InPossHighAccels',
                'InPossDistSprint', 'InPossDistHSRun', 'DistanceRunInPoss', 'TopSpeed',
                'ScndHalfHighDecels', 'ScndHalfHighAccels', 'ScndHalfDistSprint', 'ScndHalfDistHSRun',
                'DistanceRunScndHalf', 'FirstHalfHighDecels', 'FirstHalfHighAccels', 'FirstHalfDistSprint',
                'FirstHalfDistHSRun', 'DistanceRunFirstHalf', 'GM', 'Age', 'GS', 'MinIncET', 'KMHSPEED'
              ]

              numericFields.forEach(field => {
                if (processedRow[field] !== undefined && processedRow[field] !== null && processedRow[field] !== '') {
                  // Remove commas from numbers (e.g., "25,924" -> "25924")
                  const cleanedValue = String(processedRow[field]).replace(/,/g, '')
                  const numValue = parseFloat(cleanedValue)
                  if (!isNaN(numValue)) {
                    processedRow[field] = numValue
                  }
                }
              })

              return processedRow
            })

            if (onDataUpload) {
              onDataUpload(processedData)
            }
            setIsProcessing(false)
          },
          error: (error: any) => {
            console.error('Error parsing CSV:', error)
            alert('Error parsing CSV file. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
      event.target.value = ''
    }
  }

  // For season data, we pass the raw data (no normalization at team level)
  // Player-level normalization will happen in ComprehensiveMatchdayReport
  const seasonData = useMemo(() => {
    if (!runningData || runningData.length === 0) return []
    return runningData
  }, [runningData])

  if (runningData.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <TrendingUp size={48} style={{ color: '#FFD700', marginBottom: '16px' }} />
        <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', marginBottom: '20px' }}>
          Upload Season Running Data
        </h3>
        <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', marginBottom: '24px' }}>
          Upload your running data CSV to view aggregated season statistics.
        </p>

        {/* Opponent Selector */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            color: 'var(--primary-text)',
            fontWeight: '600',
            fontSize: '14px',
            display: 'block',
            marginBottom: '12px'
          }}>
            Select Opponent to Highlight (Optional):
          </label>
          <select
            value={selectedOpponent}
            onChange={(e) => setSelectedOpponent(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--primary-text)',
              fontSize: '14px',
              fontFamily: 'Montserrat',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '250px'
            }}
          >
            <option value="">No opponent selected</option>
            {availableTeams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
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
            Upload Running Data CSV (e.g., Running26.csv)
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            style={{ display: 'none' }}
            id="season-csv-upload"
            disabled={isProcessing}
          />
          <label
            htmlFor="season-csv-upload"
            style={{
              background: isProcessing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: isProcessing ? 'var(--secondary-text)' : '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontFamily: 'Montserrat',
              fontWeight: '600',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'inline-block'
            }}
          >
            {isProcessing ? 'Processing...' : 'Choose CSV File'}
          </label>
        </div>

        <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', fontSize: '12px', fontStyle: 'italic' }}>
          Or upload data from the "Running Report" tab to use it here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(255, 215, 0, 0.1)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '8px'
        }}>
          <TrendingUp size={24} style={{ color: '#FFD700' }} />
          <h3 style={{ color: '#FFD700', fontFamily: 'Montserrat', margin: 0, fontSize: '18px' }}>
            Season Aggregated Report
          </h3>
        </div>
        <p style={{ color: 'var(--secondary-text)', fontFamily: 'Montserrat', fontSize: '14px', margin: 0 }}>
          Season totals with GM (games played) indicator
        </p>
      </div>

      <div style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            if (onDataUpload) {
              onDataUpload([])
            }
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
      </div>

      <ComprehensiveMatchdayReport
        runningData={seasonData}
        matchdayNumber="Season"
        selectedOpponent={selectedOpponent || "All Teams"}
        isSeasonReport={true}
        highlightOpponent={selectedOpponent}
      />
    </div>
  )
}