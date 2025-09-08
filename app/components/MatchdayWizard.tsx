'use client'

import React, { useState } from 'react'
import { Upload, FileText, PlayCircle, CheckCircle } from 'lucide-react'
import Papa from 'papaparse'
import MatchdayReport from './MatchdayReport'

interface MatchdayWizardProps {}

export default function MatchdayWizard({}: MatchdayWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [matchdayNumber, setMatchdayNumber] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [showReport, setShowReport] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const steps = [
    { number: 1, title: 'Select Matchday', icon: PlayCircle },
    { number: 2, title: 'Upload CSV', icon: Upload },
    { number: 3, title: 'Generate Report', icon: FileText },
    { number: 4, title: 'Complete', icon: CheckCircle }
  ]

  const handleMatchdaySubmit = () => {
    if (matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36) {
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
            console.log('CSV parsing completed:', results.data)
            
            // Convert numeric strings to numbers for calculations
            const processedData = results.data.map((row: any) => {
              const processedRow: any = { ...row }
              
              // Convert numeric fields
              const numericFields = [
                'Rank', 'poswonopponenthalf', 'AvgSeqTime', 'ppda40', 'ground_duels',
                'dribblesuccessful', 'TouchOpBox', 'Touches', 'ExpG', 'xA',
                'passfromassisttogolden', 'ShtIncBl', 'SOG', 'shotfromgolden',
                'shotfrombox', 'SOG_from_box', 'SOG_from_penalty_area', 'xG',
                'Starta1enda2/', 'Starta1enda3/', 'Starta1endbox/', 'Starta2enda3/',
                'Starta2endbox/', 'Starta3endbox /', 'SeqStartA1', 'SeqStartMid3rd',
                'SeqStartAtt3rd'
              ]
              
              numericFields.forEach(field => {
                if (processedRow[field] && !isNaN(parseFloat(processedRow[field]))) {
                  processedRow[field] = parseFloat(processedRow[field])
                }
              })
              
              return processedRow
            })
            
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
    // Show the actual report
    setTimeout(() => {
      setIsProcessing(false)
      setShowReport(true)
      setCurrentStep(4)
    }, 1000)
  }

  const resetWizard = () => {
    setCurrentStep(1)
    setMatchdayNumber('')
    setCsvFile(null)
    setCsvData([])
    setIsProcessing(false)
    setShowReport(false)
  }

  return (
    <div className="wizard-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Beitar Logo */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img 
          src="/Beitarlogo.png" 
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
          Matchday Football Stats Wizard
        </h2>
        <p style={{ 
          color: 'var(--secondary-text)', 
          fontSize: '14px',
          fontFamily: 'Montserrat' 
        }}>
          Create detailed matchday reports from your CSV data
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

      {/* Step Content */}
      <div className="glass-card" style={{ padding: '30px', minHeight: '300px' }}>
        {/* Step 1: Select Matchday */}
        {currentStep === 1 && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Select Matchday Number
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Choose the matchday number for your football stats report (1-36)
            </p>
            
            <div style={{ maxWidth: '200px', margin: '0 auto', marginBottom: '30px' }}>
              <input
                type="number"
                min="1"
                max="36"
                value={matchdayNumber}
                onChange={(e) => setMatchdayNumber(e.target.value)}
                placeholder="Enter matchday number"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--primary-text)',
                  fontSize: '16px',
                  fontFamily: 'Montserrat',
                  textAlign: 'center'
                }}
              />
            </div>
            
            <button
              onClick={handleMatchdaySubmit}
              disabled={!matchdayNumber || parseInt(matchdayNumber) < 1 || parseInt(matchdayNumber) > 36}
              style={{
                background: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36 
                  ? '#000' 
                  : 'var(--secondary-text)',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                cursor: matchdayNumber && parseInt(matchdayNumber) >= 1 && parseInt(matchdayNumber) <= 36 
                  ? 'pointer' 
                  : 'not-allowed',
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
              Upload Football Stats CSV
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Upload your matchday {matchdayNumber} CSV file containing player and team statistics
            </p>
            
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
              Generate Matchday Report
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Ready to generate your comprehensive matchday {matchdayNumber} report
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
                  Report Details
                </h4>
                <p style={{ color: 'var(--primary-text)', fontSize: '14px', fontFamily: 'Montserrat' }}>
                  Matchday: {matchdayNumber}<br />
                  CSV File: {csvFile?.name}<br />
                  Data Points: Ready for processing
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
              {isProcessing ? 'Generating Report...' : 'Generate Report'}
            </button>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={64} color="#22c55e" style={{ marginBottom: '20px' }} />
            <h3 style={{ color: 'var(--primary-text)', marginBottom: '20px', fontFamily: 'Montserrat' }}>
              Report Generated Successfully!
            </h3>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '30px', fontFamily: 'Montserrat' }}>
              Your matchday {matchdayNumber} football stats report has been created and is ready for analysis.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
                Create New Report
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
                View Report
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
              ← Back to Wizard
            </button>
          </div>
          <MatchdayReport csvData={csvData} matchdayNumber={matchdayNumber} />
        </div>
      )}
    </div>
  )
}