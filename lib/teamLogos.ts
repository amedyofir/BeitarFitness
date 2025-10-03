// Team logo mappings for Supabase storage
// Base URL: https://qvktvgqvjlxopejtupnl.supabase.co/storage/v1/object/public/logo/

export const TEAM_LOGO_MAP: { [key: string]: string } = {
  "Hapoel Be'er Sheva": "beersheva.png",
  "Maccabi Netanya": "Netanya.png",
  "Hapoel Jerusalem": "hapoelkatamon.png",
  "Beitar Jerusalem": "beitarlogo.png",
  "Maccabi Haifa": "machaifa.png",
  "Hapoel Haifa": "hapoelhaifa.png",
  "Ironi Kiryat Shmona": "kashlogo.png",
  "Ironi Tiberias": "Tiberias.png",
  "Hapoel Petah Tikva": "hpt.png",
  "Maccabi Tel Aviv": "mta.png",
  "Maccabi Bnei Raina": "reineh.png",
  "Bnei Sakhnin": "sakhnin.png",
  "Ashdod": "Ashdod.png",
  "Hapoel Tel Aviv": "hta.png"
}

/**
 * Get the Supabase storage URL for a team's logo
 * @param teamName - The team name as it appears in the data
 * @returns The full public URL to the team's logo, or empty string if not found
 */
export const getTeamLogoUrl = (teamName: string): string => {
  if (!teamName) return ''

  const logoFileName = TEAM_LOGO_MAP[teamName]
  if (!logoFileName) return ''

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qvktvgqvjlxopejtupnl.supabase.co'
  return `${supabaseUrl}/storage/v1/object/public/logo/${logoFileName}`
}
