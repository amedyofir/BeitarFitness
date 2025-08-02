'use client'

import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import WeeklyAnalysis from './components/WeeklyAnalysis'
import AllDataView from './components/AllDataView'
import DistanceView from './components/DistanceView'
import IntensityView from './components/IntensityView'
import BarChartView from './components/BarChartView'
import LatestDataBand from './components/LatestDataBand'
import PlayersView from './components/PlayersView'
import CoachDashboard from './components/CoachDashboard'
import { Upload, BarChart3, Grid3X3, MapPin, Zap, BarChart, Users, ClipboardList, TrendingUp } from 'lucide-react'

export default function Home() {
  const [activeSection, setActiveSection] = useState<'coach-dashboard' | 'coaches' | 'players'>('coach-dashboard')
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'alldata' | 'distance' | 'intensity' | 'charts' | 'match-reports'>('charts')

  return (
    <div className="main-container">
      <nav className="navbar">
        <div className="navbar-content">
          <img 
            src="/beitar-logo.png" 
            alt="Beitar Jerusalem Logo" 
            className="navbar-logo"
          />
                      <h1 className="navbar-title">FCBJ - Scouting & Data</h1>
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
          {/* Main Section Navigation */}
          <nav className="section-nav">
            <button
              onClick={() => {
                setActiveSection('coach-dashboard')
              }}
              className={`section-button ${activeSection === 'coach-dashboard' ? 'active' : ''}`}
            >
              <TrendingUp />
              Coach Dashboard
            </button>
            <button
              onClick={() => {
                setActiveSection('coaches')
                setActiveTab('charts')
              }}
              className={`section-button ${activeSection === 'coaches' ? 'active' : ''}`}
            >
              <ClipboardList />
              Coaches
            </button>
            <button
              onClick={() => {
                setActiveSection('players')
                setActiveTab('match-reports')
              }}
              className={`section-button ${activeSection === 'players' ? 'active' : ''}`}
            >
              <Users />
              Players
            </button>
          </nav>

          {/* Coach Dashboard Section */}
          {activeSection === 'coach-dashboard' && (
            <div className="tab-content">
              <CoachDashboard />
            </div>
          )}

          {/* Coaches Section */}
          {activeSection === 'coaches' && (
            <>
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
                  Dashboard
                </button>
              </nav>

              <div className="tab-content">
                {activeTab === 'upload' && <FileUpload />}
                {activeTab === 'analysis' && <WeeklyAnalysis />}
                {activeTab === 'alldata' && <AllDataView />}
                {activeTab === 'distance' && <DistanceView />}
                {activeTab === 'intensity' && <IntensityView />}
                {activeTab === 'charts' && (
                  <>
                    <LatestDataBand />
                    <BarChartView />
                  </>
                )}
              </div>
            </>
          )}

          {/* Players Section */}
          {activeSection === 'players' && (
            <div className="tab-content">
              <PlayersView />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 