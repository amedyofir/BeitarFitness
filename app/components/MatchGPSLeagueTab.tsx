'use client'

import React, { useState } from 'react'
import RunningReportDashboard from './RunningReportDashboard'
import TeamAverageReport from './TeamAverageReport'

export default function MatchGPSLeagueTab() {
  const [viewMode, setViewMode] = useState<'saved-reports' | 'aggregated'>('saved-reports')

  return (
    <div className="match-gps-league-container">
      {/* Compact Header with Selector */}
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h3 style={{ 
            color: '#FFD700', 
            margin: '0', 
            fontFamily: 'Montserrat',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            📊 GPS Match League
          </h3>
          
          {/* Compact View Mode Selector */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'saved-reports' | 'aggregated')}
            style={{
              background: viewMode === 'aggregated' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${viewMode === 'aggregated' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 215, 0, 0.3)'}`,
              borderRadius: '6px',
              padding: '6px 30px 6px 10px',
              color: viewMode === 'aggregated' ? '#22c55e' : 'var(--primary-text)',
              fontFamily: 'Montserrat',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23FFD700' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
              backgroundSize: '16px'
            }}
          >
            <option value="saved-reports" style={{ background: '#1a1a1a' }}>
              Individual Matches
            </option>
            <option value="aggregated" style={{ background: '#1a1a1a' }}>
              Season Average
            </option>
          </select>
        </div>
      </div>

      {/* Content Area - Use the same components as League tab */}
      {viewMode === 'saved-reports' ? (
        <RunningReportDashboard />
      ) : (
        <TeamAverageReport />
      )}
    </div>
  )
}