'use client'

import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import WeeklyAnalysis from './components/WeeklyAnalysis'
import { Upload, BarChart3 } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis'>('upload')

  return (
    <div className="main-container">
      <nav className="navbar">
        <div className="navbar-content">
          <img 
            src="/beitar-logo.png" 
            alt="Beitar Jerusalem Logo" 
            className="navbar-logo"
          />
          <h1 className="navbar-title">Beitar Jerusalem Data</h1>
        </div>
      </nav>
      
      <header className="header">
        <div className="header-content">
          <h1>Fitness Tracker</h1>
          <p>Advanced analytics for peak performance</p>
        </div>
      </header>

      <div className="content-container">
        <div className="glass-card">
          <nav className="tab-nav">
            <button
              onClick={() => setActiveTab('upload')}
              className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            >
              <Upload />
              Upload Data
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
            >
              <BarChart3 />
              Weekly Analysis
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === 'upload' && <FileUpload />}
            {activeTab === 'analysis' && <WeeklyAnalysis />}
          </div>
        </div>
      </div>
    </div>
  )
} 