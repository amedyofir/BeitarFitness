'use client'

import React, { useState } from 'react'

interface BeitarPlayersExtractorProps {
  matchdayName?: string
  selectedOpponent: string
}

export default function BeitarPlayersExtractor({ matchdayName, selectedOpponent }: BeitarPlayersExtractorProps) {
  const [showTableSelector, setShowTableSelector] = useState(false)
  const [availableTables, setAvailableTables] = useState<{element: Element, index: number, preview: string}[]>([])
  const scanForTables = () => {
    const beitarContent = document.querySelector('#beitar-focused-content')
    if (!beitarContent) {
      alert('Please make sure you are in the Beitar Focused view')
      return
    }

    const allTables = document.querySelectorAll('#beitar-focused-content .stats-table')
    const tableData = Array.from(allTables).map((table, index) => {
      const text = table.textContent?.substring(0, 150) || ''
      const rect = table.getBoundingClientRect()
      const visible = rect.width > 0 && rect.height > 0
      const rows = table.querySelectorAll('tbody tr').length
      
      return {
        element: table,
        index,
        preview: `Table ${index + 1} (${rows} rows): ${text}...`,
        visible
      }
    }).filter(t => t.visible)
    
    setAvailableTables(tableData)
    setShowTableSelector(true)
  }

  const captureSpecificTable = async (tableIndex: number) => {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const table = availableTables[tableIndex].element
      
      console.log(`Capturing table ${tableIndex + 1}`)
      
      // Simple, direct capture
      const canvas = await html2canvas(table as HTMLElement, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedBody = clonedDoc.body
          clonedBody.style.backgroundColor = '#000000'
          clonedBody.style.color = '#ffd700'
          
          // Preserve styling
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach((el) => {
            const htmlEl = el as HTMLElement
            if (htmlEl.classList.contains('beitar-row')) {
              htmlEl.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'
              htmlEl.style.border = '1px solid rgba(255, 215, 0, 0.4)'
            }
          })
        }
      })
      
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const url = canvas.toDataURL('image/png', 1.0)
        const a = document.createElement('a')
        const timestamp = new Date().toISOString().split('T')[0]
        const filename = `FCBJ_${matchdayName || 'Matchday'}_vs_${selectedOpponent.replace(/\s+/g, '_')}_Table${availableTables[tableIndex].index + 1}_${timestamp}.png`
        
        a.href = url
        a.download = filename
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        alert(`Successfully exported Table ${availableTables[tableIndex].index + 1}!`)
        setShowTableSelector(false)
      } else {
        alert('Failed to capture the table')
      }
      
    } catch (error: any) {
      console.error('Error capturing table:', error)
      alert(`Error capturing table: ${error.message}`)
    }
  }

  return (
    <div style={{ marginLeft: '8px' }}>
      {!showTableSelector ? (
        <button
          onClick={scanForTables}
          className="beitar-players-extractor-btn"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: '#000000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontFamily: 'Montserrat',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.3s ease',
            boxShadow: '0 3px 10px rgba(255, 215, 0, 0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(255, 215, 0, 0.4)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(255, 215, 0, 0.3)'
          }}
        >
          🔍 Select Table
        </button>
      ) : (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(17, 24, 39, 0.98)',
          border: '2px solid rgba(255, 215, 0, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 1000,
          backdropFilter: 'blur(20px)'
        }}>
          <h3 style={{ 
            color: '#FFD700', 
            fontFamily: 'Montserrat', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            Select Table to Export
          </h3>
          
          {availableTables.map((table, index) => (
            <div key={index} style={{
              background: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => captureSpecificTable(index)}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)'
            }}
            >
              <div style={{ 
                color: '#FFD700', 
                fontFamily: 'Montserrat',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                📸 {table.preview}
              </div>
            </div>
          ))}
          
          <button
            onClick={() => setShowTableSelector(false)}
            style={{
              background: 'rgba(255, 107, 107, 0.8)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontFamily: 'Montserrat',
              cursor: 'pointer',
              marginTop: '10px',
              width: '100%'
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}