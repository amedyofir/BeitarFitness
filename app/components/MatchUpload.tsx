'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Upload, Calendar, Trophy, Camera } from 'lucide-react'

interface MatchSettings {
  date: string
  opponentId: string
  opponentName: string
  opponentLogo: string
  score: string
  competition: string
  round: string
  formation: string
}

interface Opponent {
  team_id: string
  team_name: string
  logo?: string
}

interface MatchCsvData {
  'Player Name': string
  'Period Name': string
  'Period Number': number
  'Date': string
  'Day Name': string
  'Activity Name': string
  'Total Duration': string
  'Total Distance': number
  'Maximum Velocity': number
  'Acceleration B3 Efforts (Gen 2)': number
  'Deceleration B3 Efforts (Gen 2)': number
  'RHIE Total Bouts': number
  'Meterage Per Minute': number
  'High Speed Running Total Distance B6': number
  'Velocity B4+ Total # Efforts (Gen2)': number
  'Very High Speed Running Total Distance B7': number
  'Running Imbalance': number
  'HMLD (Gen 2)': number
  'HMLD / Min (Gen 2)': number
  [key: string]: any
}

interface CatapultMatchData {
  id?: string
  match_id?: string
  player_id: string
  player_name?: string
  total_duration: string
  total_distance: number
  meterage_per_minute: number
  high_speed_distance: number
  sprint_distance: number
  accelerations: number
  decelerations: number
  max_velocity: number
  intensity: number
  status?: string
  game_position?: string
  created_at?: string
  updated_at?: string
}

// Formation position definitions (updated for 2x height pitch)
const FORMATION_POSITIONS: {[key: string]: {[key: string]: {x: number, y: number, label: string}}} = {
  '4-3-3': {
    'RB': { x: 85, y: 70, label: 'RB' },
    'RCB': { x: 65, y: 77, label: 'RCB' },
    'LCB': { x: 35, y: 77, label: 'LCB' },
    'LB': { x: 15, y: 70, label: 'LB' },
    'DMC': { x: 50, y: 57, label: 'DMC' },
    'RAM': { x: 65, y: 37, label: 'RAM' },
    'LAM': { x: 35, y: 37, label: 'LAM' },
    'RW': { x: 80, y: 17, label: 'RW' },
    'ST': { x: 50, y: 7, label: 'ST' },
    'LW': { x: 20, y: 17, label: 'LW' }
  },
  '4-4-2': {
    'RB': { x: 80, y: 77, label: 'RB' },
    'RCB': { x: 65, y: 77, label: 'RCB' },
    'LCB': { x: 35, y: 77, label: 'LCB' },
    'LB': { x: 20, y: 77, label: 'LB' },
    'RM': { x: 85, y: 52, label: 'RM' },
    'RCM': { x: 65, y: 52, label: 'RCM' },
    'LCM': { x: 35, y: 52, label: 'LCM' },
    'LM': { x: 15, y: 52, label: 'LM' },
    'RST': { x: 60, y: 12, label: 'RST' },
    'LST': { x: 40, y: 12, label: 'LST' }
  },
  '4-2-3-1': {
    'RB': { x: 80, y: 77, label: 'RB' },
    'RCB': { x: 65, y: 77, label: 'RCB' },
    'LCB': { x: 35, y: 77, label: 'LCB' },
    'LB': { x: 20, y: 77, label: 'LB' },
    'RCDM': { x: 60, y: 62, label: 'RCDM' },
    'LCDM': { x: 40, y: 62, label: 'LCDM' },
    'RAM': { x: 75, y: 32, label: 'RAM' },
    'CAM': { x: 50, y: 27, label: 'CAM' },
    'LAM': { x: 25, y: 32, label: 'LAM' },
    'ST': { x: 50, y: 10, label: 'ST' }
  }
}

export default function MatchUpload() {
  const [matchSettings, setMatchSettings] = useState<MatchSettings>({
    date: '',
    opponentId: '',
    opponentName: '',
    opponentLogo: '',
    score: '',
    competition: '',
    round: '',
    formation: ''
  })
  
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')
    const [squadPlayers, setSquadPlayers] = useState<{[key: string]: {id: string, profilePic?: string, fullName?: string}}>({}) 
  const [opponents, setOpponents] = useState<Opponent[]>([])
  const [processedData, setProcessedData] = useState<CatapultMatchData[]>([])
  const [playerStatuses, setPlayerStatuses] = useState<{[key: string]: string}>({})
  const [playerPositions, setPlayerPositions] = useState<{[key: string]: string}>({})
  const [showStatusAssignment, setShowStatusAssignment] = useState(false)
  const [showPositionAssignment, setShowPositionAssignment] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)

  // Fetch squad players and opponents on component mount
  useEffect(() => {
    fetchSquadPlayers()
    fetchOpponents()
  }, [])

  const fetchSquadPlayers = async () => {
    try {
      console.log('Fetching squad players from database...')
      const { data, error } = await supabase
        .from('squad_players')
        .select('player_id, first_name, last_name, profile_picture_url, full_name')

      console.log('Database response - data:', data)
      console.log('Database response - error:', error)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No squad players found in database!')
        setSquadPlayers({})
        return
      }

      // Create a mapping of CSV names to player data (handling name differences)
      const playerMap: {[key: string]: {id: string, profilePic?: string, fullName?: string}} = {}
      
      // CSV name -> Database lookup mapping
      const csvToDbMapping: {[key: string]: string} = {
        'Adi yona': 'Adi Yona',
        'Ailison Tavares': 'Aílson Tavares', 
        'Ariel Mendy': '5ad49c21-50da-4a5b-9ba6-060816fedafb',
        'Aviel Zargari': 'Aviel Zargary',
        'Brayen Karabali': 'Brayan Carabali',
        'Gregory Morozov': 'Grigori Morozov',
        'Jhonboco Kalu': 'Johnbosco Kalu',
        'Leon Mizrahi': 'Li-On Mizrahi',
        'Timothy Mozi': 'Timothy Muzie',
        'Levi Yarin': 'Yarin Levi',
        'Nehorai Dabush': 'Nehoray Dabush',
        'Zohar Zesano': 'Zohar Zasno'
      }
      
      // Create lookup by database names
      const dbNameToId: {[key: string]: {id: string, profilePic?: string, fullName?: string}} = {}
      data?.forEach(player => {
        const fullName = `${player.first_name} ${player.last_name}`
        dbNameToId[fullName] = {
          id: player.player_id,
          profilePic: player.profile_picture_url || undefined,
          fullName: player.full_name || fullName
        }
      })
      
      // Map CSV names to player data
      Object.entries(csvToDbMapping).forEach(([csvName, dbNameOrId]) => {
        // Check if the mapping is a direct player ID
        if (dbNameOrId.includes('-')) {
          // Find player data from the original data array using the ID
          const playerData = data?.find(p => p.player_id === dbNameOrId)
          if (playerData) {
            playerMap[csvName] = {
              id: dbNameOrId,
              profilePic: playerData.profile_picture_url || undefined,
              fullName: playerData.full_name || `${playerData.first_name} ${playerData.last_name}`
            }
            console.log(`Mapped CSV "${csvName}" directly to ID "${dbNameOrId}"`)
          }
        } else if (dbNameToId[dbNameOrId]) {
          // Regular name-based mapping
          playerMap[csvName] = dbNameToId[dbNameOrId]
          console.log(`Mapped CSV "${csvName}" -> DB "${dbNameOrId}" -> ${dbNameToId[dbNameOrId].id}`)
        }
      })
      
      // Also add direct matches (names that are identical)
      data?.forEach(player => {
        const fullName = `${player.first_name} ${player.last_name}`
        if (!Object.values(csvToDbMapping).includes(fullName)) {
          playerMap[fullName] = {
            id: player.player_id,
            profilePic: player.profile_picture_url || undefined,
            fullName: player.full_name || fullName
          }
          console.log(`Direct mapped: "${fullName}" -> ${player.player_id}`)
        }
      })
      
      setSquadPlayers(playerMap)
      console.log('Squad players loaded from database:', playerMap)
      console.log('Total players mapped:', Object.keys(playerMap).length)
      
      // Debug profile pictures
      console.log('=== SQUAD PLAYERS DEBUG ===')
      console.log('Raw data from database:', data)
      Object.entries(playerMap).forEach(([name, data]) => {
        console.log(`Player "${name}" -> ID: ${data.id}, Full Name: ${data.fullName || 'No full name'}, Profile: ${data.profilePic || 'No photo'}`)
      })
      console.log('=== END SQUAD PLAYERS DEBUG ===')
      
      // Check if any players have profile pictures
      const playersWithPics = Object.values(playerMap).filter(p => p.profilePic).length
      console.log(`Players with profile pictures: ${playersWithPics}/${Object.keys(playerMap).length}`)
    } catch (error) {
      console.error('Error fetching squad players:', error)
    }
  }

  const fetchOpponents = async () => {
    try {
      console.log('Fetching opponents from database...')
      const { data, error } = await supabase
        .from('opponents')
        .select('team_id, team_name, logo')
        .order('team_name')

      if (error) {
        console.error('Error fetching opponents:', error)
        return
      }

      setOpponents(data || [])
      console.log('Opponents loaded:', data)
    } catch (error) {
      console.error('Error fetching opponents:', error)
    }
  }

  const handleMatchSettingsChange = (field: keyof MatchSettings, value: string) => {
    if (field === 'opponentId') {
      // When opponent changes, update name and logo too
      const selectedOpponent = opponents.find(opp => opp.team_id === value)
      setMatchSettings(prev => ({ 
        ...prev, 
        opponentId: value,
        opponentName: selectedOpponent?.team_name || '',
        opponentLogo: selectedOpponent?.logo || ''
      }))
    } else {
      setMatchSettings(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setMessage('')
    } else {
      setMessage('Please select a valid CSV file')
      setMessageType('error')
    }
  }

  const parseDuration = (duration: string): number => {
    // Parse duration in format "1:39:05" to minutes
    const parts = duration.split(':')
    if (parts.length === 3) {
      const hours = parseInt(parts[0])
      const minutes = parseInt(parts[1])
      const seconds = parseInt(parts[2])
      return hours * 60 + minutes + seconds / 60
    }
    return 0
  }

  interface HeaderMapping {
    playerName: string
    periodName: string
    highSpeedDistance?: string
    sprintDistance?: string
    acceleration?: string
    deceleration?: string
    maxVelocity?: string
    totalDistance?: string
    totalDuration?: string
  }

  const processCsvData = (csvData: MatchCsvData[], headers: HeaderMapping): CatapultMatchData[] => {
    // Group data by player and filter for halves only
    const playerGroups: { [key: string]: MatchCsvData[] } = {}
    
    console.log('Processing CSV data, total rows:', csvData.length)
    
          csvData.forEach((row, index) => {
        const periodName = (row as any)[headers.periodName]
        const playerName = (row as any)[headers.playerName]
        
        console.log(`Row ${index}: Player="${playerName}", Period="${periodName}"`)
        
        const normalizedPeriod = periodName?.toLowerCase().trim()
        if (normalizedPeriod === 'half 1' || normalizedPeriod === 'half 2') {
          if (!playerGroups[playerName]) {
            playerGroups[playerName] = []
          }
          playerGroups[playerName].push(row)
        }
      })

    console.log('Players with half data:', Object.keys(playerGroups))

    // Process each player's data
    const processedData: Omit<CatapultMatchData, 'id' | 'match_id' | 'created_at' | 'updated_at'>[] = []
    
    Object.entries(playerGroups).forEach(([playerName, playerData]) => {
      // Get player data from squad players
      const playerInfo = squadPlayers[playerName]
      if (!playerInfo) {
        console.log(`Player "${playerName}" not found in squad players, skipping`)
        return
      }
      const playerId = playerInfo.id
      // Sum all metrics except max velocity using dynamic headers
      const totalDistance = headers.totalDistance ? 
        playerData.reduce((sum, row) => sum + ((row as any)[headers.totalDistance!] || 0), 0) : 0
      const totalAccelerations = headers.acceleration ? 
        playerData.reduce((sum, row) => sum + ((row as any)[headers.acceleration!] || 0), 0) : 0
      const totalDecelerations = headers.deceleration ? 
        playerData.reduce((sum, row) => sum + ((row as any)[headers.deceleration!] || 0), 0) : 0
      const totalHighSpeedDistance = headers.highSpeedDistance ? 
        playerData.reduce((sum, row) => sum + ((row as any)[headers.highSpeedDistance!] || 0), 0) : 0
      const totalSprintDistance = headers.sprintDistance ? 
        playerData.reduce((sum, row) => sum + ((row as any)[headers.sprintDistance!] || 0), 0) : 0
      
      console.log(`${playerName} - High Speed Distance total: ${totalHighSpeedDistance} (using header: "${headers.highSpeedDistance}")`)
      console.log(`${playerName} - Sample high speed values:`, headers.highSpeedDistance ? playerData.slice(0, 2).map(row => (row as any)[headers.highSpeedDistance!]) : [])
      
      // Get max velocity (not sum)
      const maxVelocity = headers.maxVelocity ? 
        Math.max(...playerData.map(row => (row as any)[headers.maxVelocity!] || 0)) : 0
      
      // Calculate total duration (sum of all periods)
      const totalDurationMinutes = headers.totalDuration ? 
        playerData.reduce((sum, row) => {
          return sum + parseDuration((row as any)[headers.totalDuration!] || '0:0:0')
        }, 0) : 0
      
      // Convert back to duration format (hours:minutes:seconds)
      const hours = Math.floor(totalDurationMinutes / 60)
      const minutes = Math.floor(totalDurationMinutes % 60)
      const seconds = Math.floor((totalDurationMinutes % 1) * 60)
      const totalDuration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      
      // Calculate meterage per minute (ensure no division by zero)
      const meteragePerMinute = totalDurationMinutes > 0 ? totalDistance / totalDurationMinutes : 0
      
      // Calculate intensity: (High Speed + Sprint Distance) / Total Distance
      const intensity = totalDistance > 0 ? (totalHighSpeedDistance + totalSprintDistance) / totalDistance : 0
      
      processedData.push({
        player_id: playerId,
        player_name: playerInfo.fullName || playerName,
        total_duration: totalDuration,
        total_distance: totalDistance || 0,
        meterage_per_minute: meteragePerMinute || 0,
        high_speed_distance: totalHighSpeedDistance || 0,
        sprint_distance: totalSprintDistance || 0,
        accelerations: totalAccelerations || 0,
        decelerations: totalDecelerations || 0,
        max_velocity: maxVelocity || 0,
        intensity: intensity || 0
      })
    })
    
    return processedData as CatapultMatchData[]
  }

  const handleUpload = async () => {
    if (!csvFile || !matchSettings.date || !matchSettings.opponentId) {
      setMessage('Please fill in match settings and select a CSV file')
      setMessageType('error')
      return
    }

    setUploading(true)
    setMessage('')

    try {
      // Read CSV file
      const csvText = await csvFile.text()
      console.log('Raw CSV text (first 500 chars):', csvText.substring(0, 500))
      
      // More robust CSV parsing - handle different encodings and separators
      const lines = csvText.split(/\r?\n/).filter(line => line.trim())
      console.log('Total lines found:', lines.length)
      console.log('First few lines:', lines.slice(0, 5).map((line, i) => `Line ${i}: ${JSON.stringify(line)}`))
      
      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty or has insufficient data')
      }
      
      // Find the header line by looking for "Player Name" and "Period Name"
      let headerLineIndex = -1
      let headerLine = ''
      let separator = '\t'
      
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i]
        console.log(`Checking line ${i} for headers:`, JSON.stringify(line))
        
        // Check if this line contains player name and period name (case insensitive)
        if (line.toLowerCase().includes('player') && 
            line.toLowerCase().includes('name') && 
            line.toLowerCase().includes('period')) {
          headerLineIndex = i
          headerLine = line
          
          // Determine separator
          if (line.includes('\t')) {
            separator = '\t'
          } else {
            separator = ','
          }
          
          console.log(`Found header line at index ${i}`)
          break
        }
      }
      
      if (headerLineIndex === -1) {
        throw new Error(`Could not find header line containing "Player Name" and "Period Name". First 5 lines: ${lines.slice(0, 5).join(' | ')}`)
      }
      
      console.log('Using separator:', separator === '\t' ? 'TAB' : 'COMMA')
      console.log('Header line:', JSON.stringify(headerLine))
      
      // Parse headers
      const headers = headerLine.split(separator).map(h => h.trim().replace(/["']/g, ''))
      console.log('Headers found:', headers)
      console.log('Header count:', headers.length)
      
      // Find high speed distance header
      const highSpeedHeader = headers.find(h => h.toLowerCase().includes('high speed') && h.toLowerCase().includes('distance'))
      const sprintHeader = headers.find(h => h.toLowerCase().includes('very high speed') && h.toLowerCase().includes('distance'))
      const accelerationHeader = headers.find(h => h.toLowerCase().includes('acceleration') && h.toLowerCase().includes('efforts'))
      const decelerationHeader = headers.find(h => h.toLowerCase().includes('deceleration') && h.toLowerCase().includes('efforts'))
      const maxVelocityHeader = headers.find(h => h.toLowerCase().includes('maximum') && h.toLowerCase().includes('velocity'))
      const totalDistanceHeader = headers.find(h => h.toLowerCase().includes('total') && h.toLowerCase().includes('distance') && !h.toLowerCase().includes('high'))
      const totalDurationHeader = headers.find(h => h.toLowerCase().includes('total') && h.toLowerCase().includes('duration'))
      
      console.log('Key headers found:')
      console.log('High Speed Distance:', highSpeedHeader)
      console.log('Sprint Distance:', sprintHeader)
      console.log('Acceleration:', accelerationHeader)
      console.log('Deceleration:', decelerationHeader)
      console.log('Max Velocity:', maxVelocityHeader)
      console.log('Total Distance:', totalDistanceHeader)
      console.log('Total Duration:', totalDurationHeader)
      
      // Find the correct header names (case insensitive)
      const playerNameHeader = headers.find(h => h.toLowerCase().includes('player') && h.toLowerCase().includes('name'))
      const periodNameHeader = headers.find(h => h.toLowerCase().includes('period') && h.toLowerCase().includes('name'))
      
      console.log('Player Name Header:', playerNameHeader)
      console.log('Period Name Header:', periodNameHeader)
      
      if (!playerNameHeader || !periodNameHeader) {
        throw new Error(`Could not find required headers. Looking for headers containing "player name" and "period name". Found headers: ${headers.join(', ')}`)
      }
      
      const csvData: MatchCsvData[] = []
      // Start parsing data from the line after the header line
      for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (line) {
          const values = line.split(separator).map(v => v.trim().replace(/["']/g, ''))
          const row: any = {}
          
          console.log(`Line ${i} values count: ${values.length}, player: "${values[headers.indexOf(playerNameHeader)]}", period: "${values[headers.indexOf(periodNameHeader)]}"`)
          
          headers.forEach((header, index) => {
            const value = values[index] || ''
            if (header && (header.includes('Distance') || header.includes('Velocity') || header.includes('Efforts') || header.includes('Number'))) {
              row[header] = parseFloat(value) || 0
            } else {
              row[header] = value
            }
          })
          csvData.push(row as MatchCsvData)
        }
      }
      
      console.log('Total CSV rows parsed:', csvData.length)
      console.log('Sample CSV data (first row):', csvData[0])
      console.log('Sample player name from first row:', (csvData[0] as any)?.[playerNameHeader])
      console.log('Sample period name from first row:', (csvData[0] as any)?.[periodNameHeader])

      // Process the CSV data with all header mappings
      const processedPlayerData = processCsvData(csvData, {
        playerName: playerNameHeader,
        periodName: periodNameHeader,
        highSpeedDistance: highSpeedHeader,
        sprintDistance: sprintHeader,
        acceleration: accelerationHeader,
        deceleration: decelerationHeader,
        maxVelocity: maxVelocityHeader,
        totalDistance: totalDistanceHeader,
        totalDuration: totalDurationHeader
      })

      // Set processed data and initialize player statuses
      setProcessedData(processedPlayerData)
      const initialStatuses: {[key: string]: string} = {}
      processedPlayerData.forEach(player => {
        initialStatuses[player.player_id] = 'starter' // Default to starter
      })
      setPlayerStatuses(initialStatuses)
      setShowStatusAssignment(true)
      
      setMessage(`CSV processed successfully! Please assign player statuses below.`)
      setMessageType('success')
      
    } catch (error) {
      console.error('Upload error:', error)
      setMessage(`Upload failed: ${(error as Error).message}`)
      setMessageType('error')
    } finally {
      setUploading(false)
    }
  }

  const handleStatusChange = (playerId: string, status: string) => {
    setPlayerStatuses(prev => ({
      ...prev,
      [playerId]: status
    }))
  }

  const handlePositionAssignment = (playerId: string, position: string) => {
    setPlayerPositions(prev => ({
      ...prev,
      [playerId]: position
    }))
  }

  const proceedToPositionAssignment = () => {
    setShowStatusAssignment(false)
    setShowPositionAssignment(true)
  }

  const getStartingPlayers = () => {
    return processedData.filter(player => playerStatuses[player.player_id] === 'starter')
  }

  const getSubstitutePlayers = () => {
    return processedData.filter(player => playerStatuses[player.player_id] === 'substitute')
  }

  const getUnusedPlayers = () => {
    return processedData.filter(player => playerStatuses[player.player_id] === 'unused')
  }

  const getPlayerInPosition = (position: string) => {
    const playerId = Object.keys(playerPositions).find(id => playerPositions[id] === position)
    return playerId ? processedData.find(p => p.player_id === playerId) : null
  }

  const removePlayerFromPosition = (position: string) => {
    const playerId = Object.keys(playerPositions).find(id => playerPositions[id] === position)
    if (playerId) {
      setPlayerPositions(prev => {
        const newPositions = { ...prev }
        delete newPositions[playerId]
        return newPositions
      })
    }
  }

  const handlePositionClick = (position: string) => {
    const assignedPlayer = getPlayerInPosition(position)
    if (assignedPlayer) {
      // If position is filled, remove the player
      removePlayerFromPosition(position)
    } else {
      // If position is empty, show player selection modal
      setSelectedPosition(position)
      setShowPlayerModal(true)
    }
  }

  const assignPlayerToPosition = (playerId: string) => {
    if (selectedPosition) {
      // Remove player from any existing position first
      setPlayerPositions(prev => {
        const newPositions = { ...prev }
        // Remove player from previous position if assigned
        Object.keys(newPositions).forEach(id => {
          if (id === playerId) {
            delete newPositions[id]
          }
        })
        // Assign to new position
        newPositions[playerId] = selectedPosition
        return newPositions
      })
      setShowPlayerModal(false)
      setSelectedPosition(null)
    }
  }

  const closePlayerModal = () => {
    setShowPlayerModal(false)
    setSelectedPosition(null)
  }

  const handleFinalSubmission = async () => {
    if (processedData.length === 0) return

    setUploading(true)
    try {
      // Save match info to database
      const { data: matchData, error: matchError } = await supabase
        .from('match_info')
        .insert({
          match_date: matchSettings.date,
          rival_name: matchSettings.opponentName,
          rival_photo_url: matchSettings.opponentLogo || null,
          score: matchSettings.score || null,
          competition: matchSettings.competition || null,
          round_info: matchSettings.round || null,
          formation: matchSettings.formation || null
        })
        .select()
        .single()

      if (matchError) {
        throw matchError
      }

      // Save processed data with statuses and positions to database
      const dataToInsert = processedData.map(data => ({
        ...data,
        match_id: matchData.match_id,
        match_date: matchSettings.date,
        status: playerStatuses[data.player_id] || 'starter',
        game_position: playerPositions[data.player_id] || null
      }))

      const { error: dataError } = await supabase
        .from('catapult_match_data')
        .insert(dataToInsert)

      if (dataError) {
        throw dataError
      }

      setMessage(`Successfully uploaded match data for ${processedData.length} players`)
      setMessageType('success')
      
      // Reset form
      setMatchSettings({
        date: '',
        opponentId: '',
        opponentName: '',
        opponentLogo: '',
        score: '',
        competition: '',
        round: '',
        formation: ''
      })
      setCsvFile(null)
      setProcessedData([])
      setPlayerStatuses({})
      setPlayerPositions({})
      setShowStatusAssignment(false)
      setShowPositionAssignment(false)
      setSelectedPosition(null)
      setShowPlayerModal(false)
      
    } catch (error) {
      console.error('Final submission error:', error)
      setMessage(`Upload failed: ${(error as Error).message}`)
      setMessageType('error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="match-upload">
      <div className="upload-header">
        <h3>Upload Match Data</h3>
        <p>Enter match details and upload player performance data</p>
      </div>

      {/* Match Settings */}
      <div className="match-settings">
        <h4>Match Information</h4>
        <div className="settings-grid">
          <div className="input-group">
            <label>
              <Calendar size={16} />
              Match Date
            </label>
            <input
              type="date"
              value={matchSettings.date}
              onChange={(e) => handleMatchSettingsChange('date', e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>
              <Trophy size={16} />
              Opponent
            </label>
            <select
              value={matchSettings.opponentId}
              onChange={(e) => handleMatchSettingsChange('opponentId', e.target.value)}
              required
            >
              <option value="">Select opponent...</option>
              {opponents.map(opponent => (
                <option key={opponent.team_id} value={opponent.team_id}>
                  {opponent.team_name}
                </option>
              ))}
            </select>
          </div>

          {matchSettings.opponentLogo && (
            <div className="input-group">
              <label>Opponent Logo</label>
              <img src={matchSettings.opponentLogo} alt={matchSettings.opponentName} className="opponent-logo-preview" />
            </div>
          )}

          <div className="input-group score-group">
            <label>Score</label>
            <div className="score-inputs">
              <div className="team-score">
                <div className="team-name">Beitar Jerusalem</div>
                <div className="score-select">
                  <select
                    value={matchSettings.score.split('-')[0] || ''}
                    onChange={(e) => {
                      const awayScore = matchSettings.score.split('-')[1] || '0'
                      handleMatchSettingsChange('score', `${e.target.value}-${awayScore}`)
                    }}
                  >
                    <option value="">-</option>
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="score-middle">
                <div className="team-name-spacer"></div>
                <span className="score-separator">:</span>
              </div>
              <div className="team-score">
                <div className="team-name">{matchSettings.opponentName || 'Opponent'}</div>
                <div className="score-select">
                  <select
                    value={matchSettings.score.split('-')[1] || ''}
                    onChange={(e) => {
                      const homeScore = matchSettings.score.split('-')[0] || '0'
                      handleMatchSettingsChange('score', `${homeScore}-${e.target.value}`)
                    }}
                  >
                    <option value="">-</option>
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Competition</label>
            <select
              value={matchSettings.competition}
              onChange={(e) => handleMatchSettingsChange('competition', e.target.value)}
            >
              <option value="">Select competition...</option>
              <option value="League">League</option>
              <option value="Cup">Cup</option>
              <option value="Toto">Toto</option>
              <option value="Conference">Conference</option>
            </select>
          </div>

          <div className="input-group">
            <label>Round</label>
            <input
              type="text"
              placeholder="Round 15"
              value={matchSettings.round}
              onChange={(e) => handleMatchSettingsChange('round', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Formation</label>
            <select
              value={matchSettings.formation}
              onChange={(e) => handleMatchSettingsChange('formation', e.target.value)}
            >
              <option value="">Select formation...</option>
              <option value="4-3-3">4-3-3</option>
              <option value="4-4-2">4-4-2</option>
              <option value="4-2-3-1">4-2-3-1</option>
              <option value="3-5-2">3-5-2</option>
              <option value="3-4-3">3-4-3</option>
              <option value="4-1-4-1">4-1-4-1</option>
              <option value="4-5-1">4-5-1</option>
              <option value="5-3-2">5-3-2</option>
              <option value="5-4-1">5-4-1</option>
            </select>
          </div>
        </div>
      </div>

      {/* CSV Upload */}
      <div className="csv-upload">
        <h4>Upload Performance Data</h4>
        <div className="upload-area">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={uploading}
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="upload-label">
            <Upload size={24} />
            {csvFile ? csvFile.name : 'Choose CSV file'}
          </label>
        </div>
      </div>

      {/* Player Status Assignment */}
      {showStatusAssignment && (
        <div className="status-assignment">
          <h4>Assign Player Status</h4>
          <p>Set the status for each player in this match:</p>
          <div className="players-list">
            {processedData.map(player => (
              <div key={player.player_id} className="player-status-row">
                <div className="player-info">
                  <span className="player-name">
                    {(() => {
                      const playerData = squadPlayers[player.player_name || '']
                      return playerData && player.player_name ? player.player_name : (player.player_name || 'Unknown Player')
                    })()}
                  </span>
                  <span className="player-stats">
                    {player.total_distance.toFixed(0)}m • {(player.intensity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="status-selector">
                  <select
                    value={playerStatuses[player.player_id] || 'starter'}
                    onChange={(e) => handleStatusChange(player.player_id, e.target.value)}
                  >
                    <option value="starter">Starter</option>
                    <option value="substitute">Substitute</option>
                    <option value="unused">Unused Sub</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={proceedToPositionAssignment}
            disabled={!matchSettings.formation}
            className="next-step-button"
          >
            Next: Assign Positions
          </button>
        </div>
      )}

      {/* Position Assignment */}
      {showPositionAssignment && matchSettings.formation && (
        <div className="position-assignment">
          <h4>Assign Player Positions - {matchSettings.formation}</h4>
          <p>Click on empty positions (dashed circles) to select a player. Click filled positions to remove players.</p>
          

          
          {/* Pitch Visualization */}
          <div className="pitch-container">
            <div className="pitch">
              {FORMATION_POSITIONS[matchSettings.formation] && Object.entries(FORMATION_POSITIONS[matchSettings.formation]).map(([position, coords]) => {
                const assignedPlayer = getPlayerInPosition(position)
                return (
                  <div
                    key={position}
                    className={`position-slot ${assignedPlayer ? 'filled' : 'empty'}`}
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`
                    }}
                    onClick={() => handlePositionClick(position)}
                  >
                    {assignedPlayer ? (
                      <>
                        {(() => {
                          const playerData = squadPlayers[assignedPlayer.player_name || '']
                          console.log(`Upload render - Player: ${assignedPlayer.player_name}, has data: ${!!playerData}, profile pic: ${playerData?.profilePic}`)
                          return playerData?.profilePic ? (
                            <img 
                              src={playerData.profilePic} 
                              alt={assignedPlayer.player_name}
                              className="player-profile-pic"
                              onError={(e) => {
                                console.log(`Upload - Failed to load image for ${assignedPlayer.player_name}: ${playerData.profilePic}`)
                                e.currentTarget.style.display = 'none'
                              }}
                              onLoad={() => {
                                console.log(`Upload - Successfully loaded image for ${assignedPlayer.player_name}`)
                              }}
                            />
                          ) : (
                                                         <div style={{
                               width: '100%',
                               height: '100%',
                               backgroundColor: 'rgba(255, 215, 0, 0.8)',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               fontSize: '1.8em',
                               fontWeight: 'bold',
                               color: '#000'
                             }}>
                               {assignedPlayer.player_name?.split(' ').map(n => n.charAt(0)).join('') || 'P'}
                             </div>
                          )
                        })()}
                        <div className="player-name-overlay">
                          {(() => {
                            const playerData = squadPlayers[assignedPlayer.player_name || '']
                            if (playerData && assignedPlayer.player_name) {
                              // Extract first and last name from the mapped player data
                              const nameParts = assignedPlayer.player_name.split(' ')
                              return nameParts[nameParts.length - 1] // Return last name
                            }
                            return assignedPlayer.player_name?.split(' ').pop() || 'Player'
                          })()}
                        </div>
                                                 <div className="player-stats-overlay">
                           <div className="player-stat-item player-stat-time">
                             {(() => {
                               const timeParts = assignedPlayer.total_duration.split(':');
                               const hours = parseInt(timeParts[0]);
                               const minutes = parseInt(timeParts[1]) + (hours * 60);
                               return `${minutes}⏱️`;
                             })()}
                           </div>
                           <div className="player-stat-item player-stat-distance">
                             {(assignedPlayer.total_distance / 1000).toFixed(1)}km
                           </div>
                           <div className="player-stat-item player-stat-intensity">
                             {(assignedPlayer.intensity * 100).toFixed(0)}%
                           </div>
                           <div className="player-stat-item player-stat-mpm">
                             {assignedPlayer.meterage_per_minute.toFixed(0)}m/min
                           </div>
                         </div>
                      </>
                    ) : (
                      <div className="position-label" style={{fontSize: '0.7em', fontWeight: 'bold', color: '#FFD700'}}>
                        {coords.label}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Available Starting Players */}
          <div className="available-players">
            <h5>Starting XI - Click positions on the pitch to assign players</h5>
            <div className="players-grid">
              {getStartingPlayers()
                .filter(player => !Object.keys(playerPositions).includes(player.player_id))
                .map(player => (
                  <div
                    key={player.player_id}
                    className="available-player"
                  >
                    <div className="player-name">{player.player_name}</div>
                    <div className="player-stats">{player.total_distance.toFixed(0)}m</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Substitutes */}
          <div className="substitute-players">
            <h5>Substitutes</h5>
            <div className="players-grid">
              {getSubstitutePlayers().map(player => (
                <div key={player.player_id} className="substitute-player">
                  <div className="bench-player-photo">
                    {(() => {
                      const playerData = squadPlayers[player.player_name || '']
                      return playerData?.profilePic ? (
                        <img 
                          src={playerData.profilePic} 
                          alt={player.player_name}
                          className="bench-player-profile-pic"
                          onError={(e) => {
                            console.log(`Upload bench - Failed to load image for ${player.player_name}: ${playerData.profilePic}`)
                            e.currentTarget.style.display = 'none'
                          }}
                          onLoad={() => {
                            console.log(`Upload bench - Successfully loaded image for ${player.player_name}`)
                          }}
                        />
                      ) : (
                        <div className="bench-player-initials">
                          {player.player_name?.split(' ').map(n => n.charAt(0)).join('') || 'P'}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="bench-player-info">
                    <div className="player-name">{player.player_name}</div>
                    <div className="player-stats">{player.total_distance.toFixed(0)}m</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unused Players */}
          <div className="unused-players">
            <h5>Unused Substitutes</h5>
            <div className="players-grid">
              {getUnusedPlayers().map(player => (
                <div key={player.player_id} className="unused-player">
                  <div className="bench-player-photo">
                    {(() => {
                      const playerData = squadPlayers[player.player_name || '']
                      return playerData?.profilePic ? (
                        <img 
                          src={playerData.profilePic} 
                          alt={player.player_name}
                          className="bench-player-profile-pic"
                          onError={(e) => {
                            console.log(`Upload bench - Failed to load image for ${player.player_name}: ${playerData.profilePic}`)
                            e.currentTarget.style.display = 'none'
                          }}
                          onLoad={() => {
                            console.log(`Upload bench - Successfully loaded image for ${player.player_name}`)
                          }}
                        />
                      ) : (
                        <div className="bench-player-initials">
                          {player.player_name?.split(' ').map(n => n.charAt(0)).join('') || 'P'}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="bench-player-info">
                    <div className="player-name">{player.player_name}</div>
                    <div className="player-stats">{player.total_distance.toFixed(0)}m</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleFinalSubmission}
            disabled={uploading}
            className="final-submit-button"
          >
            {uploading ? 'Uploading...' : 'Complete Upload'}
          </button>
        </div>
      )}

      {/* Player Selection Modal */}
      {showPlayerModal && selectedPosition && (
        <div className="modal-overlay" onClick={closePlayerModal}>
          <div className="player-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Assign Player to {selectedPosition}</h4>
              <button className="close-button" onClick={closePlayerModal}>×</button>
            </div>
            <div className="modal-content">
              <div className="modal-players-list">
                {getStartingPlayers()
                  .filter(player => !Object.keys(playerPositions).includes(player.player_id))
                  .map(player => (
                    <div
                      key={player.player_id}
                      className="modal-player"
                      onClick={() => assignPlayerToPosition(player.player_id)}
                    >
                      <div className="player-name">{player.player_name}</div>
                      <div className="player-stats">
                        {player.total_distance.toFixed(0)}m • {(player.intensity * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {!showStatusAssignment && !showPositionAssignment && (
        <button
          onClick={handleUpload}
          disabled={uploading || !csvFile || !matchSettings.date || !matchSettings.opponentId}
          className="upload-button"
        >
          {uploading ? 'Processing...' : 'Process CSV Data'}
        </button>
      )}

      {/* Message */}
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}
    </div>
  )
} 