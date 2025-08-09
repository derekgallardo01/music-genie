'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import TabNavigation, { Tab } from '../components/ui/TabNavigation'
import GenerateTab from '../components/tabs/GenerateTab'
import HistoryTab from '../components/tabs/HistoryTab'
import PopularTab from '../components/tabs/PopularTab'
import StatsTab from '../components/tabs/StatsTab'
import ErrorBoundary from '../components/ErrorBoundary'
import { getApiUrl, isDebugMode } from '../../utils/config'

// Define tab configuration
const tabs: Tab[] = [
  {
    id: 'generate',
    label: 'Generate',
    icon: '🎼',
    tooltip: 'Create new AI-generated music'
  },
  {
    id: 'history',
    label: 'History',
    icon: '📚',
    tooltip: 'Browse your generation history'
  },
  {
    id: 'popular',
    label: 'Popular',
    icon: '🔥',
    tooltip: 'Most played tracks'
  },
  {
    id: 'stats',
    label: 'Statistics',
    icon: '📊',
    tooltip: 'Generation analytics and insights'
  }
]

type TabType = 'generate' | 'history' | 'popular' | 'stats'

export default function Home() {
  // Core state
  const [activeTab, setActiveTab] = useState<TabType>('generate')
  
  // Audio management refs for cross-tab audio control
  const currentAudioRefs = useRef<{[key: string]: HTMLAudioElement}>({})
  
  // Audio management utilities
  const setAudioRef = useCallback((generationId: string, ref: HTMLAudioElement | null) => {
    if (ref) {
      currentAudioRefs.current[generationId] = ref
    } else {
      delete currentAudioRefs.current[generationId]
    }
  }, [])

  const stopAllOtherAudio = useCallback((currentGenerationId: string) => {
    Object.entries(currentAudioRefs.current).forEach(([genId, audioEl]) => {
      if (genId !== currentGenerationId && audioEl && !audioEl.paused) {
        audioEl.pause()
      }
    })
  }, [])

  // Shared functions for user interactions - UPDATED TO USE CONFIG
  const trackPlay = useCallback(async (generationId: string, playDuration?: number) => {
    try {
      await fetch(getApiUrl('/track-play'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          generation_id: generationId, 
          play_duration: playDuration 
        })
      })
      
      if (isDebugMode()) {
        console.log(`🎧 Play tracked for ${generationId} (${playDuration ? `${playDuration.toFixed(1)}s` : 'started'})`)
      }
    } catch (error) {
      console.error('Failed to track play:', error)
    }
  }, [])

  const downloadTrack = useCallback(async (generationId: string, prompt: string) => {
    try {
      const response = await fetch(getApiUrl(`/download/${generationId}`), {
        method: 'POST'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s-_]/g, '')}.wav`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        if (isDebugMode()) {
          console.log(`💾 Downloaded ${generationId}`)
        }
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [])

  const toggleFavorite = useCallback(async (generationId: string) => {
    try {
      await fetch(getApiUrl('/favorite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: generationId })
      })
      
      if (isDebugMode()) {
        console.log(`❤️ Favorite toggled for ${generationId}`)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }, [])

  // Callback for when generation completes (to refresh other tabs)
  const handleGenerationComplete = useCallback(() => {
    if (isDebugMode()) {
      console.log('🎉 Generation completed - other tabs will refresh when opened')
    }
    // Individual tabs will handle their own data refresh when they become active
  }, [])

  // Tab change handler
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabType)
    if (isDebugMode()) {
      console.log(`📑 Switched to ${tabId} tab`)
    }
  }, [])

  // Render the active tab content with error boundaries
  const renderTabContent = () => {
    const commonProps = {
      stopAllOtherAudio,
      setAudioRef,
      trackPlay,
      downloadTrack,
      toggleFavorite
    }

    switch (activeTab) {
      case 'generate':
        return (
          <ErrorBoundary 
            name="GenerateTab" 
            isolate={true}
            fallback={(error, errorId, retry) => (
              <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <span className="text-blue-400 text-3xl">🎼</span>
                  <div>
                    <h4 className="text-blue-300 font-medium text-lg mb-2">Music Generation Error</h4>
                    <p className="text-blue-200 text-sm mb-3">
                      The music generation interface encountered an issue. This might be temporary.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={retry}
                        className="px-4 py-2 bg-blue-600/60 hover:bg-blue-600/80 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        🔄 Retry Generation
                      </button>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        🔃 Reload Page
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          >
            <GenerateTab onGenerationComplete={handleGenerationComplete} />
          </ErrorBoundary>
        )
      
      case 'history':
        return (
          <ErrorBoundary 
            name="HistoryTab" 
            isolate={true}
            fallback={(error, errorId, retry) => (
              <div className="bg-purple-900/20 border border-purple-400/30 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <span className="text-purple-400 text-3xl">📚</span>
                  <div>
                    <h4 className="text-purple-300 font-medium text-lg mb-2">History Loading Error</h4>
                    <p className="text-purple-200 text-sm mb-3">
                      Unable to load your music history. This might be a temporary network issue.
                    </p>
                    <button
                      onClick={retry}
                      className="px-4 py-2 bg-purple-600/60 hover:bg-purple-600/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Reload History
                    </button>
                  </div>
                </div>
              </div>
            )}
          >
            <HistoryTab {...commonProps} />
          </ErrorBoundary>
        )
      
      case 'popular':
        return (
          <ErrorBoundary 
            name="PopularTab" 
            isolate={true}
            fallback={(error, errorId, retry) => (
              <div className="bg-orange-900/20 border border-orange-400/30 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <span className="text-orange-400 text-3xl">🔥</span>
                  <div>
                    <h4 className="text-orange-300 font-medium text-lg mb-2">Popular Tracks Error</h4>
                    <p className="text-orange-200 text-sm mb-3">
                      Cannot load popular tracks right now. Please try again.
                    </p>
                    <button
                      onClick={retry}
                      className="px-4 py-2 bg-orange-600/60 hover:bg-orange-600/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Reload Popular
                    </button>
                  </div>
                </div>
              </div>
            )}
          >
            <PopularTab {...commonProps} />
          </ErrorBoundary>
        )
      
      case 'stats':
        return (
          <ErrorBoundary 
            name="StatsTab" 
            isolate={true}
            fallback={(error, errorId, retry) => (
              <div className="bg-green-900/20 border border-green-400/30 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <span className="text-green-400 text-3xl">📊</span>
                  <div>
                    <h4 className="text-green-300 font-medium text-lg mb-2">Statistics Error</h4>
                    <p className="text-green-200 text-sm mb-3">
                      Unable to load analytics data. This might be a server issue.
                    </p>
                    <button
                      onClick={retry}
                      className="px-4 py-2 bg-green-600/60 hover:bg-green-600/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Reload Stats
                    </button>
                  </div>
                </div>
              </div>
            )}
          >
            <StatsTab />
          </ErrorBoundary>
        )
      
      default:
        return null
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      // Stop all audio when component unmounts
      Object.values(currentAudioRefs.current).forEach(audioEl => {
        if (audioEl && !audioEl.paused) {
          audioEl.pause()
        }
      })
    }
  }, [])

  return (
    <ErrorBoundary 
      name="MainApp"
      onError={(error, errorInfo) => {
        // Log to your error reporting service
        console.error('🚨 Main App Error:', error)
        if (isDebugMode()) {
          console.group('🔍 Error Details')
          console.log('Component Stack:', errorInfo.componentStack)
          console.log('Error Stack:', error.stack)
          console.groupEnd()
        }
        // analytics.captureException(error, { extra: errorInfo })
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2 sm:p-4 md:p-8">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-8 md:mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-2 sm:mb-4">
              🎵 Music Genie
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-blue-200 mb-2 sm:mb-4">
              Professional AI Music Generation Platform
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-4 text-xs sm:text-sm text-blue-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                AI Powered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                Real-time Processing
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                Professional Quality
              </span>
            </div>
          </motion.div>

          {/* Tab Navigation with Error Boundary */}
          <ErrorBoundary 
            name="TabNavigation" 
            isolate={true}
            fallback={(error, errorId, retry) => (
              <div className="bg-white/10 rounded-lg p-4 mb-6 text-center">
                <p className="text-white mb-2">Navigation temporarily unavailable</p>
                <button
                  onClick={retry}
                  className="px-3 py-1 bg-blue-600/60 hover:bg-blue-600/80 text-white rounded text-sm"
                >
                  🔄 Retry
                </button>
              </div>
            )}
          >
            <div className="mb-4 sm:mb-6 px-1 sm:px-0">
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="pills"
                size="md"
                centered={true}
                animated={true}
                className="w-full"
              />
            </div>
          </ErrorBoundary>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[400px] sm:min-h-[500px]"
          >
            {renderTabContent()}
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-center mt-8 sm:mt-12 text-blue-300/60 text-xs sm:text-sm"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-2 sm:mb-4">
              <span>🎼 AI Music Generation</span>
              <span>📊 Advanced Analytics</span>
              <span>🎧 Professional Audio</span>
            </div>
            <p className="text-xs sm:text-sm">
              Powered by MusicGen AI • Built with Next.js & FastAPI • 
              <span className="text-blue-400 ml-1">Music Genie v2.0</span>
            </p>
          </motion.div>
        </div>

        {/* Background Effects */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Global Styles for Custom Scrollbars */}
        <style jsx global>{`
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
          
          /* Custom slider styles */
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: 2px solid #1e40af;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }
          
          .slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #60a5fa;
            cursor: pointer;
            border: 2px solid #1e40af;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }

          /* Keyboard shortcuts hint */
          kbd {
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 0.8em;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }

          /* Animation keyframes */
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          /* Responsive design helpers */
          @media (max-width: 640px) {
            .grid-cols-2 {
              grid-template-columns: repeat(1, minmax(0, 1fr));
            }
            
            .md\\:grid-cols-3 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            
            .md\\:grid-cols-4 {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            
            /* Fix button overflow on mobile */
            .flex {
              flex-wrap: wrap;
            }
            
            .gap-3 {
              gap: 0.5rem;
            }
          }

          /* Extra small screens */
          @media (min-width: 475px) {
            .xs\\:flex {
              display: flex;
            }
          }

          @media (max-width: 474px) {
            .xs\\:flex {
              display: none;
            }
            
            /* Stack audio controls vertically on very small screens */
            .audio-controls-mobile {
              flex-direction: column;
              align-items: stretch;
            }
            
            .audio-controls-mobile > div {
              width: 100%;
              justify-content: center;
            }
          }

          /* Focus styles for accessibility */
          button:focus-visible,
          input:focus-visible,
          [role="button"]:focus-visible {
            outline: 2px solid #60a5fa;
            outline-offset: 2px;
          }

          /* Loading states */
          .loading {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }

          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .bg-white\\/10 {
              background-color: rgba(255, 255, 255, 0.2);
            }
            
            .border-white\\/20 {
              border-color: rgba(255, 255, 255, 0.4);
            }
          }

          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .animate-pulse,
            .animate-spin {
              animation: none;
            }
            
            * {
              transition-duration: 0.01ms !important;
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}