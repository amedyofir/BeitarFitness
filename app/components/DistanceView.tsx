'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { isExcludedPlayer } from '../../lib/constants'
import { Loader2, Save, X, Download, Palette, Maximize2 } from 'lucide-react'
import generatePDF from 'react-to-pdf'
import html2canvas from 'html2canvas'

interface WeeklyData {
  player_name: string
  week: string
  total_distance: number
  target_km: number
  date: string
  notes?: string
}

interface PlayerWeeklyData {
  [playerName: string]: {
    [week: string]: {
      total_distance: number
      target_km: number
      notes?: string
    }
  }
}

interface EditingNote {
  player: string
  week: string
  notes: string
}

interface EditingMissingNote {
  player: string
  week: string
  notes: string
}

export default function DistanceView() {
  const targetRef = useRef<HTMLDivElement>(null)

  const handleDownloadPDF = () => {
    if (targetRef.current) {
      generatePDF(() => targetRef.current, {
        filename: 'distance-report.pdf',
        page: { margin: 20 }
      })
    }
  }

  const handleDownloadImage = async () => {
    if (!targetRef.current) return

    try {
      const scrollContainer = targetRef.current.querySelector('.distance-data-scroll') as HTMLElement
      const synchronizedContainer = targetRef.current.querySelector('.distance-synchronized-container') as HTMLElement
      
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

      // Force a reflow to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Force layout recalculation for full height capture
      if (exportFullWidth && targetRef.current) {
        targetRef.current.style.display = 'block'
        targetRef.current.style.position = 'static'
        
        // Calculate the actual content height by measuring all child elements
        const allRows = targetRef.current.querySelectorAll('.distance-data-row, .distance-players-column > div')
        const totalContentHeight = Array.from(allRows).reduce((height, row) => {
          const rect = (row as HTMLElement).getBoundingClientRect()
          return height + rect.height
        }, 0)
        
        // Add extra padding for headers and margins
        const estimatedFullHeight = totalContentHeight + 200
        
        console.log('Calculated content height:', totalContentHeight, 'Full height:', estimatedFullHeight)
        
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
          const clonedElement = clonedDoc.querySelector('.distance-synchronized-container') as HTMLElement
          const clonedScrollContainer = clonedDoc.querySelector('.distance-data-scroll') as HTMLElement
          const clonedPlayersColumn = clonedDoc.querySelector('.distance-players-column') as HTMLElement
          
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
            // Debug: Log the structure
            console.log('Player column children:', clonedPlayersColumn.children.length)
            console.log('Data scroll children:', clonedScrollContainer.children.length)
            
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
            
            // Ensure exact count match by checking structure
            const playerChildren = Array.from(clonedPlayersColumn.children)
            const dataChildren = Array.from(clonedScrollContainer.children)
            
            console.log('Player children details:')
            playerChildren.forEach((child, index) => {
              console.log(`${index}: ${child.className} - ${child.textContent?.trim()}`)
            })
            
            console.log('Data children details:')
            dataChildren.forEach((child, index) => {
              console.log(`${index}: ${child.className}`)
            })
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
              console.log('Visible mode - applying scroll offset:', currentScrollLeft)
              clonedScrollContainer.style.overflow = 'hidden'
              clonedScrollContainer.style.transform = `translateX(-${currentScrollLeft}px)`
              clonedScrollContainer.style.width = scrollContainer?.offsetWidth + 'px'
              clonedScrollContainer.style.height = scrollContainer?.offsetHeight + 'px'
            }
          }

          // Fix week headers row specifically
          const weeksHeader = clonedDoc.querySelector('.distance-weeks-header') as HTMLElement
          if (weeksHeader) {
            weeksHeader.style.display = 'flex'
            weeksHeader.style.width = '100%'
          }

          // Fix all cells borders and spacing
          const allCells = clonedDoc.querySelectorAll('.distance-data-cell, .distance-player-cell, .distance-header-cell, .distance-week-header, .distance-data-row')
          allCells.forEach((cell: Element) => {
            const htmlCell = cell as HTMLElement
            htmlCell.style.boxSizing = 'border-box'
            htmlCell.style.border = isWhiteTheme ? '1px solid #ddd' : '1px solid #333'
            htmlCell.style.margin = '0'
            htmlCell.style.padding = htmlCell.classList.contains('distance-data-row') ? '0' : htmlCell.style.padding
          })
          
          // Specifically fix data rows to remove gaps and ensure consistent height
          const dataRows = clonedDoc.querySelectorAll('.distance-data-row')
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
          const playerHeaderCell = clonedDoc.querySelector('.distance-header-cell') as HTMLElement
          const weekHeaders = clonedDoc.querySelector('.distance-weeks-header') as HTMLElement
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
          const playerCells = clonedDoc.querySelectorAll('.distance-player-cell')
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
          const allDataCells = clonedDoc.querySelectorAll('.distance-data-cell')
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
          const firstWeekCells = clonedDoc.querySelectorAll('.distance-week-header:first-child, .distance-data-cell:first-child')
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
        
        console.log('Full mode - Height measurements:', naturalHeight, boundingHeight, containerHeight, 'Using:', fullHeight)
        
        captureOptions["width"] = fullWidth
        captureOptions["height"] = fullHeight
        captureOptions["x"] = 0
        captureOptions["y"] = 0
        captureOptions["scrollX"] = 0
        captureOptions["scrollY"] = 0
      } else if (targetRef.current) {
        // VISIBLE MODE: Capture current viewport
        console.log('Visible mode - capturing viewport at scroll position:', currentScrollLeft)
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

      // Download the image
      const link = document.createElement('a')
      link.download = 'distance-report.png'
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
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null)
  const [editingMissingNote, setEditingMissingNote] = useState<EditingMissingNote | null>(null)
  const [isUpdatingNote, setIsUpdatingNote] = useState(false)
  const [isUpdatingMissingNote, setIsUpdatingMissingNote] = useState(false)
  const [isWhiteTheme, setIsWhiteTheme] = useState(false)
  const [exportFullWidth, setExportFullWidth] = useState(false)
  const [pngWhiteTheme, setPngWhiteTheme] = useState(false)

  // Helper function to get week start date from a date
  const getWeekStartDate = (date: Date): Date => {
    const weekStart = new Date(date)
    const dayOfWeek = weekStart.getDay() // 0 = Sunday, 1 = Monday, etc.
    weekStart.setDate(weekStart.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0) // Reset time to start of day
    return weekStart
  }

  // Helper function to generate consistent week string
  const formatDateToDDMMYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${month}-${year}`
  }

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
          total_distance: record.total_distance,
          target_km: record.target_km,
          notes: record.notes || ''
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
      console.log('All players loaded:', allPlayers)
      console.log('Looking for Ben Shimol variants:', allPlayers.filter(p => p.toLowerCase().includes('ben')))
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
      
      const totalDistance = records.reduce((sum, record) => sum + (record.total_distance || 0), 0)
      const targetKm = records[0].target_km || 0
      const firstNote = records.find(r => r.notes && r.notes.trim())?.notes || ''
      
      result.push({
        player_name,
        week,
        total_distance: totalDistance,
        target_km: targetKm,
        date: records[0].date,
        notes: firstNote
      })
    })

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const formatDistance = (distance: number): string => {
    // Format the distance as an integer with thousands separator
    return Math.round(distance).toLocaleString('en-US')
  }

  const getPerformanceClass = (actualValue: number, targetValue: number): string => {
    if (targetValue === 0) return 'performance-none'
    const percentage = (actualValue / targetValue) * 100
    if (percentage >= 97) return 'performance-excellent'  // Green: 97% and above
    if (percentage >= 85) return 'performance-warning'    // Orange: 85%-97%  
    return 'performance-critical'                          // Red: below 85%
  }

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

  // Note editing functions
  const startEditingNote = (player: string, week: string) => {
    const currentNotes = playerData[player]?.[week]?.notes || ''
    setEditingNote({
      player,
      week,
      notes: currentNotes
    })
  }

  const cancelEditingNote = () => {
    setEditingNote(null)
  }

  const saveNote = async () => {
    if (!editingNote) return

    setIsUpdatingNote(true)
    try {
      // Update all records for this player/week with the new note
      const weekStart = getStartDateFromWeekString(editingNote.week)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const { error } = await supabase
        .from('weekly_load')
        .update({ notes: editingNote.notes })
        .eq('player_name', editingNote.player)
        .gte('date', weekStart.toISOString().split('T')[0])
        .lt('date', weekEnd.toISOString().split('T')[0])

      if (error) {
        console.error('Error updating note:', error)
        alert('Failed to update note')
        return
      }

      // Update local state
      setPlayerData(prevData => ({
        ...prevData,
        [editingNote.player]: {
          ...prevData[editingNote.player],
          [editingNote.week]: {
            ...prevData[editingNote.player][editingNote.week],
            notes: editingNote.notes
          }
        }
      }))

      setEditingNote(null)
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note')
    } finally {
      setIsUpdatingNote(false)
    }
  }

  // Missing week note functions
  const startEditingMissingNote = (player: string, week: string) => {
    setEditingMissingNote({
      player,
      week,
      notes: ''
    })
  }

  const cancelEditingMissingNote = () => {
    setEditingMissingNote(null)
  }

  const saveMissingNote = async () => {
    if (!editingMissingNote) return

    setIsUpdatingMissingNote(true)
    try {
      // Get the first date of the week
      const weekStart = getStartDateFromWeekString(editingMissingNote.week)
      
      // Create a new record with minimal data and the note
      const newRecord = {
        player_name: editingMissingNote.player,
        period_name: 'NOTE_ONLY',
        period_number: 0,
        date: weekStart.toISOString().split('T')[0],
        day_name: weekStart.toLocaleDateString('en-US', { weekday: 'long' }),
        activity_name: 'Missing Week Note',
        total_duration: '00:00:00',
        total_distance: 0,
        maximum_velocity: 0,
        acceleration_b3_efforts_gen2: 0,
        deceleration_b3_efforts_gen2: 0,
        rhie_total_bouts: 0,
        meterage_per_minute: 0,
        high_speed_running_total_distance_b6: 0,
        velocity_b4_plus_total_efforts_gen2: 0,
        very_high_speed_running_total_distance_b7: 0,
        running_imbalance: 0,
        hmld_gen2: 0,
        hmld_per_min_gen2: 0,
        target_km: 0,
        target_intensity: 0,
        notes: editingMissingNote.notes
      }

      const { error } = await supabase
        .from('weekly_load')
        .insert([newRecord])

      if (error) {
        console.error('Error creating missing note record:', error)
        alert('Failed to save note')
        return
      }

      // Update local state to show the new note
      setPlayerData(prevData => ({
        ...prevData,
        [editingMissingNote.player]: {
          ...prevData[editingMissingNote.player],
          [editingMissingNote.week]: {
            total_distance: 0,
            target_km: 0,
            notes: editingMissingNote.notes
          }
        }
      }))

      setEditingMissingNote(null)
    } catch (error) {
      console.error('Error saving missing note:', error)
      alert('Failed to save note')
    } finally {
      setIsUpdatingMissingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <Loader2 />
        <span>Loading distance data...</span>
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
        <h2 style="color: ${pngWhiteTheme ? '#000000' : '#FFD700'}; margin: 5px 0; font-size: 16px;">Total Distance - Last 5 Weeks</h2>
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

          if (data && data.total_distance > 0) {
            cell.textContent = formatDistance(data.total_distance)

            // Apply performance coloring based on target
            const performanceClass = getPerformanceClass(data.total_distance, data.target_km * 1000)
            if (performanceClass === 'performance-excellent') {
              cell.style.color = '#28a745'  // Green
            } else if (performanceClass === 'performance-warning') {
              cell.style.color = '#fd7e14'  // Orange
            } else if (performanceClass === 'performance-critical') {
              cell.style.color = '#dc3545'  // Red
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
      link.download = 'distance-last-5-weeks.png'
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
    <div className="distance-view-section">
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
          <h2 className="pdf-subheader" style={isWhiteTheme ? { color: 'black', fontSize: '0.8em', textAlign: 'center', margin: '5px 0' } : { fontSize: '0.8em', textAlign: 'center', margin: '5px 0' }}>Total Distance - Matches + Trainings</h2>
        </div>
        <div className="distance-synchronized-container" style={isWhiteTheme ? {
          backgroundColor: 'white',
          color: 'black'
        } : {}}>
          {/* Player Names Column (Fixed) */}
          <div className="distance-players-column" style={isWhiteTheme ? {
            backgroundColor: 'white',
            color: 'black'
          } : {}}>
            <div className="distance-header-cell" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black',
              borderColor: '#ddd'
            } : {}}>Player</div>
            <div className="distance-player-cell average-label" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black',
              borderColor: '#ddd'
            } : {}}>AVERAGE</div>
            {players.map(player => (
              <div key={player} className="distance-player-cell" style={isWhiteTheme ? {
                backgroundColor: 'white',
                color: 'black',
                borderColor: '#ddd'
              } : {}}>
                {formatPlayerName(player)}
              </div>
            ))}
          </div>

          {/* Scrollable Data Area */}
          <div className="distance-data-scroll" style={isWhiteTheme ? {
            backgroundColor: 'white',
            color: 'black'
          } : {}}>
            {/* Header Row */}
            <div className="distance-weeks-header" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black'
            } : {}}>
              {weeks.map((week, index) => (
                <div key={week} className="distance-week-header" style={isWhiteTheme ? {
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
            <div className="distance-data-row average-row" style={isWhiteTheme ? {
              backgroundColor: 'white',
              color: 'black'
            } : {}}>
              {weeks.map(week => {
                // Calculate average for players who have data in this week
                const playersWithData = players.filter(player => playerData[player]?.[week])
                
                // Filter out zero values from distance calculation
                const validDistances = playersWithData
                  .map(player => playerData[player][week]?.total_distance || 0)
                  .filter(distance => distance > 0)
                
                const avgDistance = validDistances.length > 0 ? 
                  validDistances.reduce((sum, distance) => sum + distance, 0) / validDistances.length : 0
                const weekTarget = playersWithData.find(player => playerData[player]?.[week])
                  ? playerData[playersWithData.find(player => playerData[player]?.[week])!][week]?.target_km || 0
                  : 0
                
                return (
                  <div key={week} className="distance-data-cell average-cell" style={isWhiteTheme ? {
                    backgroundColor: 'white',
                    color: 'black',
                    borderColor: '#ddd'
                  } : {}}>
                    {validDistances.length > 0 ? (
                      <div className="cell-content-horizontal">
                        <div className={`distance-compact ${getPerformanceClass(avgDistance, weekTarget * 1000)}`} style={isWhiteTheme ? { color: 'black' } : {}}>
                          {avgDistance === 0 ? '-' : formatDistance(avgDistance)}
                        </div>
                      </div>
                    ) : (
                      <div className="missing-cell" style={isWhiteTheme ? { color: 'black' } : {}}>No data</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Player Rows */}
            {players.map(player => (
              <div key={player} className="distance-data-row" style={isWhiteTheme ? {
                backgroundColor: 'white',
                color: 'black'
              } : {}}>
                {weeks.map(week => {
                  const data = playerData[player]?.[week]
                  return (
                    <div key={week} className="distance-data-cell" style={isWhiteTheme ? {
                      backgroundColor: 'white',
                      color: 'black',
                      borderColor: '#ddd'
                    } : {}}>
                      {data ? (
                        <div className="cell-content-horizontal">
                          <div className={`distance-compact ${getPerformanceClass(data.total_distance, data.target_km * 1000)}`} style={isWhiteTheme ? { color: 'black' } : {}}>
                            {data.total_distance === 0 ? '-' : formatDistance(data.total_distance)}
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