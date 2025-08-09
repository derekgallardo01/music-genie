// components/audio/AudioPlayer.tsx - FIXED with Complete Data Handling

'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ProfessionalWaveform from '../ProfessionalWaveform'
import Tooltip from '../Tooltip'
import ErrorBoundary from '../ErrorBoundary'
import { getApiUrl, isDebugMode } from '../../../utils/config'
import { 
  type CompleteGeneration,
  normalizeGenerationData,
  formatRealtimeFactor,
  getDeviceEmoji,
  getStatusEmoji,
  formatFileSize,
  formatDuration,
  debugLogGeneration
} from '../../../utils/generationNormalizer'

interface AudioPlayerProps {
  generation: any // Accept any format, we'll normalize it
  stopAllOtherAudio: (id: string) => void
  setAudioRef: (id: string, ref: HTMLAudioElement | null) => void
  trackPlay: (generationId: string, playDuration?: number) => void
  downloadTrack: (generationId: string, prompt: string) => void
  toggleFavorite: (generationId: string) => void
  className?: string
  showWaveformDefault?: boolean
  compact?: boolean
}

export default function AudioPlayer({
  generation: rawGeneration,
  stopAllOtherAudio,
  setAudioRef,
  trackPlay,
  downloadTrack,
  toggleFavorite,
  className = '',
  showWaveformDefault = true,
  compact = false,
}: AudioPlayerProps) {
  
  // FIXED: Normalize the generation data to ensure completeness
  const generation: CompleteGeneration = normalizeGenerationData(rawGeneration)
  
  // Debug log in development
  useEffect(() => {
    if (isDebugMode()) {
      debugLogGeneration(generation, 'AudioPlayer')
    }
  }, [generation])
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showWaveform, setShowWaveform] = useState(showWaveformDefault)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [volume, setVolumeState] = useState(1)
  const [canSeek, setCanSeek] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Track if this is the first load
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)

  // Safe time formatting
  const formatTime = useCallback((seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0))
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Get full audio URL
  const getAudioUrl = useCallback(() => {
    if (!generation.audio_url) {
      setLoadError('No audio URL provided')
      return ''
    }
    
    try {
      // Handle different URL formats
      if (generation.audio_url.startsWith('http')) {
        return generation.audio_url
      }
      
      // Add the base URL if it's a relative path
      const fullUrl = getApiUrl(generation.audio_url)
      
      if (isDebugMode()) {
        console.log(`🔗 [${generation.generation_id}] Audio URL: ${fullUrl}`)
      }
      
      return fullUrl
    } catch (error) {
      setLoadError(`Invalid audio URL: ${generation.audio_url}`)
      return ''
    }
  }, [generation.audio_url, generation.generation_id])

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (isDebugMode()) {
      console.log(`🎵 [${generation.generation_id}] Audio metadata loaded`)
    }
    
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0)
      setAudioLoaded(true)
      setCanSeek(true)
      setIsBuffering(false)
      setLoadError(null)
      setAudioRef(generation.generation_id, audioRef.current)
    }
  }, [generation.generation_id, setAudioRef])

  const handleCanPlay = useCallback(() => {
    if (isDebugMode()) {
      console.log(`✅ [${generation.generation_id}] Audio can play`)
    }
    setIsBuffering(false)
    setCanSeek(true)
    setLoadError(null)
  }, [generation.generation_id])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current && !isBuffering) {
      setCurrentTime(audioRef.current.currentTime || 0)
    }
  }, [isBuffering])

  const handleLoadStart = useCallback(() => {
    if (isDebugMode()) {
      console.log(`⏳ [${generation.generation_id}] Audio loading started`)
    }
    setIsBuffering(true)
    setHasAttemptedLoad(true)
    setLoadError(null)
  }, [generation.generation_id])

  const handleWaiting = useCallback(() => {
    setIsBuffering(true)
  }, [])

  const handleError = useCallback((e: Event) => {
    const errorMsg = `Audio loading failed for ${generation.generation_id}`
    console.error(`❌ [${generation.generation_id}] Audio error:`, e)
    
    setIsPlaying(false)
    setAudioLoaded(false)
    setCanSeek(false)
    setIsBuffering(false)
    setLoadError(errorMsg)
    
    if (isDebugMode()) {
      console.error('Audio element error details:', {
        error: e,
        audioUrl: getAudioUrl(),
        readyState: audioRef.current?.readyState,
        networkState: audioRef.current?.networkState
      })
    }
  }, [generation.generation_id, getAudioUrl])

  const handleEnded = useCallback(() => {
    if (isDebugMode()) {
      console.log(`🏁 [${generation.generation_id}] Audio ended`)
    }
    
    const playTime = audioRef.current?.duration || 0
    setIsPlaying(false)
    setCurrentTime(0)
    trackPlay(generation.generation_id, playTime)
  }, [generation.generation_id, trackPlay])

  // Control functions
  const handlePlay = useCallback(async () => {
    if (!audioRef.current) {
      setLoadError('Audio element not ready')
      return
    }

    try {
      if (isDebugMode()) {
        console.log(`▶️ [${generation.generation_id}] Starting playback`)
      }
      
      // Stop all other audio
      stopAllOtherAudio(generation.generation_id)
      
      // Attempt to play
      await audioRef.current.play()
      setIsPlaying(true)
      setLoadError(null)
      
      // Track the play
      trackPlay(generation.generation_id)
      
      if (isDebugMode()) {
        console.log(`✅ [${generation.generation_id}] Playback started`)
      }
    } catch (error) {
      const errorMsg = `Playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ [${generation.generation_id}] Playback failed:`, error)
      setIsPlaying(false)
      setLoadError(errorMsg)
    }
  }, [generation.generation_id, stopAllOtherAudio, trackPlay])

  const handlePause = useCallback(() => {
    if (!audioRef.current) return

    if (isDebugMode()) {
      console.log(`⏸️ [${generation.generation_id}] Pausing playback`)
    }
    
    const playTime = audioRef.current.currentTime || 0
    audioRef.current.pause()
    setIsPlaying(false)
    
    // Track the pause with play duration
    if (playTime > 0) {
      trackPlay(generation.generation_id, playTime)
    }
  }, [generation.generation_id, trackPlay])

  const handleStop = useCallback(() => {
    if (!audioRef.current) return

    if (isDebugMode()) {
      console.log(`⏹️ [${generation.generation_id}] Stopping playback`)
    }
    
    const playTime = audioRef.current.currentTime || 0
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
    
    // Track the stop with play duration
    if (playTime > 0) {
      trackPlay(generation.generation_id, playTime)
    }
  }, [generation.generation_id, trackPlay])

  const handleSeek = useCallback((newTime: number) => {
    if (!audioRef.current || !canSeek) return

    const clampedTime = Math.max(0, Math.min(newTime, duration))
    audioRef.current.currentTime = clampedTime
    setCurrentTime(clampedTime)
    
    if (isDebugMode()) {
      console.log(`🎯 [${generation.generation_id}] Seeked to ${clampedTime.toFixed(1)}s`)
    }
  }, [generation.generation_id, canSeek, duration])

  const skipForward = useCallback((seconds: number = 10) => {
    if (!audioRef.current || !canSeek) return
    const newTime = Math.min((audioRef.current.currentTime || 0) + seconds, duration)
    handleSeek(newTime)
  }, [canSeek, duration, handleSeek])

  const skipBackward = useCallback((seconds: number = 10) => {
    if (!audioRef.current || !canSeek) return
    const newTime = Math.max((audioRef.current.currentTime || 0) - seconds, 0)
    handleSeek(newTime)
  }, [canSeek, handleSeek])

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!audioRef.current) return
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    audioRef.current.volume = clampedVolume
    setVolumeState(clampedVolume)
  }, [])

  const handleToggleMute = useCallback(() => {
    if (!audioRef.current) return
    if (audioRef.current.volume > 0) {
      audioRef.current.volume = 0
      setVolumeState(0)
    } else {
      audioRef.current.volume = 1
      setVolumeState(1)
    }
  }, [])

  const handleDownload = useCallback(() => {
    downloadTrack(generation.generation_id, generation.prompt)
  }, [downloadTrack, generation.generation_id, generation.prompt])

  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(generation.generation_id)
  }, [toggleFavorite, generation.generation_id])

  const handleToggleWaveform = useCallback(() => {
    setShowWaveform(prev => !prev)
  }, [])

  const handleRetryLoad = useCallback(() => {
    if (audioRef.current) {
      setLoadError(null)
      setHasAttemptedLoad(false)
      setIsBuffering(true)
      audioRef.current.load()
    }
  }, [])

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('error', handleError)
    audio.addEventListener('ended', handleEnded)

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [handleLoadedMetadata, handleCanPlay, handleTimeUpdate, handleLoadStart, handleWaiting, handleError, handleEnded])

  // Get the audio URL
  const audioUrl = getAudioUrl()

  return (
    <div className={`audio-player ${className}`}>
      {/* Debug info in development */}
      {isDebugMode() && (
        <div className="mb-2 text-xs text-gray-400 bg-black/20 rounded p-2">
          <div>🔗 Audio URL: {audioUrl}</div>
          <div>🎵 Status: Loaded={audioLoaded ? '✅' : '❌'} | Playing={isPlaying ? '▶️' : '⏸️'} | CanSeek={canSeek ? '✅' : '❌'}</div>
          <div>⏱️ Time: {formatTime(currentTime)} / {formatTime(duration)}</div>
          <div>📊 Generation Data: Device={generation.device} | Precision={generation.precision} | Size={formatFileSize(generation.file_size_mb)}</div>
        </div>
      )}

      {/* Loading indicator */}
      {isBuffering && !loadError && (
        <div className="flex items-center justify-center mb-4 p-4 bg-black/30 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mr-3"></div>
          <span className="text-blue-200">
            {hasAttemptedLoad ? 'Loading audio...' : 'Preparing to load...'}
          </span>
        </div>
      )}

      {/* Error indicator */}
      {loadError && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-400/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-red-200 text-sm">
              ⚠️ {loadError}
            </div>
            <button
              onClick={handleRetryLoad}
              className="ml-3 px-3 py-1 bg-red-600/60 hover:bg-red-600/80 text-white rounded text-sm"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Controls */}
      <ErrorBoundary name="AudioPlayerControls" isolate={true}>
        <div className={`flex items-center justify-between mb-4 bg-black/20 rounded-xl ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center gap-3">
            <Tooltip content="Skip Back 10s" position="top">
              <button
                onClick={() => skipBackward(10)}
                disabled={!canSeek}
                className={`${compact ? 'p-2' : 'p-2.5'} bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className={`text-white ${compact ? 'text-xs' : 'text-sm'}`}>⏪</span>
              </button>
            </Tooltip>
            
            <Tooltip content="Play/Pause" position="top">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={!audioLoaded && !isBuffering && !loadError}
                className={`${compact ? 'p-3' : 'p-4'} bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-white ${compact ? 'text-lg' : 'text-xl'} hover:scale-105 shadow-lg border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isBuffering ? "⏳" : isPlaying ? "⏸️" : "▶️"}
              </button>
            </Tooltip>
            
            <Tooltip content="Stop" position="top">
              <button
                onClick={handleStop}
                disabled={!audioLoaded}
                className={`${compact ? 'p-2' : 'p-2.5'} bg-red-600/60 rounded-full hover:bg-red-600/80 transition-all duration-200 text-white hover:scale-105 border border-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className={`${compact ? 'text-xs' : 'text-sm'}`}>⏹️</span>
              </button>
            </Tooltip>
            
            <Tooltip content="Skip Forward 10s" position="top">
              <button
                onClick={() => skipForward(10)}
                disabled={!canSeek}
                className={`${compact ? 'p-2' : 'p-2.5'} bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className={`text-white ${compact ? 'text-xs' : 'text-sm'}`}>⏩</span>
              </button>
            </Tooltip>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Volume Control */}
            {!compact && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleMute}
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200"
                  title={volume === 0 ? "Unmute" : "Mute"}
                >
                  <span className="text-white text-sm">
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </span>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
            
            <Tooltip content="Toggle Waveform" position="top">
              <button
                onClick={handleToggleWaveform}
                className={`${compact ? 'p-2' : 'p-2.5'} rounded-full transition-all duration-200 hover:scale-105 border ${
                  showWaveform 
                    ? "bg-green-600/60 hover:bg-green-600/80 border-green-400/30 text-white" 
                    : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                }`}
              >
                <span className={`${compact ? 'text-xs' : 'text-sm'}`}>📊</span>
              </button>
            </Tooltip>
            
            <Tooltip content="Download" position="top">
              <button
                onClick={handleDownload}
                className={`${compact ? 'p-2' : 'p-2.5'} bg-blue-600/60 rounded-full hover:bg-blue-600/80 transition-all duration-200 hover:scale-105 border border-blue-400/30`}
              >
                <span className={`text-white ${compact ? 'text-xs' : 'text-sm'}`}>💾</span>
              </button>
            </Tooltip>
            
            <Tooltip content="Toggle Favorite" position="top">
              <button
                onClick={handleToggleFavorite}
                className={`${compact ? 'p-2' : 'p-2.5'} rounded-full transition-all duration-200 hover:scale-105 border ${
                  generation.is_favorited
                    ? "bg-red-600/60 hover:bg-red-600/80 border-red-400/30"
                    : "bg-white/10 hover:bg-white/20 border-white/10"
                }`}
              >
                <span className={`text-white ${compact ? 'text-xs' : 'text-sm'}`}>
                  {generation.is_favorited ? "❤️" : "🤍"}
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </ErrorBoundary>

      {/* Professional Waveform */}
      {showWaveform && audioUrl && !loadError && (
        <ErrorBoundary name="AudioWaveform" isolate={true}>
          <div className="mb-4 bg-black/30 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-blue-400 text-sm">📊</span>
              <span className="text-blue-200 text-sm font-medium">Live waveform</span>
            </div>
            <ProfessionalWaveform
              audioUrl={audioUrl}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              height={compact ? 80 : 120}
              barWidth={2}
              barGap={1}
              className="shadow-lg rounded-lg"
            />
          </div>
        </ErrorBoundary>
      )}

      {/* Fallback Progress Bar */}
      {!showWaveform && !loadError && (
        <ErrorBoundary name="AudioProgressBar" isolate={true}>
          <div className="mb-4 bg-black/30 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-3 text-sm text-blue-200 mb-2">
              <span className="font-mono min-w-[3rem] text-white">{formatTime(currentTime)}</span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  disabled={!canSeek}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer hover:h-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      duration ? (currentTime / duration) * 100 : 0
                    }%, rgba(255,255,255,0.2) ${
                      duration ? (currentTime / duration) * 100 : 0
                    }%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-lg pointer-events-none transition-all duration-200"
                  style={{
                    left: `${duration ? (currentTime / duration) * 100 : 0}%`
                  }}
                />
              </div>
              <span className="font-mono min-w-[3rem] text-white">{formatTime(duration)}</span>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* Generation Info Display */}
      {!compact && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-green-400 text-lg mb-1">⚡</div>
            <div className="text-white font-medium text-sm">{generation.generation_time.toFixed(1)}s</div>
            <div className="text-gray-400 text-xs">Generation</div>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-blue-400 text-lg mb-1">🎧</div>
            <div className="text-white font-medium text-sm">{generation.play_count}</div>
            <div className="text-gray-400 text-xs">Plays</div>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-purple-400 text-lg mb-1">💾</div>
            <div className="text-white font-medium text-sm">{formatFileSize(generation.file_size_mb)}</div>
            <div className="text-gray-400 text-xs">Size</div>
          </div>
          
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-orange-400 text-lg mb-1">{getDeviceEmoji(generation.device)}</div>
            <div className="text-white font-medium text-sm">{generation.device}</div>
            <div className="text-gray-400 text-xs">{generation.precision}</div>
          </div>
        </div>
      )}

      {/* Technical Details */}
      {!compact && (
        <div className="flex flex-wrap gap-2 text-xs mb-4">
          <span className="bg-blue-600/30 px-2 py-1 rounded border border-blue-400/30 text-blue-200 flex items-center gap-1">
            {getDeviceEmoji(generation.device)}
            {generation.device}
          </span>
          <span className="bg-purple-600/30 px-2 py-1 rounded border border-purple-400/30 text-purple-200">
            {generation.precision}
          </span>
          <span className="bg-orange-600/30 px-2 py-1 rounded border border-orange-400/30 text-orange-200">
            {formatRealtimeFactor(generation.realtime_factor)}
          </span>
          <span className="bg-green-600/30 px-2 py-1 rounded border border-green-400/30 text-green-200 flex items-center gap-1">
            {getStatusEmoji(generation.status)}
            {generation.status}
          </span>
        </div>
      )}

      {/* Hidden Audio Element */}
      {audioUrl && !loadError && (
        <audio
          ref={audioRef}
          preload="metadata"
          style={{ display: 'none' }}
        >
          <source src={audioUrl} type="audio/wav" />
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
      )}
    </div>
  )
}