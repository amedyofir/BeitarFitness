'use client'

import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import WeeklyAnalysis from './components/WeeklyAnalysis'
import AllDataView from './components/AllDataView'
import DistanceView from './components/DistanceView'
import IntensityView from './components/IntensityView'
import BarChartView from './components/BarChartView'
import { Upload, BarChart3, Grid3X3, MapPin, Zap, BarChart } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'alldata' | 'distance' | 'intensity' | 'charts'>('upload')

  return (
    <div className="main-container">
      <nav className="navbar">
        <div className="navbar-content">
          <img 
            src="/beitar-logo.png" 
            alt="Beitar Jerusalem Logo" 
            className="navbar-logo"
          />
          <h1 className="navbar-title">Beitar Jerusalem Scouting & Data</h1>
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
            <button
              onClick={() => setActiveTab('alldata')}
              className={`tab-button ${activeTab === 'alldata' ? 'active' : ''}`}
            >
              <Grid3X3 />
              All Data
            </button>
            <button
              onClick={() => setActiveTab('distance')}
              className={`tab-button ${activeTab === 'distance' ? 'active' : ''}`}
            >
              <MapPin />
              Distance Only
            </button>
            <button
              onClick={() => setActiveTab('intensity')}
              className={`tab-button ${activeTab === 'intensity' ? 'active' : ''}`}
            >
              <Zap />
              Intensity Only
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}
            >
              <BarChart />
              Bar Charts
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === 'upload' && <FileUpload />}
            {activeTab === 'analysis' && <WeeklyAnalysis />}
            {activeTab === 'alldata' && <AllDataView />}
            {activeTab === 'distance' && <DistanceView />}
            {activeTab === 'intensity' && <IntensityView />}
            {activeTab === 'charts' && <BarChartView />}
          </div>
        </div>
      </div>
    </div>
  )
} 