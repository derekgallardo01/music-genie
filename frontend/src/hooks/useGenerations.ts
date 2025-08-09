// Update your useGenerations hook to use the api.ts layer
// Replace your current useGenerations implementation with this:

import { useCallback, useState } from 'react'
import { api, getErrorMessage } from '../../utils/api'
import { isDebugMode } from '../../utils/config'

export const useGenerations = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear error function
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Generate music using api.ts
  const generateMusic = useCallback(async (request: {
    prompt: string
    duration?: number
    device?: string
    precision?: string
  }) => {
    setLoading(true)
    setError(null)
    
    try {
      const generation = await api.generateMusic(request)
      
      if (isDebugMode()) {
        console.log('🎵 Music generated successfully:', generation)
      }
      
      return generation
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
      console.error('❌ Music generation failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Track play using api.ts - THIS IS THE KEY FIX
  const trackPlay = useCallback(async (generationId: string, playDuration?: number) => {
    try {
      await api.trackPlay(generationId, playDuration)
      
      if (isDebugMode()) {
        console.log(`🎧 Play tracked: ${generationId}${playDuration ? ` (${playDuration.toFixed(1)}s)` : ''}`)
      }
    } catch (err) {
      console.error('❌ Failed to track play:', err)
      // Don't set error state for tracking failures - they're not critical
    }
  }, [])

  // Toggle favorite using api.ts
  const toggleFavorite = useCallback(async (generationId: string) => {
    try {
      const isFavorited = await api.toggleFavorite(generationId)
      
      if (isDebugMode()) {
        console.log(`❤️ Favorite ${isFavorited ? 'added' : 'removed'}: ${generationId}`)
      }
      
      return isFavorited
    } catch (err) {
      console.error('❌ Failed to toggle favorite:', err)
      // Don't throw for UI interactions
    }
  }, [])

  // Download track using api.ts
  const downloadTrack = useCallback(async (generationId: string, prompt: string) => {
    try {
      await api.downloadTrack(generationId, prompt)
      
      if (isDebugMode()) {
        console.log(`💾 Download initiated: ${generationId}`)
      }
    } catch (err) {
      console.error('❌ Download failed:', err)
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
    }
  }, [])

  // Fetch recent generations using api.ts
  const fetchRecentGenerations = useCallback(async (limit: number = 20) => {
    setLoading(true)
    setError(null)
    
    try {
      const generations = await api.fetchRecentGenerations(limit)
      
      if (isDebugMode()) {
        console.log(`📚 Fetched ${generations.length} recent generations`)
      }
      
      return generations
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
      console.error('❌ Failed to fetch recent generations:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch stats using api.ts
  const fetchStats = useCallback(async (days: number = 7) => {
    setLoading(true)
    setError(null)
    
    try {
      const stats = await api.fetchStats(days)
      
      if (isDebugMode()) {
        console.log(`📊 Fetched stats for ${days} days:`, stats)
      }
      
      return stats
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
      console.error('❌ Failed to fetch stats:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Search generations using api.ts
  const searchGenerations = useCallback(async (query: string, limit: number = 50) => {
    setLoading(true)
    setError(null)
    
    try {
      const generations = await api.searchGenerations(query, limit)
      
      if (isDebugMode()) {
        console.log(`🔍 Search "${query}" returned ${generations.length} results`)
      }
      
      return generations
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
      console.error('❌ Search failed:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch most played generations using api.ts
  const fetchMostPlayed = useCallback(async (limit: number = 20, days?: number, sortBy?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const generations = await api.fetchMostPlayed(limit)
      
      if (isDebugMode()) {
        console.log(`🔥 Fetched ${generations.length} most played generations`)
      }
      
      return generations
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
      console.error('❌ Failed to fetch most played:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch favorites using api.ts
  const fetchFavorites = useCallback(async (limit: number = 50) => {
    setLoading(true)
    setError(null)
    
    try {
      const generations = await api.fetchFavorites(limit)
      
      if (isDebugMode()) {
        console.log(`❤️ Fetched ${generations.length} favorite generations`)
      }
      
      return generations
    } catch (err) {
      const errorMessage = getErrorMessage(err as Error)
      setError(errorMessage)
      console.error('❌ Failed to fetch favorites:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    // State
    loading,
    error,
    
    // Actions
    generateMusic,
    trackPlay,        // ✅ Now uses api.ts with proper error handling
    toggleFavorite,   // ✅ Now uses api.ts
    downloadTrack,    // ✅ Now uses api.ts
    
    // Data fetching
    fetchRecentGenerations,
    fetchMostPlayed,   // ✅ Added missing function
    fetchFavorites,    // ✅ Added missing function
    fetchStats,
    searchGenerations,
    clearError
  }
}

export default useGenerations