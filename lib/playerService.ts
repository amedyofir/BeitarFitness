import { supabase } from './supabase'

export interface PlayerData {
  player_id: string
  first_name: string
  last_name: string
  full_name?: string
  profile_picture_url?: string
  position?: string
  team?: 'beitar' | 'opponent'
  actual_team_name?: string
}

export interface PlayerStats {
  duels: number
  passes: number
  intensity: number
  xG: number
  distance: number
}

export type PlayerUnit = 'goalkeeper' | 'defense' | 'midfield' | 'attack'

export interface MatchupPlayer {
  id: string
  name: string
  position: string
  unit: PlayerUnit
  team: 'beitar' | 'opponent'
  actual_team_name?: string
  photo?: string
  stats: PlayerStats
}

export const fetchBeitarPlayersFromOpta = async (): Promise<PlayerData[]> => {
  try {
    console.log('🔍 Fetching Beitar players from opta_player_object...')

    // First try your simple opta_player_object table (without JOIN for now)
    const { data, error } = await supabase
      .from('opta_player_object')
      .select('*')
      .ilike('"Team"', '%beitar%')
      .order('"FullName"', { ascending: true })

    if (error) {
      console.error('❌ Error fetching from opta_player_object:', error)
      // Fallback to old table structure
      return fetchBeitarPlayersFromOptaFallback()
    }

    console.log('✅ Sample opta_player_object data:', data?.slice(0, 2))

    // Map the data to our PlayerData interface
    return data?.map((player, index) => ({
      player_id: player.playerId || `opta_beitar_${index}`,
      first_name: player.firstName || player.FullName?.split(' ')[0] || 'Unknown',
      last_name: player.lastName || player.FullName?.split(' ').slice(1).join(' ') || '',
      full_name: player.FullName || 'Unknown Player',
      position: player.Position || player.Full_Position || 'Unknown',
      team: 'beitar' as const,
      actual_team_name: player.Team || 'Beitar Jerusalem',
      profile_picture_url: player.profile_pic_supabase_url
    })) || []
  } catch (err) {
    console.error('❌ Error fetching Beitar players from opta_player_object:', err)
    // Fallback to old table if new tables don't exist yet
    return fetchBeitarPlayersFromOptaFallback()
  }
}

// Fallback function for old table structure
const fetchBeitarPlayersFromOptaFallback = async (): Promise<PlayerData[]> => {
  try {
    console.log('🔄 Using fallback: fetching from original opta_league_players table...')

    const { data, error } = await supabase
      .from('opta_league_players')
      .select('*')
      .ilike('team', '%beitar%')

    if (error) {
      console.error('❌ Error fetching from fallback table:', error)
      throw error
    }

    return data?.map((player, index) => ({
      player_id: player.player_id || `opta_beitar_${index}`,
      first_name: player.player_full_name?.split(' ')[0] || 'Unknown',
      last_name: player.player_full_name?.split(' ').slice(1).join(' ') || '',
      full_name: player.player_full_name || 'Unknown Player',
      position: player.position || 'Unknown',
      team: 'beitar' as const,
      actual_team_name: player.team || 'Beitar Jerusalem',
      profile_picture_url: player.profile_picture_url
    })) || []
  } catch (err) {
    console.error('❌ Fallback also failed:', err)
    return []
  }
}

export const getPlayerUnit = (position: string): PlayerUnit => {
  const pos = position.toUpperCase()
  if (pos === 'GK' || pos === 'GOALKEEPER') return 'goalkeeper'
  if (pos.includes('CB') || pos.includes('LB') || pos.includes('RB') || pos.includes('WB') || pos === 'DEF') return 'defense'
  if (pos.includes('CM') || pos.includes('CDM') || pos.includes('CAM') || pos.includes('LM') || pos.includes('RM') || pos === 'MID') return 'midfield'
  if (pos.includes('ST') || pos.includes('CF') || pos.includes('LW') || pos.includes('RW') || pos === 'ATT') return 'attack'
  return 'midfield' // default fallback
}

export const fetchOpponentPlayersFromOpta = async (opponentTeam?: string): Promise<PlayerData[]> => {
  try {
    console.log('🔍 Fetching opponent players from opta_league_players table...')

    // Try your opta_player_object table first (simplified, no JOIN)
    try {
      const { data, error } = await supabase
        .from('opta_player_object')
        .select('*')
        .not('"Team"', 'ilike', '%beitar%')
        .order('"FullName"', { ascending: true })

      if (!error && data) {
        console.log('✅ Sample opponent data from opta_player_object:', data?.slice(0, 2))

        return data?.map((player, index) => ({
          player_id: player.playerId || `opta_opp_${index}`,
          first_name: player.firstName || player.FullName?.split(' ')[0] || 'Unknown',
          last_name: player.lastName || player.FullName?.split(' ').slice(1).join(' ') || '',
          full_name: player.FullName || 'Unknown Player',
          position: player.Position || player.Full_Position || 'Unknown',
          team: 'opponent' as const,
          actual_team_name: player.Team || 'Unknown Team',
          profile_picture_url: player.profile_pic_supabase_url
        })) || []
      }
    } catch (simpleError) {
      console.log('🔄 opta_player_object not ready, using fallback...')
    }

    // Fallback to old table
    const { data, error } = await supabase
      .from('opta_league_players')
      .select('*')
      .not('team', 'ilike', '%beitar%')

    if (error) {
      console.error('❌ Error fetching opponent players from fallback table:', error)
      return generateMockOpponentPlayers()
    }

    console.log('✅ Sample opponent fallback data:', data?.slice(0, 2))

    return data?.map((player, index) => ({
      player_id: player.player_id || `opta_opp_${index}`,
      first_name: player.player_full_name?.split(' ')[0] || 'Unknown',
      last_name: player.player_full_name?.split(' ').slice(1).join(' ') || '',
      full_name: player.player_full_name || 'Unknown Player',
      position: player.position || 'Unknown',
      team: 'opponent' as const,
      actual_team_name: player.team || 'Unknown Team',
      profile_picture_url: player.profile_picture_url
    })) || []
  } catch (err) {
    console.error('❌ Error fetching opponent players:', err)
    return generateMockOpponentPlayers()
  }
}

export const generateMockOpponentPlayers = (): PlayerData[] => {
  const opponentNames = [
    { first_name: 'David', last_name: 'Silva', position: 'ST' },
    { first_name: 'Amit', last_name: 'Glazer', position: 'CM' },
    { first_name: 'Yoav', last_name: 'Gerafi', position: 'GK' },
    { first_name: 'Roy', last_name: 'Revivo', position: 'CB' },
    { first_name: 'Daniel', last_name: 'Einbinder', position: 'LB' },
    { first_name: 'Tal', last_name: 'Ben Haim', position: 'RB' },
    { first_name: 'Omer', last_name: 'Atzili', position: 'LW' },
    { first_name: 'Eden', last_name: 'Karzev', position: 'RW' },
    { first_name: 'Shay', last_name: 'Elias', position: 'CAM' },
    { first_name: 'Nir', last_name: 'Bitton', position: 'CDM' },
    { first_name: 'Manor', last_name: 'Solomon', position: 'LM' },
    // Add more goalkeepers for better unit representation
    { first_name: 'Itamar', last_name: 'Nitzan', position: 'GK' },
  ]

  return opponentNames.map((player, index) => ({
    player_id: `opponent_${index + 1}`,
    first_name: player.first_name,
    last_name: player.last_name,
    full_name: `${player.first_name} ${player.last_name}`,
    position: player.position,
    team: 'opponent' as const,
    profile_picture_url: `https://picsum.photos/150/150?random=${50 + index}`
  }))
}

export const generateMockStats = (): PlayerStats => {
  return {
    duels: Math.floor(Math.random() * 40) + 30, // 30-70
    passes: Math.floor(Math.random() * 30) + 60, // 60-90
    intensity: Math.floor(Math.random() * 40) + 40, // 40-80
    xG: parseFloat((Math.random() * 0.5).toFixed(2)), // 0-0.5
    distance: Math.floor(Math.random() * 4000) + 8000 // 8000-12000
  }
}

export const generateMockGoalkeeperStats = (): PlayerStats => {
  return {
    duels: Math.floor(Math.random() * 20) + 10, // 10-30 (lower for GKs)
    passes: Math.floor(Math.random() * 30) + 60, // 60-90 (shorter passes)
    intensity: Math.floor(Math.random() * 30) + 30, // 30-60 (lower intensity)
    xG: parseFloat((Math.random() * 0.1).toFixed(2)), // 0-0.1 (very low for GKs)
    distance: Math.floor(Math.random() * 2000) + 3000 // 3000-5000 (much less distance)
  }
}

export const convertToMatchupPlayer = (playerData: PlayerData): MatchupPlayer => {
  const position = playerData.position || 'Unknown'
  const unit = getPlayerUnit(position)
  const isGoalkeeper = unit === 'goalkeeper'

  return {
    id: playerData.player_id,
    name: playerData.full_name || `${playerData.first_name} ${playerData.last_name}`,
    position: position,
    unit: unit,
    team: playerData.team || 'beitar',
    actual_team_name: playerData.actual_team_name,
    photo: playerData.profile_picture_url,
    stats: isGoalkeeper ? generateMockGoalkeeperStats() : generateMockStats()
  }
}

export const calculateUnitTotals = (players: MatchupPlayer[]): MatchupPlayer => {
  const totalStats = players.reduce((acc, player) => {
    acc.duels += player.stats.duels
    acc.passes += player.stats.passes
    acc.intensity += player.stats.intensity
    acc.xG += player.stats.xG
    acc.distance += player.stats.distance
    return acc
  }, {
    duels: 0,
    passes: 0,
    intensity: 0,
    xG: 0,
    distance: 0
  })

  // Average intensity (as it's a percentage)
  totalStats.intensity = totalStats.intensity / players.length

  return {
    id: 'unit_total',
    name: `${players[0]?.unit || 'Unit'} Total (${players.length} players)`,
    position: 'UNIT',
    unit: players[0]?.unit || 'midfield',
    team: players[0]?.team || 'beitar',
    stats: totalStats
  }
}

export const fetchAllPlayersForMatchup = async (): Promise<MatchupPlayer[]> => {
  try {
    console.log('🚀 Starting to fetch players for matchup from opta_league_players...')

    // Fetch real Beitar players from opta_league_players table
    const beitarPlayersData = await fetchBeitarPlayersFromOpta()
    console.log('✅ Fetched Beitar players:', beitarPlayersData.length)

    // Fetch real opponent players from opta_league_players table
    const opponentPlayersData = await fetchOpponentPlayersFromOpta()
    console.log('✅ Fetched opponent players:', opponentPlayersData.length)

    const beitarPlayers = beitarPlayersData.map(convertToMatchupPlayer)
    const opponentPlayers = opponentPlayersData.map(convertToMatchupPlayer)

    console.log('🎯 Total players for matchup:', beitarPlayers.length + opponentPlayers.length)

    // Log unit distribution for debugging
    const beitarUnits = beitarPlayers.reduce((acc, p) => {
      acc[p.unit] = (acc[p.unit] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const opponentUnits = opponentPlayers.reduce((acc, p) => {
      acc[p.unit] = (acc[p.unit] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('📊 Beitar unit distribution:', beitarUnits)
    console.log('📊 Opponent unit distribution:', opponentUnits)

    return [...beitarPlayers, ...opponentPlayers]
  } catch (err) {
    console.error('❌ Error fetching players for matchup:', err)
    console.log('🔄 Falling back to mock data...')

    // Return mock data as fallback with proper units
    return [
      {
        id: 'fallback_1',
        name: 'Ben Lederman',
        position: 'CM',
        unit: 'midfield',
        team: 'beitar',
        stats: generateMockStats()
      },
      {
        id: 'fallback_2',
        name: 'David Silva',
        position: 'ST',
        unit: 'attack',
        team: 'opponent',
        stats: generateMockStats()
      },
      {
        id: 'fallback_3',
        name: 'Yarden Gattegno',
        position: 'GK',
        unit: 'goalkeeper',
        team: 'beitar',
        stats: generateMockGoalkeeperStats()
      }
    ]
  }
}