// hooks/useStats.ts - Updated with Error Handler Integration

import { useState, useCallback } from 'react'
import { api } from '../../utils/api'
import { config, isDebugMode } from '../../utils/config'
import { useErrorHandler } from './useErrorHandler' // Import your error handler
import {
  Stats,
  TimeRange,
  UseStatsReturn,
  PerformanceLevel,
  EngagementLevel,
} from '../types'

export default function useStats(): UseStatsReturn {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use the error handler hook
  const { reportError, handleAsyncError } = useErrorHandler()

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Handle API errors with error reporting
  const handleError = useCallback((error: any, operation: string) => {
    if (isDebugMode()) {
      console.error(`${operation} failed:`, error)
    }
    
    const errorMessage = error?.message || `${operation} failed`
    setError(errorMessage)
    
    // Report the error for tracking
    reportError(error, `useStats.${operation}`)
    
    return null
  }, [reportError])

  // Fetch statistics for a specific number of days with error tracking
  const fetchStats = useCallback(async (days?: number): Promise<Stats | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await handleAsyncError(
        api.fetchStats(days),
        'fetchStats'
      )
      
      setStats(data)
      
      if (isDebugMode()) {
        console.log(`📊 Fetched statistics for ${days ? `${days} days` : 'all time'}:`, {
          totalGenerations: data.total_generations,
          successRate: data.success_rate?.toFixed(1) + '%',
          avgTime: data.avg_generation_time?.toFixed(1) + 's',
          totalPlays: data.total_plays
        })
      }
      
      return data
      
    } catch (error: any) {
      handleError(error, 'Fetch statistics')
      return null
    } finally {
      setLoading(false)
    }
  }, [handleError, handleAsyncError])

  // Fetch statistics by predefined time range with error tracking
  const fetchStatsByTimeRange = useCallback(async (timeRange: TimeRange): Promise<Stats | null> => {
    const days = timeRange === 'all' ? undefined : parseInt(timeRange)
    return fetchStats(days)
  }, [fetchStats])

  // Refresh current statistics with error tracking
  const refreshStats = useCallback(async (): Promise<void> => {
    if (isDebugMode()) {
      console.log('🔄 Refreshing statistics...')
    }
    
    try {
      // If we have existing stats, use the same time range
      if (stats?.days_analyzed) {
        await handleAsyncError(
          fetchStats(stats.days_analyzed),
          'refreshStats'
        )
      } else {
        // Default to 30 days
        await handleAsyncError(
          fetchStats(30),
          'refreshStats'
        )
      }
    } catch (error) {
      // Error already handled by fetchStats
    }
  }, [fetchStats, stats, handleAsyncError])

  // Utility function to get color based on success rate
  const getSuccessRateColor = useCallback((rate: number): string => {
    if (rate >= 95) return 'text-green-400'
    if (rate >= 85) return 'text-yellow-400'
    if (rate >= 70) return 'text-orange-400'
    return 'text-red-400'
  }, [])

  // Utility function to assess performance level
  const getPerformanceLevel = useCallback((avgTime: number): PerformanceLevel => {
    if (avgTime <= 5) return 'excellent'
    if (avgTime <= 10) return 'good'
    if (avgTime <= 20) return 'average'
    return 'slow'
  }, [])

  // Utility function to assess engagement level
  const getEngagementLevel = useCallback((avgPlays: number): EngagementLevel => {
    if (avgPlays >= 3) return 'high'
    if (avgPlays >= 1.5) return 'medium'
    return 'low'
  }, [])

  // Format duration in human-readable format
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }, [])

  // Format file size with appropriate units
  const formatFileSize = useCallback((mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`
    }
    return `${mb.toFixed(1)}MB`
  }, [])

  // Get human-readable time range label
  const getTimeRangeLabel = useCallback((range: TimeRange): string => {
    switch (range) {
      case '7': return 'Last 7 Days'
      case '30': return 'Last 30 Days'  
      case '90': return 'Last 90 Days'
      case 'all': return 'All Time'
      default: return 'Last 30 Days'
    }
  }, [])

  return {
    // State
    stats,
    loading,
    error,
    
    // Data fetching
    fetchStats,
    fetchStatsByTimeRange,
    
    // Utilities
    refreshStats,
    clearError,
    
    // Computed values
    getSuccessRateColor,
    getPerformanceLevel,
    getEngagementLevel,
    formatDuration,
    formatFileSize,
    getTimeRangeLabel,
  }
}
