// Fat percentage benchmark ranges per player
export const FAT_BENCHMARKS: Record<string, { min: number; max: number }> = {
  'Ori Dahan': { min: 9, max: 9.5 },
  'Dor Micha': { min: 9, max: 9.5 },
  'Miguel Silva': { min: 7, max: 7.5 },
  'Leon Mizrahi': { min: 9, max: 9.5 },
  'Bryan Cabezas': { min: 9, max: 9.5 },
  'Timothy Muzi': { min: 9, max: 9.5 }, // Updated to match Timothy Muzie
  'Yarden Cohen': { min: 9.5, max: 10 },
  'Yarden Shua': { min: 10, max: 11 },
  'Grigory Muzurov': { min: 8, max: 8.5 },
  'Yuval Shalev': { min: 7.5, max: 8 },
  'Yarin Levy': { min: 7, max: 7.5 },
  'Gil Cohen': { min: 9.5, max: 10 },
  'Ziv Ben Shimol': { min: 8, max: 8.5 },
  'Adi Yona': { min: 7, max: 8 },
  'Omer Atzili': { min: 8.5, max: 9 },
  'Dor Hugy': { min: 9, max: 10 },
  'Aviel Zargari': { min: 7, max: 7.5 },
  'Yonatan Ozer': { min: 10, max: 11 },
  'Gonbosco Kalo': { min: 6.5, max: 7.5 },
  'Adi Yissachar': { min: 11, max: 12 },
  'Ilay Hagag': { min: 8.5, max: 9 },
  'Luka Gadrani': { min: 6.5, max: 7.5 },
  'Ariel Mendi': { min: 6.5, max: 7.5 },
  'Ravid Abarjil': { min: 8.5, max: 9 },
  'Roi Elimelech': { min: 9, max: 9.5 },
  'Eilson Tavares': { min: 6.5, max: 7.5 },
  // Additional benchmarks - with name variations handled
  'Brayan Carabali': { min: 9, max: 9.5 },
  'Bryan Carabali': { min: 9, max: 9.5 }, // Name variation
  'Adi Isaschar': { min: 11, max: 12 }, // Alternate spelling of Adi Yissachar
  'Arial Mendy': { min: 6.5, max: 7.5 }, // Alternate spelling of Ariel Mendi  
  'Aviel Zargary': { min: 7, max: 7.5 }, // Alternate spelling of Aviel Zargari
  'Aílson Tavares': { min: 6.5, max: 7.5 }, // Alternate spelling of Eilson Tavares
  'Grigori Morozov': { min: 8, max: 8.5 }, // Alternate spelling of Grigory Muzurov
  'Ilay Hajaj': { min: 8.5, max: 9 }, // Alternate spelling of Ilay Hagag
  'Johnbosco Kalu': { min: 6.5, max: 7.5 }, // Alternate spelling of Gonbosco Kalo
  'Ravid Abergil': { min: 8.5, max: 9 }, // Alternate spelling of Ravid Abarjil
  'Roey Elimelech': { min: 9, max: 9.5 }, // Alternate spelling of Roi Elimelech
  'Timothy Muzie': { min: 9, max: 9.5 }, // Updated range for Timothy (was 9.5 only)
  'Yarin Levi': { min: 7, max: 7.5 }, // Alternate spelling of Yarin Levy
  'Yehonatan Ozer': { min: 10, max: 11 }, // Alternate spelling of Yonatan Ozer
  'Li-On Mizrahi': { min: 9, max: 9.5 },
  'Dor Hugi': { min: 9, max: 10 } // Alternate spelling of Dor Hugy
}

// Helper function to get benchmark for a player
export const getPlayerBenchmark = (playerName: string): { min: number; max: number } | null => {
  return FAT_BENCHMARKS[playerName] || null
}

// Helper function to check if a player's fat percentage is within benchmark
export const isWithinBenchmark = (playerName: string, fatPercentage: number): boolean | null => {
  const benchmark = getPlayerBenchmark(playerName)
  if (!benchmark) return null
  return fatPercentage >= benchmark.min && fatPercentage <= benchmark.max
}

// Helper function to get status color based on benchmark
export const getBenchmarkStatus = (playerName: string, fatPercentage: number): { color: string; text: string } => {
  const benchmark = getPlayerBenchmark(playerName)
  if (!benchmark) {
    return { color: '#888', text: 'No benchmark' }
  }
  
  if (fatPercentage < benchmark.min) {
    return { color: '#22c55e', text: `Below target (${benchmark.min}-${benchmark.max}%)` }
  } else if (fatPercentage > benchmark.max) {
    return { color: '#ef4444', text: `Above target (${benchmark.min}-${benchmark.max}%)` }
  } else {
    return { color: '#22c55e', text: `On target (${benchmark.min}-${benchmark.max}%)` }
  }
}