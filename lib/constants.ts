// Players who are no longer part of the club
export const EXCLUDED_PLAYERS = [
  'Liel Deri',
  'Zohar Zesano',
  'Silva Kani',
  'Nehorai Dabush',
  'Nadav Markovich'
]

// Helper function to check if a player should be excluded
export const isExcludedPlayer = (playerName: string): boolean => {
  return EXCLUDED_PLAYERS.some(excluded => 
    playerName.toLowerCase().includes(excluded.toLowerCase())
  )
}