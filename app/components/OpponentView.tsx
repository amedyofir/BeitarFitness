'use client'

import React, { useState, useEffect } from 'react'
import { Upload, FileText, PlayCircle, CheckCircle, AlertCircle, Users, Target } from 'lucide-react'
import Papa from 'papaparse'
import MatchdayReport from './MatchdayReport'
import { saveOpponentStatistics, fetchAvailableOpponents, fetchOpponentStatistics, checkOpponentDataExists, parseOpponentCsvRow } from '@/lib/opponentDataService'
import type { OpponentStatistics, OpponentMetadata } from '@/lib/opponentDataService'

interface OpponentViewProps {}

export default function OpponentView({}: OpponentViewProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [opponentName, setOpponentName] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [showReport, setShowReport] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [existingOpponents, setExistingOpponents] = useState<any[]>([])
  const [dataExists, setDataExists] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [currentReportIndex, setCurrentReportIndex] = useState(0)
  const [totalMatchdays, setTotalMatchdays] = useState<number>(1)

  // Israeli Premier League teams list
  const israeliClubs = [
    'Hapoel Be\'er Sheva',
    'Hapoel Haifa', 
    'Hapoel Jerusalem',
    'Maccabi Haifa',
    'Maccabi Tel Aviv',
    'Ashdod',
    'Beitar Jerusalem',
    'Hapoel Petah Tikva',
    'Ironi Kiryat Shmona',
    'Maccabi Netanya',
    'Hapoel Tel Aviv',
    'Bnei Sakhnin',
    'Ironi Tiberias',
    'Maccabi Bnei Raina'
  ].sort()

  const steps = [
    { number: 1, title: 'Select Opponent', icon: Target },
    { number: 2, title: 'Upload CSV', icon: Upload },
    { number: 3, title: 'Generate Report', icon: FileText },
    { number: 4, title: 'Complete', icon: CheckCircle }
  ]

  useEffect(() => {
    // Fetch existing opponents on component mount
    const loadExistingOpponents = async () => {
      try {
        const opponents = await fetchAvailableOpponents()
        console.log('Available opponents:', opponents)
        setExistingOpponents(opponents)
      } catch (error) {
        console.error('Error fetching opponents:', error)
      }
    }
    
    loadExistingOpponents()
  }, [])

  const handleOpponentSubmit = async () => {
    if (opponentName) {
      // Check if data already exists for this opponent
      const exists = await checkOpponentDataExists(opponentName)
      setDataExists(exists)
      setCurrentStep(2)
    }
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setIsProcessing(true)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        
        // Parse CSV using Papa Parse
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Opponent CSV parsing completed:', results.data)
            
            // Process opponent data using the opponent service parsing function
            const processedData = results.data.map((row: any) => parseOpponentCsvRow(row))
            setCsvData(processedData)
            
            setIsProcessing(false)
            setCurrentStep(3)
          },
          error: (error: any) => {
            console.error('Error parsing CSV:', error)
            alert('Error parsing CSV file. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
    }
  }

  const generateReport = async () => {
    setIsProcessing(true)
    setSaveError(null)
    
    try {
      // Handle opponent statistics data (aggregated across all matchdays)
      const opponentData: OpponentStatistics[] = csvData.map((row: any) => ({
        ...row,
        opponent_name: opponentName,
        season: '2025-2026',
        total_matchdays: totalMatchdays
      }))

      // Prepare opponent metadata
      const opponentMetadata: OpponentMetadata = {
        opponent_name: opponentName,
        season: '2025-2026',
        csv_filename: csvFile?.name || '',
        total_teams: opponentData.length,
        total_matchdays: totalMatchdays,
        notes: `Aggregated opponent analysis for ${opponentName} across ${totalMatchdays} matchdays`
      }

      // Save opponent data to Supabase (overwrites existing)
      await saveOpponentStatistics(opponentData, opponentMetadata)
      console.log('Successfully saved opponent statistics to Supabase')
      
      // Update existing opponents list
      try {
        const updatedOpponents = await fetchAvailableOpponents()
        setExistingOpponents(updatedOpponents)
      } catch (fetchError) {
        console.log('Note: Could not update opponents list, but data was saved successfully')
      }
      
      setIsProcessing(false)
      setShowReport(true)
      setCurrentStep(4)
    } catch (error) {
      console.error('Error saving opponent data:', error)
      setSaveError('Failed to save opponent data to database. Please try again.')
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setOpponentName('')
    setCsvFile(null)
    setCsvData([])
    setIsProcessing(false)
    setShowReport(false)
    setDataExists(false)
    setSaveError(null)
    setLoadingHistorical(false)
    setCurrentReportIndex(0)
    setTotalMatchdays(1)
  }

  const loadHistoricalReport = async (opponent: string) => {
    setLoadingHistorical(true)
    try {
      const data = await fetchOpponentStatistics(opponent)
      if (data && data.length > 0) {
        setCsvData(data)
        setOpponentName(opponent)
        setShowReport(true)
        setCurrentStep(4)
      } else {
        alert('No data found for this opponent')
      }
    } catch (error) {
      console.error('Error loading historical opponent report:', error)
      alert('Failed to load historical opponent report')
    }
    setLoadingHistorical(false)
  }

  const nextReport = () => {
    setCurrentReportIndex((prev) => (prev + 1) % existingOpponents.length)
  }

  const prevReport = () => {
    setCurrentReportIndex((prev) => (prev - 1 + existingOpponents.length) % existingOpponents.length)
  }

  const goToReport = (index: number) => {
    setCurrentReportIndex(index)
  }

  return (
    <div className="wizard-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Beitar Logo */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img 
          src="/beitar-logo.png" 
          alt="Beitar Jerusalem Logo" 
          style={{ 
            width: '80px', 
            height: '80px', 
            objectFit: 'contain',
            marginBottom: '10px' 
          }}
        />
        <h2 style={{ 
          color: '#FFD700', 
          fontFamily: 'Montserrat', 
          fontWeight: '600',
          marginBottom: '5px' 
        }}>
          Opponent Analysis
        </h2>
        <p style={{ 
          color: 'var(--secondary-text)', 
          fontSize: '14px',
          fontFamily: 'Montserrat' 
        }}>
          Analyze aggregated opponent data across all matchdays
        </p>
      </div>

      {/* Progress Steps */}
      <div className="wizard-steps" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '40px',
        gap: '20px' 
      }}>
        {steps.map((step, index) => {
          const IconComponent = step.icon
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number
          
          return (
            <div 
              key={step.number}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: isActive || isCompleted ? 1 : 0.5
              }}
            >
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: isCompleted 
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                  : isActive 
                    ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                    : 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                border: isActive ? '2px solid #FFD700' : 'none'
              }}>
                <IconComponent 
                  size={24} 
                  color={isCompleted ? '#fff' : isActive ? '#000' : '#fff'} 
                />
              </div>
              <span style={{
                fontSize: '12px',
                color: isActive ? '#FFD700' : isCompleted ? '#22c55e' : 'var(--secondary-text)',
                fontFamily: 'Montserrat',
                fontWeight: isActive ? '600' : '400',
                textAlign: 'center'
              }}>
                {step.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Historical Reports Carousel */}
      {existingOpponents.length > 0 && (
        <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ color: '#FFD700', marginBottom: '15px', fontFamily: 'Montserrat', fontSize: '16px', textAlign: 'center' }}>
            🎯 Previously Analyzed Opponents ({currentReportIndex + 1} of {existingOpponents.length})
          </h3>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Previous Arrow */}
            <button
              onClick={prevReport}
              disabled={existingOpponents.length <= 1}
              style={{
                background: existingOpponents.length <= 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 215, 0, 0.2)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: existingOpponents.length <= 1 ? 'not-allowed' : 'pointer',
                color: existingOpponents.length <= 1 ? '#666' : '#FFD700',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ←
            </button>

            {/* Current Report Card */}
            <div style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              position: 'relative'
            }}>
              {(() => {
                const opponent = existingOpponents[currentReportIndex]
                return (
                  <>
                    <h4 style={{ color: '#FFD700', margin: '0 0 8px 0', fontFamily: 'Montserrat', fontSize: '18px', fontWeight: '600' }}>
                      {opponent.opponent_name}
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                      <span style={{ 
                        background: 'rgba(34, 197, 94, 0.2)', 
                        color: '#22c55e', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '12px',
                        fontFamily: 'Montserrat',
                        fontWeight: '500'
                      }}>
                        {opponent.total_teams} Teams
                      </span>
                      <span style={{ 
                        background: 'rgba(59, 130, 246, 0.2)', 
                        color: '#3b82f6', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '12px',
                        fontFamily: 'Montserrat',
                        fontWeight: '500'
                      }}>
                        {opponent.total_matchdays} Matchdays
                      </span>
                    </div>
                    <button
                      onClick={() => loadHistoricalReport(opponent.opponent_name)}
                      disabled={loadingHistorical}
                      style={{
                        background: loadingHistorical ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                        color: loadingHistorical ? 'var(--secondary-text)' : '#000',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600',
                        cursor: loadingHistorical ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        minWidth: '120px'
                      }}
                    >
                      {loadingHistorical ? 'Loading...' : '🎯 View Analysis'}
                    </button>
                  </>
                )
              })()}
            </div>

            {/* Next Arrow */}
            <button
              onClick={nextReport}
              disabled={existingOpponents.length <= 1}
              style={{
                background: existingOpponents.length <= 1 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 215, 0, 0.2)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: existingOpponents.length <= 1 ? 'not-allowed' : 'pointer',
                color: existingOpponents.length <= 1 ? '#666' : '#FFD700',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              →
            </button>
          </div>

          {/* Dots Navigation */}
          {existingOpponents.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '15px' }}>
              {existingOpponents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToReport(index)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: 'none',
                    background: index === currentReportIndex ? '#FFD700' : 'rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step Content */}
      <div className="glass-card" style={{ padding: '30px', minHeight: '300px' }}>
        {/* Step 1: Select Opponent */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Select Opponent for Analysis
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Choose the opponent team to analyze. Upload aggregated data across all matchdays.
            </p>
            
            {/* Show existing opponents */}
            {existingOpponents.length > 0 && (
              <div style={{
                background: 'rgba(255, 215, 0, 0.05)',
                border: '1px solid rgba(255, 215, 0, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                maxWidth: '400px',
                margin: '0 auto 20px'
              }}>
                <p style={{ color: '#FFD700', fontSize: '12px', marginBottom: '8px', fontFamily: 'Montserrat' }}>
                  Previously Analyzed Opponents:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                  {existingOpponents.map(opp => (
                    <span key={opp.opponent_name} style={{
                      background: 'rgba(255, 215, 0, 0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: 'var(--primary-text)',
                      fontFamily: 'Montserrat'
                    }}>
                      {opp.opponent_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ maxWidth: '400px', margin: '0 auto', marginBottom: '30px' }}>
              <select
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--primary-text)',
                  fontSize: '14px',
                  fontFamily: 'Montserrat',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}>
                  Select opponent team
                </option>
                {israeliClubs.map(club => (
                  <option 
                    key={club} 
                    value={club}
                    style={{ background: '#1a1a1a', color: 'var(--primary-text)' }}
                  >
                    {club}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                min="1"
                max="38"
                value={totalMatchdays}
                onChange={(e) => setTotalMatchdays(parseInt(e.target.value) || 1)}
                placeholder="Number of matchdays"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--primary-text)',
                  fontSize: '16px',
                  fontFamily: 'Montserrat',
                  textAlign: 'center',
                  marginBottom: '16px'
                }}
              />
              <p style={{ 
                color: 'var(--secondary-text)', 
                fontSize: '12px', 
                fontFamily: 'Montserrat',
                fontStyle: 'italic' 
              }}>
                Enter the total number of matchdays this data represents
              </p>
            </div>
            
            <button
              onClick={handleOpponentSubmit}
              disabled={!opponentName}
              style={{
                background: opponentName
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: opponentName ? '#000' : 'var(--secondary-text)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: opponentName ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              Continue to CSV Upload
            </button>
          </div>
        )}

        {/* Step 2: Upload CSV */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Upload Opponent Data CSV
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Upload aggregated CSV data for {opponentName} across all matchdays
            </p>
            
            {dataExists && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} color="#fbbf24" />
                <p style={{ color: '#fbbf24', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Data exists for {opponentName}. New data will replace existing.
                </p>
              </div>
            )}
            
            {csvData.length > 0 && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <Users size={16} color="#22c55e" />
                <p style={{ color: '#22c55e', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Detected: Opponent Team Statistics ({csvData.length} teams)
                </p>
              </div>
            )}
            
            <div style={{
              border: '2px dashed rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '40px',
              marginBottom: '30px',
              background: 'rgba(255, 215, 0, 0.05)'
            }}>
              <Upload size={48} color="#FFD700" style={{ marginBottom: '16px' }} />
              <p style={{ color: 'var(--primary-text)', marginBottom: '16px', fontFamily: 'Montserrat' }}>
                Drag and drop your CSV file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                style={{ display: 'none' }}
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'inline-block'
                }}
              >
                Choose CSV File
              </label>
            </div>
            
            {csvFile && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#22c55e', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  ✓ {csvFile.name} uploaded successfully
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Generate Report */}
        {currentStep === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Generate Opponent Analysis
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Ready to generate comprehensive opponent analysis for {opponentName}
            </p>
            
            <div style={{ marginBottom: '30px' }}>
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#FFD700', marginBottom: '10px', fontFamily: 'Montserrat' }}>
                  Analysis Details
                </h4>
                <p style={{ color: 'var(--primary-text)', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Opponent: {opponentName}<br />
                  CSV File: {csvFile?.name}<br />
                  Data Type: Aggregated Team Statistics<br />
                  Teams: {csvData.length}<br />
                  Matchdays: {totalMatchdays}<br />
                  Season: 2025-2026<br />
                  Action: {dataExists ? 'Will overwrite existing data' : 'Will create new analysis'}
                </p>
              </div>
            </div>
            
            <button
              onClick={generateReport}
              disabled={isProcessing}
              style={{
                background: isProcessing 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: isProcessing ? 'var(--secondary-text)' : '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {isProcessing ? 'Saving & Generating Analysis...' : 'Save & Generate Analysis'}
            </button>
            
            {saveError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '20px'
              }}>
                <p style={{ color: '#ef4444', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  {saveError}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} color="#22c55e" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Opponent Analysis Generated Successfully!
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Your opponent analysis for {opponentName} has been created and saved to the database.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={resetWizard}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--primary-text)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Analyze Another Opponent
              </button>
              <button
                onClick={() => setShowReport(true)}
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#000',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                View Analysis
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Show Report */}
      {showReport && csvData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setShowReport(false)}
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
              ← Back to Opponent Analysis
            </button>
          </div>
          <MatchdayReport csvData={csvData} matchdayNumber={`${opponentName} Analysis`} isOpponentAnalysis={true} selectedOpponent={opponentName} />
        </div>
      )}
    </div>
  )
}