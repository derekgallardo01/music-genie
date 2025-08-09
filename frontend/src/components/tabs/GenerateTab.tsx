// components/tabs/GenerateTab.tsx - CLEAN VERSION - Fixed Audio Player Integration

'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import AudioPlayer from '../audio/AudioPlayer'
import useGenerations from '../../hooks/useGenerations'
import ErrorBoundary from '../ErrorBoundary'
import { getApiUrl, config, isDebugMode } from '../../../utils/config'

// FIXED: Import the normalizer if available, otherwise use fallback
let normalizeApiResponse: any = null
let debugLogGeneration: any = null

try {
  const normalizer = require('../../../utils/generationNormalizer')
  normalizeApiResponse = normalizer.normalizeApiResponse
  debugLogGeneration = normalizer.debugLogGeneration
} catch (error) {
  // Fallback if normalizer is not available yet
  console.warn('Generation normalizer not available, using fallback')
}

interface GenerateTabProps {
  onGenerationComplete?: () => void
}

// FIXED: Define the generation data type
interface CompleteGenerationData {
  id: number
  generation_id: string
  prompt: string
  status: string
  generation_time: number
  device: string
  precision: string
  realtime_factor: number
  created_at: string
  audio_url: string
  file_size_mb: number
  play_count: number
  download_count: number
  is_favorited: boolean
  last_played?: string | null
  duration?: number
}

export default function GenerateTab({ onGenerationComplete }: GenerateTabProps) {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [timer, setTimer] = useState(0)
  const [progress, setProgress] = useState(0)
  const [audioUrl, setAudioUrl] = useState('')
  const [progressStage, setProgressStage] = useState('')
  
  // FIXED: Store the complete generation data with proper typing
  const [generatedTrackData, setGeneratedTrackData] = useState<CompleteGenerationData | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  const {
    loading,
    error,
    generateMusic,
    downloadTrack: hookDownloadTrack,
    toggleFavorite: hookToggleFavorite,
    trackPlay: hookTrackPlay,
    clearError,
  } = useGenerations()

  // FIXED: Properly handle audio player interactions
  const stopAllOtherAudio = (currentGenerationId: string) => {
    // Since this is the generate tab, we only have one audio player
    if (isDebugMode()) {
      console.log(`🔇 Stopping other audio for: ${currentGenerationId}`)
    }
  }

  const setAudioRef = (generationId: string, ref: HTMLAudioElement | null) => {
    if (isDebugMode()) {
      console.log(`🎵 Audio ref set for generation: ${generationId}`, ref)
    }
  }

  const trackPlay = async (generationId: string, playDuration?: number) => {
    if (isDebugMode()) {
      console.log(`🎧 Tracking play for generated track: ${generationId}`, playDuration)
    }
    
    // Update local play count
    if (generatedTrackData && generatedTrackData.generation_id === generationId) {
      setGeneratedTrackData((prev: CompleteGenerationData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          play_count: (prev.play_count || 0) + 1,
          last_played: new Date().toISOString()
        }
      })
    }
    
    return await hookTrackPlay(generationId, playDuration)
  }

  const downloadTrack = async (generationId: string, prompt: string) => {
    if (isDebugMode()) {
      console.log(`💾 Downloading generated track: ${generationId}`)
    }
    
    // Update local download count
    if (generatedTrackData && generatedTrackData.generation_id === generationId) {
      setGeneratedTrackData((prev: CompleteGenerationData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          download_count: (prev.download_count || 0) + 1
        }
      })
    }
    
    const success = await hookDownloadTrack(generationId, prompt)
    
    // FIXED: Check if function exists AND was successful before calling
    if (success && onGenerationComplete) {
      onGenerationComplete()  // This is safe because we checked it exists
    }
    
    return success
  }

  const toggleFavorite = async (generationId: string) => {
    if (isDebugMode()) {
      console.log(`❤️ Toggling favorite for generated track: ${generationId}`)
    }
    
    // Update local favorite state immediately for better UX
    if (generatedTrackData && generatedTrackData.generation_id === generationId) {
      setGeneratedTrackData((prev: CompleteGenerationData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          is_favorited: !prev.is_favorited
        }
      })
    }
    
    const success = await hookToggleFavorite(generationId)
    
    // Revert if the API call failed
    if (!success && generatedTrackData && generatedTrackData.generation_id === generationId) {
      setGeneratedTrackData((prev: CompleteGenerationData | null) => {
        if (!prev) return prev
        return {
          ...prev,
          is_favorited: !prev.is_favorited
        }
      })
    }
    
    return success
  }

  const formatTimeShort = (seconds: number): string => {
    return `${seconds.toFixed(1)}s`
  }

  // Timer effect
  useEffect(() => {
    if (loading) {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 0.1)
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (!loading && timer > 0 && startTimeRef.current !== null) {
        const totalTime = (Date.now() - startTimeRef.current) / 1000
        if (isDebugMode()) {
          console.log(`🎵 Music generation completed in ${totalTime.toFixed(2)} seconds`)
        }
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [loading, timer])

  // Progress bar simulation
  useEffect(() => {
    if (loading) {
      setProgress(0)
      setProgressStage('Initializing...')
      
      const progressSteps = [
        { time: 500, progress: 15, stage: 'Loading AI model...' },
        { time: 1500, progress: 35, stage: 'Processing your prompt...' },
        { time: 3000, progress: 55, stage: 'Generating audio patterns...' },
        { time: 5000, progress: 75, stage: 'Refining musical structure...' },
        { time: 7000, progress: 90, stage: 'Finalizing your track...' },
      ]
      
      progressSteps.forEach(({ time, progress: targetProgress, stage }) => {
        setTimeout(() => {
          if (loading) {
            setProgress(targetProgress)
            setProgressStage(stage)
          }
        }, time)
      })
    } else {
      setProgress(0)
      setTimer(0)
      setProgressStage('')
    }
  }, [loading])

  // FIXED: Helper function to create generation data
  const createGenerationData = (data: any, prompt: string): CompleteGenerationData => {
    // Try to use normalizer if available
    if (normalizeApiResponse) {
      try {
        const normalized = normalizeApiResponse(data)
        normalized.prompt = prompt
        normalized.created_at = new Date().toISOString()
        return normalized
      } catch (error) {
        console.warn('Normalizer failed, using fallback:', error)
      }
    }
    
    // Fallback manual creation
    return {
      id: Date.now(),
      generation_id: data.generation_id || 'unknown',
      prompt: prompt,
      status: data.status || 'completed',
      generation_time: parseFloat(String(data.generation_time || '0').replace('s', '')),
      device: data.device || 'Unknown',
      precision: data.precision || 'Unknown',
      realtime_factor: data.realtime_factor || 0,
      created_at: new Date().toISOString(),
      audio_url: data.audio_url || '',
      file_size_mb: data.file_size_mb || 0,
      play_count: 0,
      download_count: 0,
      is_favorited: false,
      last_played: null,
      duration: parseFloat(String(data.duration || '10').replace(' seconds', ''))
    }
  }

  const handleGenerateMusic = async () => {
    if (!prompt.trim()) return
    
    if (isDebugMode()) {
      console.log(`🎼 Starting music generation for prompt: "${prompt}"`)
    }
    
    setResult('')
    setAudioUrl('')
    setGeneratedTrackData(null)
    clearError()
    
    try {
      const data = await generateMusic({
        prompt: prompt.trim(),
        duration: 30,
        device: 'auto',
        precision: 'float32'
      })
      
      if (!data) {
        return
      }
      
      setResult(JSON.stringify(data, null, 2))
      
      if (data.status === 'completed' && data.audio_url) {
        const fullAudioUrl = getApiUrl(data.audio_url)
        setAudioUrl(fullAudioUrl)
        
        // FIXED: Create complete generation data
        const completeData = createGenerationData(data, prompt)
        setGeneratedTrackData(completeData)
        
        if (isDebugMode()) {
          if (debugLogGeneration) {
            debugLogGeneration(completeData, 'Generated Track')
          } else {
            console.log('🎵 Generated track data:', completeData)
          }
        }
      }
      
      setProgress(100)
      setProgressStage('Complete! 🎉')
      
      if (onGenerationComplete) {
        onGenerationComplete()
      }
      
    } catch (error) {
      console.error('❌ Music generation failed:', error)
      setProgress(0)
    }
  }

  const handlePromptKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && prompt.trim()) {
      e.preventDefault()
      handleGenerateMusic()
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
      <div className="space-y-6">
        {/* Configuration Info (only in debug mode) */}
        {isDebugMode() && (
          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-3 text-xs">
            <div className="text-blue-300 mb-1">🔧 Debug Info:</div>
            <div className="text-blue-200">
              API URL: {config.apiUrl} | Environment: {config.environment}
            </div>
          </div>
        )}

        <div>
          <label className="block text-white text-sm font-medium mb-2">
            Describe the music you want to generate:
          </label>
          <div className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handlePromptKeyPress}
              placeholder="e.g., upbeat jazz piano solo, relaxing ambient electronic"
              className="w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
              disabled={loading}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 text-sm pointer-events-none">
              {prompt.trim() && !loading ? '↵' : ''}
            </div>
          </div>
          <p className="text-blue-200/70 text-xs mt-2">
            💡 Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Enter</kbd> to generate or click the button below
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-400/30 rounded-lg p-4">
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

        {/* Timer Display */}
        {loading && (
          <ErrorBoundary name="GenerationProgress" isolate={true}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-black/30 rounded-lg p-4 border border-white/20"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-medium">Generation Progress</span>
                <span className="text-blue-300 font-mono text-lg">
                  ⏱️ {formatTimeShort(timer)}
                </span>
              </div>
              
              <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </motion.div>
              </div>
              
              <div className="flex justify-between text-xs text-blue-200 mb-2">
                <span>0%</span>
                <span className="font-medium">{progress.toFixed(0)}%</span>
                <span>100%</span>
              </div>
              
              <div className="text-center">
                <span className="text-blue-300 text-sm font-medium">
                  {progressStage}
                </span>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}

        {/* Generation Button */}
        <button
          onClick={handleGenerateMusic}
          disabled={loading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
              Generating Music... ({formatTimeShort(timer)})
            </div>
          ) : (
            'Generate Music 🎼'
          )}
        </button>

        {/* FIXED: Enhanced Audio Player with Normalized Data */}
        {audioUrl && generatedTrackData && (
          <ErrorBoundary name="GeneratedAudioPlayer" isolate={true}>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="bg-black/40 rounded-lg p-6 border border-white/10"
            >
              <h3 className="text-white font-semibold mb-4 text-xl">🎵 Your Generated Music</h3>
              
              {/* FIXED: Use AudioPlayer component with normalized generation data */}
              <AudioPlayer
                generation={generatedTrackData}
                stopAllOtherAudio={stopAllOtherAudio}
                setAudioRef={setAudioRef}
                trackPlay={trackPlay}
                downloadTrack={downloadTrack}
                toggleFavorite={toggleFavorite}
                className="mb-6"
                showWaveformDefault={true}
              />

              {/* Prompt Display */}
              <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="text-sm text-blue-300 mb-1">Generated from prompt:</div>
                <div className="text-white font-medium italic">
                  &ldquo;{prompt}&rdquo;
                </div>
              </div>

              {/* Generation Stats Display */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-green-400 text-lg mb-1">⚡</div>
                  <div className="text-white font-medium text-sm">{generatedTrackData.generation_time?.toFixed(1)}s</div>
                  <div className="text-gray-400 text-xs">Generation</div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-blue-400 text-lg mb-1">💾</div>
                  <div className="text-white font-medium text-sm">{generatedTrackData.file_size_mb?.toFixed(1)}MB</div>
                  <div className="text-gray-400 text-xs">File Size</div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-purple-400 text-lg mb-1">🚀</div>
                  <div className="text-white font-medium text-sm">{generatedTrackData.device}</div>
                  <div className="text-gray-400 text-xs">Device</div>
                </div>
                
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-orange-400 text-lg mb-1">🎯</div>
                  <div className="text-white font-medium text-sm">{generatedTrackData.realtime_factor?.toFixed(1)}x</div>
                  <div className="text-gray-400 text-xs">Realtime</div>
                </div>
              </div>
            </motion.div>
          </ErrorBoundary>
        )}

        {/* API Response (Debug Info) */}
        {result && isDebugMode() && (
          <ErrorBoundary name="DebugInfo" isolate={true}>
            <details className="bg-black/30 rounded-lg border border-white/20">
              <summary className="p-4 text-white font-semibold cursor-pointer hover:bg-white/5 transition-colors">
                📊 API Response Details (Debug Mode)
              </summary>
              <div className="p-4 pt-0">
                <pre className="text-green-300 text-sm overflow-auto max-h-48">
                  {result}
                </pre>
              </div>
            </details>
          </ErrorBoundary>
        )}
      </div>
    </motion.div>
  )
}