'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GenerationCard from '../audio/GenerationCard' // Use the new GenerationCard
import useGenerations from '../../hooks/useGenerations' // Use the new hook
import { Generation } from '../../../utils/api' // ✅ Import from api.ts instead of defining locally

interface PopularTabProps {
  stopAllOtherAudio: (currentGenerationId: string) => void
  setAudioRef: (generationId: string, ref: HTMLAudioElement | null) => void
}

export default function PopularTab({
  stopAllOtherAudio,
  setAudioRef,
}: PopularTabProps) {
  const [mostPlayed, setMostPlayed] = useState<Generation[]>([]) // ✅ Now uses the correct type
  const [localLoading, setLocalLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'plays' | 'downloads' | 'recent'>('plays')
  const [timeRange, setTimeRange] = useState<'7' | '30' | 'all'>('30')

  // Use the new hooks
  const {
    loading: hooksLoading,
    error,
    fetchMostPlayed,
    trackPlay,
    downloadTrack,
    toggleFavorite,
    clearError,
  } = useGenerations()

  // Combined loading state
  const loading = localLoading || hooksLoading

  // Fetch most played with current filters
  const fetchData = async () => {
    try {
      setLocalLoading(true)
      clearError()
      
      const days = timeRange === 'all' ? undefined : parseInt(timeRange)
      const data = await fetchMostPlayed(20, days, sortBy) // ✅ Now returns correct type
      setMostPlayed(data) // ✅ Type compatibility fixed
    } catch (error) {
      console.error('Failed to fetch popular tracks:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  // Load initial data and refresh when filters change
  useEffect(() => {
    fetchData()
  }, [sortBy, timeRange])

  const refreshPopular = () => {
    fetchData()
  }

  const getRankingIcon = (index: number): string => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈' 
      case 2: return '🥉'
      default: return '🎵'
    }
  }

  const getRankingColor = (index: number): string => {
    switch (index) {
      case 0: return 'from-yellow-600/30 to-yellow-700/30 border-yellow-400/50'
      case 1: return 'from-gray-600/30 to-gray-700/30 border-gray-400/50'
      case 2: return 'from-orange-600/30 to-orange-700/30 border-orange-400/50'
      default: return 'from-blue-600/20 to-purple-600/20 border-white/20'
    }
  }

  const getSortLabel = (sort: string): string => {
    switch (sort) {
      case 'plays': return 'Most Played'
      case 'downloads': return 'Most Downloaded'
      case 'recent': return 'Recently Popular'
      default: return 'Popular'
    }
  }

  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case '7': return 'Last 7 Days'
      case '30': return 'Last 30 Days'
      case 'all': return 'All Time'
      default: return 'Last 30 Days'
    }
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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">🔥 Popular Tracks</h2>
          <div className="text-sm text-orange-200 bg-orange-600/30 px-3 py-1 rounded-full border border-orange-400/30">
            {getSortLabel(sortBy)} - {getTimeRangeLabel(timeRange)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshPopular}
            disabled={loading}
            className="px-4 py-2 bg-orange-600/80 hover:bg-orange-600 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
            title="Refresh popular tracks"
          >
            {loading ? '🔄 Loading...' : '🔄 Refresh'}
          </button>
          <div className="text-sm text-blue-200">
            {loading ? 'Loading...' : `${mostPlayed.length} tracks`}
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

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Sort By Filter */}
        <div className="bg-black/20 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-400">📊</span>
            <span className="text-white text-sm font-medium">Sort By</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'plays' as const, label: '🎧 Plays', icon: '🎧' },
              { value: 'downloads' as const, label: '💾 Downloads', icon: '💾' },
              { value: 'recent' as const, label: '🕒 Recent', icon: '🕒' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                disabled={loading}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                  sortBy === option.value
                    ? 'bg-blue-600/80 text-white'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="bg-black/20 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-purple-400">📅</span>
            <span className="text-white text-sm font-medium">Time Range</span>
          </div>
          <div className="flex gap-2">
            {[
              { value: '7' as const, label: '7D' },
              { value: '30' as const, label: '30D' },
              { value: 'all' as const, label: 'All' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                disabled={loading}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                  timeRange === option.value
                    ? 'bg-purple-600/80 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mr-3"></div>
          <span className="text-orange-200">Loading popular tracks...</span>
        </div>
      )}

      {/* Popular Tracks List - Now using GenerationCard! */}
      {!loading && (
        <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
          {mostPlayed.map((generation, index) => (
            <div
              key={generation.id}
              className={`relative bg-gradient-to-r ${getRankingColor(index)} rounded-lg p-6 border hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
            >
              {/* Ranking Badge */}
              <div className="absolute -top-2 -left-2 z-10">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-lg ${
                  index < 3 ? 'bg-gradient-to-br from-white to-gray-200 text-gray-800' : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                }`}>
                  {index < 3 ? getRankingIcon(index) : `#${index + 1}`}
                </div>
              </div>

              {/* Crown for #1 */}
              {index === 0 && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-2xl animate-bounce">
                  👑
                </div>
              )}

              {/* Enhanced Popularity Stats */}
              <div className="ml-8 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  {index < 3 && (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                      TOP {index + 1}
                    </span>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 bg-orange-600/40 px-3 py-1.5 rounded-full border border-orange-400/40">
                      <span className="text-orange-300">🎧</span>
                      <span className="text-white font-bold">{generation.play_count || 0}</span>
                      <span className="text-orange-200">plays</span>
                    </div>
                    {generation.download_count && generation.download_count > 0 && (
                      <div className="flex items-center gap-1 bg-blue-600/40 px-3 py-1.5 rounded-full border border-blue-400/40">
                        <span className="text-blue-300">💾</span>
                        <span className="text-white font-bold">{generation.download_count}</span>
                        <span className="text-blue-200">downloads</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 bg-purple-600/40 px-3 py-1.5 rounded-full border border-purple-400/40">
                      <span className="text-purple-300">🔥</span>
                      <span className="text-white font-medium">Rank #{index + 1}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Use the new GenerationCard component */}
              <div className="ml-8">
                <GenerationCard
                  generation={generation}
                  stopAllOtherAudio={stopAllOtherAudio}
                  setAudioRef={setAudioRef}
                  trackPlay={trackPlay}
                  downloadTrack={downloadTrack}
                  toggleFavorite={toggleFavorite}
                  index={index}
                  className="bg-transparent border-none p-0"
                  compact={true}
                />
              </div>
            </div>
          ))}

          {/* Empty State */}
          {mostPlayed.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="space-y-4">
                <div className="text-6xl">🎵</div>
                <div className="text-xl text-orange-200">No popular tracks yet</div>
                <div className="text-orange-300">
                  Generate and play some music to see popular tracks appear here!
                </div>
                <div className="text-sm text-blue-200 bg-blue-600/20 rounded-lg p-4 max-w-md mx-auto">
                  💡 Tracks become popular based on play count, download count, and recency.
                  Try different time ranges to see various trending periods.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Summary */}
      {!loading && mostPlayed.length > 0 && (
        <div className="mt-6 bg-black/30 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-orange-400">🏆</span>
              <span className="text-white font-medium">Leaderboard Summary</span>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div className="text-orange-300">
                Total Plays: {mostPlayed.reduce((sum, gen) => sum + (gen.play_count || 0), 0)}
              </div>
              <div className="text-blue-300">
                Total Downloads: {mostPlayed.reduce((sum, gen) => sum + (gen.download_count || 0), 0)}
              </div>
              <div className="text-purple-300">
                Showing Top {mostPlayed.length}
              </div>
            </div>
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
          background: rgba(249, 115, 22, 0.6);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.8);
        }
      `}</style>
    </motion.div>
  )
}