'use client'

import React, { useState, useEffect } from 'react'
import { Upload, Download, Filter } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'

// Position-specific scoring weights
// Each position has different priorities based on their role
const SCORING_WEIGHTS_BY_POSITION: { [position: string]: any } = {
  // CENTRAL DEFENDER (CB)
  'CB': {
    defense: {
      weight: 0.50, // 50% of total score
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.02,
        'Tckl': 0.02,
        'GrndDlWn': 0.40,
        'poswon': 0.20,
        'poswonopphalf': 0.04,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.20,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.056,
        'LongBall%': 0.111,
        'Touches': 0.056,
        'ProgPass%': 0.056,
        'Success1v1': 0.278,
        'PsCmpInBox': 0.00,
        'Ps%InA3rd': 0.00,
        'touches/Turnovers': 0.275
      }
    },
    turnovers: {
      weight: 0.08,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.20,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.04,
      metrics: {
        'TouchOpBox': 0.00,
        'Shot': 0.00,
        'SOG': 0.00,
        'Ast': 0.10,
        'PensWon': 0.30,
        'Goal': 0.40,
        'xG': 0.10,
        'xA': 0.10,
        'KeyPass': 0.00,
        'SOG_from_box': 0.00,
        'shotfromgolden': 0.00,
        'shotfrombox': 0.00,
        'ShotConv': 0.00,
        'GAA': 0.00,
        'ChncOpnPl': 0.00
      }
    },
    physical: {
      weight: 0.15,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // LEFT BACK (LB) & RIGHT BACK (RB) - Full Backs
  'LB': {
    defense: {
      weight: 0.30, // 30% of total score
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.02,
        'Tckl': 0.02,
        'GrndDlWn': 0.40,
        'poswon': 0.20,
        'poswonopphalf': 0.04,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.30,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.056,
        'LongBall%': 0.111,
        'Touches': 0.056,
        'ProgPass%': 0.056,
        'Success1v1': 0.278,
        'PsCmpInBox': 0.056,
        'Ps%InA3rd': 0.056,
        'touches/Turnovers': 0.219
      }
    },
    turnovers: {
      weight: 0.05,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.2,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.15,
      metrics: {
        'TouchOpBox': 0.04,
        'Shot': 0.03,
        'SOG': 0.03,
        'Ast': 0.26,
        'PensWon': 0.15,
        'Goal': 0.20,
        'xG': 0.075,
        'xA': 0.075,
        'KeyPass': 0.08,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.01,
        'shotfrombox': 0.01,
        'ShotConv': 0.01,
        'GAA': 0.01,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.17,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  'RB': {
    defense: {
      weight: 0.30,
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.02,
        'Tckl': 0.02,
        'GrndDlWn': 0.40,
        'poswon': 0.20,
        'poswonopphalf': 0.04,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.30,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.056,
        'LongBall%': 0.111,
        'Touches': 0.056,
        'ProgPass%': 0.056,
        'Success1v1': 0.278,
        'PsCmpInBox': 0.056,
        'Ps%InA3rd': 0.056,
        'touches/Turnovers': 0.219
      }
    },
    turnovers: {
      weight: 0.05,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.2,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.15,
      metrics: {
        'TouchOpBox': 0.04,
        'Shot': 0.03,
        'SOG': 0.03,
        'Ast': 0.26,
        'PensWon': 0.15,
        'Goal': 0.20,
        'xG': 0.075,
        'xA': 0.075,
        'KeyPass': 0.08,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.01,
        'shotfrombox': 0.01,
        'ShotConv': 0.01,
        'GAA': 0.01,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.17,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // NUMBER 6 (Defensive Midfielder)
  '6': {
    defense: {
      weight: 0.30,
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.04,
        'Tckl': 0.04,
        'GrndDlWn': 0.40,
        'poswon': 0.10,
        'poswonopphalf': 0.10,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.30,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.056,
        'LongBall%': 0.111,
        'Touches': 0.056,
        'ProgPass%': 0.056,
        'Success1v1': 0.278,
        'PsCmpInBox': 0.00,
        'Ps%InA3rd': 0.00,
        'touches/Turnovers': 0.333
      }
    },
    turnovers: {
      weight: 0.08,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.20,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.14,
      metrics: {
        'TouchOpBox': 0.02,
        'Shot': 0.01,
        'SOG': 0.01,
        'Ast': 0.2,
        'PensWon': 0.2,
        'Goal': 0.2,
        'xG': 0.125,
        'xA': 0.125,
        'KeyPass': 0.01,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.01,
        'shotfrombox': 0.01,
        'ShotConv': 0.01,
        'GAA': 0.02,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.15,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // NUMBER 8 (Box-to-Box Midfielder)
  '8': {
    defense: {
      weight: 0.20,
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.04,
        'Tckl': 0.04,
        'GrndDlWn': 0.40,
        'poswon': 0.10,
        'poswonopphalf': 0.10,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.35,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.056,
        'LongBall%': 0.111,
        'Touches': 0.056,
        'ProgPass%': 0.056,
        'Success1v1': 0.278,
        'PsCmpInBox': 0.025,
        'Ps%InA3rd': 0.025,
        'touches/Turnovers': 0.283
      }
    },
    turnovers: {
      weight: 0.07,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.20,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.20,
      metrics: {
        'TouchOpBox': 0.02,
        'Shot': 0.01,
        'SOG': 0.01,
        'Ast': 0.20,
        'PensWon': 0.20,
        'Goal': 0.20,
        'xG': 0.125,
        'xA': 0.125,
        'KeyPass': 0.01,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.01,
        'shotfrombox': 0.01,
        'ShotConv': 0.01,
        'GAA': 0.05,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.15,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // NUMBER 10 (Attacking Midfielder / Playmaker)
  '10': {
    defense: {
      weight: 0.15,
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.04,
        'Tckl': 0.04,
        'GrndDlWn': 0.40,
        'poswon': 0.10,
        'poswonopphalf': 0.10,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.25,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.056,
        'LongBall%': 0.111,
        'Touches': 0.056,
        'ProgPass%': 0.056,
        'Success1v1': 0.278,
        'PsCmpInBox': 0.025,
        'Ps%InA3rd': 0.025,
        'touches/Turnovers': 0.283
      }
    },
    turnovers: {
      weight: 0.05,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.20,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.35,
      metrics: {
        'TouchOpBox': 0.02,
        'Shot': 0.01,
        'SOG': 0.01,
        'Ast': 0.20,
        'PensWon': 0.20,
        'Goal': 0.20,
        'xG': 0.125,
        'xA': 0.125,
        'KeyPass': 0.01,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.01,
        'shotfrombox': 0.01,
        'ShotConv': 0.01,
        'GAA': 0.05,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.15,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // WINGER (LW/RW)
  'LW/RW': {
    defense: {
      weight: 0.20,
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.02,
        'Tckl': 0.02,
        'GrndDlWn': 0.40,
        'poswon': 0.10,
        'poswonopphalf': 0.10,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.10,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.03,
        'LongBall%': 0.03,
        'Touches': 0.03,
        'ProgPass%': 0.056,
        'Success1v1': 0.40,
        'PsCmpInBox': 0.056,
        'Ps%InA3rd': 0.056,
        'touches/Turnovers': 0.219
      }
    },
    turnovers: {
      weight: 0.05,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.20,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.45,
      metrics: {
        'TouchOpBox': 0.04,
        'Shot': 0.03,
        'SOG': 0.03,
        'Ast': 0.20,
        'PensWon': 0.15,
        'Goal': 0.26,
        'xG': 0.075,
        'xA': 0.075,
        'KeyPass': 0.08,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.01,
        'shotfrombox': 0.01,
        'ShotConv': 0.01,
        'GAA': 0.01,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.17,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // CENTER FORWARD (CF/Striker)
  'CF': {
    defense: {
      weight: 0.10,
      metrics: {
        'Clrnce': 0.02,
        'Int': 0.02,
        'Tckl': 0.02,
        'GrndDlWn': 0.40,
        'poswon': 0.10,
        'poswonopphalf': 0.10,
        'AerialWon': 0.30,
        'ground%': 0.00,
        'Aerial%': 0.00
      }
    },
    ballMovement: {
      weight: 0.10,
      metrics: {
        'PassAccFwd': 0.056,
        '%PassFwd': 0.056,
        'Pass%': 0.03,
        'LongBall%': 0.03,
        'Touches': 0.03,
        'ProgPass%': 0.056,
        'Success1v1': 0.40,
        'PsCmpInBox': 0.056,
        'Ps%InA3rd': 0.056,
        'touches/Turnovers': 0.219
      }
    },
    turnovers: {
      weight: 0.05,
      metrics: {
        'PossLost': 0.25,
        'PsLostD3': 0.25,
        'ErrShot': 0.125,
        'ErrGoal': 0.20,
        'PensCom': 0.15,
        'FlComD3': 0.025
      }
    },
    attack: {
      weight: 0.55,
      metrics: {
        'TouchOpBox': 0.04,
        'Shot': 0.03,
        'SOG': 0.03,
        'Ast': 0.10,
        'PensWon': 0.15,
        'Goal': 0.36,
        'xG': 0.075,
        'xA': 0.005,
        'KeyPass': 0.05,
        'SOG_from_box': 0.01,
        'shotfromgolden': 0.04,
        'shotfrombox': 0.01,
        'ShotConv': 0.08,
        'GAA': 0.11,
        'ChncOpnPl': 0.01
      }
    },
    physical: {
      weight: 0.17,
      metrics: {
        'KMHSPEED': 0.10,
        'distancepergame': 0.40,
        '%Intensity': 0.50
      }
    },
    plusMinus: {
      weight: 0.03,
      metrics: {
        '+/-': 1.0
      }
    }
  },

  // GOALKEEPER (GK)
  'GK': {
    gkShotStopping: {
      weight: 0.57,
      metrics: {
        'GKxg': 0.20,
        'Save % from 6 Yard': 0.09,
        'Save % from Box': 0.09,
        'ShotOnTargetSave%': 0.07,
        'ShotOnTargetFromBoxSave%': 0.07,
        'Save%': 0.05,
        'OppShotsOnTarget': 0.00,
        'OppShotsOnTargetFromBox': 0.00
      }
    },
    gkBallPlaying: {
      weight: 0.24,
      metrics: {
        'LongBall%': 0.15,
        'LgBallCp': 0.05,
        'Pass%': 0.04
      }
    },
    gkMistakes: {
      weight: 0.15,
      metrics: {
        'ErrGoal': 0.09,
        'ErrShot': 0.06
      }
    },
    gkPenalties: {
      weight: 0.04,
      metrics: {
        'Penalty Save Rate': 0.04,
        'PenFaced': 0.00
      }
    }
  }
}

// Helper function to get scoring weights for a position
const getScoringWeights = (position: string) => {
  return SCORING_WEIGHTS_BY_POSITION[position] || SCORING_WEIGHTS_BY_POSITION['CB']
}

// Get category keys and display names for a position
const getCategoriesForPosition = (position: string): Array<{key: string, displayName: string, emoji: string}> => {
  const weights = getScoringWeights(position)
  const categories: Array<{key: string, displayName: string, emoji: string}> = []

  // Check which categories exist for this position
  if (weights.defense) categories.push({key: 'defense', displayName: 'Defense', emoji: '🛡️'})
  if (weights.ballMovement) categories.push({key: 'ballMovement', displayName: 'Ball Mvmt', emoji: '⚽'})
  if (weights.turnovers) categories.push({key: 'turnovers', displayName: 'Turnovers', emoji: '⚠️'})
  if (weights.attack) categories.push({key: 'attack', displayName: 'Attack', emoji: '⚔️'})
  if (weights.physical) categories.push({key: 'physical', displayName: 'Physical', emoji: '💪'})
  if (weights.plusMinus) categories.push({key: 'plusMinus', displayName: '+/-', emoji: '±'})
  if (weights.gkShotStopping) categories.push({key: 'gkShotStopping', displayName: 'Shot Stop', emoji: '🧤'})
  if (weights.gkBallPlaying) categories.push({key: 'gkBallPlaying', displayName: 'Ball Play', emoji: '🎯'})
  if (weights.gkMistakes) categories.push({key: 'gkMistakes', displayName: 'Mistakes', emoji: '🛡'})
  if (weights.gkPenalties) categories.push({key: 'gkPenalties', displayName: 'Penalties', emoji: '🎟'})

  return categories
}

// All available metrics organized by category
const ALL_METRICS = {
  defense: {
    name: '🛡️ Defense',
    metrics: {
      'Clrnce': 'Clearances',
      'Int': 'Interceptions',
      'Tckl': 'Tackles',
      'GrndDlWn': 'Ground Duels Won',
      'poswon': 'Possessions Won',
      'poswonopphalf': 'Poss Won Opp Half',
      'AerialWon': 'Aerial Duels Won',
      'ground%': 'Ground Duel Win %',
      'Aerial%': 'Aerial Duel Win %'
    }
  },
  ballMovement: {
    name: '⚽ Ball Movement',
    metrics: {
      'PassAccFwd': 'Forward Pass Acc',
      '%PassFwd': '% Passes Forward',
      'Pass%': 'Pass Accuracy %',
      'LongBall%': 'Long Ball Acc %',
      'Touches': 'Touches',
      'ProgPass%': 'Progressive Pass %',
      'Success1v1': '1v1 Success',
      'PsCmpInBox': 'Passes in Box',
      'Ps%InA3rd': 'Pass % Att 3rd',
      'touches/Turnovers': 'Touches/Turnover'
    }
  },
  turnovers: {
    name: '⚠️ Turnovers',
    metrics: {
      'PossLost': 'Possessions Lost',
      'PsLostD3': 'Pass Lost Def 3rd',
      'ErrShot': 'Errors → Shot',
      'ErrGoal': 'Errors → Goal',
      'PensCom': 'Penalties Conceded',
      'FlComD3': 'Fouls Def 3rd'
    }
  },
  attack: {
    name: '⚔️ Attack',
    metrics: {
      'TouchOpBox': 'Touches Opp Box',
      'Shot': 'Shots',
      'SOG': 'Shots on Goal',
      'Ast': 'Assists',
      'PensWon': 'Penalties Won',
      'Goal': 'Goals',
      'xG': 'Expected Goals',
      'xA': 'Expected Assists',
      'KeyPass': 'Key Passes',
      'SOG_from_box': 'SOG from Box',
      'shotfromgolden': 'Shots Golden Zone',
      'shotfrombox': 'Shots from Box',
      'ShotConv': 'Shot Conversion %',
      'GAA': 'Goal Assist Att',
      'ChncOpnPl': 'Chances Open Play'
    }
  },
  physical: {
    name: '💪 Physical',
    metrics: {
      'KMHSPEED': 'Max Speed (KMH)',
      'distancepergame': 'Distance/Game',
      '%Intensity': '% Intensity'
    }
  },
  plusMinus: {
    name: '± Plus/Minus',
    metrics: {
      '+/-': 'Plus/Minus'
    }
  },
  gkShotStopping: {
    name: '🧤 Shot Stopping',
    metrics: {
      'GKxg': 'Goals Prevented (PSxG±)',
      'Save % from 6 Yard': 'Save % from 6 Yard',
      'Save % from Box': 'Save % from Box',
      'ShotOnTargetSave%': 'Shot on Target Save %',
      'ShotOnTargetFromBoxSave%': 'Box SOT Save %',
      'Save%': 'Save %',
      'OppShotsOnTarget': 'Opp Shots on Target',
      'OppShotsOnTargetFromBox': 'Opp Box SOT'
    }
  },
  gkBallPlaying: {
    name: '🎯 Ball Playing',
    metrics: {
      'LongBall%': 'Long Ball Accuracy %',
      'LgBallCp': 'Long Ball Completions',
      'Pass%': 'Pass Accuracy %'
    }
  },
  gkMistakes: {
    name: '🛡 Mistakes',
    metrics: {
      'ErrGoal': 'Errors → Goal',
      'ErrShot': 'Errors → Shot'
    }
  },
  gkPenalties: {
    name: '🎟 Penalties',
    metrics: {
      'Penalty Save Rate': 'Penalty Save Rate',
      'PenFaced': 'Penalties Faced'
    }
  }
}

interface PlayerData {
  [key: string]: any
}

interface PlayerWithPosition extends PlayerData {
  real_position?: string
  player_id?: string
}

export default function OptaScore() {
  const [csvData, setCsvData] = useState<PlayerData[]>([])
  const [teamTotalsData, setTeamTotalsData] = useState<any[]>([])
  const [playersWithPositions, setPlayersWithPositions] = useState<PlayerWithPosition[]>([])
  const [scoredData, setScoredData] = useState<any[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string>('CB')
  const [availablePositions, setAvailablePositions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [minMinutesFilter, setMinMinutesFilter] = useState<number>(0)
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<any>(null)
  const [sortColumn, setSortColumn] = useState<string>('totalScore')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [columnSearchQuery, setColumnSearchQuery] = useState('')
  const [showCategoryColumns, setShowCategoryColumns] = useState(true)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        console.log('📊 CSV Data loaded:', results.data)
        const csvPlayers = results.data as PlayerData[]
        setCsvData(csvPlayers)

        // Log first player to see available fields
        if (csvPlayers.length > 0) {
          console.log('📋 Sample CSV player fields:', Object.keys(csvPlayers[0]))
          console.log('📋 Sample CSV player:', csvPlayers[0])
        }

        // Fetch real_position from opta_player_object table
        try {
          const { data: optaPlayers, error } = await supabase
            .from('opta_player_object')
            .select('playerId, real_position, FullName, profile_pic_supabase_url')

          if (error) {
            console.error('Error fetching player positions:', error)
            alert('Error fetching player positions from database')
            setIsLoading(false)
            return
          }

          console.log('👥 Opta players fetched:', optaPlayers?.length)

          // Join CSV data with opta_player_object by player_id or name
          const enrichedPlayers = csvPlayers.map(csvPlayer => {
            // Try exact match first
            let optaPlayer = optaPlayers?.find(op =>
              op.playerId === csvPlayer.player_id ||
              op.playerId === csvPlayer.PlayerId ||
              op.FullName === csvPlayer.Player ||
              op.FullName === csvPlayer.playerFullName
            )

            // If no exact match, try fuzzy matching on name (e.g., "E. Gethon" -> "Emmanuel Gethon")
            if (!optaPlayer && csvPlayer.Player) {
              const csvName = csvPlayer.Player.toLowerCase()
              optaPlayer = optaPlayers?.find(op => {
                const fullName = op.FullName?.toLowerCase() || ''
                // Check if abbreviated name matches (e.g., "e. gethon" matches "emmanuel gethon")
                const nameParts = csvName.split(' ')
                if (nameParts.length >= 2) {
                  const initial = nameParts[0].replace('.', '').trim()
                  const lastName = nameParts.slice(1).join(' ').trim()
                  return fullName.startsWith(initial) && fullName.includes(lastName)
                }
                return false
              })
            }

            if (!optaPlayer) {
              console.log('❌ No match found for CSV player:', csvPlayer.Player || csvPlayer.FullName)
            }

            return {
              ...csvPlayer,
              real_position: optaPlayer?.real_position || 'Unknown',
              player_id: optaPlayer?.playerId || csvPlayer.player_id || csvPlayer.PlayerId,
              FullName: optaPlayer?.FullName || csvPlayer.playerFullName || csvPlayer.FullName || csvPlayer.Player,
              profile_pic_supabase_url: optaPlayer?.profile_pic_supabase_url
            }
          })

          console.log('✅ Enriched players with positions:', enrichedPlayers)
          const positionBreakdown = enrichedPlayers.reduce((acc: any, p) => {
            acc[p.real_position] = (acc[p.real_position] || 0) + 1
            return acc
          }, {})
          console.log('📊 Position breakdown:', positionBreakdown)
          setPlayersWithPositions(enrichedPlayers)

          // Get unique positions for filter - ONLY show positions with scoring weights (CB, LB, RB)
          const positionSet = new Set(enrichedPlayers.map(p => p.real_position))
          const allPositions = Array.from(positionSet).filter(p => p && p !== 'Unknown')

          // Filter to only positions with scoring configured
          const scorablePositions = allPositions.filter(pos => {
            return SCORING_WEIGHTS_BY_POSITION.hasOwnProperty(pos)
          })

          console.log('📊 All positions found:', allPositions)
          console.log('🎯 Positions with scoring (CB/LB/RB):', scorablePositions)
          setAvailablePositions(scorablePositions.sort())

          // Auto-select first scorable position
          if (scorablePositions.length > 0) {
            setSelectedPosition(scorablePositions[0])
            calculateScores(enrichedPlayers, scorablePositions[0], minMinutesFilter)
          }

          setIsLoading(false)
        } catch (error) {
          console.error('Error processing data:', error)
          alert('Error processing player data')
          setIsLoading(false)
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        alert('Error parsing CSV file')
        setIsLoading(false)
      }
    })
  }

  const handleTeamTotalsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log('🏟️ Team totals CSV loaded:', results.data)
        const teamData = results.data as any[]

        // Log first team to see available fields
        if (teamData.length > 0) {
          console.log('📋 Sample team totals fields:', Object.keys(teamData[0]))
          console.log('📋 Sample team totals:', teamData[0])
        }

        setTeamTotalsData(teamData)
        console.log('✅ Team totals loaded:', teamData.length, 'teams')

        // Re-calculate scores if we already have player data
        if (playersWithPositions.length > 0 && selectedPosition) {
          calculateScores(playersWithPositions, selectedPosition, minMinutesFilter)
        }
      },
      error: (error) => {
        console.error('Error parsing team totals CSV:', error)
        alert('Error parsing team totals CSV file')
      }
    })
  }

  const calculateScores = (data: PlayerWithPosition[], position: string, minMinutes: number = 0) => {
    if (data.length === 0) return

    // Check if scoring weights exist for this position
    const scoringWeights = getScoringWeights(position)
    if (!scoringWeights) {
      console.log(`⚠️ Scoring not available for position: ${position}. Showing players without scores.`)

      // Show players without scoring for positions that don't have weights
      const filteredPlayers = data.filter(player => {
        const minutes = parseFloat(player['MinIncET']) || 0
        return player.real_position === position && minutes >= minMinutes
      }).map(player => ({
        ...player,
        totalScore: 0,
        categoryScores: {},
        teamPercentages: {},
        metricScores: {},
        minutesPlayed: parseFloat(player['MinIncET']) || 0
      }))

      setScoredData(filteredPlayers)
      return
    }

    // Filter players by exact real_position and minimum minutes
    const filteredPlayers = data.filter(player => {
      const minutes = parseFloat(player['MinIncET']) || 0
      return player.real_position === position && minutes >= minMinutes
    })

    console.log(`🎯 Filtered ${filteredPlayers.length} ${position}s for scoring (min ${minMinutes} minutes)`)

    // ===== Team Totals: Calculate per-90 team totals =====
    const teamTotals: { [team: string]: { [metric: string]: number } } = {}
    const teamMinutes: { [team: string]: number } = {}

    // Metrics that should NOT be summed (they're rates/percentages)
    const nonSummableMetrics = ['KMHSPEED', 'distancepergame', '%Intensity', 'Pass%', '%PassFwd',
                                 'PassAccFwd', 'ProgPass%', 'LongBall%', 'Ps%InA3rd', 'ShotConv',
                                 'touches/Turnovers', 'ground%', 'Aerial%',
                                 'Save % from 6 Yard', 'Save % from Box', 'ShotOnTargetSave%', 'ShotOnTargetFromBoxSave%',
                                 'Save%', 'Penalty Save Rate']

    // Physical metrics that should NOT have team share calculated
    const physicalMetrics = ['KMHSPEED', 'distancepergame', '%Intensity']

    if (teamTotalsData.length > 0) {
      // Use uploaded team totals CSV and normalize to per-90
      console.log('✅ Using uploaded team totals from CSV')
      teamTotalsData.forEach(teamRow => {
        const teamName = teamRow.Team || teamRow.teamName || teamRow.TeamId || teamRow.team || 'Unknown'
        const teamMins = parseFloat(teamRow.MinIncET || teamRow.Minutes) || 1
        teamMinutes[teamName] = teamMins
        teamTotals[teamName] = {}

        Object.values(scoringWeights).forEach((category: any) => {
          Object.keys(category.metrics).forEach(metric => {
            const rawValue = parseFloat(teamRow[metric]) || 0

            if (nonSummableMetrics.includes(metric)) {
              // For rates/percentages, keep as-is (already normalized)
              teamTotals[teamName][metric] = rawValue
            } else {
              // Normalize to per-90: (rawValue / teamMinutes) * 90
              teamTotals[teamName][metric] = (rawValue / teamMins) * 90
            }
          })
        })
      })
      console.log('📊 Team totals loaded and normalized to per-90:', Object.keys(teamTotals))
    } else {
      // Fallback: Calculate team totals from player data (already per-90 in player data)
      console.log('⚠️ No team totals CSV uploaded - calculating from player data')

      // Group players by team
      const playersByTeam: { [key: string]: PlayerWithPosition[] } = {}
      data.forEach(player => {
        const teamName = player.Team || player.teamName || player.TeamId || 'Unknown'
        if (!playersByTeam[teamName]) {
          playersByTeam[teamName] = []
        }
        playersByTeam[teamName].push(player)
      })

      console.log('🏟️ Teams found:', Object.keys(playersByTeam))

      Object.entries(playersByTeam).forEach(([teamName, teamPlayers]) => {
        teamTotals[teamName] = {}

        // Calculate total team minutes
        const totalTeamMinutes = teamPlayers.reduce((sum, p) => {
          return sum + (parseFloat(p['MinIncET']) || 0)
        }, 0)
        teamMinutes[teamName] = totalTeamMinutes

        Object.values(scoringWeights).forEach((category: any) => {
          Object.keys(category.metrics).forEach(metric => {
            if (nonSummableMetrics.includes(metric)) {
              // For non-summable metrics, use average
              const avgValue = teamPlayers.reduce((sum, p) => {
                const val = parseFloat(p[metric]) || 0
                return sum + val
              }, 0) / teamPlayers.length
              teamTotals[teamName][metric] = avgValue
            } else {
              // Sum raw values then normalize to per-90
              const totalValue = teamPlayers.reduce((sum, p) => {
                const rawValue = parseFloat(p[metric]) || 0
                return sum + rawValue
              }, 0)
              // Normalize to per-90: (totalValue / totalTeamMinutes) * 90
              teamTotals[teamName][metric] = totalTeamMinutes > 0 ? (totalValue / totalTeamMinutes) * 90 : 0
            }
          })
        })
      })

      console.log('📊 Team totals calculated (per-90):', teamTotals)
    }

    // Get min/max for each metric for normalization (now based on percentage contribution)
    const metricRanges: { [key: string]: { min: number, max: number } } = {}

    // Collect percentage contributions from all filtered players (all normalized to per-90)
    Object.values(scoringWeights).forEach((category: any) => {
      Object.keys(category.metrics).forEach(metric => {
        const values = filteredPlayers
          .map(p => {
            const teamName = p.Team || p.teamName || p.TeamId || 'Unknown'
            const rawValue = parseFloat(p[metric]) || 0
            const minutes = parseFloat(p['MinIncET']) || 0
            const teamTotalPer90 = teamTotals[teamName]?.[metric] || 0

            if (minutes === 0) return 0

            // Normalize player value to per-90
            let playerPer90: number
            if (nonSummableMetrics.includes(metric)) {
              // For rates/percentages and absolute values, just use the raw value (already normalized)
              playerPer90 = rawValue
            } else {
              // For countable metrics, normalize to per-90: (rawValue / minutes) * 90
              playerPer90 = (rawValue / minutes) * 90
            }

            // Calculate percentage contribution to team (both per-90)
            if (physicalMetrics.includes(metric)) {
              // Physical metrics: use raw value for comparison (no team share)
              return playerPer90
            } else if (metric === '+/-') {
              // Plus/Minus: use difference from team average (handles positive/negative crossing zero)
              // This shows how much better/worse the player is compared to team
              const diffFromTeam = playerPer90 - teamTotalPer90
              return diffFromTeam
            } else if (nonSummableMetrics.includes(metric)) {
              // Rate/percentage metrics: calculate as % of team average/total
              if (teamTotalPer90 === 0) return 0
              const playerPercentage = (playerPer90 / teamTotalPer90) * 100
              return playerPercentage
            } else {
              // For countable metrics, calculate player's % of team total per-90
              if (teamTotalPer90 === 0) return 0
              const playerPercentage = (playerPer90 / teamTotalPer90) * 100
              return playerPercentage
            }
          })
          .filter(v => !isNaN(v))

        if (values.length > 0) {
          metricRanges[metric] = {
            min: Math.min(...values),
            max: Math.max(...values)
          }

          // Debug logging for +/-
          if (metric === '+/-') {
            console.log(`📊 +/- Range: min=${metricRanges[metric].min.toFixed(2)}, max=${metricRanges[metric].max.toFixed(2)}, total values=${values.length}`)
            console.log(`📊 Sample +/- values:`, values.slice(0, 10).map(v => v.toFixed(2)))
            console.log(`📊 Max +/- value found:`, Math.max(...values).toFixed(2))

            // Show top 10 players with their names and minutes
            const playersWithValues = filteredPlayers.map((p, idx) => {
              const pAny = p as any
              return {
                name: pAny.FullName || pAny.Player || 'Unknown',
                team: pAny.Team || p.teamName || 'Unknown',
                minutes: parseFloat(pAny['MinIncET']) || 0,
                value: values[idx]
              }
            }).sort((a, b) => b.value - a.value)

            console.log(`📊 Top 10 +/- players (filtered):`, playersWithValues.slice(0, 10).map(p =>
              `${p.name} (${p.team}): ${p.value.toFixed(2)}% @ ${p.minutes} min`
            ))
          }
        }
      })
    })

    console.log('📏 Metric ranges (% of team totals):', metricRanges)

    // Calculate scores for each player
    const scored = filteredPlayers
      .filter(player => {
        const minutes = parseFloat(player['MinIncET']) || 0
        return minutes > 0 // Only include players with minutes played
      })
      .map(player => {
        const minutes = parseFloat(player['MinIncET']) || 0
        const teamName = player.Team || player.teamName || player.TeamId || 'Unknown'

        let totalScore = 0
        const categoryScores: { [key: string]: number } = {}
        const teamPercentages: { [key: string]: number } = {} // Store for display
        const metricScores: { [key: string]: number } = {} // Per-metric 1-100 scores

        // Calculate score for each category
        Object.entries(scoringWeights).forEach(([categoryName, category]: [string, any]) => {
          let categoryScore = 0

          // Calculate sum of metric weights to determine normalization approach
          const metricWeightsSum = Object.values(category.metrics).reduce((sum: number, w: any) => sum + w, 0)
          // If weights sum to ~1.0, they're already normalized; otherwise divide by category.weight
          const useAbsoluteWeights = Math.abs(metricWeightsSum - category.weight) < 0.01

          Object.entries(category.metrics).forEach(([metric, metricWeight]: [string, any]) => {
            const rawValue = parseFloat(player[metric]) || 0
            const teamTotalPer90 = teamTotals[teamName]?.[metric] || 0
            const range = metricRanges[metric]

            // Normalize player value to per-90
            let playerPer90: number
            if (nonSummableMetrics.includes(metric)) {
              // For rates/percentages and absolute values, use raw value (already normalized)
              playerPer90 = rawValue
            } else {
              // For countable metrics, normalize to per-90: (rawValue / minutes) * 90
              playerPer90 = (rawValue / minutes) * 90
            }

            // Calculate the value to normalize (percentage or raw)
            let valueToNormalize: number
            if (physicalMetrics.includes(metric)) {
              // Physical metrics: use raw value (no team share)
              valueToNormalize = playerPer90
            } else if (metric === '+/-') {
              // Plus/Minus: use difference from team average (handles positive/negative crossing zero)
              const diffFromTeam = playerPer90 - teamTotalPer90
              valueToNormalize = diffFromTeam
              // Store difference for display
              teamPercentages[metric] = diffFromTeam
            } else if (nonSummableMetrics.includes(metric)) {
              // Rate/percentage metrics: calculate team share as % of team average/total
              valueToNormalize = teamTotalPer90 > 0 ? (playerPer90 / teamTotalPer90) * 100 : 0
              teamPercentages[metric] = valueToNormalize // Store for display
            } else {
              // For countable metrics, use percentage of team total per-90
              valueToNormalize = teamTotalPer90 > 0 ? (playerPer90 / teamTotalPer90) * 100 : 0
              teamPercentages[metric] = valueToNormalize // Store for display
            }

            if (range && metricWeight > 0) {
              let metricScore: number

              if (range.max > range.min) {
                // Normalize to 1-100: Player with highest % gets 100, lowest gets 1
                metricScore = ((valueToNormalize - range.min) / (range.max - range.min)) * 99 + 1

                // Debug logging for +/-
                if (metric === '+/-' && valueToNormalize > 1.5) {
                  console.log(`🎯 High +/- player: ${player.FullName || player.Player} (${teamName}), diffFromAvg=${valueToNormalize.toFixed(2)}, playerPer90=${playerPer90.toFixed(2)}, teamAvg=${teamTotalPer90.toFixed(2)}, range.min=${range.min.toFixed(2)}, range.max=${range.max.toFixed(2)}, score=${metricScore.toFixed(2)}`)
                }
                if (metric === '+/-' && valueToNormalize > 2.5) {
                  console.log(`🏆 TOP +/- player: ${player.FullName || player.Player} (${teamName}), diffFromAvg=${valueToNormalize.toFixed(2)}, playerPer90=${playerPer90.toFixed(2)}, teamAvg=${teamTotalPer90.toFixed(2)}, rawValue=${rawValue.toFixed(2)}, minutes=${minutes}`)
                }
              } else {
                // If all players have the same value, give them a neutral score of 50
                metricScore = valueToNormalize > 0 ? 50 : 1
              }

              // Ensure metric score is between 1 and 100
              metricScore = Math.max(1, Math.min(100, metricScore))

              // For turnover and GK mistake metrics, invert the score (lower is better)
              if (categoryName === 'turnovers' || categoryName === 'gkMistakes') {
                metricScore = 101 - metricScore // Invert within 1-100 range
              }

              // Store per-metric score (1-100)
              metricScores[metric] = metricScore

              // Add weighted metric score to category score
              // Two cases:
              // 1. If metric weights sum to category.weight (absolute weights like GK: 0.09+0.06=0.15)
              //    -> divide by category.weight to normalize to 1-100 scale
              // 2. If metric weights sum to 1.0 (already normalized like CB defense)
              //    -> use directly as they already represent proportions
              const metricProportionInCategory = useAbsoluteWeights
                ? metricWeight / category.weight
                : metricWeight
              categoryScore += metricScore * metricProportionInCategory
            }
          })

          // Category score is 1-100 scale (if player is #1 in all metrics, category score = 100)
          categoryScores[categoryName] = categoryScore

          // Add to total score with category weight
          // category.weight is the category's contribution to total (e.g., 0.50 for defense)
          totalScore += categoryScore * category.weight
        })

        // Log first player's detailed breakdown
        if (player === filteredPlayers[0]) {
          const touchesPer90 = ((parseFloat(player['Touches']) || 0) / minutes) * 90
          const tacklesPer90 = ((parseFloat(player['Tckl']) || 0) / minutes) * 90
          console.log('🔍 Sample player calculation (per-90 based):', {
            player: player.FullName || player.Player,
            team: teamName,
            minutes,
            samplePer90Values: {
              touches: touchesPer90.toFixed(2) + ' per 90',
              tackles: tacklesPer90.toFixed(2) + ' per 90'
            },
            samplePercentages: {
              touches: teamPercentages['Touches']?.toFixed(2) + '% of team per-90',
              tackles: teamPercentages['Tckl']?.toFixed(2) + '% of team per-90'
            },
            sampleMetricScores: {
              tackles: metricScores['Tckl']?.toFixed(1) + '/100',
              touches: metricScores['Touches']?.toFixed(1) + '/100'
            },
            categoryScores,
            totalScore: totalScore.toFixed(2)
          })
        }

        return {
          ...player,
          totalScore,
          categoryScores,
          minutesPlayed: minutes,
          teamPercentages,
          metricScores, // Include per-metric scores
          teamName
        }
      })

    // Calculate rankings for each metric
    const metricRankings: { [key: string]: { [playerId: string]: number } } = {}

    Object.values(scoringWeights).forEach((category: any) => {
      Object.keys(category.metrics).forEach(metric => {
        // Sort players by this metric's score (descending - higher is better)
        const playerMetricValues = scored.map(p => {
          const playerAny = p as any
          return {
            playerId: playerAny.player_id || playerAny.FullName || playerAny.Player,
            metricScore: p.metricScores?.[metric] || 0,
            per90Value: (() => {
              const rawValue = parseFloat(playerAny[metric]) || 0
              const minutes = p.minutesPlayed || 1
              const isNonSummable = nonSummableMetrics.includes(metric)
              return isNonSummable ? rawValue : (rawValue / minutes) * 90
            })()
          }
        }).sort((a, b) => {
          // For turnovers and GK mistakes (lower is better), sort by per90Value ascending
          // For others, sort by metricScore descending
          if (scoringWeights.turnovers?.metrics?.hasOwnProperty(metric) ||
              scoringWeights.gkMistakes?.metrics?.hasOwnProperty(metric)) {
            return a.per90Value - b.per90Value // Lower is better
          }
          return b.metricScore - a.metricScore // Higher is better
        })

        metricRankings[metric] = {}
        playerMetricValues.forEach((pv, index) => {
          metricRankings[metric][pv.playerId] = index + 1
        })
      })
    })

    // Add rankings to each player
    const scoredWithRankings = scored.map(player => {
      const playerAny = player as any
      return {
        ...player,
        metricRankings: Object.keys(metricRankings).reduce((acc, metric) => {
          const playerId = playerAny.player_id || playerAny.FullName || playerAny.Player
          acc[metric] = metricRankings[metric][playerId] || 0
          return acc
        }, {} as { [key: string]: number })
      }
    })

    // Sort by total score descending
    scoredWithRankings.sort((a, b) => b.totalScore - a.totalScore)

    // Log final score range (no normalization - scores are exactly as calculated)
    if (scoredWithRankings.length > 0) {
      const scores = scoredWithRankings.map(p => p.totalScore)
      const minScore = Math.min(...scores)
      const maxScore = Math.max(...scores)

      const topPlayerAny = scoredWithRankings[0] as any
      console.log('✅ Final CB scores (based on exact weighted calculation):', {
        scoreRange: `${minScore.toFixed(2)} - ${maxScore.toFixed(2)}`,
        topPlayer: topPlayerAny.FullName || topPlayerAny.Player,
        topScore: scoredWithRankings[0].totalScore.toFixed(2),
        totalPlayers: scoredWithRankings.length,
        note: 'Scores are NOT normalized - they reflect exact weighted performance'
      })
    }

    setScoredData(scoredWithRankings)
  }

  const handlePositionFilter = (position: string) => {
    setSelectedPosition(position)
    if (playersWithPositions.length > 0) {
      calculateScores(playersWithPositions, position, minMinutesFilter)
    }
  }

  const handleMinutesFilterChange = (minutes: number) => {
    setMinMinutesFilter(minutes)
    if (playersWithPositions.length > 0 && selectedPosition) {
      calculateScores(playersWithPositions, selectedPosition, minutes)
    }
  }

  const handleDownloadScores = () => {
    if (scoredData.length === 0) {
      alert('No data to download')
      return
    }

    const csv = Papa.unparse(scoredData)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opta-scores-${selectedPosition}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to descending
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Get sorted and filtered data
  const getSortedData = () => {
    // Apply column sorting if a sort column is selected
    if (!sortColumn) return scoredData

    const sorted = [...scoredData].sort((a, b) => {
      let aValue: number
      let bValue: number

      if (sortColumn === 'totalScore') {
        aValue = a.totalScore
        bValue = b.totalScore
      } else if (a.categoryScores && a.categoryScores[sortColumn] !== undefined) {
        // For category scores
        aValue = a.categoryScores[sortColumn] || 0
        bValue = b.categoryScores[sortColumn] || 0
      } else {
        // For individual metric scores
        aValue = a.metricScores?.[sortColumn] || 0
        bValue = b.metricScores?.[sortColumn] || 0
      }

      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return sorted
  }

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      <div style={{ padding: '20px', fontFamily: 'Montserrat' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 215, 0, 0.2)'
        }}>
        <h2 style={{ color: '#FFD700', marginBottom: '16px', fontSize: '24px', fontWeight: '600' }}>
          ⚽ Opta Score Calculator
        </h2>
        <p style={{ color: '#ccc', marginBottom: '20px' }}>
          Upload Opta CSV data to calculate player scores based on position-specific weighting model
        </p>

        {/* Upload Section */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Player-level CSV Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#000',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}>
              <Upload size={20} />
              Upload Player CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
            {playersWithPositions.length > 0 && (
              <span style={{ color: '#10b981', fontWeight: '500' }}>
                ✓ {playersWithPositions.length} players loaded
              </span>
            )}
          </div>

          {/* Team-level CSV Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}>
              <Upload size={20} />
              Upload Team Totals CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleTeamTotalsUpload}
                style={{ display: 'none' }}
              />
            </label>
            {teamTotalsData.length > 0 && (
              <span style={{ color: '#10b981', fontWeight: '500' }}>
                ✓ {teamTotalsData.length} teams loaded
              </span>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div style={{
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          marginBottom: '20px',
          color: '#93c5fd',
          fontSize: '13px',
          lineHeight: '1.6'
        }}>
          <strong>Upload Instructions:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Player CSV:</strong> Individual player statistics (required)</li>
            <li><strong>Team Totals CSV:</strong> Team-level aggregated statistics for accurate normalization (optional - will calculate from player data if not provided)</li>
          </ul>
        </div>

        {/* Minutes Filter */}
        {playersWithPositions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Filter size={20} style={{ color: '#FFD700' }} />
              <span style={{ color: '#FFD700', fontWeight: '600' }}>Minimum Minutes Played:</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="900"
                step="90"
                value={minMinutesFilter}
                onChange={(e) => handleMinutesFilterChange(parseInt(e.target.value))}
                style={{
                  width: '200px',
                  accentColor: '#FFD700'
                }}
              />
              <span style={{ color: '#FFD700', fontWeight: '600', minWidth: '60px' }}>
                {minMinutesFilter}'
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0, 90, 180, 270, 450, 900].map(mins => (
                  <button
                    key={mins}
                    onClick={() => handleMinutesFilterChange(mins)}
                    style={{
                      padding: '6px 12px',
                      background: minMinutesFilter === mins
                        ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: minMinutesFilter === mins ? '#000' : '#fff',
                      border: minMinutesFilter === mins ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: minMinutesFilter === mins ? '600' : '400',
                      fontFamily: 'Montserrat',
                      fontSize: '12px'
                    }}
                  >
                    {mins}'
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Position Filter */}
        {availablePositions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Filter size={20} style={{ color: '#FFD700' }} />
              <span style={{ color: '#FFD700', fontWeight: '600' }}>Filter by Position:</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {availablePositions.map(position => (
                <button
                  key={position}
                  onClick={() => handlePositionFilter(position)}
                  style={{
                    padding: '8px 16px',
                    background: selectedPosition === position
                      ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                    color: selectedPosition === position ? '#000' : '#fff',
                    border: selectedPosition === position ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: selectedPosition === position ? '600' : '400',
                    fontFamily: 'Montserrat'
                  }}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Column Selector Button */}
        {scoredData.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowColumnSelector(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '8px',
                color: '#FFD700',
                cursor: 'pointer',
                fontFamily: 'Montserrat',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Filter size={18} />
              <span>Customize Columns</span>
              {visibleColumns.length > 0 && (
                <span style={{
                  background: 'rgba(255, 215, 0, 0.2)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {visibleColumns.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Download Button */}
        {scoredData.length > 0 && (
          <button
            onClick={handleDownloadScores}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '6px',
              color: '#10b981',
              cursor: 'pointer',
              fontFamily: 'Montserrat',
              fontWeight: '500'
            }}
          >
            <Download size={16} />
            Download Scored Data
          </button>
        )}
      </div>

      {/* Results Table */}
      {scoredData.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          overflowX: 'auto',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src="/beitar-logo.png"
                alt="Beitar Jerusalem"
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              />
              <h3 style={{ color: '#FFD700', fontSize: '18px', margin: 0 }}>
                FCBJ DATA
              </h3>
            </div>
            <div style={{ width: '100%', height: '1px', background: '#FFD700' }}></div>
            <div style={{ color: '#FFD700', fontSize: '14px', fontWeight: '500' }}>
              {selectedPosition === 'CB' ? 'Central Back' :
               selectedPosition === 'FB' ? 'Full Back' :
               selectedPosition === 'CM' ? 'Central Midfielder' :
               selectedPosition === 'AM' ? 'Attacking Midfielder' :
               selectedPosition === 'W' ? 'Winger' :
               selectedPosition === 'ST' ? 'Striker' :
               selectedPosition === 'GK' ? 'Goalkeeper' :
               selectedPosition}
            </div>
          </div>

          {/* Right Slide Panel for Column Selector */}
          {showColumnSelector && (
            <>
              {/* Backdrop overlay */}
              <div
                onClick={() => setShowColumnSelector(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 999,
                  animation: 'fadeIn 0.2s ease'
                }}
              />

              {/* Right Panel */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '380px',
                maxWidth: '90vw',
                background: 'linear-gradient(to bottom, #1a1a1a 0%, #0f0f0f 100%)',
                borderLeft: '2px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.6)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideInRight 0.25s ease'
              }}>
                {/* Panel Header */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid rgba(255, 215, 0, 0.2)',
                  background: 'rgba(255, 215, 0, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    color: '#FFD700',
                    fontWeight: '700',
                    fontSize: '16px',
                    margin: 0,
                    fontFamily: 'Montserrat'
                  }}>
                    Select Columns
                  </h3>
                  <button
                    onClick={() => setShowColumnSelector(false)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Montserrat',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                      e.currentTarget.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.color = '#fff'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Panel Content (Scrollable) */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px'
                }}>
                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '12px'
                  }}>
                    <button
                      onClick={() => {
                        const allMetrics: string[] = []
                        Object.values(ALL_METRICS).forEach(category => {
                          allMetrics.push(...Object.keys(category.metrics))
                        })
                        setVisibleColumns(allMetrics)
                        setShowCategoryColumns(true)
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        color: '#10b981',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600'
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setVisibleColumns([])
                        setShowCategoryColumns(true)
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600'
                      }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        setVisibleColumns([])
                        setShowCategoryColumns(false)
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '6px',
                        color: '#a855f7',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: 'Montserrat',
                        fontWeight: '600'
                      }}
                    >
                      Hide All
                    </button>
                  </div>

                  {/* Search bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={columnSearchQuery}
                      onChange={(e) => setColumnSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontFamily: 'Montserrat',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.4)'}
                      onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    />
                  </div>

                  {Object.entries(ALL_METRICS).map(([categoryKey, category]) => {
                    // Filter metrics based on search query
                    const filteredMetrics = Object.entries(category.metrics).filter(([metricKey, metricName]) => {
                      const searchLower = columnSearchQuery.toLowerCase()
                      return metricKey.toLowerCase().includes(searchLower) ||
                             (metricName as string).toLowerCase().includes(searchLower)
                    })

                    // Don't show category if no metrics match
                    if (filteredMetrics.length === 0 && columnSearchQuery) return null

                    const categoryMetrics = Object.keys(category.metrics)
                    const selectedCount = categoryMetrics.filter(m => visibleColumns.includes(m)).length

                    return (
                      <div key={categoryKey} style={{ marginBottom: '14px' }}>
                        <div style={{
                          color: '#FFD700',
                          fontWeight: '600',
                          fontSize: '12px',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: 'rgba(255, 215, 0, 0.08)',
                          borderRadius: '6px'
                        }}>
                          <span>{category.name.replace(/[🛡️⚽⚠️⚔️💪±]/g, '').trim()} <span style={{ color: '#666', fontSize: '10px', fontWeight: '500' }}>({selectedCount}/{categoryMetrics.length})</span></span>
                          <button
                            onClick={() => {
                              const allSelected = categoryMetrics.every(m => visibleColumns.includes(m))
                              if (allSelected) {
                                setVisibleColumns(visibleColumns.filter(col => !categoryMetrics.includes(col)))
                              } else {
                                const combined = [...visibleColumns, ...categoryMetrics]
                                setVisibleColumns(Array.from(new Set(combined)))
                              }
                            }}
                            style={{
                              padding: '3px 8px',
                              background: 'rgba(255, 215, 0, 0.1)',
                              border: '1px solid rgba(255, 215, 0, 0.2)',
                              borderRadius: '4px',
                              color: '#FFD700',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontFamily: 'Montserrat',
                              fontWeight: '600'
                            }}
                          >
                            {selectedCount === categoryMetrics.length ? '✓' : '○'}
                          </button>
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px'
                        }}>
                          {filteredMetrics.map(([metricKey, metricName]) => (
                            <button
                              key={metricKey}
                              onClick={() => {
                                if (visibleColumns.includes(metricKey)) {
                                  setVisibleColumns(visibleColumns.filter(col => col !== metricKey))
                                } else {
                                  setVisibleColumns([...visibleColumns, metricKey])
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 10px',
                                background: visibleColumns.includes(metricKey)
                                  ? 'rgba(255, 215, 0, 0.15)'
                                  : 'rgba(255, 255, 255, 0.05)',
                                border: visibleColumns.includes(metricKey)
                                  ? '1px solid rgba(255, 215, 0, 0.4)'
                                  : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'Montserrat',
                                fontWeight: visibleColumns.includes(metricKey) ? '600' : '500',
                                color: visibleColumns.includes(metricKey) ? '#FFD700' : '#aaa',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '3px',
                                background: visibleColumns.includes(metricKey) ? '#FFD700' : 'transparent',
                                border: visibleColumns.includes(metricKey) ? 'none' : '1.5px solid rgba(255, 255, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                color: '#000',
                                fontWeight: '900'
                              }}>
                                {visibleColumns.includes(metricKey) ? '✓' : ''}
                              </span>
                              <span>{metricName}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #FFD700' }}>
                <th style={{ padding: '4px 10px', textAlign: 'left', color: '#FFD700', width: '50px' }}>Rank</th>
                <th style={{ padding: '4px 10px', textAlign: 'left', color: '#FFD700', width: '180px' }}>Player</th>
                {showCategoryColumns && (
                  <>
                    <th
                      onClick={() => handleSort('totalScore')}
                      style={{
                        padding: '4px 10px',
                        textAlign: 'center',
                        color: '#FFD700',
                        cursor: 'pointer',
                        userSelect: 'none',
                        position: 'relative',
                        width: '90px'
                      }}
                    >
                      Total {sortColumn === 'totalScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    {getCategoriesForPosition(selectedPosition).map(category => (
                      <th
                        key={category.key}
                        onClick={() => handleSort(category.key)}
                        style={{
                          padding: '4px 10px',
                          textAlign: 'center',
                          color: '#FFD700',
                          cursor: 'pointer',
                          userSelect: 'none',
                          width: category.key.startsWith('gk') ? '85px' : '80px'
                        }}
                      >
                        {category.displayName} {sortColumn === category.key && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                  </>
                )}
                {/* Dynamic metric columns */}
                {visibleColumns.map(metricKey => {
                  // Find the display name for this metric
                  let displayName = metricKey
                  Object.values(ALL_METRICS).forEach(category => {
                    const metrics = category.metrics as any
                    if (metrics[metricKey]) {
                      displayName = metrics[metricKey]
                    }
                  })
                  return (
                    <th
                      key={metricKey}
                      onClick={() => handleSort(metricKey)}
                      style={{
                        padding: '4px 10px',
                        textAlign: 'center',
                        color: '#FFD700',
                        width: '120px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        minWidth: '120px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {displayName} {sortColumn === metricKey && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {getSortedData().map((player, index) => (
                <tr
                  key={index}
                  onClick={() => setSelectedPlayerModal(player)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <td style={{ padding: '8px 10px', color: '#888', fontWeight: '500', fontSize: '12px' }}>{index + 1}</td>
                  <td style={{ padding: '8px 10px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {player.profile_pic_supabase_url && (
                        <img
                          src={player.profile_pic_supabase_url}
                          alt={player.FullName || player.Player}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #FFD700',
                            imageRendering: '-webkit-optimize-contrast',
                            backfaceVisibility: 'hidden',
                            transform: 'translateZ(0)'
                          }}
                          loading="eager"
                        />
                      )}
                      <div>
                        <div style={{ marginBottom: '3px', fontSize: '13px' }}>
                          {player.FullName || player.Player || 'Unknown'}
                          <span style={{
                            marginLeft: '6px',
                            color: '#FFD700',
                            fontSize: '10px',
                            border: '1px solid #FFD700',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: '500'
                          }}>
                            {Math.round(player.minutesPlayed || 0)}'
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '10px' }}>
                          <span style={{
                            color: '#888',
                            fontStyle: 'italic'
                          }}>
                            {player.real_position}
                          </span>
                          {player.teamName && (
                            <>
                              <span style={{ color: '#666' }}>•</span>
                              <span style={{
                                color: '#3b82f6',
                                fontWeight: '500'
                              }}>
                                {player.teamName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  {showCategoryColumns && (
                    <>
                      <td style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        color: '#FFD700',
                        fontWeight: '700',
                        fontSize: '15px'
                      }}>
                        {typeof player.totalScore === 'number' ? player.totalScore.toFixed(2) : player.totalScore}
                      </td>
                      {getCategoriesForPosition(selectedPosition).map(category => (
                        <td key={category.key} style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc', fontSize: '12px' }}>
                          {typeof player.categoryScores[category.key] === 'number' ? player.categoryScores[category.key].toFixed(1) : '-'}
                        </td>
                      ))}
                    </>
                  )}
                  {/* Dynamic metric columns */}
                  {visibleColumns.map(metricKey => {
                    const rawValue = parseFloat(player[metricKey]) || 0
                    const minutes = player.minutesPlayed || 1

                    // Check if this is a rate/percentage metric (nonSummable but not physical)
                    const nonSummableMetrics = ['KMHSPEED', 'distancepergame', '%Intensity', 'Pass%', '%PassFwd',
                                                 'PassAccFwd', 'ProgPass%', 'LongBall%', 'Ps%InA3rd', 'ShotConv',
                                                 'touches/Turnovers', 'ground%', 'Aerial%',
                                                 'Save % from 6 Yard', 'Save % from Box', 'ShotOnTargetSave%', 'ShotOnTargetFromBoxSave%',
                                                 'Save%', 'Penalty Save Rate']
                    const physicalMetrics = ['KMHSPEED', 'distancepergame', '%Intensity']
                    const isRateMetric = nonSummableMetrics.includes(metricKey)

                    // Display value: raw for rates/percentages, per-90 for countable metrics
                    const displayValue = isRateMetric ? rawValue : (rawValue / minutes) * 90

                    const metricScore = player.metricScores?.[metricKey] || 0
                    const ranking = player.metricRankings?.[metricKey] || '-'
                    const teamShare = player.teamPercentages?.[metricKey] || 0

                    return (
                      <td
                        key={metricKey}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'center',
                          color: '#ccc',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '12px' }}>
                            {displayValue.toFixed(1)}
                          </div>
                          {!physicalMetrics.includes(metricKey) && metricKey !== '+/-' && (
                            <div style={{ fontSize: '9px', color: '#3b82f6' }}>
                              {teamShare.toFixed(0)}%
                            </div>
                          )}
                          {metricKey === '+/-' && (
                            <div style={{ fontSize: '9px', color: teamShare >= 0 ? '#10b981' : '#ef4444' }}>
                              {teamShare >= 0 ? '+' : ''}{teamShare.toFixed(1)}
                            </div>
                          )}
                          <div style={{ fontSize: '9px', color: '#888' }}>
                            {metricScore.toFixed(0)}
                          </div>
                          <div style={{ fontSize: '8px', color: '#a78bfa' }}>
                            #{ranking}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: 'center', color: '#FFD700', padding: '40px' }}>
          Loading...
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayerModal && (
        <div
          onClick={() => setSelectedPlayerModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'stretch',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '500px',
              backgroundColor: '#1a1a1a',
              padding: '24px',
              overflowY: 'auto',
              borderLeft: '2px solid #FFD700'
            }}
          >
            {/* Player Header */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              {selectedPlayerModal.profile_pic_supabase_url && (
                <img
                  src={selectedPlayerModal.profile_pic_supabase_url}
                  alt={selectedPlayerModal.FullName}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #FFD700'
                  }}
                />
              )}
              <div>
                <h2 style={{ color: '#FFD700', margin: '0 0 8px 0', fontSize: '24px' }}>
                  {selectedPlayerModal.FullName || selectedPlayerModal.Player}
                </h2>
                <p style={{ color: '#ccc', margin: 0 }}>
                  {selectedPlayerModal.real_position} • {Math.round(selectedPlayerModal.minutesPlayed || 0)}' played
                  {selectedPlayerModal.teamName && (
                    <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
                      • {selectedPlayerModal.teamName}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedPlayerModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid #FFD700',
                color: '#FFD700',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Montserrat',
                fontWeight: '600'
              }}
            >
              ✕ Close
            </button>

            {/* Scoring Breakdown Summary */}
            <div style={{ marginTop: '32px', marginBottom: '32px' }}>
              <h3 style={{ color: '#FFD700', fontSize: '18px', marginBottom: '16px' }}>
                🎯 Score Breakdown & Contribution
              </h3>

              {/* Total Score */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%)',
                border: '2px solid #FFD700',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>TOTAL SCORE</div>
                <div style={{ color: '#FFD700', fontSize: '32px', fontWeight: '700' }}>
                  {selectedPlayerModal.totalScore.toFixed(2)}
                </div>
                <div style={{ color: '#aaa', fontSize: '11px', marginTop: '4px' }}>
                  Out of 100 possible points
                </div>
              </div>

              {/* Category Contributions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Category Contributions to Total Score
                </h4>
                {Object.entries(getScoringWeights(selectedPosition)).map(([categoryName, category]: [string, any]) => {
                  const categoryScore = selectedPlayerModal.categoryScores?.[categoryName] || 0
                  const contribution = categoryScore * category.weight
                  const displayName = categoryName === 'defense' ? 'Defense' :
                                     categoryName === 'ballMovement' ? 'Ball Movement' :
                                     categoryName === 'turnovers' ? 'Turnovers' :
                                     categoryName === 'attack' ? 'Attack' :
                                     categoryName === 'physical' ? 'Physical' :
                                     categoryName === 'plusMinus' ? 'Plus/Minus' : categoryName

                  return (
                    <div key={categoryName} style={{
                      marginBottom: '12px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#FFD700', fontWeight: '600' }}>
                          {displayName} ({(category.weight * 100).toFixed(0)}% of total)
                        </span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                              +{contribution.toFixed(2)} pts
                            </div>
                            <div style={{ color: '#888', fontSize: '11px' }}>
                              Category Score: {categoryScore.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Visual contribution bar */}
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${(contribution / selectedPlayerModal.totalScore * 100)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                          borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per 90 Stats */}
            <div style={{ marginTop: '32px' }}>
              <h3 style={{ color: '#FFD700', fontSize: '18px', marginBottom: '16px' }}>
                📊 Detailed Metrics & Scoring
              </h3>
              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#93c5fd'
              }}>
                <strong>Legend:</strong>
                <div style={{ marginTop: '4px' }}>
                  • <strong>Per-90 Value:</strong> Player's performance normalized to 90 minutes
                </div>
                <div>
                  • <strong>Team Share:</strong> Player's % contribution to team total (for team-shared metrics)
                </div>
                <div>
                  • <strong>Score (1-100):</strong> Normalized score vs other players in position
                </div>
                <div>
                  • <strong>Weight:</strong> How much this metric contributes to its category
                </div>
                <div>
                  • <strong>Contribution:</strong> Points added to category score (Score × Weight)
                </div>
              </div>

              {/* Defense Stats */}
              {getScoringWeights(selectedPosition).defense && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Defense ({(getScoringWeights(selectedPosition).defense.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.defense?.toFixed(1) || '0'}
                </h4>
                {Object.entries({
                  'Clrnce': 'Clearances',
                  'Int': 'Interceptions',
                  'Tckl': 'Tackles',
                  'GrndDlWn': 'Ground Duels Won',
                  'poswon': 'Possessions Won',
                  'poswonopphalf': 'Possessions Won Opp Half',
                  'AerialWon': 'Aerial Duels Won',
                  'ground%': 'Ground Duel Win %',
                  'Aerial%': 'Aerial Duel Win %'
                }).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const minutes = selectedPlayerModal.minutesPlayed || 1
                  const teamPercentage = selectedPlayerModal.teamPercentages?.[metric]
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).defense.metrics as any)[metric] || 0
                  const isPercentageMetric = metric.includes('%')
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length

                  // Calculate per-90 value
                  const per90Value = isPercentageMetric ? rawValue : (rawValue / minutes) * 90

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: '10px' }}>Per-90</div>
                            <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                              {isPercentageMetric ? per90Value.toFixed(1) + '%' : per90Value.toFixed(2)}
                            </div>
                          </div>
                          {teamPercentage !== undefined && (
                            <div>
                              <div style={{ color: '#888', fontSize: '10px' }}>Team Share</div>
                              <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                                {teamPercentage.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* Ball Movement Stats */}
              {getScoringWeights(selectedPosition).ballMovement && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Ball Movement ({(getScoringWeights(selectedPosition).ballMovement.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.ballMovement?.toFixed(1) || '0'}
                </h4>
                {Object.entries({
                  'PassAccFwd': 'Forward Pass Accuracy',
                  '%PassFwd': '% Forward Passes',
                  'Pass%': 'Pass Accuracy %',
                  'LongBall%': 'Long Ball %',
                  'Touches': 'Touches',
                  'ProgPass%': 'Progressive Pass %',
                  'Success1v1': '1v1 Success',
                  'PsCmpInBox': 'Passes Completed in Box',
                  'Ps%InA3rd': 'Pass % in Attacking 3rd',
                  'touches/Turnovers': 'Touches per Turnover'
                }).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const minutes = selectedPlayerModal.minutesPlayed || 1
                  const teamPercentage = selectedPlayerModal.teamPercentages?.[metric]
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).ballMovement.metrics as any)[metric] || 0
                  const isPercentage = metric.includes('%') || metric.includes('Acc') || metric === 'touches/Turnovers'
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length

                  // Calculate per-90 value
                  const per90Value = isPercentage ? rawValue : (rawValue / minutes) * 90

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: '10px' }}>Per-90</div>
                            <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                              {isPercentage ? per90Value.toFixed(1) + '%' : per90Value.toFixed(2)}
                            </div>
                          </div>
                          {teamPercentage !== undefined && (
                            <div>
                              <div style={{ color: '#888', fontSize: '10px' }}>Team Share</div>
                              <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                                {teamPercentage.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* Turnovers Stats */}
              {getScoringWeights(selectedPosition).turnovers && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Turnovers ({(getScoringWeights(selectedPosition).turnovers.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.turnovers?.toFixed(1) || '0'}
                </h4>
                <div style={{
                  padding: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '11px',
                  color: '#fca5a5'
                }}>
                  ⚠️ <strong>Note:</strong> For turnovers, lower values are better. Scores are inverted (100 = fewest turnovers).
                </div>
                {Object.entries({
                  'PossLost': 'Possessions Lost',
                  'PsLostD3': 'Passes Lost in Defensive Third',
                  'ErrShot': 'Errors Leading to Shot',
                  'ErrGoal': 'Errors Leading to Goal',
                  'PensCom': 'Penalties Conceded',
                  'FlComD3': 'Fouls Committed in Defensive Third'
                }).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const minutes = selectedPlayerModal.minutesPlayed || 1
                  const teamPercentage = selectedPlayerModal.teamPercentages?.[metric]
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).turnovers.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length

                  // Calculate per-90 value (turnovers are not percentages)
                  const per90Value = (rawValue / minutes) * 90

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: '10px' }}>Per-90</div>
                            <div style={{ color: '#ef4444', fontWeight: '600', fontSize: '14px' }}>
                              {per90Value.toFixed(2)}
                            </div>
                          </div>
                          {teamPercentage !== undefined && (
                            <div>
                              <div style={{ color: '#888', fontSize: '10px' }}>Team Share</div>
                              <div style={{ color: '#f87171', fontWeight: '600', fontSize: '14px' }}>
                                {teamPercentage.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score (inverted)</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* Attack Stats */}
              {getScoringWeights(selectedPosition).attack && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Attack ({(getScoringWeights(selectedPosition).attack.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.attack?.toFixed(1) || '0'}
                </h4>
                {Object.entries({
                  'TouchOpBox': 'Touches in Opp Box',
                  'Shot': 'Shots',
                  'SOG': 'Shots on Goal',
                  'Ast': 'Assists',
                  'PensWon': 'Penalties Won',
                  'Goal': 'Goals',
                  'xG': 'Expected Goals (xG)',
                  'xA': 'Expected Assists (xA)',
                  'KeyPass': 'Key Passes',
                  'SOG_from_box': 'SOG from Box',
                  'shotfromgolden': 'Shots from Golden Zone',
                  'shotfrombox': 'Shots from Box',
                  'ShotConv': 'Shot Conversion',
                  'GAA': 'Goals Above Average',
                  'ChncOpnPl': 'Chances from Open Play'
                }).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const minutes = selectedPlayerModal.minutesPlayed || 1
                  const teamPercentage = selectedPlayerModal.teamPercentages?.[metric]
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).attack.metrics as any)[metric] || 0
                  const isPercentage = metric.includes('Conv')
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length

                  // Calculate per-90 value
                  const per90Value = isPercentage ? rawValue : (rawValue / minutes) * 90

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: '10px' }}>Per-90</div>
                            <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                              {isPercentage ? per90Value.toFixed(1) + '%' : per90Value.toFixed(2)}
                            </div>
                          </div>
                          {teamPercentage !== undefined && (
                            <div>
                              <div style={{ color: '#888', fontSize: '10px' }}>Team Share</div>
                              <div style={{ color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}>
                                {teamPercentage.toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* Physical Stats */}
              {getScoringWeights(selectedPosition).physical && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Physical ({(getScoringWeights(selectedPosition).physical.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.physical?.toFixed(1) || '0'}
                </h4>
                {Object.entries({
                  'KMHSPEED': 'Top Speed (km/h)',
                  'distancepergame': 'Distance Covered (m)',
                  '%Intensity': 'Intensity %'
                }).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).physical.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length
                  // These metrics are already normalized, no per-90 calculation needed
                  const displayValue = rawValue.toFixed(2)
                  const isPercentage = metric.includes('%')
                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#888', fontSize: '10px' }}>Value</div>
                          <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                            {displayValue}{isPercentage ? '%' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* Plus/Minus Stats */}
              {getScoringWeights(selectedPosition).plusMinus && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Plus/Minus ({(getScoringWeights(selectedPosition).plusMinus.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.plusMinus?.toFixed(1) || '0'}
                </h4>
                {Object.entries({
                  '+/-': 'Goal Differential'
                }).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).plusMinus.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length
                  const displayValue = rawValue.toFixed(1)
                  const valueColor = rawValue >= 0 ? '#10b981' : '#ef4444'
                  const teamPercentage = selectedPlayerModal.teamPercentages?.[metric]
                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          <span style={{
                            marginLeft: '8px',
                            color: '#888',
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '3px'
                          }}>
                            Weight: {(metricWeight * 100).toFixed(0)}%
                          </span>
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#888', fontSize: '10px' }}>Value</div>
                            <div style={{ color: valueColor, fontWeight: '600', fontSize: '14px' }}>
                              {rawValue >= 0 ? '+' : ''}{displayValue}
                            </div>
                          </div>
                          {teamPercentage !== undefined && (
                            <div>
                              <div style={{ color: '#888', fontSize: '10px' }}>vs Team Avg</div>
                              <div style={{ color: teamPercentage >= 0 ? '#10b981' : '#ef4444', fontWeight: '600', fontSize: '14px' }}>
                                {teamPercentage >= 0 ? '+' : ''}{teamPercentage.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  border: '1px solid rgba(34, 197, 94, 0.4)',
                                  borderRadius: '4px',
                                  color: '#22c55e',
                                  fontSize: '14px',
                                  fontWeight: '700'
                                }}>
                                  +{contribution.toFixed(2)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* GK Shot Stopping Stats */}
              {getScoringWeights(selectedPosition).gkShotStopping && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  🧤 Shot Stopping ({(getScoringWeights(selectedPosition).gkShotStopping.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.gkShotStopping?.toFixed(1) || '0'}
                </h4>
                {Object.entries(ALL_METRICS.gkShotStopping.metrics).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).gkShotStopping.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length
                  const isPercentageMetric = metric.includes('%') || metric.includes('Rate')

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#888', fontSize: '10px' }}>Value</div>
                          <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                            {isPercentageMetric ? rawValue.toFixed(1) + '%' : rawValue.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* GK Ball Playing Stats */}
              {getScoringWeights(selectedPosition).gkBallPlaying && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  🎯 Ball Playing ({(getScoringWeights(selectedPosition).gkBallPlaying.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.gkBallPlaying?.toFixed(1) || '0'}
                </h4>
                {Object.entries(ALL_METRICS.gkBallPlaying.metrics).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).gkBallPlaying.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length
                  const isPercentageMetric = metric.includes('%')

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#888', fontSize: '10px' }}>Value</div>
                          <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                            {isPercentageMetric ? rawValue.toFixed(1) + '%' : rawValue.toFixed(2)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* GK Mistakes Stats */}
              {getScoringWeights(selectedPosition).gkMistakes && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  🛡 Mistakes ({(getScoringWeights(selectedPosition).gkMistakes.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.gkMistakes?.toFixed(1) || '0'}
                </h4>
                <div style={{
                  padding: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '11px',
                  color: '#fca5a5'
                }}>
                  ⚠️ Lower is better: Rankings are inverted (fewer mistakes = higher score)
                </div>
                {Object.entries(ALL_METRICS.gkMistakes.metrics).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).gkMistakes.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          <span style={{
                            marginLeft: '8px',
                            color: '#888',
                            fontSize: '11px',
                            padding: '2px 6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '3px'
                          }}>
                            Weight: {(metricWeight * 100).toFixed(1)}%
                          </span>
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#888', fontSize: '10px' }}>Value</div>
                          <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                            {rawValue.toFixed(0)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  border: '1px solid rgba(34, 197, 94, 0.4)',
                                  borderRadius: '4px',
                                  color: '#22c55e',
                                  fontSize: '14px',
                                  fontWeight: '700'
                                }}>
                                  +{contribution.toFixed(2)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}

              {/* GK Penalties Stats */}
              {getScoringWeights(selectedPosition).gkPenalties && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#FFD700', fontSize: '14px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  🎟 Penalties ({(getScoringWeights(selectedPosition).gkPenalties.weight * 100).toFixed(0)}% of total) - Category Score: {selectedPlayerModal.categoryScores?.gkPenalties?.toFixed(1) || '0'}
                </h4>
                {Object.entries(ALL_METRICS.gkPenalties.metrics).map(([metric, displayName]) => {
                  const rawValue = parseFloat(selectedPlayerModal[metric]) || 0
                  const metricScore = selectedPlayerModal.metricScores?.[metric]
                  const metricWeight = (getScoringWeights(selectedPosition).gkPenalties.metrics as any)[metric] || 0
                  const contribution = metricScore && metricWeight > 0 ? metricScore * metricWeight : 0
                  const ranking = selectedPlayerModal.metricRankings?.[metric]
                  const totalPlayers = scoredData.length
                  const isPercentageMetric = metric.includes('%') || metric.includes('Rate')

                  return (
                    <div key={metric} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      background: metricWeight > 0 ? 'rgba(255, 255, 255, 0.03)' : 'rgba(100, 100, 100, 0.02)',
                      borderRadius: '6px',
                      border: metricWeight > 0 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(100, 100, 100, 0.1)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ color: '#ccc', fontWeight: '500' }}>{displayName}</span>
                          {metricWeight > 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#888',
                              fontSize: '11px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px'
                            }}>
                              Weight: {(metricWeight * 100).toFixed(1)}%
                            </span>
                          )}
                          {metricWeight === 0 && (
                            <span style={{
                              marginLeft: '8px',
                              color: '#666',
                              fontSize: '11px',
                              fontStyle: 'italic'
                            }}>
                              (display only)
                            </span>
                          )}
                        </div>
                        {ranking && (
                          <div style={{
                            color: '#a78bfa',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            background: 'rgba(167, 139, 250, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(167, 139, 250, 0.3)'
                          }}>
                            #{ranking} of {totalPlayers}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#888', fontSize: '10px' }}>Value</div>
                          <div style={{ color: '#FFD700', fontWeight: '600', fontSize: '14px' }}>
                            {isPercentageMetric ? rawValue.toFixed(1) + '%' : rawValue.toFixed(0)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {metricScore !== undefined && (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#888', fontSize: '10px' }}>Score</div>
                                <div style={{
                                  padding: '4px 10px',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {metricScore.toFixed(0)}/100
                                </div>
                              </div>
                              {metricWeight > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#888', fontSize: '10px' }}>Contribution</div>
                                  <div style={{
                                    padding: '4px 10px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '4px',
                                    color: '#22c55e',
                                    fontSize: '14px',
                                    fontWeight: '700'
                                  }}>
                                    +{contribution.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
