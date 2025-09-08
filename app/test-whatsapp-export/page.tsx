'use client'

import React, { useState, useEffect } from 'react'
import WhatsAppOptimizedReport from '../components/WhatsAppOptimizedReport'

export default function TestWhatsAppExport() {
  const [csvData, setCsvData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load the CSV data for testing
    const loadTestData = async () => {
      try {
        const response = await fetch('/Matchreport26%20(4).csv')
        const text = await response.text()
        
        // Simple CSV parsing
        const lines = text.trim().split('\n')
        const headers = lines[0].split(',')
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',')
          const row: any = {}
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || ''
          })
          return row
        })
        
        setCsvData(data)
        setLoading(false)
        
        console.log('Test data loaded:', data.length, 'teams')
        
      } catch (error) {
        console.error('Failed to load test data:', error)
        setLoading(false)
      }
    }
    
    loadTestData()
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0b0b0f',
        color: '#fff',
        fontSize: '18px'
      }}>
        Loading test data...
      </div>
    )
  }

  if (csvData.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0b0b0f',
        color: '#fff',
        gap: '16px'
      }}>
        <h1 style={{ color: '#ef4444', fontSize: '24px' }}>No Test Data Available</h1>
        <p style={{ color: '#888' }}>Please ensure the CSV file is available in the public folder</p>
        <p style={{ color: '#666', fontSize: '14px' }}>Expected file: /public/Matchreport26%20(4).csv</p>
      </div>
    )
  }

  return (
    <div>
      {/* Info Banner */}
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        background: 'rgba(255, 215, 0, 0.9)',
        color: '#000',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '600',
        textAlign: 'center',
        zIndex: 999,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        🧪 WhatsApp Export Test Page • Fixed Layout • Optimized Dimensions • {csvData.length} Teams Loaded
      </div>
      
      {/* Padding to account for info banner */}
      <div style={{ paddingTop: '40px' }}>
        <WhatsAppOptimizedReport 
          csvData={csvData} 
          matchdayNumber="2" 
        />
      </div>
    </div>
  )
}