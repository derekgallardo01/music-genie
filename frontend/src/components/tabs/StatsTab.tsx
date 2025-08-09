'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useStats from '../../hooks/useStats'
import ErrorBoundary from '../ErrorBoundary'

interface StatsCardProps {
  icon: string
  value: string | number
  label: string
  gradient: string
  subtext?: string
}

const StatsCard = ({ icon, value, label, gradient, subtext }: StatsCardProps) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`bg-gradient-to-r ${gradient} rounded-lg p-6 border transition-all duration-200 hover:shadow-lg`}
  >
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-gray-200">{label}</div>
    {subtext && <div className="text-xs text-gray-300/70 mt-1">{subtext}</div>}
  </motion.div>
)

export default function StatsTab() {
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | 'all'>('30')

  // Use the new useStats hook
  const {
    stats,
    loading,
    error,
    fetchStatsByTimeRange,
    refreshStats,
    clearError,
    getSuccessRateColor,
    getPerformanceLevel,
    getEngagementLevel,
    formatDuration,
    formatFileSize,
    getTimeRangeLabel,
  } = useStats()

  // Load initial data and refresh when time range changes
  useEffect(() => {
    fetchStatsByTimeRange(timeRange)
  }, [timeRange, fetchStatsByTimeRange])

  const handleRefresh = async () => {
    await refreshStats()
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
          <h2 className="text-2xl font-bold text-white">📊 Generation Statistics</h2>
          <div className="text-sm text-blue-200 bg-blue-600/30 px-3 py-1 rounded-full border border-blue-400/30">
            {getTimeRangeLabel(timeRange)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh statistics"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Refreshing...</span>
              </div>
            ) : (
              '🔄 Refresh'
            )}
          </button>
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

      {/* Time Range Filter with Error Boundary */}
      <ErrorBoundary 
        name="TimeRangeFilter" 
        isolate={true}
        fallback={() => (
          <div className="bg-gray-900/20 border border-gray-400/30 rounded-lg p-4 mb-6">
            <p className="text-gray-300 text-sm">Time range filter temporarily unavailable</p>
          </div>
        )}
      >
        <div className="mb-6">
          <div className="bg-black/20 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-400">📅</span>
              <span className="text-white text-sm font-medium">Time Range</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: '7' as const, label: '7 Days' },
                { value: '30' as const, label: '30 Days' },
                { value: '90' as const, label: '90 Days' },
                { value: 'all' as const, label: 'All Time' }
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
      </ErrorBoundary>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mr-3"></div>
          <span className="text-blue-200">Loading statistics...</span>
        </div>
      )}

      {/* Statistics Content */}
      {!loading && stats && (
        <div className="space-y-8">
          {/* Main Stats Grid with Error Boundary */}
          <ErrorBoundary 
            name="MainStatsGrid" 
            isolate={true}
            fallback={() => (
              <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-6 text-center">
                <span className="text-red-400 text-2xl">📊</span>
                <p className="text-red-200 mt-2">Main statistics temporarily unavailable</p>
              </div>
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatsCard
                icon="🎵"
                value={stats.total_generations || 0}
                label="Total Generations"
                gradient="from-blue-600/30 to-blue-700/30 border-blue-400/30"
                subtext={`${stats.successful_generations || 0} successful`}
              />
              
              <StatsCard
                icon="✅"
                value={`${(stats.success_rate || 0).toFixed(1)}%`}
                label="Success Rate"
                gradient="from-green-600/30 to-green-700/30 border-green-400/30"
                subtext={`Performance: ${getPerformanceLevel(stats.avg_generation_time || 0)}`}
              />
              
              <StatsCard
                icon="⚡"
                value={`${(stats.avg_generation_time || 0).toFixed(1)}s`}
                label="Avg Generation Time"
                gradient="from-purple-600/30 to-purple-700/30 border-purple-400/30"
                subtext={`Level: ${getPerformanceLevel(stats.avg_generation_time || 0)}`}
              />
              
              <StatsCard
                icon="🎧"
                value={stats.total_plays || 0}
                label="Total Plays"
                gradient="from-orange-600/30 to-orange-700/30 border-orange-400/30"
                subtext={`Engagement: ${getEngagementLevel(stats.avg_plays_per_generation || 0)}`}
              />
              
              <StatsCard
                icon="💾"
                value={stats.total_downloads || 0}
                label="Total Downloads"
                gradient="from-cyan-600/30 to-cyan-700/30 border-cyan-400/30"
                subtext={`${((stats.total_downloads || 0) / Math.max(stats.total_generations || 1, 1) * 100).toFixed(1)}% download rate`}
              />
              
              <StatsCard
                icon="📈"
                value={`${(stats.avg_plays_per_generation || 0).toFixed(1)}`}
                label="Avg Plays per Track"
                gradient="from-pink-600/30 to-pink-700/30 border-pink-400/30"
                subtext={`Level: ${getEngagementLevel(stats.avg_plays_per_generation || 0)}`}
              />
            </div>
          </ErrorBoundary>

          {/* Extended Stats Grid with Error Boundary */}
          <ErrorBoundary 
            name="ExtendedStatsGrid" 
            isolate={true}
            fallback={() => (
              <div className="bg-yellow-900/20 border border-yellow-400/30 rounded-lg p-6 text-center">
                <span className="text-yellow-400 text-2xl">📈</span>
                <p className="text-yellow-200 mt-2">Extended statistics temporarily unavailable</p>
              </div>
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatsCard
                icon="🎶"
                value={formatDuration(stats.total_audio_duration || 0)}
                label="Total Audio Created"
                gradient="from-teal-600/30 to-teal-700/30 border-teal-400/30"
                subtext={`${((stats.total_audio_duration || 0) / 60).toFixed(1)} minutes`}
              />
              
              <StatsCard
                icon="❌"
                value={stats.failed_generations || 0}
                label="Failed Generations"
                gradient="from-red-600/30 to-red-700/30 border-red-400/30"
                subtext={`${(100 - (stats.success_rate || 0)).toFixed(1)}% failure rate`}
              />

              {stats.total_file_size_mb && (
                <StatsCard
                  icon="💿"
                  value={formatFileSize(stats.total_file_size_mb)}
                  label="Total Storage Used"
                  gradient="from-indigo-600/30 to-indigo-700/30 border-indigo-400/30"
                  subtext={`${formatFileSize(stats.avg_file_size_mb || 0)} avg per file`}
                />
              )}

              {stats.most_used_device && (
                <StatsCard
                  icon="🖥️"
                  value={stats.most_used_device}
                  label="Most Used Device"
                  gradient="from-emerald-600/30 to-emerald-700/30 border-emerald-400/30"
                  subtext={`Precision: ${stats.most_used_precision || 'Unknown'}`}
                />
              )}
            </div>
          </ErrorBoundary>

          {/* Popular Prompts Section with Error Boundary */}
          {stats.popular_prompts && stats.popular_prompts.length > 0 && (
            <ErrorBoundary 
              name="PopularPrompts" 
              isolate={true}
              fallback={() => (
                <div className="bg-orange-900/20 border border-orange-400/30 rounded-lg p-6 text-center">
                  <span className="text-orange-400 text-2xl">🔥</span>
                  <p className="text-orange-200 mt-2">Popular prompts data temporarily unavailable</p>
                </div>
              )}
            >
              <div className="bg-black/30 rounded-lg p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">🔥 Most Popular Prompts</h3>
                  <div className="text-sm text-orange-200">
                    Top {stats.popular_prompts.length} prompts
                  </div>
                </div>
                <div className="space-y-3">
                  {stats.popular_prompts.map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3 
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                        }`}>
                          #{index + 1}
                        </div>
                        <span className="text-white font-medium">
                          &ldquo;{item.prompt}&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-300 text-sm">🎧 {item.plays} plays</span>
                        {index < 3 && (
                          <span className="text-orange-400">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </ErrorBoundary>
          )}

          {/* Performance Insights with Error Boundary */}
          <ErrorBoundary 
            name="PerformanceInsights" 
            isolate={true}
            fallback={() => (
              <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-6 text-center">
                <span className="text-blue-400 text-2xl">🎯</span>
                <p className="text-blue-200 mt-2">Performance insights temporarily unavailable</p>
              </div>
            )}
          >
            <div className="bg-black/30 rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">🎯 Performance Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-green-400 text-lg mb-1">✅</div>
                  <div className="text-white font-medium">Success Rate</div>
                  <div className={`text-2xl font-bold ${getSuccessRateColor(stats.success_rate || 0)}`}>
                    {(stats.success_rate || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-300">
                    {stats.successful_generations} of {stats.total_generations} generations
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-blue-400 text-lg mb-1">⚡</div>
                  <div className="text-white font-medium">Performance</div>
                  <div className="text-2xl font-bold text-blue-400 capitalize">
                    {getPerformanceLevel(stats.avg_generation_time || 0)}
                  </div>
                  <div className="text-xs text-gray-300">
                    {(stats.avg_generation_time || 0).toFixed(1)}s average
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="text-purple-400 text-lg mb-1">🎵</div>
                  <div className="text-white font-medium">Engagement</div>
                  <div className="text-2xl font-bold text-purple-400 capitalize">
                    {getEngagementLevel(stats.avg_plays_per_generation || 0)}
                  </div>
                  <div className="text-xs text-gray-300">
                    {(stats.avg_plays_per_generation || 0).toFixed(1)} plays per track
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Time Range Summary with Error Boundary */}
          <ErrorBoundary 
            name="TimeRangeSummary" 
            isolate={true}
            fallback={() => (
              <div className="bg-gray-900/20 border border-gray-400/30 rounded-lg p-4">
                <p className="text-gray-300 text-sm text-center">Summary temporarily unavailable</p>
              </div>
            )}
          >
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg p-4 border border-blue-400/30">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">📊</span>
                  <span className="text-white font-medium">Summary for {getTimeRangeLabel(timeRange)}</span>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div className="text-blue-300">
                    {stats.days_analyzed || 0} days analyzed
                  </div>
                  <div className="text-purple-300">
                    {Math.round((stats.total_generations || 0) / Math.max(stats.days_analyzed || 1, 1))} generations/day
                  </div>
                  <div className="text-cyan-300">
                    {Math.round((stats.total_plays || 0) / Math.max(stats.days_analyzed || 1, 1))} plays/day
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      )}

      {/* Empty State */}
      {!loading && !stats && (
        <div className="text-center py-12">
          <div className="space-y-4">
            <div className="text-6xl">📊</div>
            <div className="text-xl text-blue-200">No statistics available</div>
            <div className="text-blue-300">
              Generate some music to see statistics appear here!
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}