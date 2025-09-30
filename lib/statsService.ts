import { supabase } from './supabase'
import { MatchupPlayer } from './playerService'

export interface PlayerStats {
  // Basic info
  playerId: string
  fullName: string
  team: string
  position: string
  minutesPlayed: number

  // Performance stats (raw)
  goals: number
  assists: number
  xG: number
  xA: number
  shots: number
  shotsOnTarget: number
  passes: number
  passAccuracy: number
  keyPasses: number
  tackles: number
  interceptions: number
  clearances: number
  duelsWon: number
  duelsTotal: number
  aerialsWon: number
  aerialsTotal: number
  distance: number
  intensity: number
  takeOns: number
  takeOnSuccess: number

  // Normalized stats (per 90 minutes)
  goalsPer90: number
  assistsPer90: number
  xGPer90: number
  xAPer90: number
  shotsPer90: number
  shotsOnTargetPer90: number
  passesPer90: number
  keyPassesPer90: number
  tacklesPer90: number
  interceptionsPer90: number
  clearancesPer90: number
  duelsWonPer90: number
  aerialsWonPer90: number
  distancePer90: number
  takeOnsPer90: number
}

export interface ComparisonResult {
  type: '1v1' | 'unit-vs-unit' | 'side-vs-side' | 'team-vs-team'
  data: any
  normalized: boolean
  categories: string[]
}

export const fetchPlayerDetailedStats = async (playerId: string): Promise<PlayerStats | null> => {
  try {
    // First get player info from opta_player_object
    const { data: playerInfo, error: playerError } = await supabase
      .from('opta_player_object')
      .select('*')
      .eq('"playerId"', playerId)
      .single()

    if (playerError) {
      console.error('Error fetching player info:', playerError)
      return null
    }

    // Then get latest performance stats from opta_csv_uploads
    const { data: statsData, error: statsError } = await supabase
      .from('opta_csv_uploads')
      .select('*')
      .eq('"playerId"', playerId)
      .order('upload_date', { ascending: false })
      .limit(1)
      .single()

    if (statsError) {
      console.error('Error fetching stats:', statsError)
      return null
    }

    const minutesPlayed = statsData.Min || 90 // Default to 90 if missing

    // Convert to PlayerStats format
    const stats: PlayerStats = {
      playerId: playerId,
      fullName: playerInfo.FullName || 'Unknown',
      team: playerInfo.Team || 'Unknown',
      position: playerInfo.Position || 'Unknown',
      minutesPlayed: minutesPlayed,

      // Raw stats
      goals: statsData.Goal || 0,
      assists: statsData.Ast || 0,
      xG: statsData.xG || 0,
      xA: statsData.xA || 0,
      shots: statsData.Shot || 0,
      shotsOnTarget: statsData.SOG || 0,
      passes: statsData.PassAccFwd || 0,
      passAccuracy: statsData['Pass%'] || 0,
      keyPasses: statsData.KeyPass || 0,
      tackles: statsData.Tckl || 0,
      interceptions: statsData.Int || 0,
      clearances: statsData.Clrnce || 0,
      duelsWon: statsData.GrndDlWn + (statsData.AerialWon || 0),
      duelsTotal: statsData.ground_duels + (statsData.Aerials || 0),
      aerialsWon: statsData.AerialWon || 0,
      aerialsTotal: statsData.Aerials || 0,
      distance: statsData.distancepergame || 0,
      intensity: statsData['%Intensity'] || 0,
      takeOns: statsData.TakeOn || 0,
      takeOnSuccess: statsData['TakeOn%'] || 0,

      // Normalized stats (per 90 minutes)
      goalsPer90: normalize90(statsData.Goal || 0, minutesPlayed),
      assistsPer90: normalize90(statsData.Ast || 0, minutesPlayed),
      xGPer90: normalize90(statsData.xG || 0, minutesPlayed),
      xAPer90: normalize90(statsData.xA || 0, minutesPlayed),
      shotsPer90: normalize90(statsData.Shot || 0, minutesPlayed),
      shotsOnTargetPer90: normalize90(statsData.SOG || 0, minutesPlayed),
      passesPer90: normalize90(statsData.PassAccFwd || 0, minutesPlayed),
      keyPassesPer90: normalize90(statsData.KeyPass || 0, minutesPlayed),
      tacklesPer90: normalize90(statsData.Tckl || 0, minutesPlayed),
      interceptionsPer90: normalize90(statsData.Int || 0, minutesPlayed),
      clearancesPer90: normalize90(statsData.Clrnce || 0, minutesPlayed),
      duelsWonPer90: normalize90((statsData.GrndDlWn || 0) + (statsData.AerialWon || 0), minutesPlayed),
      aerialsWonPer90: normalize90(statsData.AerialWon || 0, minutesPlayed),
      distancePer90: statsData.distancepergame || 0, // Already per game
      takeOnsPer90: normalize90(statsData.TakeOn || 0, minutesPlayed)
    }

    return stats
  } catch (error) {
    console.error('Error fetching detailed stats:', error)
    return null
  }
}

const normalize90 = (value: number, minutesPlayed: number): number => {
  if (minutesPlayed <= 0) return 0
  return (value / minutesPlayed) * 90
}

export const compare1v1 = async (player1: MatchupPlayer, player2: MatchupPlayer): Promise<ComparisonResult> => {
  const stats1 = await fetchPlayerDetailedStats(player1.id)
  const stats2 = await fetchPlayerDetailedStats(player2.id)

  if (!stats1 || !stats2) {
    throw new Error('Could not fetch stats for comparison')
  }

  const comparison = {
    player1: {
      ...stats1,
      name: player1.name,
      team: player1.team
    },
    player2: {
      ...stats2,
      name: player2.name,
      team: player2.team
    },
    categories: {
      attacking: {
        'Goals/90': [stats1.goalsPer90, stats2.goalsPer90],
        'xG/90': [stats1.xGPer90, stats2.xGPer90],
        'Assists/90': [stats1.assistsPer90, stats2.assistsPer90],
        'xA/90': [stats1.xAPer90, stats2.xAPer90],
        'Shots/90': [stats1.shotsPer90, stats2.shotsPer90],
        'Shots on Target/90': [stats1.shotsOnTargetPer90, stats2.shotsOnTargetPer90],
        'Take-ons/90': [stats1.takeOnsPer90, stats2.takeOnsPer90]
      },
      passing: {
        'Passes/90': [stats1.passesPer90, stats2.passesPer90],
        'Pass Accuracy %': [stats1.passAccuracy, stats2.passAccuracy],
        'Key Passes/90': [stats1.keyPassesPer90, stats2.keyPassesPer90]
      },
      defending: {
        'Tackles/90': [stats1.tacklesPer90, stats2.tacklesPer90],
        'Interceptions/90': [stats1.interceptionsPer90, stats2.interceptionsPer90],
        'Clearances/90': [stats1.clearancesPer90, stats2.clearancesPer90],
        'Duels Won/90': [stats1.duelsWonPer90, stats2.duelsWonPer90],
        'Aerials Won/90': [stats1.aerialsWonPer90, stats2.aerialsWonPer90]
      },
      physical: {
        'Distance': [stats1.distance, stats2.distance],
        'Intensity %': [stats1.intensity, stats2.intensity]
      }
    }
  }

  return {
    type: '1v1',
    data: comparison,
    normalized: true,
    categories: ['attacking', 'passing', 'defending', 'physical']
  }
}

export const compareUnits = async (unit1Players: MatchupPlayer[], unit2Players: MatchupPlayer[]): Promise<ComparisonResult> => {
  const unit1Stats = await Promise.all(unit1Players.map(p => fetchPlayerDetailedStats(p.id)))
  const unit2Stats = await Promise.all(unit2Players.map(p => fetchPlayerDetailedStats(p.id)))

  const validUnit1Stats = unit1Stats.filter(s => s !== null) as PlayerStats[]
  const validUnit2Stats = unit2Stats.filter(s => s !== null) as PlayerStats[]

  // Aggregate stats for each unit
  const aggregateStats = (playerStats: PlayerStats[]) => {
    return playerStats.reduce((acc, player) => ({
      goalsPer90: acc.goalsPer90 + player.goalsPer90,
      assistsPer90: acc.assistsPer90 + player.assistsPer90,
      xGPer90: acc.xGPer90 + player.xGPer90,
      xAPer90: acc.xAPer90 + player.xAPer90,
      shotsPer90: acc.shotsPer90 + player.shotsPer90,
      shotsOnTargetPer90: acc.shotsOnTargetPer90 + player.shotsOnTargetPer90,
      passesPer90: acc.passesPer90 + player.passesPer90,
      keyPassesPer90: acc.keyPassesPer90 + player.keyPassesPer90,
      tacklesPer90: acc.tacklesPer90 + player.tacklesPer90,
      interceptionsPer90: acc.interceptionsPer90 + player.interceptionsPer90,
      clearancesPer90: acc.clearancesPer90 + player.clearancesPer90,
      duelsWonPer90: acc.duelsWonPer90 + player.duelsWonPer90,
      aerialsWonPer90: acc.aerialsWonPer90 + player.aerialsWonPer90,
      distance: acc.distance + player.distance,
      intensity: acc.intensity + player.intensity,
      takeOnsPer90: acc.takeOnsPer90 + player.takeOnsPer90,
      passAccuracy: acc.passAccuracy + player.passAccuracy
    }), {
      goalsPer90: 0, assistsPer90: 0, xGPer90: 0, xAPer90: 0, shotsPer90: 0,
      shotsOnTargetPer90: 0, passesPer90: 0, keyPassesPer90: 0, tacklesPer90: 0,
      interceptionsPer90: 0, clearancesPer90: 0, duelsWonPer90: 0, aerialsWonPer90: 0,
      distance: 0, intensity: 0, takeOnsPer90: 0, passAccuracy: 0
    })
  }

  const unit1Totals = aggregateStats(validUnit1Stats)
  const unit2Totals = aggregateStats(validUnit2Stats)

  // Average pass accuracy (not sum)
  unit1Totals.passAccuracy = unit1Totals.passAccuracy / validUnit1Stats.length
  unit2Totals.passAccuracy = unit2Totals.passAccuracy / validUnit2Stats.length
  unit1Totals.intensity = unit1Totals.intensity / validUnit1Stats.length
  unit2Totals.intensity = unit2Totals.intensity / validUnit2Stats.length

  const comparison = {
    unit1: {
      name: `${unit1Players[0]?.unit || 'Unit'} (${validUnit1Stats.length} players)`,
      team: unit1Players[0]?.team,
      players: validUnit1Stats,
      totals: unit1Totals
    },
    unit2: {
      name: `${unit2Players[0]?.unit || 'Unit'} (${validUnit2Stats.length} players)`,
      team: unit2Players[0]?.team,
      players: validUnit2Stats,
      totals: unit2Totals
    },
    categories: {
      attacking: {
        'Goals/90': [unit1Totals.goalsPer90, unit2Totals.goalsPer90],
        'xG/90': [unit1Totals.xGPer90, unit2Totals.xGPer90],
        'Assists/90': [unit1Totals.assistsPer90, unit2Totals.assistsPer90],
        'xA/90': [unit1Totals.xAPer90, unit2Totals.xAPer90],
        'Shots/90': [unit1Totals.shotsPer90, unit2Totals.shotsPer90],
        'Take-ons/90': [unit1Totals.takeOnsPer90, unit2Totals.takeOnsPer90]
      },
      passing: {
        'Passes/90': [unit1Totals.passesPer90, unit2Totals.passesPer90],
        'Pass Accuracy %': [unit1Totals.passAccuracy, unit2Totals.passAccuracy],
        'Key Passes/90': [unit1Totals.keyPassesPer90, unit2Totals.keyPassesPer90]
      },
      defending: {
        'Tackles/90': [unit1Totals.tacklesPer90, unit2Totals.tacklesPer90],
        'Interceptions/90': [unit1Totals.interceptionsPer90, unit2Totals.interceptionsPer90],
        'Clearances/90': [unit1Totals.clearancesPer90, unit2Totals.clearancesPer90],
        'Duels Won/90': [unit1Totals.duelsWonPer90, unit2Totals.duelsWonPer90]
      },
      physical: {
        'Total Distance': [unit1Totals.distance, unit2Totals.distance],
        'Avg Intensity %': [unit1Totals.intensity, unit2Totals.intensity]
      }
    }
  }

  return {
    type: 'unit-vs-unit',
    data: comparison,
    normalized: true,
    categories: ['attacking', 'passing', 'defending', 'physical']
  }
}