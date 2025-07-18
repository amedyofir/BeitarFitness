'use client'

import React, { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { supabase, WeeklyLoadData } from '../../lib/supabase'

interface UploadStatus {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  recordsUploaded?: number
  filesProcessed?: number
  totalFiles?: number
  currentFile?: string
}

// Add date conversion function for Israeli date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
const convertIsraeliDate = (israeliDate: string): string => {
  if (!israeliDate || typeof israeliDate !== 'string') {
    return ''
  }
  
  // Expected format: DD/MM/YYYY
  const dateParts = israeliDate.trim().split('/')
  if (dateParts.length !== 3) {
    return ''
  }
  
  const day = dateParts[0].padStart(2, '0')
  const month = dateParts[1].padStart(2, '0')
  const year = dateParts[2]
  
  // Convert to ISO format: YYYY-MM-DD
  return `${year}-${month}-${day}`
}

export default function FileUpload() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const [recentFiles, setRecentFiles] = useState<string[]>([])
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null)

  const handleDrag = (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: any) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[]
      handleFiles(files)
    }
  }

  const handleFileInput = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[]
      handleFiles(files)
    }
  }

  const parseCSVData = (data: any[]): WeeklyLoadData[] => {
    // Start from row 11 (index 10) as specified by user
    const dataRows = data.slice(10)
    
    return dataRows.map((row: any) => ({
      player_name: row[0] || '',
      period_name: row[1] || '',
      period_number: parseInt(row[2]) || 0,
      date: convertIsraeliDate(row[3]) || '',
      day_name: row[4] || '',
      activity_name: row[5] || '',
      total_duration: row[6] || '',
      total_distance: parseFloat(row[7]) || 0,
      maximum_velocity: parseFloat(row[8]) || 0,
      acceleration_b3_efforts_gen2: parseInt(row[9]) || 0,
      deceleration_b3_efforts_gen2: parseInt(row[10]) || 0,
      rhie_total_bouts: parseInt(row[11]) || 0,
      meterage_per_minute: parseFloat(row[12]) || 0,
      high_speed_running_total_distance_b6: parseFloat(row[13]) || 0,
      velocity_b4_plus_total_efforts_gen2: parseInt(row[14]) || 0,
      very_high_speed_running_total_distance_b7: parseFloat(row[15]) || 0,
      running_imbalance: parseFloat(row[16]) || 0,
      hmld_gen2: parseFloat(row[17]) || 0,
      hmld_per_min_gen2: parseFloat(row[18]) || 0,
      target_km: parseInt(row[19]) || 0,
      target_intensity: parseFloat(row[20]) || 0,
      notes: row[21] || ''
    })).filter(record => record.player_name && record.date && (record.period_name === 'Session' || record.period_name === 'NOTE_ONLY')) // Filter out empty rows and include Session and NOTE_ONLY records
  }

  const handleFiles = async (files: File[]) => {
    // Filter out non-CSV files
    const csvFiles = files.filter(file => file.name.endsWith('.csv'))
    
    if (csvFiles.length === 0) {
      setUploadStatus({
        status: 'error',
        message: 'Please upload CSV files only'
      })
      return
    }

    if (csvFiles.length !== files.length) {
      console.warn(`Filtered out ${files.length - csvFiles.length} non-CSV files`)
    }

    setUploadStatus({
      status: 'uploading',
      message: 'Processing files...',
      totalFiles: csvFiles.length,
      filesProcessed: 0
    })

    let totalRecords = 0
    let processedFiles = 0

    for (let i = 0; i < csvFiles.length; i++) {
      const file = csvFiles[i]
      
      setUploadStatus(prev => ({
        ...prev,
        currentFile: file.name,
        message: `Processing file ${i + 1} of ${csvFiles.length}: ${file.name}`
      }))

      try {
        const records = await processFile(file)
        
        if (records.length > 0) {
          // Upload to Supabase
          const { data, error } = await supabase
            .from('weekly_load')
            .insert(records)

          if (error) {
            console.error('Supabase error for file', file.name, ':', error)
            setUploadStatus({
              status: 'error',
              message: `Database error in file "${file.name}": ${error.message}`
            })
            return
          }
          
          totalRecords += records.length
        }
        
        processedFiles++
        setUploadStatus(prev => ({
          ...prev,
          filesProcessed: processedFiles
        }))
        
      } catch (error) {
        console.error('Processing error for file', file.name, ':', error)
        setUploadStatus({
          status: 'error',
          message: `Error processing file "${file.name}". Please check the file format.`
        })
        return
      }
    }

    // Store the recent files and upload time
    setRecentFiles(csvFiles.map(file => file.name))
    setLastUploadTime(new Date())

    setUploadStatus({
      status: 'success',
      message: `Successfully uploaded ${csvFiles.length} file(s)!`,
      recordsUploaded: totalRecords,
      filesProcessed: csvFiles.length,
      totalFiles: csvFiles.length
    })
  }

  const processFile = async (file: File): Promise<WeeklyLoadData[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          try {
            const parsedData = parseCSVData(results.data)
            resolve(parsedData)
          } catch (error) {
            reject(error)
          }
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  }



  const resetUpload = () => {
    setUploadStatus({
      status: 'idle',
      message: ''
    })
    // Don't clear recent files - keep them visible for reference
  }

  return (
    <div className="upload-section">
      <h2>Upload Fitness Data</h2>
      <p>
        Upload your CSV file with fitness data. The system will automatically parse data starting from row 11.
      </p>

      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploadStatus.status === 'idle' && (
          <>
            <Upload />
            <h3>Drop your CSV files here, or click to browse</h3>
            <p>Supports multiple CSV files with fitness data</p>
            <input
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileInput}
              id="file-upload"
            />
            <label htmlFor="file-upload" className="file-input-label">
              Choose File
            </label>
          </>
        )}

        {uploadStatus.status === 'uploading' && (
          <div className="status-message uploading">
            <Loader2 />
            <h3>{uploadStatus.message}</h3>
          </div>
        )}

        {uploadStatus.status === 'success' && (
          <div className="status-message success">
            <CheckCircle />
            <h3>{uploadStatus.message}</h3>
            <p>{uploadStatus.recordsUploaded} records from {uploadStatus.filesProcessed} file(s) uploaded</p>
            <button onClick={resetUpload} className="btn btn-success">
              Upload More Files
            </button>
          </div>
        )}

        {uploadStatus.status === 'error' && (
          <div className="status-message error">
            <AlertCircle />
            <h3>Upload Failed</h3>
            <p>{uploadStatus.message}</p>
            <button onClick={resetUpload} className="btn btn-danger">
              Try Again
            </button>
          </div>
        )}
      </div>

      {recentFiles.length > 0 && lastUploadTime && (
        <div className="recent-files-section">
          <h4>Recent Upload:</h4>
          <div className="recent-files-info">
            <p className="upload-time">
              <strong>Uploaded:</strong> {lastUploadTime.toLocaleDateString()} at {lastUploadTime.toLocaleTimeString()}
            </p>
            <div className="file-list">
              <strong>Files:</strong>
              <ul>
                {recentFiles.map((fileName, index) => (
                  <li key={index} className="file-item">
                    📄 {fileName}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="notes-section">
        <h4>Important Notes:</h4>
        <ul>
          <li>Data parsing starts from row 11 (row 10 contains headers)</li>
          <li>Supports multiple CSV files - select multiple or drag multiple files</li>
          <li>Column 22 (index 21) is used for player notes/explanations</li>
          <li>All uploaded data is stored in the database</li>
          <li>Each upload represents a new session</li>
          <li>Make sure your CSV follows the expected format</li>
        </ul>
      </div>
    </div>
  )
} 