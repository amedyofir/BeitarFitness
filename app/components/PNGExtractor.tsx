'use client'

import React from 'react'

interface PNGExtractorProps {
  matchdayName?: string
  selectedOpponent: string
}

export default function PNGExtractor({ matchdayName, selectedOpponent }: PNGExtractorProps) {
  const generatePNGs = async () => {
    console.log('PNG generation started...')
    
    try {
      // Check if we're in the Beitar Focused view
      const beitarContent = document.querySelector('#beitar-focused-content')
      if (!beitarContent) {
        alert('Please make sure you are in the Beitar Focused view')
        return
      }

      console.log('Beitar content found, importing html2canvas...')
      
      // Dynamically import html2canvas
      const { default: html2canvas } = await import('html2canvas')
      
      console.log('html2canvas loaded successfully')
      
      // Simple function to capture element as screenshot
      const captureElement = async (element: Element) => {
        const htmlElement = element as HTMLElement
        console.log('Capturing element:', htmlElement)
        
        // Check if element has valid dimensions
        const rect = htmlElement.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(htmlElement)
        
        console.log('Element dimensions:', {
          clientWidth: htmlElement.clientWidth,
          clientHeight: htmlElement.clientHeight,
          offsetWidth: htmlElement.offsetWidth,
          offsetHeight: htmlElement.offsetHeight,
          scrollWidth: htmlElement.scrollWidth,
          scrollHeight: htmlElement.scrollHeight,
          boundingRect: rect,
          display: computedStyle.display,
          visibility: computedStyle.visibility
        })
        
        // Validate dimensions
        if (rect.width <= 0 || rect.height <= 0) {
          throw new Error(`Element has invalid dimensions: ${rect.width}x${rect.height}`)
        }
        
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          throw new Error('Element is not visible')
        }
        
        try {
          // Find the parent container that has the proper styling
          const tableContainer = htmlElement.closest('.stats-table-container') || htmlElement.closest('.glass-card') || htmlElement
          
          const canvas = await html2canvas(tableContainer as HTMLElement, {
            backgroundColor: '#000000',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            removeContainer: true,
            imageTimeout: 0, // Skip loading external images
            skipFonts: true, // Skip font loading
            onclone: (clonedDoc) => {
              // Ensure the cloned document preserves the dark theme
              const clonedBody = clonedDoc.body
              clonedBody.style.backgroundColor = '#000000'
              clonedBody.style.color = '#ffd700'
              
              // Apply dark theme to all elements
              const allElements = clonedDoc.querySelectorAll('*')
              allElements.forEach((el: HTMLElement) => {
                // Remove problematic background images but preserve progress bars
                if (!el.classList.contains('progress-bar') && 
                    !el.classList.contains('bar-fill') &&
                    !el.classList.contains('in-poss-bar') &&
                    !el.classList.contains('out-poss-bar')) {
                  el.style.backgroundImage = 'none'
                }
                el.style.maskImage = 'none'
                el.style.webkitMaskImage = 'none'
                
                const computedStyle = window.getComputedStyle(el)
                
                // Preserve glass card background
                if (el.classList.contains('glass-card')) {
                  el.style.background = 'rgba(17, 24, 39, 0.95)'
                  el.style.backdropFilter = 'blur(20px)'
                  el.style.border = '1px solid rgba(255, 215, 0, 0.3)'
                }
                
                // Preserve table styling
                if (el.classList.contains('stats-table')) {
                  el.style.background = 'rgba(255, 215, 0, 0.05)'
                  el.style.border = '1px solid rgba(255, 215, 0, 0.1)'
                }
                
                // Preserve progress bars exactly as they appear in the web app
                const originalStyle = window.getComputedStyle(el)
                
                // For progress bars, preserve all original styling
                if (el.classList.contains('progress-bar') || 
                    el.classList.contains('bar-container') ||
                    el.classList.contains('bar-fill') ||
                    el.classList.contains('in-poss-bar') ||
                    el.classList.contains('out-poss-bar') ||
                    el.style.width?.includes('%') ||
                    el.style.background?.includes('linear-gradient') ||
                    el.parentElement?.classList.contains('bar-container')) {
                  
                  // Copy all the computed styles to preserve exact appearance
                  el.style.backgroundColor = originalStyle.backgroundColor
                  el.style.background = originalStyle.background
                  el.style.width = originalStyle.width
                  el.style.height = originalStyle.height
                  el.style.borderRadius = originalStyle.borderRadius
                  el.style.border = originalStyle.border
                  el.style.position = originalStyle.position
                  el.style.display = originalStyle.display
                  el.style.overflow = originalStyle.overflow
                  el.style.opacity = originalStyle.opacity
                  el.style.transform = originalStyle.transform
                  
                  // Remove only transitions that don't work in PNG
                  el.style.transition = 'none'
                  el.style.animation = 'none'
                  
                  // Ensure it's visible
                  if (el.style.display === 'none') {
                    el.style.display = 'block'
                  }
                }
                
                // Ensure text colors are preserved
                if (computedStyle.color === 'rgb(255, 215, 0)' || el.style.color.includes('#FFD700')) {
                  el.style.color = '#FFD700'
                }
                
                // Preserve row backgrounds
                if (el.classList.contains('beitar-row')) {
                  el.style.backgroundColor = 'rgba(255, 215, 0, 0.2)'
                  el.style.border = '1px solid rgba(255, 215, 0, 0.4)'
                }
                
                if (el.classList.contains('opponent-row')) {
                  el.style.backgroundColor = 'rgba(255, 107, 107, 0.2)'
                  el.style.border = '1px solid rgba(255, 107, 107, 0.4)'
                }
              })
            },
            ignoreElements: (element) => {
              // Skip elements that might cause issues
              return element.tagName === 'CANVAS' || 
                     element.tagName === 'IMG' || // Skip images
                     element.style.display === 'none' ||
                     element.classList.contains('png-export-btn') ||
                     element.classList.contains('beitar-players-extractor-btn')
            }
          })
          
          console.log('Canvas created successfully:', canvas.width, 'x', canvas.height)
          
          if (canvas.width <= 0 || canvas.height <= 0) {
            throw new Error(`Generated canvas has invalid dimensions: ${canvas.width}x${canvas.height}`)
          }
          
          return canvas
        } catch (error) {
          console.error('Error in html2canvas:', error)
          throw error
        }
      }

      // Table titles for each section
      const tableTitles = [
        'All Teams Comparison',
        'Team Half-Time Breakdown',
        'Beitar Jerusalem Players',
        `${selectedOpponent} Players`,
        'Head-to-Head Comparison'
      ]

      // Wait for all tables to be properly loaded and rendered
      console.log('Waiting for tables to load...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Find all tables in the beitar focused content
      const allTables = document.querySelectorAll('#beitar-focused-content .stats-table')
      console.log(`Found ${allTables.length} tables`)
      
      // Find the Head-to-Head Comparison section (it's not a table, it's a special div)
      let headToHeadElement = null
      
      // Search through all H4 elements to find the Head-to-Head section
      const allH4s = document.querySelectorAll('#beitar-focused-content h4')
      allH4s.forEach(h4 => {
        if (h4.textContent && h4.textContent.includes('Head-to-Head Comparison')) {
          headToHeadElement = h4.parentElement // Get the containing div
          console.log('Found Head-to-Head Comparison section')
        }
      })
      
      console.log(`Found ${allTables.length} tables and Head-to-Head section: ${!!headToHeadElement}`)

      if (allTables.length === 0) {
        alert('No tables found. Please make sure you are in the Beitar Focused view with data loaded.')
        return
      }

      // Check which tables have actual content
      const tablesWithContent = []
      allTables.forEach((table, index) => {
        const rows = table.querySelectorAll('tbody tr')
        const allRows = table.querySelectorAll('tr')
        const hasContent = rows.length > 0
        const rect = table.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(table as HTMLElement)
        
        console.log(`Table ${index + 1} (${tableTitles[index]}):`, {
          hasContent,
          rowCount: rows.length,
          totalRows: allRows.length,
          dimensions: `${rect.width}x${rect.height}`,
          visible: rect.width > 0 && rect.height > 0,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          position: computedStyle.position,
          innerHTML: table.innerHTML.substring(0, 200) + '...'
        })
        
        // Only include the first 4 tables (0-3), the 5th will be the Head-to-Head section
        if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden' && index < 4) {
          tablesWithContent.push({ element: table, index, title: tableTitles[index] })
        }
      })
      
      // Add the Head-to-Head Comparison section as the 5th element
      if (headToHeadElement) {
        const rect = headToHeadElement.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(headToHeadElement as HTMLElement)
        
        console.log('Head-to-Head Comparison section:', {
          dimensions: `${rect.width}x${rect.height}`,
          visible: rect.width > 0 && rect.height > 0,
          display: computedStyle.display,
          visibility: computedStyle.visibility
        })
        
        if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
          tablesWithContent.push({ element: headToHeadElement, index: 4, title: tableTitles[4] })
          console.log('Added Head-to-Head Comparison as 5th element')
        }
      } else {
        console.warn('Head-to-Head Comparison section not found')
      }

      console.log(`Found ${tablesWithContent.length} tables with valid content`)
      
      if (tablesWithContent.length === 0) {
        alert('No tables with content found. Please make sure all data is loaded in the Beitar Focused view.')
        return
      }

      // Generate PNG for each table with content
      for (let i = 0; i < tablesWithContent.length; i++) {
        const { element, index, title } = tablesWithContent[i]
        console.log(`Processing table ${index + 1}: ${title}`)
        
        // Special handling for table 3 (Beitar Jerusalem Players)
        if (index === 2) { // Table 3 is index 2 (0-based)
          console.log('=== DETAILED TABLE 3 DEBUGGING ===')
          
          // Get detailed dimension info
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element as HTMLElement)
          const playerRows = element.querySelectorAll('tbody tr')
          
          console.log('Table 3 dimensions:', {
            boundingRect: rect,
            clientWidth: (element as HTMLElement).clientWidth,
            clientHeight: (element as HTMLElement).clientHeight,
            offsetWidth: (element as HTMLElement).offsetWidth,
            offsetHeight: (element as HTMLElement).offsetHeight,
            scrollWidth: (element as HTMLElement).scrollWidth,
            scrollHeight: (element as HTMLElement).scrollHeight,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            position: style.position,
            overflow: style.overflow,
            playerRows: playerRows.length
          })
          
          // Check if dimensions are valid BEFORE attempting capture
          if (rect.width <= 0 || rect.height <= 0) {
            console.error(`Table 3 has invalid dimensions: ${rect.width}x${rect.height}`)
            alert(`Table 3 dimension issue: width=${rect.width}, height=${rect.height}. Cannot capture table with zero dimensions.`)
            continue // Skip to next table
          }
          
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            console.error('Table 3 is not visible:', { display: style.display, visibility: style.visibility, opacity: style.opacity })
            alert(`Table 3 visibility issue: display=${style.display}, visibility=${style.visibility}, opacity=${style.opacity}`)
            continue // Skip to next table
          }
          
          try {
            // Try to scroll the element into view first
            element.scrollIntoView({ behavior: 'instant', block: 'center' })
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Re-check dimensions after scroll
            const newRect = element.getBoundingClientRect()
            console.log('Table 3 dimensions after scroll:', newRect)
            
            if (newRect.width <= 0 || newRect.height <= 0) {
              console.error(`Table 3 still has invalid dimensions after scroll: ${newRect.width}x${newRect.height}`)
              throw new Error(`Invalid dimensions after scroll: ${newRect.width}x${newRect.height}`)
            }
            
            console.log(`Table 3 player rows found: ${playerRows.length}`)
            
            if (playerRows.length === 0) {
              console.warn('Table 3 has no player rows - might still be loading')
              // Wait longer for content to load
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              // Re-check after waiting
              const newPlayerRows = element.querySelectorAll('tbody tr')
              console.log(`Table 3 player rows after waiting: ${newPlayerRows.length}`)
            }
            
            // Try capturing the entire section containing the table
            const playerSection = element.closest('div[style*="margin-bottom: 40px"]') || element.parentElement?.parentElement
            if (playerSection) {
              console.log('Trying to capture player section instead of just table')
              
              // Check section dimensions before capture
              const sectionRect = playerSection.getBoundingClientRect()
              console.log('Player section dimensions:', sectionRect)
              
              if (sectionRect.width <= 0 || sectionRect.height <= 0) {
                console.error(`Player section has invalid dimensions: ${sectionRect.width}x${sectionRect.height}`)
                throw new Error(`Player section invalid dimensions: ${sectionRect.width}x${sectionRect.height}`)
              }
              
              const { default: html2canvas } = await import('html2canvas')
              const sectionCanvas = await html2canvas(playerSection as HTMLElement, {
                backgroundColor: '#000000',
                scale: 1,
                logging: false, // Disable logging to reduce noise
                useCORS: true,
                allowTaint: true,
                removeContainer: true, // Clean up after rendering
                imageTimeout: 0, // Skip loading external images
                skipFonts: true, // Skip font loading
                onclone: (clonedDoc) => {
                  // Remove problematic background images from cloned elements but preserve progress bars
                  const allElements = clonedDoc.querySelectorAll('*')
                  allElements.forEach((el: HTMLElement) => {
                    // Remove background images but preserve progress bars
                    if (!el.classList.contains('progress-bar') && 
                        !el.classList.contains('bar-fill') &&
                        !el.classList.contains('in-poss-bar') &&
                        !el.classList.contains('out-poss-bar')) {
                      el.style.backgroundImage = 'none'
                    }
                    el.style.maskImage = 'none'
                    el.style.webkitMaskImage = 'none'
                    
                    // Preserve progress bars exactly as they appear
                    const originalStyle = window.getComputedStyle(el)
                    
                    if (el.classList.contains('progress-bar') || 
                        el.classList.contains('bar-container') ||
                        el.classList.contains('bar-fill') ||
                        el.classList.contains('in-poss-bar') ||
                        el.classList.contains('out-poss-bar') ||
                        el.style.width?.includes('%') ||
                        el.style.background?.includes('linear-gradient') ||
                        el.parentElement?.classList.contains('bar-container')) {
                      
                      // Copy exact computed styles
                      el.style.backgroundColor = originalStyle.backgroundColor
                      el.style.background = originalStyle.background
                      el.style.width = originalStyle.width
                      el.style.height = originalStyle.height
                      el.style.borderRadius = originalStyle.borderRadius
                      el.style.border = originalStyle.border
                      el.style.position = originalStyle.position
                      el.style.display = originalStyle.display
                      el.style.overflow = originalStyle.overflow
                      el.style.opacity = originalStyle.opacity
                      el.style.transform = originalStyle.transform
                      
                      // Remove only animations
                      el.style.transition = 'none'
                      el.style.animation = 'none'
                      
                      if (el.style.display === 'none') {
                        el.style.display = 'block'
                      }
                    }
                  })
                },
                ignoreElements: (el) => {
                  // Skip any problematic elements
                  return el.tagName === 'CANVAS' || 
                         el.tagName === 'IMG' || // Skip images that might be problematic
                         el.style.display === 'none' || 
                         el.classList.contains('png-export-btn') ||
                         el.classList.contains('beitar-players-extractor-btn')
                }
              })
              
              if (sectionCanvas.width > 0 && sectionCanvas.height > 0) {
                const url = sectionCanvas.toDataURL('image/png', 1.0)
                const a = document.createElement('a')
                const timestamp = new Date().toISOString().split('T')[0]
                const filename = `FCBJ_${matchdayName || 'Matchday'}_vs_${selectedOpponent.replace(/\s+/g, '_')}_Table${index + 1}_${title.replace(/\s+/g, '_')}_SECTION_${timestamp}.png`
                
                a.href = url
                a.download = filename
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                
                console.log(`Downloaded section capture: ${filename}`)
                
                // Add delay and continue to next table
                if (i < tablesWithContent.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500))
                }
                continue // Skip the normal processing for this table
              }
            }
          } catch (specialError) {
            console.error('Special handling for table 3 failed:', specialError)
          }
        }
        
        try {
          // First, ensure the table is visible and has content
          const rect = element.getBoundingClientRect()
          console.log(`Table ${index + 1} dimensions:`, rect)
          
          // Try to wait for the table to fully render
          await new Promise(resolve => setTimeout(resolve, 100))
          
          const canvas = await captureElement(element)
          
          // Create download link immediately
          const url = canvas.toDataURL('image/png', 1.0)
          const a = document.createElement('a')
          const timestamp = new Date().toISOString().split('T')[0]
          const filename = `FCBJ_${matchdayName || 'Matchday'}_vs_${selectedOpponent.replace(/\s+/g, '_')}_Table${index + 1}_${title.replace(/\s+/g, '_')}_${timestamp}.png`
          
          a.href = url
          a.download = filename
          a.style.display = 'none'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          
          console.log(`Downloaded: ${filename}`)
          
          // Add a delay between downloads
          if (i < tablesWithContent.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
          
        } catch (error) {
          console.error(`Error processing table ${index + 1}:`, error)
          console.log(`Attempting multiple fallback approaches for table ${index + 1}`)
          
          let captured = false
          
          // Fallback 1: Simple capture without styling
          try {
            const { default: html2canvas } = await import('html2canvas')
            console.log(`Fallback 1: Simple capture for table ${index + 1}`)
            
            // Check dimensions before fallback capture
            const fallbackRect = element.getBoundingClientRect()
            console.log(`Fallback 1 element dimensions: ${fallbackRect.width}x${fallbackRect.height}`)
            
            if (fallbackRect.width <= 0 || fallbackRect.height <= 0) {
              throw new Error(`Fallback 1: Invalid dimensions ${fallbackRect.width}x${fallbackRect.height}`)
            }
            
            const simpleCanvas = await html2canvas(element as HTMLElement, {
              backgroundColor: '#000000',
              scale: 1,
              logging: true,
              useCORS: true,
              allowTaint: true,
              width: Math.max(fallbackRect.width, 100),
              height: Math.max(fallbackRect.height, 100)
            })
            
            if (simpleCanvas.width > 0 && simpleCanvas.height > 0) {
              const url = simpleCanvas.toDataURL('image/png', 1.0)
              const a = document.createElement('a')
              const timestamp = new Date().toISOString().split('T')[0]
              const filename = `FCBJ_${matchdayName || 'Matchday'}_vs_${selectedOpponent.replace(/\s+/g, '_')}_Table${index + 1}_${title.replace(/\s+/g, '_')}_FALLBACK1_${timestamp}.png`
              
              a.href = url
              a.download = filename
              a.style.display = 'none'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              
              console.log(`Downloaded fallback 1: ${filename}`)
              captured = true
            }
          } catch (fallback1Error) {
            console.error(`Fallback 1 failed for table ${index + 1}:`, fallback1Error)
          }
          
          // Fallback 2: Try capturing parent container
          if (!captured) {
            try {
              const { default: html2canvas } = await import('html2canvas')
              console.log(`Fallback 2: Parent container for table ${index + 1}`)
              
              const parent = element.closest('.stats-table-container') || element.parentElement
              if (parent) {
                const parentCanvas = await html2canvas(parent as HTMLElement, {
                  backgroundColor: '#000000',
                  scale: 1,
                  logging: true,
                  useCORS: true,
                  allowTaint: true
                })
                
                if (parentCanvas.width > 0 && parentCanvas.height > 0) {
                  const url = parentCanvas.toDataURL('image/png', 1.0)
                  const a = document.createElement('a')
                  const timestamp = new Date().toISOString().split('T')[0]
                  const filename = `FCBJ_${matchdayName || 'Matchday'}_vs_${selectedOpponent.replace(/\s+/g, '_')}_Table${index + 1}_${title.replace(/\s+/g, '_')}_FALLBACK2_${timestamp}.png`
                  
                  a.href = url
                  a.download = filename
                  a.style.display = 'none'
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  
                  console.log(`Downloaded fallback 2: ${filename}`)
                  captured = true
                }
              }
            } catch (fallback2Error) {
              console.error(`Fallback 2 failed for table ${index + 1}:`, fallback2Error)
            }
          }
          
          if (!captured) {
            // Final attempt for table 3 - try manual selector approach
            if (index === 2) {
              console.log('Final attempt for table 3 using manual selectors')
              try {
                const { default: html2canvas } = await import('html2canvas')
                
                // Try finding the table using multiple possible selectors
                const possibleSelectors = [
                  '#beitar-focused-content .stats-table:nth-of-type(3)',
                  '#beitar-focused-content div:nth-child(4) .stats-table',
                  '[data-table="beitar-players"]',
                  '.stats-table-container:nth-child(3) .stats-table'
                ]
                
                for (const selector of possibleSelectors) {
                  const manualElement = document.querySelector(selector)
                  if (manualElement && manualElement.getBoundingClientRect().width > 0) {
                    console.log(`Found table 3 using selector: ${selector}`)
                    
                    const manualCanvas = await html2canvas(manualElement as HTMLElement, {
                      backgroundColor: '#000000',
                      scale: 1,
                      logging: true
                    })
                    
                    if (manualCanvas.width > 0 && manualCanvas.height > 0) {
                      const url = manualCanvas.toDataURL('image/png', 1.0)
                      const a = document.createElement('a')
                      const timestamp = new Date().toISOString().split('T')[0]
                      const filename = `FCBJ_${matchdayName || 'Matchday'}_vs_${selectedOpponent.replace(/\s+/g, '_')}_Table${index + 1}_${title.replace(/\s+/g, '_')}_MANUAL_${timestamp}.png`
                      
                      a.href = url
                      a.download = filename
                      a.style.display = 'none'
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      
                      console.log(`Downloaded manual capture: ${filename}`)
                      captured = true
                      break
                    }
                  }
                }
              } catch (manualError) {
                console.error('Manual capture for table 3 failed:', manualError)
              }
            }
            
            if (!captured) {
              alert(`Could not capture table ${index + 1}: ${title}. All capture methods failed.`)
            }
          }
        }
      }
      
      console.log('All PNG files generated successfully!')
      alert(`Successfully generated ${tablesWithContent.length} PNG files!`)

    } catch (error) {
      console.error('Error generating PNG images:', error)
      alert(`Error generating PNG images: ${error.message}`)
    }
  }

  return (
    <button
      onClick={generatePNGs}
      className="png-export-btn"
      style={{
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        color: '#000000',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontFamily: 'Montserrat',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.4)'
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)'
      }}
    >
      📸 Export PNG Images
    </button>
  )
}