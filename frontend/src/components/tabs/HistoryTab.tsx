// components/tabs/HistoryTab.tsx - FIXED with Proper Data Normalization

'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import GenerationCard from '../audio/GenerationCard'
import { api } from '../../../utils/api'
import { config, isDebugMode } from '../../../utils/config'
import ErrorBoundary from '../ErrorBoundary'

// Import the data fixer for proper data handling - CRITICAL FIX
import { 
  fixGenerationArray, 
  debugDataIssues,
  type NormalizedGeneration,
  validateGenerationData
} from '../../../utils/dataFixer'

interface HistoryTabProps {
  stopAllOtherAudio: (currentGenerationId: string) => void
  setAudioRef: (generationId: string, ref: HTMLAudioElement | null) => void
  trackPlay: (generationId: string, playDuration?: number) => void
  downloadTrack: (generationId: string, prompt: string) => void
  toggleFavorite: (generationId: string) => void
}

export default function HistoryTab({
  stopAllOtherAudio,
  setAudioRef,
  trackPlay,
  downloadTrack,
  toggleFavorite,
}: HistoryTabProps) {
  const [recentGenerations, setRecentGenerations] = useState<NormalizedGeneration[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredGenerations, setFilteredGenerations] = useState<NormalizedGeneration[]>([])

  const fetchRecentGenerations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (isDebugMode()) {
        console.log(`📚 Fetching recent generations (limit: ${config.ui.maxRecentTracks})`)
      }
      
      // Fetch raw data from API
      const rawData = await api.fetchRecentGenerations(config.ui.maxRecentTracks)
      
      if (isDebugMode()) {
        console.log('📊 Raw API data:', rawData)
        debugDataIssues(rawData, 'API Response')
      }
      
      // CRITICAL FIX: Use the proper data fixer
      const normalizedData = fixGenerationArray(rawData)
      
      if (isDebugMode()) {
        console.log('✅ Fixed data:', normalizedData)
        if (normalizedData.length > 0) {
          const validation = validateGenerationData(normalizedData[0])
          console.log('🔍 First item validation:', validation)
        }
      }
      
      setRecentGenerations(normalizedData)
      setFilteredGenerations(normalizedData)
      
      if (isDebugMode()) {
        console.log(`✅ Fetched and fixed ${normalizedData.length} recent generations`)
      }
    } catch (error) {
      console.error('Failed to fetch recent generations:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch history')
    } finally {
      setLoading(false)
    }
  }, [])

  // Filter generations based on search query
  const filterGenerations = useCallback((query: string) => {
    if (!query.trim()) {
      setFilteredGenerations(recentGenerations)
      return
    }

    const filtered = recentGenerations.filter(generation => {
      const searchTerm = query.toLowerCase()
      return (
        generation.prompt.toLowerCase().includes(searchTerm) ||
        generation.device.toLowerCase().includes(searchTerm) ||
        generation.precision.toLowerCase().includes(searchTerm) ||
        generation.status.toLowerCase().includes(searchTerm)
      )
    })

    setFilteredGenerations(filtered)
    
    if (isDebugMode()) {
      console.log(`🔍 Filtered ${filtered.length} generations for query: "${query}"`)
    }
  }, [recentGenerations])

  // Load initial data
  useEffect(() => {
    fetchRecentGenerations()
  }, [fetchRecentGenerations])

  // Apply search filter when query or generations change
  useEffect(() => {
    filterGenerations(searchQuery)
  }, [searchQuery, filterGenerations])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterGenerations(searchQuery)
    }, 300)
    
    return () => clearTimeout(timeoutId)
  }, [searchQuery, filterGenerations])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const refreshHistory = useCallback(() => {
    fetchRecentGenerations()
  }, [fetchRecentGenerations])

  const clearError = () => {
    setError(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">🎵 Generation History</h2>
        <div className="flex items-center gap-3">
          {/* Configuration Info (only in debug mode) */}
          {isDebugMode() && (
            <div className="text-xs text-blue-300 bg-blue-600/20 px-2 py-1 rounded">
              Max: {config.ui.maxRecentTracks}
            </div>
          )}
          
          <button
            onClick={refreshHistory}
            disabled={loading}
            className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh history"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <div className="text-sm text-blue-200">
            {loading ? 'Loading...' : `${filteredGenerations.length} tracks`}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-200">
              <span>❌</span>
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by prompt, device, precision... (e.g., jazz, piano, ambient, cuda)"
            className="w-full px-4 py-3 pl-10 pr-12 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
            🔍
          </div>
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors p-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-2 text-sm text-blue-200">
            {filteredGenerations.length > 0 ? (
              <>Found {filteredGenerations.length} result{filteredGenerations.length !== 1 ? 's' : ''} for "{searchQuery}"</>
            ) : (
              <>No results found for "{searchQuery}"</>
            )}
          </div>
        )}

        {/* Search Tips */}
        {!searchQuery && !loading && (
          <div className="mt-2 text-xs text-blue-300/70">
            💡 Try searching by genre, instrument, mood, or device (jazz, piano, ambient, cuda)
          </div>
        )}
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSearchQuery('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            !searchQuery 
              ? 'bg-blue-600/80 text-white' 
              : 'bg-white/10 text-blue-200 hover:bg-white/20'
          }`}
        >
          All Tracks
        </button>
        {['jazz', 'piano', 'ambient', 'electronic', 'classical', 'rock'].map((tag) => (
          <button
            key={tag}
            onClick={() => setSearchQuery(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 capitalize ${
              searchQuery.toLowerCase() === tag 
                ? 'bg-purple-600/80 text-white' 
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mr-3"></div>
          <span className="text-blue-200">Loading your music history...</span>
        </div>
      )}

      {/* Debug Info (only in debug mode) */}
      {isDebugMode() && !loading && filteredGenerations.length > 0 && (
        <div className="mb-4 bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-3 text-xs">
          <div className="text-yellow-300 mb-1">🔍 Debug Info:</div>
          <div className="text-yellow-200">
            API returned: {recentGenerations.length} items | 
            Filtered: {filteredGenerations.length} items | 
            First item has file_size_mb: {filteredGenerations[0]?.file_size_mb || 'missing'}
          </div>
        </div>
      )}

      {/* Generations List */}
      {!loading && (
        <ErrorBoundary name="HistoryGenerationsList" isolate={true}>
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {filteredGenerations.map((generation, index) => {
              if (isDebugMode() && index === 0) {
                console.log('🎵 Rendering first generation card with data:', generation)
              }
              
              return (
                <ErrorBoundary 
                  key={generation.generation_id || generation.id} 
                  name={`GenerationCard-${index}`} 
                  isolate={true}
                  fallback={(error, errorId, retry) => (
                    <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-4">
                      <div className="text-red-200 text-sm mb-2">
                        ⚠️ Failed to load generation card #{index + 1}
                      </div>
                      <div className="text-xs text-red-300">
                        Prompt: "{generation.prompt?.slice(0, 50)}..."
                      </div>
                      <button
                        onClick={retry}
                        className="mt-2 px-3 py-1 bg-red-600/60 hover:bg-red-600/80 text-white rounded text-sm"
                      >
                        🔄 Retry
                      </button>
                    </div>
                  )}
                >
                  <GenerationCard
                    generation={generation}
                    stopAllOtherAudio={stopAllOtherAudio}
                    setAudioRef={setAudioRef}
                    trackPlay={trackPlay}
                    downloadTrack={downloadTrack}
                    toggleFavorite={toggleFavorite}
                    index={index}
                    className="hover:border-white/30"
                    showAudioPlayer={true}
                  />
                </ErrorBoundary>
              )
            })}

            {/* Empty States */}
            {filteredGenerations.length === 0 && !loading && (
              <div className="text-center py-12">
                {searchQuery ? (
                  <div className="space-y-4">
                    <div className="text-6xl">🔍</div>
                    <div className="text-xl text-blue-200">No results found</div>
                    <div className="text-blue-300">
                      No generations found matching "{searchQuery}"
                    </div>
                    <button
                      onClick={clearSearch}
                      className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-all duration-200"
                    >
                      Clear search
                    </button>
                  </div>
                ) : error ? (
                  <div className="space-y-4">
                    <div className="text-6xl">⚠️</div>
                    <div className="text-xl text-red-200">Failed to load history</div>
                    <div className="text-red-300">
                      {error}
                    </div>
                    <button
                      onClick={refreshHistory}
                      className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-all duration-200"
                    >
                      🔄 Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-6xl">🎵</div>
                    <div className="text-xl text-blue-200">No music yet</div>
                    <div className="text-blue-300">
                      Generate your first track to see it appear here!
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ErrorBoundary>
      )}

      {/* Data Summary (debug mode only) */}
      {isDebugMode() && !loading && filteredGenerations.length > 0 && (
        <div className="mt-4 bg-blue-900/20 border border-blue-400/30 rounded-lg p-3 text-xs">
          <div className="text-blue-300 mb-1">📊 Data Summary:</div>
          <div className="text-blue-200 space-y-1">
            <div>Total items: {filteredGenerations.length}</div>
            <div>Items with file sizes: {filteredGenerations.filter(g => g.file_size_mb > 0).length}</div>
            <div>Items with play counts: {filteredGenerations.filter(g => g.play_count > 0).length}</div>
            <div>Completed items: {filteredGenerations.filter(g => g.status === 'completed').length}</div>
            <div>Items with audio URLs: {filteredGenerations.filter(g => g.audio_url).length}</div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.8);
        }
      `}</style>
    </motion.div>
  )
}