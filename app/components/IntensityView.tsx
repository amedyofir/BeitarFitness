'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { isExcludedPlayer } from '../../lib/constants'
import { Download, Loader2, Palette, Maximize2 } from 'lucide-react'
import generatePDF from 'react-to-pdf'
import html2canvas from 'html2canvas'

interface WeeklyData {
  player_name: string
  week: string
  vir_intensity: number
  target_intensity: number
  date: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      vir_intensity: number
      target_intensity: number
    }
  }
}



export default function IntensityView() {
  const targetRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = () => {
    if (targetRef.current) {
      generatePDF(() => targetRef.current, {
        filename: 'intensity-report.pdf',
        page: { margin: 20 }
      })
    }
  }

  const handleDownloadImage = async () => {
    if (!targetRef.current) return

    try {
      const scrollContainer = targetRef.current.querySelector('.intensity-data-scroll') as HTMLElement
      const synchronizedContainer = targetRef.current.querySelector('.intensity-synchronized-container') as HTMLElement
      
      // Store original styles
      const originalStyles = {
        scrollOverflow: scrollContainer?.style.overflow || '',
        scrollWidth: scrollContainer?.style.width || '',
        scrollMinWidth: scrollContainer?.style.minWidth || '',
        scrollHeight: scrollContainer?.style.height || '',
        scrollMaxHeight: scrollContainer?.style.maxHeight || '',
        containerWidth: synchronizedContainer?.style.width || '',
        containerMaxWidth: synchronizedContainer?.style.maxWidth || '',
        containerHeight: synchronizedContainer?.style.height || '',
        containerMaxHeight: synchronizedContainer?.style.maxHeight || '',
        targetHeight: targetRef.current?.style.height || '',
        targetMaxHeight: targetRef.current?.style.maxHeight || '',
        targetOverflow: targetRef.current?.style.overflow || ''
      }

      // Apply temporary styles for capture
      if (exportFullWidth && scrollContainer && synchronizedContainer) {
        // Expand the container to show all content
        scrollContainer.style.overflow = 'visible'
        scrollContainer.style.width = 'max-content'
        scrollContainer.style.minWidth = 'max-content'
        scrollContainer.style.height = 'auto'
        scrollContainer.style.maxHeight = 'none'
        synchronizedContainer.style.width = 'max-content'
        synchronizedContainer.style.maxWidth = 'none'
        synchronizedContainer.style.height = 'auto'
        synchronizedContainer.style.maxHeight = 'none'
        
        // Also ensure the target ref itself can expand
        if (targetRef.current) {
          targetRef.current.style.height = 'auto'
          targetRef.current.style.maxHeight = 'none'
          targetRef.current.style.overflow = 'visible'
        }
      }

      // Apply print styles temporarily for PNG export if in dark mode
      const printStyleSheet = document.createElement('style')
      if (!isWhiteTheme) {
        printStyleSheet.textContent = `
          .pdf-header, 
          .intensity-synchronized-container {
            background-color: black !important;
            color: #FFD700 !important;
          }
          .intensity-header-row,
          .week-data-cell,
          .player-column-header,
          .player-name-sticky,
          .player-weeks-scroll,
          .week-header-horizontal {
            background-color: black !important;
            color: #FFD700 !important;
          }
          .week-data-cell {
            border-color: #333 !important;
          }
        `
        document.head.appendChild(printStyleSheet)
      }

      // Force a reflow to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Force layout recalculation for full height capture
      if (exportFullWidth && targetRef.current) {
        targetRef.current.style.display = 'block'
        targetRef.current.style.position = 'static'
        
        // Calculate the actual content height by measuring all child elements
        const allRows = targetRef.current.querySelectorAll('.intensity-data-row, .intensity-players-column > div')
        const totalContentHeight = Array.from(allRows).reduce((height, row) => {
          const rect = (row as HTMLElement).getBoundingClientRect()
          return height + rect.height
        }, 0)
        
        // Add extra padding for headers and margins
        const estimatedFullHeight = totalContentHeight + 200
        
        console.log('Intensity - Calculated content height:', totalContentHeight, 'Full height:', estimatedFullHeight)
        
        // Force the container to this height
        if (synchronizedContainer) {
          synchronizedContainer.style.minHeight = `${estimatedFullHeight}px`
        }
      }

      // Get current scroll position for visible mode
      const currentScrollLeft = scrollContainer?.scrollLeft || 0
      const currentScrollTop = scrollContainer?.scrollTop || 0

      const captureOptions: any = {
        "backgroundColor": isWhiteTheme ? '#ffffff' : '#000000',
        "useCORS": true,
        "allowTaint": true,
        "scale": 2,
        "logging": false,
        "onclone": (clonedDoc: Document) => {
          // Fix header alignment - make it truly centered
          const header = clonedDoc.querySelector('.pdf-header') as HTMLElement
          if (header && exportFullWidth) {
            header.style.width = '100%'
            header.style.display = 'flex'
            header.style.flexDirection = 'column'
            header.style.alignItems = 'center'
            header.style.justifyContent = 'center'
            header.style.padding = '20px'
            header.style.boxSizing = 'border-box'
          }
          
          const headerContent = clonedDoc.querySelector('.pdf-header-content') as HTMLElement
          if (headerContent) {
            headerContent.style.display = 'flex'
            headerContent.style.justifyContent = 'center'
            headerContent.style.alignItems = 'center'
            headerContent.style.width = 'auto'
            headerContent.style.margin = '0 auto'
          }

          // Fix table container and borders
          const clonedElement = clonedDoc.querySelector('.intensity-synchronized-container') as HTMLElement
          const clonedScrollContainer = clonedDoc.querySelector('.intensity-data-scroll') as HTMLElement
          const clonedPlayersColumn = clonedDoc.querySelector('.intensity-players-column') as HTMLElement
          
          if (clonedElement) {
            if (exportFullWidth) {
              clonedElement.style.display = 'grid'
              clonedElement.style.width = 'max-content'
              clonedElement.style.gridTemplateColumns = '120px max-content'
              clonedElement.style.gridGap = '0'
              clonedElement.style.gap = '0'
            }
            clonedElement.style.border = isWhiteTheme ? '2px solid #ddd' : '2px solid #333'
            clonedElement.style.borderRadius = '8px'
            clonedElement.style.overflow = 'visible'
            clonedElement.style.margin = '0'
          }
          
          // CRITICAL: Ensure both columns use the same display structure
          if (clonedPlayersColumn && clonedScrollContainer) {
            // Both columns must use flex column layout
            clonedPlayersColumn.style.display = 'flex'
            clonedPlayersColumn.style.flexDirection = 'column'
            clonedPlayersColumn.style.margin = '0'
            clonedPlayersColumn.style.padding = '0'
            clonedPlayersColumn.style.gap = '0'
            
            clonedScrollContainer.style.display = 'flex'
            clonedScrollContainer.style.flexDirection = 'column'
            clonedScrollContainer.style.margin = '0'
            clonedScrollContainer.style.padding = '0'
            clonedScrollContainer.style.gap = '0'
          }

          // Handle scroll container based on mode
          if (clonedScrollContainer) {
            if (exportFullWidth) {
              // For full width, expand the scroll container
              clonedScrollContainer.style.overflow = 'visible'
              clonedScrollContainer.style.width = 'max-content'
              clonedScrollContainer.style.maxWidth = 'none'
            } else {
              // For visible mode, preserve current scroll position by transforming content
              console.log('Intensity Visible mode - applying scroll offset:', currentScrollLeft)
              clonedScrollContainer.style.overflow = 'hidden'
              clonedScrollContainer.style.transform = `translateX(-${currentScrollLeft}px)`
              clonedScrollContainer.style.width = scrollContainer?.offsetWidth + 'px'
              clonedScrollContainer.style.height = scrollContainer?.offsetHeight + 'px'
            }
          }

          // Fix week headers row specifically
          const weeksHeader = clonedDoc.querySelector('.intensity-weeks-header') as HTMLElement
          if (weeksHeader) {
            weeksHeader.style.display = 'flex'
            weeksHeader.style.width = '100%'
          }

          // Fix all cells borders and spacing
          const allCells = clonedDoc.querySelectorAll('.intensity-data-cell, .intensity-player-cell, .intensity-header-cell, .intensity-week-header, .intensity-data-row')
          allCells.forEach((cell: Element) => {
            const htmlCell = cell as HTMLElement
            htmlCell.style.boxSizing = 'border-box'
            htmlCell.style.border = isWhiteTheme ? '1px solid #ddd' : '1px solid #333'
            htmlCell.style.margin = '0'
            htmlCell.style.padding = htmlCell.classList.contains('intensity-data-row') ? '0' : htmlCell.style.padding
          })
          
          // Specifically fix data rows to remove gaps and ensure consistent height
          const dataRows = clonedDoc.querySelectorAll('.intensity-data-row')
          dataRows.forEach((row: Element, index: number) => {
            const htmlRow = row as HTMLElement
            htmlRow.style.display = 'flex'
            htmlRow.style.gap = '0'
            htmlRow.style.margin = '0'
            htmlRow.style.marginTop = '0'
            htmlRow.style.marginBottom = '0'
            htmlRow.style.padding = '0'
            htmlRow.style.borderSpacing = '0'
            htmlRow.style.height = '48px'
            htmlRow.style.minHeight = '48px'
            htmlRow.style.maxHeight = '48px'
            htmlRow.style.alignItems = 'center'
          })
          
          // Ensure exact same height for player column header and week header
          const playerHeaderCell = clonedDoc.querySelector('.intensity-header-cell') as HTMLElement
          const weekHeaders = clonedDoc.querySelector('.intensity-weeks-header') as HTMLElement
          if (playerHeaderCell && weekHeaders) {
            playerHeaderCell.style.height = '60px'
            playerHeaderCell.style.minHeight = '60px'
            playerHeaderCell.style.maxHeight = '60px'
            playerHeaderCell.style.display = 'flex'
            playerHeaderCell.style.alignItems = 'center'
            playerHeaderCell.style.justifyContent = 'center'
            
            weekHeaders.style.height = '60px'
            weekHeaders.style.minHeight = '60px'
            weekHeaders.style.maxHeight = '60px'
          }
          
          // Fix all player cells to have exact same height
          const playerCells = clonedDoc.querySelectorAll('.intensity-player-cell')
          playerCells.forEach((cell: Element) => {
            const htmlCell = cell as HTMLElement
            htmlCell.style.margin = '0'
            htmlCell.style.padding = '8px'
            htmlCell.style.height = '48px'
            htmlCell.style.minHeight = '48px'
            htmlCell.style.maxHeight = '48px'
            htmlCell.style.boxSizing = 'border-box'
            htmlCell.style.display = 'flex'
            htmlCell.style.alignItems = 'center'
            htmlCell.style.justifyContent = 'center'
            htmlCell.style.fontSize = '13px'
          })
          
          // Ensure all data cells in all rows have exact same height
          const allDataCells = clonedDoc.querySelectorAll('.intensity-data-cell')
          allDataCells.forEach((cell: Element) => {
            const htmlCell = cell as HTMLElement
            htmlCell.style.height = '48px'
            htmlCell.style.minHeight = '48px'
            htmlCell.style.maxHeight = '48px'
            htmlCell.style.boxSizing = 'border-box'
            htmlCell.style.display = 'flex'
            htmlCell.style.alignItems = 'center'
            htmlCell.style.justifyContent = 'center'
          })

          // Ensure first column borders are visible
          const firstWeekCells = clonedDoc.querySelectorAll('.intensity-week-header:first-child, .intensity-data-cell:first-child')
          firstWeekCells.forEach((cell: Element) => {
            const htmlCell = cell as HTMLElement
            htmlCell.style.borderLeft = isWhiteTheme ? '2px solid #ddd' : '2px solid #333'
          })
        }
      }

      // Configure capture options based on mode
      if (exportFullWidth && targetRef.current) {
        // FULL WIDTH MODE: Capture everything
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const rect = targetRef.current.getBoundingClientRect()
        const fullWidth = Math.max(targetRef.current.scrollWidth, rect.width)
        const naturalHeight = targetRef.current.scrollHeight
        const boundingHeight = rect.height
        const containerHeight = synchronizedContainer?.getBoundingClientRect().height || 0
        const fullHeight = Math.max(naturalHeight, boundingHeight, containerHeight) + 100
        
        console.log('Intensity Full mode - Height measurements:', naturalHeight, boundingHeight, containerHeight, 'Using:', fullHeight)
        
        captureOptions["width"] = fullWidth
        captureOptions["height"] = fullHeight
        captureOptions["x"] = 0
        captureOptions["y"] = 0
        captureOptions["scrollX"] = 0
        captureOptions["scrollY"] = 0
      } else if (targetRef.current) {
        // VISIBLE MODE: Capture current viewport
        console.log('Intensity Visible mode - capturing viewport at scroll position:', currentScrollLeft)
        const rect = targetRef.current.getBoundingClientRect()
        captureOptions["width"] = rect.width
        captureOptions["height"] = rect.height
        captureOptions["x"] = 0
        captureOptions["y"] = 0
      }

      const canvas = await html2canvas(targetRef.current, captureOptions)

      // Restore original styles
      if (scrollContainer && synchronizedContainer) {
        scrollContainer.style.overflow = originalStyles.scrollOverflow
        scrollContainer.style.width = originalStyles.scrollWidth
        scrollContainer.style.minWidth = originalStyles.scrollMinWidth
        scrollContainer.style.height = originalStyles.scrollHeight
        scrollContainer.style.maxHeight = originalStyles.scrollMaxHeight
        synchronizedContainer.style.width = originalStyles.containerWidth
        synchronizedContainer.style.maxWidth = originalStyles.containerMaxWidth
        synchronizedContainer.style.height = originalStyles.containerHeight
        synchronizedContainer.style.maxHeight = originalStyles.containerMaxHeight
        
        if (targetRef.current) {
          targetRef.current.style.height = originalStyles.targetHeight
          targetRef.current.style.maxHeight = originalStyles.targetMaxHeight
          targetRef.current.style.overflow = originalStyles.targetOverflow
        }
      }

      // Remove temporary styles
      if (!isWhiteTheme && document.head.contains(printStyleSheet)) {
        document.head.removeChild(printStyleSheet)
      }

      // Download the image
      const link = document.createElement('a')
      link.download = 'intensity-report.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Error generating PNG:', error)
      alert('Failed to generate PNG. Please try again.')
    }
  }

  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [playerData, setPlayerData] = useState<PlayerWeeklyData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<string[]>([])
  const [players, setPlayers] = useState<string[]>([])
  const [isWhiteTheme, setIsWhiteTheme] = useState(false)
  const [exportFullWidth, setExportFullWidth] = useState(false)
  const [pngWhiteTheme, setPngWhiteTheme] = useState(false)

  const formatPlayerName = (fullName: string): string => {
    // Special cases for Cohen family
    if (fullName === 'Yarden Cohen') return 'Y. COHEN'
    if (fullName === 'Gil Cohen') return 'G. COHEN'
    // Special case for Ben Shimol (flexible matching)
    if (fullName.toLowerCase().includes('ben shimol') || fullName.toLowerCase().includes('ben-shimol')) {
      return 'BEN SHIMOL'
    }

    // For all other players, show only last name in uppercase
    const nameParts = fullName.split(' ')
    if (nameParts.length > 1) {
      return nameParts[nameParts.length - 1].toUpperCase()
    }
    return fullName.toUpperCase()
  }

  const formatDateToDDMMYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${month}-${year}`
  }



  // Helper function to get week start date from a date
  const getWeekStartDate = (date: Date): Date => {
    const weekStart = new Date(date)
    const dayOfWeek = weekStart.getDay() // 0 = Sunday, 1 = Monday, etc.
    weekStart.setDate(weekStart.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0) // Reset time to start of day
    return weekStart
  }

  // Helper function to generate consistent week string
  const generateWeekString = (date: Date): string => {
    const weekStart = getWeekStartDate(date)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return `${weekStart.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
  }

  // Helper function to extract start date from week string
  const getStartDateFromWeekString = (weekString: string): Date => {
    const startDateStr = weekString.split(' - ')[0]
    return new Date(startDateStr)
  }

  // Helper function to get month index from month name
  const getMonthIndex = (monthName: string): number => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']
    return months.indexOf(monthName)
  }

  useEffect(() => {
    fetchWeeklyData()
  }, [])

  const fetchWeeklyData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data using pagination to bypass Supabase limits
      const fetchAllData = async () => {
        let allData = []
        let from = 0
        const pageSize = 1000
        
        while (true) {
          const { data: pageData, error: pageError } = await supabase
            .from('weekly_load')
            .select('*')
            .order('date', { ascending: true })
            .range(from, from + pageSize - 1)
          
          if (pageError) throw pageError
          if (!pageData || pageData.length === 0) break
          
          allData.push(...pageData)
          
          if (pageData.length < pageSize) break
          from += pageSize
        }
        
        return allData
      }
      
      const data = await fetchAllData()
      const error = null

      if (error) {
        setError(`Error fetching data: ${(error as any).message}`)
        return
      }

      if (!data || data.length === 0) {
        setError('No data found. Please upload some fitness data first.')
        return
      }

      const processedData = processWeeklyData(data)
      setWeeklyData(processedData)
      
      const playerWeeklyData: PlayerWeeklyData = {}
      const weekSet = new Set<string>()
      const playerSet = new Set<string>()

      processedData.forEach(record => {
        // Skip excluded players
        if (isExcludedPlayer(record.player_name)) {
          return
        }
        
        if (!playerWeeklyData[record.player_name]) {
          playerWeeklyData[record.player_name] = {}
        }
        
        playerWeeklyData[record.player_name][record.week] = {
          vir_intensity: record.vir_intensity,
          target_intensity: record.target_intensity
        }
        
        weekSet.add(record.week)
        playerSet.add(record.player_name)
      })

      const sortedWeeks = Array.from(weekSet)
        .sort((a, b) => {
          const dateA = getStartDateFromWeekString(a)
          const dateB = getStartDateFromWeekString(b)
          return dateA.getTime() - dateB.getTime()
        })

      setPlayerData(playerWeeklyData)
      setWeeks(sortedWeeks)
      const allPlayers = Array.from(playerSet).sort()
      console.log('Intensity - All players loaded:', allPlayers)
      console.log('Intensity - Looking for Ben Shimol variants:', allPlayers.filter(p => p.toLowerCase().includes('ben')))
      setPlayers(allPlayers)
      
    } catch (err) {
      console.error('Error processing data:', err)
      setError('Error processing data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const processWeeklyData = (data: any[]): WeeklyData[] => {
    const weeklyGroups: { [key: string]: any[] } = {}
    
    data.forEach(record => {
      // Skip excluded players
      if (isExcludedPlayer(record.player_name)) {
        return
      }
      
      const date = new Date(record.date)
      const week = generateWeekString(date)
      
      const key = `${record.player_name}_${week}`
      
      if (!weeklyGroups[key]) {
        weeklyGroups[key] = []
      }
      
      weeklyGroups[key].push(record)
    })

    const result: WeeklyData[] = []
    
    Object.entries(weeklyGroups).forEach(([key, records]) => {
      const underscoreIndex = key.indexOf('_')
      const player_name = key.substring(0, underscoreIndex)
      const week = key.substring(underscoreIndex + 1)
      
      // Calculate totals for the weighted intensity formula
      const accelerationEfforts = records.reduce((sum, record) => sum + (record.acceleration_b3_efforts_gen2 || 0), 0)
      const decelerationEfforts = records.reduce((sum, record) => sum + (record.deceleration_b3_efforts_gen2 || 0), 0)
      const hsrDistance = records.reduce((sum, record) => sum + (record.high_speed_running_total_distance_b6 || 0), 0)
      const sprintDistance = records.reduce((sum, record) => sum + (record.very_high_speed_running_total_distance_b7 || 0), 0)
      
      // Intensity calculation: sum(high_speed)*0.35/600 + sum(acceleration)*0.25/35 + sum(deceleration)*0.2/30 + sum(sprint)*0.2/100
      const virIntensity = (hsrDistance * 0.35 / 600) + (accelerationEfforts * 0.25 / 35) + (decelerationEfforts * 0.2 / 30) + (sprintDistance * 0.2 / 100)
      
      const targetIntensity = records[0].target_intensity || 0
      
      result.push({
        player_name,
        week,
        vir_intensity: virIntensity,
        target_intensity: targetIntensity,
        date: records[0].date
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const formatIntensity = (intensity: number): string => {
    return (intensity * 100).toFixed(0) + '%'
  }

  const getPerformanceClass = (playerValue: number, weekAverage: number): string => {
    if (weekAverage === 0 || weekAverage === null || weekAverage === undefined) {
      return 'performance-none'
    }
    
    // Compare player value to average
    if (playerValue >= weekAverage) return 'performance-excellent'  // Green - Above average
    if (playerValue >= weekAverage * 0.9) return 'performance-warning'  // Orange - Within 10% of average
    return 'performance-critical'  // Red - More than 10% below average
  }

  const getIntensityPerformanceClass = (playerIntensity: number, week: string): string => {
    // Get all valid intensities for this week to calculate average
    const weekIntensities = players
      .map(player => playerData[player]?.[week]?.vir_intensity)
      .filter(intensity => intensity && intensity > 0)
    
    if (weekIntensities.length === 0) return 'performance-none'
    
    // Calculate average
    const average = weekIntensities.reduce((sum, intensity) => sum + intensity, 0) / weekIntensities.length
    
    // Compare player to average
    if (playerIntensity >= average) return 'performance-excellent'  // Green - Above average
    if (playerIntensity >= average * 0.9) return 'performance-warning'  // Orange - Within 10% of average
    return 'performance-critical'  // Red - More than 10% below average
  }




  if (loading) {
    return (
      <div className="loading">
        <Loader2 />
        <span>Loading intensity data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={fetchWeeklyData} className="btn btn-primary">
          Retry
        </button>
      </div>
    )
  }

  const handleDownloadLast5WeeksPNG = async () => {
    if (!targetRef.current) return

    try {
      // Get last 5 weeks
      const last5Weeks = weeks.slice(-5)

      // Create a temporary container for the PNG
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.backgroundColor = pngWhiteTheme ? '#ffffff' : '#000000'
      tempContainer.style.color = pngWhiteTheme ? '#000000' : '#FFD700'
      tempContainer.style.padding = '20px'
      tempContainer.style.fontFamily = 'sans-serif'

      // Create header
      const header = document.createElement('div')
      header.style.textAlign = 'center'
      header.style.marginBottom = '20px'
      header.style.display = 'flex'
      header.style.flexDirection = 'column'
      header.style.alignItems = 'center'

      // Add logo
      const logo = document.createElement('img')
      logo.src = '/beitar-logo.png'
      logo.style.maxHeight = '60px'
      logo.style.width = 'auto'
      logo.style.marginBottom = '10px'
      logo.onerror = () => { logo.style.display = 'none' }
      header.appendChild(logo)

      // Add titles
      const titleContainer = document.createElement('div')
      titleContainer.innerHTML = `
        <h1 style="color: ${pngWhiteTheme ? '#000000' : '#FFD700'}; margin: 0; font-size: 24px;">FCBJ DATA</h1>
        <h2 style="color: ${pngWhiteTheme ? '#000000' : '#FFD700'}; margin: 5px 0; font-size: 16px;">Intensity % - Last 5 Weeks</h2>
      `
      header.appendChild(titleContainer)
      tempContainer.appendChild(header)

      // Create table
      const table = document.createElement('table')
      table.style.borderCollapse = 'collapse'
      table.style.width = '100%'
      table.style.border = '2px solid #333'

      // Create header row
      const headerRow = document.createElement('tr')
      headerRow.style.backgroundColor = pngWhiteTheme ? '#f8f9fa' : '#333'

      const playerHeader = document.createElement('th')
      playerHeader.textContent = 'Player'
      playerHeader.style.border = pngWhiteTheme ? '1px solid #ddd' : '1px solid #333'
      playerHeader.style.padding = '8px'
      playerHeader.style.color = pngWhiteTheme ? '#000000' : '#FFD700'
      playerHeader.style.textAlign = 'center'
      headerRow.appendChild(playerHeader)

      last5Weeks.forEach((week, index) => {
        const weekHeader = document.createElement('th')
        weekHeader.innerHTML = `
          <div style="font-weight: bold;">W${weeks.length - 4 + index}</div>
          <div style="font-size: 10px; margin-top: 2px;">${week}</div>
        `
        weekHeader.style.border = pngWhiteTheme ? '1px solid #ddd' : '1px solid #333'
        weekHeader.style.padding = '8px'
        weekHeader.style.color = pngWhiteTheme ? '#000000' : '#FFD700'
        weekHeader.style.textAlign = 'center'
        weekHeader.style.fontSize = '12px'
        weekHeader.style.lineHeight = '1.2'
        headerRow.appendChild(weekHeader)
      })

      table.appendChild(headerRow)

      // Add player rows
      players.forEach(player => {
        const row = document.createElement('tr')

        const playerCell = document.createElement('td')
        playerCell.textContent = formatPlayerName(player)
        playerCell.style.border = pngWhiteTheme ? '1px solid #ddd' : '1px solid #333'
        playerCell.style.padding = '8px'
        playerCell.style.color = pngWhiteTheme ? '#000000' : '#FFD700'
        playerCell.style.textAlign = 'center'
        playerCell.style.fontSize = '13px'
        row.appendChild(playerCell)

        last5Weeks.forEach(week => {
          const cell = document.createElement('td')
          const data = playerData[player]?.[week]

          if (data && data.vir_intensity > 0) {
            cell.textContent = `${Math.round(data.vir_intensity * 100)}%`

            // Apply performance coloring
            const weekIntensities = players
              .map(p => playerData[p]?.[week]?.vir_intensity)
              .filter(intensity => intensity && intensity > 0)

            if (weekIntensities.length > 0) {
              const average = weekIntensities.reduce((sum, intensity) => sum + intensity, 0) / weekIntensities.length
              if (data.vir_intensity >= average) {
                cell.style.color = '#28a745'  // Green
              } else if (data.vir_intensity >= average * 0.9) {
                cell.style.color = '#fd7e14'  // Orange
              } else {
                cell.style.color = '#dc3545'  // Red
              }
            }
          } else {
            cell.textContent = '-'
            cell.style.color = pngWhiteTheme ? '#999' : '#666'
          }

          cell.style.border = pngWhiteTheme ? '1px solid #ddd' : '1px solid #333'
          cell.style.padding = '8px'
          cell.style.textAlign = 'center'
          cell.style.fontSize = '13px'
          row.appendChild(cell)
        })

        table.appendChild(row)
      })

      tempContainer.appendChild(table)
      document.body.appendChild(tempContainer)

      // Generate PNG
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: pngWhiteTheme ? '#ffffff' : '#000000',
        scale: 2,
        logging: false
      })

      // Download
      const link = document.createElement('a')
      link.download = 'intensity-last-5-weeks.png'
      link.href = canvas.toDataURL('image/png')
      link.click()

      // Cleanup
      document.body.removeChild(tempContainer)

    } catch (error) {
      console.error('Error generating PNG:', error)
      alert('Failed to generate PNG. Please try again.')
    }
  }

  return (
    <div className="intensity-view-section">
      <div className="distance-header-actions">
        <button
          onClick={() => setPngWhiteTheme(!pngWhiteTheme)}
          className="download-btn"
          style={{
            background: pngWhiteTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: pngWhiteTheme ? '#000' : '#FFD700',
            border: pngWhiteTheme ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 215, 0, 0.3)'
          }}
        >
          <Palette size={16} />
          PNG {pngWhiteTheme ? 'Dark' : 'Light'}
        </button>
        <button onClick={handleDownloadLast5WeeksPNG} className="download-btn">
          <Download size={16} />
          Last 5 Weeks PNG
        </button>
      </div>
      <div ref={targetRef} style={isWhiteTheme ? {
        backgroundColor: 'white',
        color: 'black'
      } : {}}>
        <div className="pdf-header" style={isWhiteTheme ? {
          backgroundColor: 'white',
          color: 'black'
        } : {}}>
          <div className="pdf-header-content">
            <img
              src="/beitar-logo.png"
              alt="FCBJ Logo"
              className="pdf-header-logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
              style={{
                maxHeight: '60px',
                width: 'auto'
              }}
            />
            <h1 className="pdf-header-title" style={isWhiteTheme ? { color: 'black' } : {}}>FCBJ DATA</h1>
          </div>
          <h2 className="pdf-subheader" style={isWhiteTheme ? { color: 'black', fontSize: '0.8em', textAlign: 'center', margin: '5px 0' } : { fontSize: '0.8em', textAlign: 'center', margin: '5px 0' }}>Intensity % - Matches + Trainings</h2>
        </div>
        <div className="intensity-synchronized-container" style={isWhiteTheme ? {
          backgroundColor: 'white',
          color: 'black'
        } : {}}>
          {/* Player Names Column (Fixed) */}
          <div className="intensity-players-column" style={isWhiteTheme ? {
            backgroundColor: 'white',
            color: 'black'
          } : {}}>
            <div className="intensity-header-cell" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black',
              borderColor: '#ddd'
            } : {}}>Player</div>
            <div className="intensity-player-cell average-label" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black',
              borderColor: '#ddd'
            } : {}}>AVERAGE</div>
            {players.map(player => (
              <div key={player} className="intensity-player-cell" style={isWhiteTheme ? {
                backgroundColor: 'white',
                color: 'black',
                borderColor: '#ddd'
              } : {}}>
                {formatPlayerName(player)}
              </div>
            ))}
          </div>

          {/* Scrollable Data Area */}
          <div className="intensity-data-scroll" style={isWhiteTheme ? {
            backgroundColor: 'white',
            color: 'black'
          } : {}}>
            {/* Header Row */}
            <div className="intensity-weeks-header" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black'
            } : {}}>
              {weeks.map((week, index) => (
                <div key={week} className="intensity-week-header" style={isWhiteTheme ? {
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: '#ddd'
                } : {}}>
                  <div className="week-number" style={isWhiteTheme ? { color: 'black' } : {}}>W{index + 1}</div>
                  <div className="week-dates" style={isWhiteTheme ? { color: 'black' } : {}}>
                    {week}
                  </div>
                </div>
              ))}
            </div>

            {/* Average Row */}
            <div className="intensity-data-row average-row" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black'
            } : {}}>
              {weeks.map(week => {
                // Calculate average for players who have data in this week
                const playersWithData = players.filter(player => playerData[player]?.[week])
                
                // Filter out zero values from intensity calculation
                const validIntensities = playersWithData
                  .map(player => playerData[player][week]?.vir_intensity || 0)
                  .filter(intensity => intensity > 0)
                
                const avgIntensity = validIntensities.length > 0 ? 
                  validIntensities.reduce((sum, intensity) => sum + intensity, 0) / validIntensities.length : 0
                
                return (
                  <div key={week} className="intensity-data-cell average-cell" style={isWhiteTheme ? {
                    backgroundColor: 'white',
                    color: 'black',
                    borderColor: '#ddd'
                  } : {}}>
                    {validIntensities.length > 0 ? (
                      <div className="cell-content-horizontal">
                        <div className="intensity-compact performance-none" style={isWhiteTheme ? { color: 'black' } : {}}>
                          {avgIntensity === 0 ? '-' : `${Math.round(avgIntensity * 100).toLocaleString('en-US')}%`}
                        </div>
                      </div>
                    ) : (
                      <div className="missing-week-content">
                        <div className="missing-week-placeholder">
                          <span className="missing-indicator" style={isWhiteTheme ? { color: 'black' } : {}}>-</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Player Rows */}
            {players.map(player => (
              <div key={player} className="intensity-data-row" style={isWhiteTheme ? {
                backgroundColor: 'white',
                color: 'black'
              } : {}}>
                {weeks.map(week => {
                  const data = playerData[player]?.[week]
                  return (
                    <div key={week} className="intensity-data-cell" style={isWhiteTheme ? {
                      backgroundColor: 'white',
                      color: 'black',
                      borderColor: '#ddd'
                    } : {}}>
                      {data ? (
                        <div className="cell-content-horizontal">
                          <div className={`intensity-compact ${getIntensityPerformanceClass(data.vir_intensity, week)}`} style={isWhiteTheme ? { color: 'black' } : {}}>
                            {data.vir_intensity === 0 ? '-' : `${Math.round(data.vir_intensity * 100).toLocaleString('en-US')}%`}
                          </div>
                        </div>
                      ) : (
                        <div className="missing-week-content">
                          <div className="missing-week-placeholder">
                            <span className="missing-indicator" style={isWhiteTheme ? { color: 'black' } : {}}>-</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 