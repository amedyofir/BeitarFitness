'use client'

import React from 'react'
import { Download } from 'lucide-react'
import { completeWhatsAppExport } from '../../utils/whatsappPngExport'

interface WhatsAppOptimizedReportProps {
  csvData: any[]
  matchdayNumber: string
}

export default function WhatsAppOptimizedReport({ csvData, matchdayNumber }: WhatsAppOptimizedReportProps) {
  if (!csvData || csvData.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#fff' }}>
        <p>No data available for Matchday {matchdayNumber}</p>
      </div>
    )
  }

  const downloadWhatsAppReport = async () => {
    const reportElement = document.getElementById('whatsapp-report-container')
    if (!reportElement) {
      alert('Report container not found')
      return
    }

    await completeWhatsAppExport(
      reportElement, 
      `Matchday_${matchdayNumber}`,
      {
        backgroundColor: '#0b0b0f',
        targetWidth: 1600,
        compressionQuality: 0.95
      }
    )
  }

  // Sort teams by rank
  const sortedTeams = [...csvData].sort((a, b) => parseInt(a.Rank) - parseInt(b.Rank))

  // Calculate Press Scores
  const calculatePressScores = () => {
    const ppda40Values = sortedTeams.map(t => parseFloat(t.ppda40) || 0)
    const avgSeqTimeValues = sortedTeams.map(t => parseFloat(t.AvgSeqTime) || 0)
    const posWonValues = sortedTeams.map(t => parseFloat(t.poswonopponenthalf) || 0)

    const ppda40Min = Math.min(...ppda40Values)
    const ppda40Max = Math.max(...ppda40Values)
    const avgSeqMin = Math.min(...avgSeqTimeValues)
    const avgSeqMax = Math.max(...avgSeqTimeValues)
    const posWonMin = Math.min(...posWonValues)
    const posWonMax = Math.max(...posWonValues)

    return sortedTeams.map(team => {
      const ppda40 = parseFloat(team.ppda40) || 0
      const avgSeq = parseFloat(team.AvgSeqTime) || 0
      const posWon = parseFloat(team.poswonopponenthalf) || 0

      const ppda40Score = ppda40Max > ppda40Min ? 
        ((ppda40Max - ppda40) / (ppda40Max - ppda40Min)) * 99 + 1 : 50
      const avgSeqScore = avgSeqMax > avgSeqMin ? 
        ((avgSeqMax - avgSeq) / (avgSeqMax - avgSeqMin)) * 99 + 1 : 50
      const posWonScore = posWonMax > posWonMin ? 
        ((posWon - posWonMin) / (posWonMax - posWonMin)) * 99 + 1 : 50

      const pressScore = (ppda40Score + avgSeqScore + posWonScore) / 3

      return { ...team, ppda40Score, avgSeqScore, posWonScore, pressScore }
    })
  }

  const teamsWithPressScores = calculatePressScores().sort((a, b) => b.pressScore - a.pressScore)

  const getScoreColor = (score: number) => {
    if (score >= 66) return '#22c55e' // Green
    if (score >= 33) return '#f59e0b' // Orange  
    return '#ef4444' // Red
  }

  const renderProgressBar = (score: number, displayValue: string) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      gap: '12px',
      justifyContent: 'center',
      minWidth: '200px'
    }}>
      <div style={{
        width: '80px',
        height: '16px',
        background: '#333',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: `${Math.min(score, 100)}%`,
          height: '100%',
          background: getScoreColor(score),
          borderRadius: '8px'
        }} />
      </div>
      <span style={{ 
        color: getScoreColor(score),
        fontSize: '14px',
        fontWeight: '700',
        minWidth: '60px',
        textAlign: 'center'
      }}>
        {displayValue}
      </span>
    </div>
  )

  return (
    <div style={{ position: 'relative', background: '#0b0b0f', minHeight: '100vh' }}>
      {/* Download Button */}
      <button
        onClick={downloadWhatsAppReport}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: '#FFD700',
          borderRadius: '8px',
          padding: '12px',
          cursor: 'pointer',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#000',
          fontWeight: '600'
        }}
      >
        <Download size={20} />
        WhatsApp Export
      </button>

      {/* Main Report Container - Optimized for WhatsApp */}
      <div 
        id="whatsapp-report-container" 
        style={{
          background: '#0b0b0f',
          padding: '32px',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          width: '1600px',
          minWidth: '1600px',
          maxWidth: '1600px',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1f2e 0%, #0a0a0a 100%)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid #333',
          textAlign: 'center'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '12px', 
            marginBottom: '16px' 
          }}>
            <img src="/beitar-logo.png" alt="Beitar Logo" style={{ width: '32px', height: '32px' }} />
            <span style={{ color: '#FFD700', fontSize: '16px', fontWeight: '700' }}>FCBJ DATA</span>
          </div>
          
          <h1 style={{ 
            color: '#FFD700', 
            fontSize: '28px', 
            fontWeight: '800',
            margin: '0',
            letterSpacing: '1px'
          }}>
            Matchday {matchdayNumber} Report
          </h1>
        </div>

        {/* Press Metrics Section */}
        <div style={{ 
          background: '#111',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '2px solid #333'
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            color: '#FFD700', 
            marginBottom: '20px', 
            textAlign: 'center',
            fontWeight: '700'
          }}>
            ⚡ Press Metrics & Scoring
          </h2>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '60px 1fr 180px 140px 140px 140px',
            gap: '16px',
            alignItems: 'center'
          }}>
            {/* Headers */}
            <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', textAlign: 'center' }}>RANK</div>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>TEAM</div>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', textAlign: 'center' }}>PRESS SCORE</div>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', textAlign: 'center' }}>חילוצי כדור<br/>בחצי היריבה</div>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', textAlign: 'center' }}>זמן יריבה<br/>עם הכדור</div>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: '600', textAlign: 'center' }}>PPDA40</div>
            
            {/* Separator Line */}
            <div style={{ gridColumn: '1 / -1', height: '1px', background: '#333', margin: '8px 0' }} />
            
            {/* Data Rows */}
            {teamsWithPressScores.map((team, index) => {
              const isBeitar = team.Team?.toLowerCase().includes('beitar')
              
              return (
                <React.Fragment key={team.teamId}>
                  <div style={{ 
                    fontSize: '14px',
                    color: isBeitar ? '#FFD700' : '#fff',
                    fontWeight: '700',
                    textAlign: 'center'
                  }}>
                    {index + 1}
                  </div>
                  
                  <div style={{ 
                    fontSize: '14px',
                    color: isBeitar ? '#FFD700' : '#fff', 
                    fontWeight: isBeitar ? '700' : '500',
                    padding: '8px 0'
                  }}>
                    {team.Team}
                  </div>
                  
                  <div>
                    {renderProgressBar(team.pressScore, `${team.pressScore.toFixed(0)}`)}
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center',
                    fontSize: '14px',
                    color: getScoreColor(team.posWonScore),
                    fontWeight: '600'
                  }}>
                    {team.poswonopponenthalf || 0}<br/>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>({team.posWonScore.toFixed(0)})</span>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center',
                    fontSize: '14px',
                    color: getScoreColor(team.avgSeqScore),
                    fontWeight: '600'
                  }}>
                    {parseFloat(team.AvgSeqTime || 0).toFixed(1)}s<br/>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>({team.avgSeqScore.toFixed(0)})</span>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center',
                    fontSize: '14px',
                    color: getScoreColor(team.ppda40Score),
                    fontWeight: '600'
                  }}>
                    {parseFloat(team.ppda40 || 0).toFixed(2)}<br/>
                    <span style={{ fontSize: '11px', opacity: 0.8 }}>({team.ppda40Score.toFixed(0)})</span>
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1', height: '1px', background: '#222', margin: '4px 0' }} />
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '16px',
          fontSize: '12px',
          color: '#666',
          borderTop: '1px solid #333'
        }}>
          Generated with FCBJ Data Analytics • Optimized for WhatsApp Sharing
        </div>
      </div>
    </div>
  )
}