'use client'

import React, { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle, Users } from 'lucide-react'
import Papa from 'papaparse'
import MatchdayReport from './MatchdayReport'
import { saveOpponentStatistics, fetchAvailableOpponents, fetchAllTeamsData, fetchOpponentStatistics, fetchOpponentUploadHistory, parseOpponentCsvRow, parseOurTeamMetricsCsvRow, mergeOpponentStatistics } from '@/lib/opponentDataService'
import type { OpponentStatistics, OpponentMetadata } from '@/lib/opponentDataService'

export default function OpponentView() {
  const [currentStep, setCurrentStep] = useState(1)
  const [opponentName, setOpponentName] = useState('')
  const [csvFile1, setCsvFile1] = useState<File | null>(null)
  const [csvFile2, setCsvFile2] = useState<File | null>(null)
  const [csvData1, setCsvData1] = useState<any[]>([])
  const [csvData2, setCsvData2] = useState<any[]>([])
  const [csvData, setCsvData] = useState<any[]>([])
  const [showReport, setShowReport] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [existingOpponents, setExistingOpponents] = useState<any[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [totalMatchdays, setTotalMatchdays] = useState<number>(1)
  const [uploadHistory, setUploadHistory] = useState<any[]>([])
  const [selectedUploadDate, setSelectedUploadDate] = useState<string>('')
  const [showUploadWizard, setShowUploadWizard] = useState(false)
  const [selectedOpponent, setSelectedOpponent] = useState<string>('')

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
    { number: 1, title: 'Upload CSV', icon: Upload },
    { number: 2, title: 'Generate Report', icon: FileText },
    { number: 3, title: 'Complete', icon: CheckCircle }
  ]

  useEffect(() => {
    // Load ALL teams data from opponent_statistics on component mount
    const loadDataFromDatabase = async () => {
      try {
        // Fetch ALL teams data (not just one opponent)
        const allTeamsData = await fetchAllTeamsData()

        if (allTeamsData && allTeamsData.length > 0) {
          console.log(`✅ Loaded ${allTeamsData.length} teams from database`)

          // Show the dashboard immediately with all teams data
          setCsvData(allTeamsData)
          setOpponentName('All Teams')  // Generic name since showing all teams
          setSelectedOpponent('')  // Empty = "All Teams" selected in dropdown
          setShowReport(true)
          setCurrentStep(3)

          // Also fetch opponents list for the carousel
          const opponents = await fetchAvailableOpponents()
          setExistingOpponents(opponents)
        } else {
          console.log('No data in database - user needs to upload')
        }
      } catch (error) {
        console.error('Error loading data from database:', error)
      }
    }

    loadDataFromDatabase()
  }, [])


  const handleCsv1Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile1(file)
      setIsProcessing(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string

        // Parse CSV using Papa Parse
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Opponent CSV 1 parsing completed:', results.data)

            // Process opponent data using the opponent service parsing function
            const processedData = results.data.map((row: any) => parseOpponentCsvRow(row))
            setCsvData1(processedData)

            setIsProcessing(false)

            // If both CSVs are uploaded, merge and move to next step
            if (csvData2.length > 0) {
              const merged = mergeOpponentStatistics(processedData, csvData2)
              setCsvData(merged)
              setCurrentStep(2)
            }
          },
          error: (error: any) => {
            console.error('Error parsing CSV 1:', error)
            alert('Error parsing CSV file 1. Please check the file format.')
            setIsProcessing(false)
          }
        })
      }
      reader.readAsText(file)
    }
  }

  const handleCsv2Upload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile2(file)
      setIsProcessing(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string

        // Parse CSV using Papa Parse
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Our Team Metrics CSV 2 parsing completed:', results.data)

            // Process our team metrics data
            const processedData = results.data.map((row: any) => parseOurTeamMetricsCsvRow(row))
            setCsvData2(processedData)

            setIsProcessing(false)

            // If both CSVs are uploaded, merge and move to next step
            if (csvData1.length > 0) {
              const merged = mergeOpponentStatistics(csvData1, processedData)
              setCsvData(merged)
              setCurrentStep(2)
            }
          },
          error: (error: any) => {
            console.error('Error parsing CSV 2:', error)
            alert('Error parsing CSV file 2. Please check the file format.')
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
      // Use "All Teams" as default opponent name if none selected
      const finalOpponentName = opponentName || 'All Teams'

      // Handle opponent statistics data (aggregated across all matchdays)
      const opponentData: OpponentStatistics[] = csvData.map((row: any) => ({
        ...row,
        opponent_name: finalOpponentName,
        season: '2025-2026',
        total_matchdays: totalMatchdays
      }))

      // Prepare opponent metadata
      const opponentMetadata: OpponentMetadata = {
        opponent_name: finalOpponentName,
        season: '2025-2026',
        csv_filename: `${csvFile1?.name || 'file1.csv'} + ${csvFile2?.name || 'file2.csv'}`,
        total_teams: opponentData.length,
        total_matchdays: totalMatchdays,
        notes: `Aggregated opponent analysis for ${finalOpponentName} across ${totalMatchdays} matchdays (2 CSV files merged)`
      }

      // Save opponent data to Supabase (overwrites existing)
      await saveOpponentStatistics(opponentData, opponentMetadata)
      console.log('Successfully saved opponent statistics to Supabase')

      // Set the opponent name and show the data immediately
      setOpponentName(finalOpponentName)
      setShowReport(true)
      setCurrentStep(3)

      // Update opponents list for carousel
      const updatedOpponents = await fetchAvailableOpponents()
      setExistingOpponents(updatedOpponents)

      setIsProcessing(false)
    } catch (error) {
      console.error('Error saving opponent data:', error)
      setSaveError('Failed to save opponent data to database. Please try again.')
      setIsProcessing(false)
    }
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setOpponentName('')
    setCsvFile1(null)
    setCsvFile2(null)
    setCsvData1([])
    setCsvData2([])
    setCsvData([])
    setIsProcessing(false)
    setShowReport(false)
    setSaveError(null)
    setLoadingHistorical(false)
    setTotalMatchdays(1)
    setShowUploadWizard(false)
  }

  const loadHistoricalReport = async (opponent: string, uploadDate?: string) => {
    setLoadingHistorical(true)
    try {
      // Fetch upload history for this opponent
      const history = await fetchOpponentUploadHistory(opponent)
      setUploadHistory(history)

      // If uploadDate specified, use it. Otherwise use latest
      const targetUploadDate = uploadDate || history[0]?.upload_date

      const data = await fetchOpponentStatistics(opponent, '2025-2026', targetUploadDate)
      if (data && data.length > 0) {
        setCsvData(data)
        setOpponentName(opponent)
        setSelectedUploadDate(targetUploadDate || '')
        setShowReport(true)
        setCurrentStep(3)
      } else {
        alert('No data found for this opponent')
      }
    } catch (error) {
      console.error('Error loading historical opponent report:', error)
      alert('Failed to load historical opponent report')
    }
    setLoadingHistorical(false)
  }

  const changeUploadVersion = async (uploadDate: string) => {
    if (!opponentName) return
    setLoadingHistorical(true)
    try {
      const data = await fetchOpponentStatistics(opponentName, '2025-2026', uploadDate)
      if (data && data.length > 0) {
        setCsvData(data)
        setSelectedUploadDate(uploadDate)
      }
    } catch (error) {
      console.error('Error switching upload version:', error)
      alert('Failed to load selected upload version')
    }
    setLoadingHistorical(false)
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
        {steps.map((step) => {
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

      {/* Latest Opponent Report - Show only the most recent upload */}
      {existingOpponents.length > 0 && !showReport && (() => {
        const latestOpponent = existingOpponents[0]
        return (
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ color: '#FFD700', marginBottom: '20px', fontFamily: 'Montserrat', fontSize: '18px', textAlign: 'center' }}>
              🎯 Latest Opponent Analysis
            </h3>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '30px',
              textAlign: 'center',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <h4 style={{
                color: '#FFD700',
                margin: '0 0 16px 0',
                fontFamily: 'Montserrat',
                fontSize: '20px',
                fontWeight: '600'
              }}>
                {latestOpponent.opponent_name}
              </h4>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <span style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: '#22c55e',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'Montserrat',
                  fontWeight: '500'
                }}>
                  {latestOpponent.total_teams} Teams
                </span>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'Montserrat',
                  fontWeight: '500'
                }}>
                  {latestOpponent.total_matchdays} Matchdays
                </span>
              </div>

              <p style={{
                color: 'var(--secondary-text)',
                fontSize: '12px',
                marginBottom: '20px',
                fontFamily: 'Montserrat',
                fontStyle: 'italic'
              }}>
                Updated: {new Date(latestOpponent.upload_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>

              <button
                onClick={() => loadHistoricalReport(latestOpponent.opponent_name)}
                disabled={loadingHistorical}
                style={{
                  background: loadingHistorical ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: loadingHistorical ? 'var(--secondary-text)' : '#000',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: loadingHistorical ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  width: '100%'
                }}
              >
                {loadingHistorical ? 'Loading...' : '🎯 View Analysis'}
              </button>
            </div>

            {existingOpponents.length > 1 && (
              <p style={{
                color: 'var(--secondary-text)',
                fontSize: '12px',
                marginTop: '16px',
                fontFamily: 'Montserrat',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                {existingOpponents.length - 1} other opponent{existingOpponents.length > 2 ? 's' : ''} available
              </p>
            )}
          </div>
        )
      })()}

      {/* Upload New Data Section */}
      {!showReport && !showUploadWizard && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            onClick={() => setShowUploadWizard(true)}
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#000',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontFamily: 'Montserrat',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ➕ Upload New Opponent Analysis
          </button>
        </div>
      )}

      {/* Step Content */}
      {showUploadWizard && !showReport && (
      <div className="glass-card" style={{ padding: '30px', minHeight: '300px' }}>
        {/* Step 1: Upload CSVs */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Upload Opponent Data CSVs
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Upload 2 CSV files containing all teams data: Opponent metrics & Our team metrics
            </p>

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
                  ✓ Both CSVs merged successfully! ({csvData.length} teams)
                </p>
              </div>
            )}

            {/* CSV 1 Upload */}
            <div style={{
              border: '2px dashed rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '20px',
              background: 'rgba(255, 215, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <span style={{
                  background: '#FFD700',
                  color: '#000',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'Montserrat'
                }}>
                  CSV 1
                </span>
              </div>
              <Upload size={36} color="#FFD700" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'var(--primary-text)', marginBottom: '12px', fontFamily: 'Montserrat', fontSize: '14px' }}>
                Opponent Metrics (ppda40, poswonopponenthalf)
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsv1Upload}
                style={{ display: 'none' }}
                id="csv1-upload"
              />
              <label
                htmlFor="csv1-upload"
                style={{
                  background: csvFile1 ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: csvFile1 ? '#22c55e' : '#000',
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
                {csvFile1 ? `✓ ${csvFile1.name}` : 'Choose CSV File 1'}
              </label>
            </div>

            {/* CSV 2 Upload */}
            <div style={{
              border: '2px dashed rgba(255, 215, 0, 0.3)',
              borderRadius: '12px',
              padding: '30px',
              marginBottom: '30px',
              background: 'rgba(255, 215, 0, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <span style={{
                  background: '#FFD700',
                  color: '#000',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'Montserrat'
                }}>
                  CSV 2
                </span>
              </div>
              <Upload size={36} color="#FFD700" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'var(--primary-text)', marginBottom: '12px', fontFamily: 'Montserrat', fontSize: '14px' }}>
                Our Team Metrics (AvgSeqTime, StartA1EndA2, StartA1EndA3, SeqStartA1)
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsv2Upload}
                style={{ display: 'none' }}
                id="csv2-upload"
              />
              <label
                htmlFor="csv2-upload"
                style={{
                  background: csvFile2 ? 'rgba(34, 197, 94, 0.3)' : 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: csvFile2 ? '#22c55e' : '#000',
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
                {csvFile2 ? `✓ ${csvFile2.name}` : 'Choose CSV File 2'}
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Generate Report */}
        {currentStep === 2 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Generate Opponent Analysis
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Select a primary opponent name and specify matchdays
            </p>

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
                  Select primary opponent (optional)
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
                fontStyle: 'italic',
                marginBottom: '20px'
              }}>
                Enter the total number of matchdays this data represents
              </p>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#FFD700', marginBottom: '10px', fontFamily: 'Montserrat' }}>
                  Upload Summary
                </h4>
                <p style={{ color: 'var(--primary-text)', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Primary Opponent: {opponentName || 'All Teams'}<br />
                  CSV File 1: {csvFile1?.name}<br />
                  CSV File 2: {csvFile2?.name}<br />
                  Total Teams: {csvData.length}<br />
                  Matchdays: {totalMatchdays}<br />
                  Season: 2025-2026
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

        {/* Step 3: Complete */}
        {currentStep === 3 && (
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
      )}

      {/* Show Report */}
      {showReport && csvData.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
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

            {/* Opponent Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{
                color: 'var(--primary-text)',
                fontSize: '14px',
                fontFamily: 'Montserrat',
                fontWeight: '600'
              }}>
                🎯 Focus on opponent:
              </label>
              <select
                value={selectedOpponent}
                onChange={(e) => setSelectedOpponent(e.target.value)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--primary-text)',
                  fontSize: '14px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '200px'
                }}
              >
                <option value="">All Teams</option>
                {csvData.map((team: any) => {
                  const teamName = team.Team || team.team_full_name || team.teamFullName || 'Unknown'
                  return (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Upload History Selector */}
            {uploadHistory.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{
                  color: 'var(--primary-text)',
                  fontSize: '14px',
                  fontFamily: 'Montserrat',
                  fontWeight: '600'
                }}>
                  📅 Upload Version:
                </label>
                <select
                  value={selectedUploadDate}
                  onChange={(e) => changeUploadVersion(e.target.value)}
                  disabled={loadingHistorical}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--primary-text)',
                    fontSize: '14px',
                    fontFamily: 'Montserrat',
                    fontWeight: '600',
                    cursor: loadingHistorical ? 'not-allowed' : 'pointer',
                    minWidth: '200px'
                  }}
                >
                  {uploadHistory.map((upload, index) => (
                    <option key={upload.upload_date} value={upload.upload_date}>
                      {index === 0 && '🆕 '}
                      {new Date(upload.upload_date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {' '}({upload.total_matchdays} MD)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {uploadHistory.length > 1 && (
              <span style={{
                color: 'var(--secondary-text)',
                fontSize: '12px',
                fontFamily: 'Montserrat',
                fontStyle: 'italic'
              }}>
                {uploadHistory.length} uploads available
              </span>
            )}
          </div>
          <MatchdayReport csvData={csvData} matchdayNumber={`${opponentName} Analysis`} isOpponentAnalysis={true} selectedOpponent={selectedOpponent} />
        </div>
      )}
    </div>
  )
}