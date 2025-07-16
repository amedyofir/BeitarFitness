'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function LatestDataBand() {
  const [latestDate, setLatestDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLatestDate()
  }, [])

  const fetchLatestDate = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('weekly_load')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching latest data:', error)
        setError(`Error fetching data: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        const date = new Date(data[0].date)
        setLatestDate(date.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }))
      } else {
        setLatestDate(null)
      }
      
    } catch (err) {
      console.error('Data fetch error:', err)
      setError('Error processing data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="latest-data-band">
        <div className="latest-data-content">
          <span>Loading latest training date...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="latest-data-band">
        <div className="latest-data-content">
          <span style={{ color: '#ff6b6b' }}>Error loading data</span>
        </div>
      </div>
    )
  }

  return (
    <div className="latest-data-band">
      <div className="latest-data-content">
        <span className="latest-date-label">Latest Training Data:</span>
        <span className="latest-date-value">
          {latestDate || 'No data available'}
        </span>
      </div>
    </div>
  )
} 