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
import League from './components/League'
import MatchdayWizard from './components/MatchdayWizard'
import OpponentView from './components/OpponentView'
import DietitianDashboard from './components/DietitianDashboard'
import CornersView from './components/CornersView'
import OptaScore from './components/OptaScore'
import { Upload, BarChart3, Grid3X3, MapPin, Zap, BarChart, Users, ClipboardList, TrendingUp, Trophy, FileText, Scale, Settings, Lock, Target, Flag, Award } from 'lucide-react'

export default function Home() {
  const [activeSection, setActiveSection] = useState<'coach-dashboard' | 'developer'>('coach-dashboard')
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis' | 'alldata' | 'distance' | 'intensity' | 'charts' | 'match-reports'>('charts')
  const [developerSection, setDeveloperSection] = useState<'coaches' | 'players' | 'league' | 'matchday-wizard' | 'opponent-view' | 'dietitian' | 'corners' | 'opta-score'>('coaches')
  const [showDeveloperAccess, setShowDeveloperAccess] = useState(false)

  return (
    <div className="main-container">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-center">
            <img
              src="/beitar-logo.png"
              alt="Beitar Jerusalem Logo"
              className="navbar-logo"
            />
            <h1 className="navbar-title">FCBJ DATA</h1>
          </div>
          <div className="navbar-right">
            <button
              onClick={() => {
                if (!showDeveloperAccess) {
                  setShowDeveloperAccess(true)
                  setActiveSection('developer')
                } else if (activeSection === 'developer') {
                  setShowDeveloperAccess(false)
                  setActiveSection('coach-dashboard')
                } else {
                  setActiveSection('developer')
                }
              }}
              className={`developer-access-btn ${showDeveloperAccess ? 'developer-unlocked' : 'developer-locked'}`}
            >
              {!showDeveloperAccess ? <Lock size={16} /> : <Settings size={16} />}
              {!showDeveloperAccess ? 'Developer' : 'Dev Mode'}
            </button>
          </div>
        </div>
      </nav>
      
      <header className="header">
        <div className="header-content">
          <div className="header-badge">
            <span className="header-team">Beitar Jerusalem</span>
            <span className="header-divider">|</span>
            <span className="header-platform">Data Platform</span>
          </div>
        </div>
      </header>

      <div className="content-container">
        <div className="glass-card">

          {/* Coach Dashboard Section */}
          {activeSection === 'coach-dashboard' && (
            <div className="tab-content">
              <CoachDashboard />
            </div>
          )}

          {/* Developer Section */}
          {activeSection === 'developer' && showDeveloperAccess && (
            <>
              {/* Developer Section Navigation */}
              <nav className="section-nav developer-nav">
                <button
                  onClick={() => {
                    setDeveloperSection('coaches')
                    setActiveTab('charts')
                  }}
                  className={`section-button ${developerSection === 'coaches' ? 'active' : ''}`}
                >
                  <ClipboardList />
                  Coaches Tools
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('players')
                  }}
                  className={`section-button ${developerSection === 'players' ? 'active' : ''}`}
                >
                  <Users />
                  Players
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('league')
                  }}
                  className={`section-button ${developerSection === 'league' ? 'active' : ''}`}
                >
                  <Trophy />
                  League
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('matchday-wizard')
                  }}
                  className={`section-button ${developerSection === 'matchday-wizard' ? 'active' : ''}`}
                >
                  <FileText />
                  Matchday Wizard
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('opponent-view')
                  }}
                  className={`section-button ${developerSection === 'opponent-view' ? 'active' : ''}`}
                >
                  <Target />
                  Opponent View
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('dietitian')
                  }}
                  className={`section-button ${developerSection === 'dietitian' ? 'active' : ''}`}
                >
                  <Scale />
                  Dietitian
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('corners')
                  }}
                  className={`section-button ${developerSection === 'corners' ? 'active' : ''}`}
                >
                  <Flag />
                  Corners
                </button>
                <button
                  onClick={() => {
                    setDeveloperSection('opta-score')
                  }}
                  className={`section-button ${developerSection === 'opta-score' ? 'active' : ''}`}
                >
                  <Award />
                  Opta Score
                </button>
              </nav>

              {/* Coaches Tools Section */}
              {developerSection === 'coaches' && (
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
              {developerSection === 'players' && (
                <div className="tab-content">
                  <PlayersView />
                </div>
              )}

              {/* League Section */}
              {developerSection === 'league' && (
                <div className="tab-content">
                  <League />
                </div>
              )}

              {/* Matchday Wizard Section */}
              {developerSection === 'matchday-wizard' && (
                <div className="tab-content">
                  <MatchdayWizard />
                </div>
              )}

              {/* Opponent View Section */}
              {developerSection === 'opponent-view' && (
                <div className="tab-content">
                  <OpponentView />
                </div>
              )}

              {/* Dietitian Section */}
              {developerSection === 'dietitian' && (
                <div className="tab-content">
                  <DietitianDashboard />
                </div>
              )}

              {/* Corners Section */}
              {developerSection === 'corners' && (
                <div className="tab-content">
                  <CornersView />
                </div>
              )}

              {/* Opta Score Section */}
              {developerSection === 'opta-score' && (
                <div className="tab-content">
                  <OptaScore />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 