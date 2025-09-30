'use client'

import React, { useState, useEffect } from 'react'
import { MatchupPlayer } from '@/lib/playerService'
import { ComparisonResult, compare1v1, compareUnits } from '@/lib/statsService'
import { BarChart3, TrendingUp, Shield, Zap, Users } from 'lucide-react'

interface StatsComparisonProps {
  comparisonMode: 'assignment' | '1v1' | 'unit-vs-unit' | 'side-vs-side'
  selectedPlayers: MatchupPlayer[]
  selectedUnit?: 'goalkeeper' | 'defense' | 'midfield' | 'attack'
  allPlayers: MatchupPlayer[]
}

export default function StatsComparison({
  comparisonMode,
  selectedPlayers,
  selectedUnit,
  allPlayers
}: StatsComparisonProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('attacking')

  useEffect(() => {
    if (comparisonMode === '1v1' && selectedPlayers.length === 2) {
      performComparison()
    } else if (comparisonMode === 'unit-vs-unit' && selectedUnit) {
      performUnitComparison()
    }
  }, [comparisonMode, selectedPlayers, selectedUnit])

  const performComparison = async () => {
    if (selectedPlayers.length !== 2) return

    setLoading(true)
    try {
      const result = await compare1v1(selectedPlayers[0], selectedPlayers[1])
      setComparisonData(result)
    } catch (error) {
      console.error('Comparison failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const performUnitComparison = async () => {
    if (!selectedUnit) return

    const beitarPlayers = allPlayers.filter(p => p.team === 'beitar' && p.unit === selectedUnit)
    const opponentPlayers = allPlayers.filter(p => p.team === 'opponent' && p.unit === selectedUnit)

    if (beitarPlayers.length === 0 || opponentPlayers.length === 0) return

    setLoading(true)
    try {
      const result = await compareUnits(beitarPlayers, opponentPlayers)
      setComparisonData(result)
    } catch (error) {
      console.error('Unit comparison failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attacking': return <TrendingUp size={16} />
      case 'passing': return <Users size={16} />
      case 'defending': return <Shield size={16} />
      case 'physical': return <Zap size={16} />
      default: return <BarChart3 size={16} />
    }
  }

  const getStatBar = (value1: number, value2: number, label: string) => {
    const max = Math.max(value1, value2) || 1
    const percentage1 = (value1 / max) * 100
    const percentage2 = (value2 / max) * 100

    return (
      <div key={label} style={{ marginBottom: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px'
        }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</span>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span style={{ color: '#FFD700' }}>{value1.toFixed(1)}</span>
            <span style={{ color: '#ff4444' }}>{value2.toFixed(1)}</span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          height: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage1}%`,
            backgroundColor: '#FFD700',
            transition: 'width 0.3s ease'
          }} />
          <div style={{
            width: `${percentage2}%`,
            backgroundColor: '#ff4444',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        color: '#fff'
      }}>
        <BarChart3 size={24} style={{ margin: '0 auto 8px', color: '#FFD700' }} />
        <div>Loading comparison data...</div>
      </div>
    )
  }

  if (!comparisonData) {
    return (
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        color: '#9ca3af'
      }}>
        <BarChart3 size={24} style={{ margin: '0 auto 8px' }} />
        <div>
          {comparisonMode === '1v1'
            ? 'Select 2 players to compare'
            : comparisonMode === 'unit-vs-unit'
            ? 'Select a unit to compare'
            : 'Choose comparison mode'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          color: '#FFD700',
          fontSize: '14px',
          fontWeight: '600',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <BarChart3 size={16} />
          {comparisonMode === '1v1' ? '1v1 Comparison' : 'Unit Comparison'}
        </h3>

        {comparisonData.type === '1v1' && (
          <div style={{
            display: 'flex',
            gap: '8px',
            fontSize: '10px'
          }}>
            <div style={{ color: '#FFD700' }}>
              {comparisonData.data.player1.name}
            </div>
            <span style={{ color: '#9ca3af' }}>vs</span>
            <div style={{ color: '#ff4444' }}>
              {comparisonData.data.player2.name}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {comparisonData.categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              background: selectedCategory === category
                ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                : 'rgba(255, 255, 255, 0.1)',
              color: selectedCategory === category ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 10px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'capitalize'
            }}
          >
            {getCategoryIcon(category)}
            {category.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Stats Display */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        padding: '12px'
      }}>
        {selectedCategory && comparisonData.data.categories[selectedCategory] &&
          Object.entries(comparisonData.data.categories[selectedCategory]).map(([statName, values]) =>
            getStatBar(values[0], values[1], statName)
          )
        }
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '12px',
        fontSize: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#FFD700',
            borderRadius: '2px'
          }} />
          <span style={{ color: '#9ca3af' }}>
            {comparisonData.type === '1v1'
              ? comparisonData.data.player1.name
              : 'Beitar'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            backgroundColor: '#ff4444',
            borderRadius: '2px'
          }} />
          <span style={{ color: '#9ca3af' }}>
            {comparisonData.type === '1v1'
              ? comparisonData.data.player2.name
              : 'Opponent'}
          </span>
        </div>
      </div>

      {/* Normalized Notice */}
      <div style={{
        textAlign: 'center',
        fontSize: '9px',
        color: '#6b7280',
        marginTop: '8px'
      }}>
        ✓ Stats normalized to 90 minutes
      </div>
    </div>
  )
}