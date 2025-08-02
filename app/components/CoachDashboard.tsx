'use client'

import React, { useState } from 'react'
import MatchReports from './MatchReports'
import WeeklyAnalysis from './WeeklyAnalysis'
import LatestDataBand from './LatestDataBand'
import BarChartView from './BarChartView'
import { BarChart3, Trophy } from 'lucide-react'

export default function CoachDashboard() {
  const [activeCoachTab, setActiveCoachTab] = useState<'weekly-running' | 'match-reports'>('weekly-running')

  return (
    <div className="coach-dashboard">
      <div className="coach-dashboard-header">
        <h2>Coach Dashboard</h2>
        <p>Comprehensive view of team performance and analytics</p>
      </div>

      <nav className="coach-tab-nav">
        <button
          onClick={() => setActiveCoachTab('weekly-running')}
          className={`tab-button ${activeCoachTab === 'weekly-running' ? 'active' : ''}`}
        >
          <BarChart3 />
          Weekly Running
        </button>
        <button
          onClick={() => setActiveCoachTab('match-reports')}
          className={`tab-button ${activeCoachTab === 'match-reports' ? 'active' : ''}`}
        >
          <Trophy />
          Match Reports
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
      </div>
    </div>
  )
} 