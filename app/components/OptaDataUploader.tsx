'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, Check, X, AlertCircle } from 'lucide-react'

interface OptaDataUploaderProps {
  onUploadComplete?: () => void
}

export default function OptaDataUploader({ onUploadComplete }: OptaDataUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',')
    const data = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',')
        const row: any = {}

        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || null
        })

        data.push(row)
      }
    }

    return data
  }

  const mapPlayerObjectData = (optaRow: any) => {
    return {
      playerId: optaRow.playerId,
      FullName: optaRow.playerFullName || optaRow.Player,
      Team: optaRow.newestTeam || optaRow.teamName,
      Full_Position: optaRow.Position,
      Position: optaRow.pos,
      firstName: optaRow.firstName,
      lastName: optaRow.lastName,
      profile_pic_supabase_url: optaRow.playerImageId ? `https://images.optasports.com/football/players/${optaRow.playerImageId}.png` : null
    }
  }

  const cleanNumericValue = (value: string | number | null): number | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'number') return value

    // Remove % sign and convert to number
    const cleanValue = value.toString().replace('%', '').trim()
    if (cleanValue === '' || cleanValue === '-') return null

    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? null : parsed
  }

  const mapCsvData = (optaRow: any, filename: string) => {
    return {
      playerId: optaRow.playerId,
      csv_filename: filename,
      season: '2025-2026',

      // Identity data
      Rank: cleanNumericValue(optaRow.Rank),
      playerImageId: optaRow.playerImageId || null,
      Player: optaRow.Player || null,
      playerFullName: optaRow.playerFullName || null,
      pos: optaRow.pos || null,
      teamImageId: optaRow.teamImageId || null,
      teamName: optaRow.teamName || null,
      teamShortName: optaRow.teamShortName || null,
      teamAbbrevName: optaRow.teamAbbrevName || null,
      newestTeamId: optaRow.newestTeamId || null,
      newestTeam: optaRow.newestTeam || null,
      newestTeamColor: optaRow.newestTeamColor || null,
      newestLeagueId: optaRow.newestLeagueId || null,
      newestLeague: optaRow.newestLeague || null,
      optaPersonId: optaRow.optaPersonId || null,
      firstName: optaRow.firstName || null,
      lastName: optaRow.lastName || null,
      Position: optaRow.Position || null,
      GM: cleanNumericValue(optaRow.GM),
      Min: cleanNumericValue(optaRow.Min),
      Age: cleanNumericValue(optaRow.Age),

      // All performance stats - clean numeric values
      poslost: cleanNumericValue(optaRow.poslost),
      SOG_from_box: cleanNumericValue(optaRow.SOG_from_box),
      shotfromgolden: cleanNumericValue(optaRow.shotfromgolden),
      shotfrombox: cleanNumericValue(optaRow.shotfrombox),
      SOG: cleanNumericValue(optaRow.SOG),
      Shot: cleanNumericValue(optaRow.Shot),
      GAA: cleanNumericValue(optaRow.GAA),
      ChncOpnPl: cleanNumericValue(optaRow.ChncOpnPl),
      '+/-': cleanNumericValue(optaRow['+/-']),
      MinIncET: cleanNumericValue(optaRow.MinIncET),
      TakeOnOvr: cleanNumericValue(optaRow.TakeOnOvr),
      TakeOnFail: cleanNumericValue(optaRow.TakeOnFail),
      Success1v1: cleanNumericValue(optaRow.Success1v1),
      Chance: cleanNumericValue(optaRow.Chance),
      PassAccFwd: cleanNumericValue(optaRow.PassAccFwd),
      '%PassFwd': cleanNumericValue(optaRow['%PassFwd']),
      TouchOpBox: cleanNumericValue(optaRow.TouchOpBox),
      ShotConv: cleanNumericValue(optaRow.ShotConv),
      plusminus: cleanNumericValue(optaRow.plusminus),
      Shotcr: cleanNumericValue(optaRow.Shotcr),
      GrndDlWn: cleanNumericValue(optaRow.GrndDlWn),
      AerialWon: cleanNumericValue(optaRow.AerialWon),
      xG: cleanNumericValue(optaRow.xG),
      Goal: cleanNumericValue(optaRow.Goal),
      KMHSPEED: cleanNumericValue(optaRow.KMHSPEED),
      distancepergame: cleanNumericValue(optaRow.distancepergame),
      '%Intensity': cleanNumericValue(optaRow['%Intensity']),
      FlComD3: cleanNumericValue(optaRow.FlComD3),
      ErrShot: cleanNumericValue(optaRow.ErrShot),
      ErrGoal: cleanNumericValue(optaRow.ErrGoal),
      Clrnce: cleanNumericValue(optaRow.Clrnce),
      Int: cleanNumericValue(optaRow.Int),
      Tckl: cleanNumericValue(optaRow.Tckl),
      PsLostD3: cleanNumericValue(optaRow.PsLostD3),
      PossLost: cleanNumericValue(optaRow.PossLost),
      Touches: cleanNumericValue(optaRow.Touches),
      poswonopphalf: cleanNumericValue(optaRow.poswonopphalf),
      'Aerial%': cleanNumericValue(optaRow['Aerial%']),
      Aerials: cleanNumericValue(optaRow.Aerials),
      'ground%': cleanNumericValue(optaRow['ground%']),
      ground_duels: cleanNumericValue(optaRow.ground_duels),
      '%DropFwdUPr': cleanNumericValue(optaRow['%DropFwdUPr']),
      'touches/Turnovers': cleanNumericValue(optaRow['touches/Turnovers']),
      'TakeOn%': cleanNumericValue(optaRow['TakeOn%']),
      'LongBall%': cleanNumericValue(optaRow['LongBall%']),
      'Pass%': cleanNumericValue(optaRow['Pass%']),
      Ast: cleanNumericValue(optaRow.Ast),
      KeyPass: cleanNumericValue(optaRow.KeyPass),
      xA: cleanNumericValue(optaRow.xA),
      TakeOn: cleanNumericValue(optaRow.TakeOn),
      PsCmpInBox: cleanNumericValue(optaRow.PsCmpInBox),
      'Ps%InA3rd': cleanNumericValue(optaRow['Ps%InA3rd']),
      '1v1%': cleanNumericValue(optaRow['1v1%']),
      '1v1': cleanNumericValue(optaRow['1v1']),
      'ProgCarry%': cleanNumericValue(optaRow['ProgCarry%']),
      ProgCarry: cleanNumericValue(optaRow.ProgCarry),
      'ProgPass%': cleanNumericValue(optaRow['ProgPass%']),
      ProgPass: cleanNumericValue(optaRow.ProgPass)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setUploadStatus('error')
      setMessage('Please upload a CSV file')
      return
    }

    setUploading(true)
    setUploadStatus('idle')
    setMessage('Processing CSV file...')

    try {
      const csvText = await file.text()
      const optaData = parseCSV(csvText)

      if (optaData.length === 0) {
        throw new Error('No data found in CSV file')
      }

      setMessage(`Found ${optaData.length} players. Using your two-table architecture...`)

      // Map CSV data for separate storage
      const csvData = optaData.map(row => mapCsvData(row, file.name))

      setMessage('Updating player objects (preserves photos)...')

      // 1. SKIP updating player objects - we only update performance stats!
      setMessage('Skipping player objects update (preserving your data)...')

      setMessage('Preparing to upload to separate table...')

      setMessage('Clearing today\'s performance data...')

      // 2. Clear today's CSV uploads for this season
      const today = new Date().toISOString().split('T')[0]
      const { error: deleteError } = await supabase
        .from('opta_csv_uploads')
        .delete()
        .eq('season', '2025-2026')
        .gte('upload_date', `${today}T00:00:00`)
        .lt('upload_date', `${today}T23:59:59`)

      if (deleteError) {
        console.warn('No existing CSV data to clear:', deleteError.message)
      }

      setMessage('Uploading CSV data to separate table...')

      // 3. Insert CSV data into separate table (NOT touching opta_player_object!)
      let processedStats = 0
      const batchSize = 100

      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize)

        console.log('Uploading batch:', batch[0]) // Debug first item
        const { error: insertError, data: insertData } = await supabase
          .from('opta_csv_uploads')
          .insert(batch)

        if (insertError) {
          console.error('Insert error details:', insertError)
          throw new Error(`Error uploading batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`)
        }

        processedStats += batch.length
        setMessage(`Uploaded performance stats: ${processedStats}/${csvData.length} players...`)
      }

      setUploadStatus('success')
      setMessage(`Successfully uploaded ${csvData.length} players to separate table - your opta_player_object is safe!`)

      if (onUploadComplete) {
        onUploadComplete()
      }

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus('error')
      setMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      padding: '12px',
      border: '1px solid rgba(255, 215, 0, 0.2)',
      marginBottom: '16px'
    }}>
      <h4 style={{
        color: '#FFD700',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '12px',
        margin: '0 0 12px 0'
      }}>
        📊 Upload Opta Data
      </h4>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `1px dashed ${dragOver ? '#FFD700' : 'rgba(255, 215, 0, 0.3)'}`,
          borderRadius: '6px',
          padding: '16px',
          textAlign: 'center',
          background: dragOver ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          marginBottom: '12px'
        }}
        onClick={() => document.getElementById('csv-upload')?.click()}
      >
        <Upload size={24} color="#FFD700" style={{ marginBottom: '8px' }} />
        <p style={{ color: '#fff', fontSize: '12px', marginBottom: '4px' }}>
          {uploading ? 'Processing...' : 'Drop CSV or click'}
        </p>
        <p style={{ color: '#fbbf24', fontSize: '10px' }}>
          ⚠️ Overwrites existing data
        </p>
      </div>

      <input
        id="csv-upload"
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '8px',
          background: uploadStatus === 'success'
            ? 'rgba(34, 197, 94, 0.1)'
            : uploadStatus === 'error'
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${uploadStatus === 'success'
            ? 'rgba(34, 197, 94, 0.3)'
            : uploadStatus === 'error'
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(59, 130, 246, 0.3)'}`
        }}>
          {uploadStatus === 'success' && <Check size={12} color="#22c55e" />}
          {uploadStatus === 'error' && <X size={12} color="#ef4444" />}
          {uploadStatus === 'idle' && <AlertCircle size={12} color="#3b82f6" />}
          <span style={{
            color: uploadStatus === 'success'
              ? '#22c55e'
              : uploadStatus === 'error'
              ? '#ef4444'
              : '#3b82f6',
            fontSize: '11px'
          }}>
            {message}
          </span>
        </div>
      )}

      <div style={{
        fontSize: '10px',
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: '1.3'
      }}>
        Expected: OptaScore CSV export
      </div>
    </div>
  )
}