'use client'

import React, { useState } from 'react'
import MatchUpload from './MatchUpload'
import MatchReports from './MatchReports'
import PlayerAnalysis from './PlayerAnalysis'
import { Upload, Trophy, TrendingUp } from 'lucide-react'

export default function PlayersView() {
  const [activePlayerTab, setActivePlayerTab] = useState<'upload' | 'reports' | 'analysis'>('upload')

  return (
    <div className="players-view">
      <div className="players-header">
        <h2>Players Dashboard</h2>
        <p>Match analysis and performance tracking</p>
      </div>

      <nav className="players-tab-nav">
        <button
          onClick={() => setActivePlayerTab('upload')}
          className={`tab-button ${activePlayerTab === 'upload' ? 'active' : ''}`}
        >
          <Upload />
          Upload Match Data
        </button>
        <button
          onClick={() => setActivePlayerTab('reports')}
          className={`tab-button ${activePlayerTab === 'reports' ? 'active' : ''}`}
        >
          <Trophy />
          Match Reports
        </button>
        <button
          onClick={() => setActivePlayerTab('analysis')}
          className={`tab-button ${activePlayerTab === 'analysis' ? 'active' : ''}`}
        >
          <TrendingUp />
          Player Analysis
        </button>
      </nav>

      <div className="players-tab-content">
        {activePlayerTab === 'upload' && <MatchUpload />}
        {activePlayerTab === 'reports' && <MatchReports />}
        {activePlayerTab === 'analysis' && <PlayerAnalysis />}
      </div>
    </div>
  )
} 