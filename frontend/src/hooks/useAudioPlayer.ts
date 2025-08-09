// hooks/useAudioPlayer.ts - Updated with Error Handler Integration

import { useState, useRef, useEffect, useCallback } from 'react'
import { useErrorHandler } from './useErrorHandler' // Import your error handler

interface Generation {
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
  play_count?: number
  download_count?: number
  is_favorited?: boolean
  last_played?: string
}

interface UseAudioPlayerProps {
  audioUrl: string
  generationId: string
  onPlay?: (generationId: string) => void
  onPause?: (generationId: string, playDuration?: number) => void
  onEnded?: (generationId: string, playDuration?: number) => void
  onError?: (error: Event) => void
  stopAllOtherAudio?: (generationId: string) => void
  setAudioRef?: (generationId: string, ref: HTMLAudioElement | null) => void
}

interface UseAudioPlayerReturn {
  // Audio ref
  audioRef: React.RefObject<HTMLAudioElement | null>
  
  // Playback state
  isPlaying: boolean
  currentTime: number
  duration: number
  audioLoaded: boolean
  canSeek: boolean
  isBuffering: boolean
  
  // Advanced controls state
  volume: number
  playbackRate: number
  isLooping: boolean
  repeatMode: 'none' | 'one' | 'all'
  repeatCount: number
  
  // Waveform state  
  showWaveform: boolean
  
  // Control functions
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  skipForward: (seconds?: number) => void
  skipBackward: (seconds?: number) => void
  
  // Advanced control functions
  setVolume: (volume: number) => void
  setPlaybackRate: (rate: number) => void
  toggleLoop: () => void
  toggleRepeat: () => void
  toggleMute: () => void
  toggleWaveform: () => void
  
  // Utility functions
  formatTime: (seconds: number) => string
}

export default function useAudioPlayer({
  audioUrl,
  generationId,
  onPlay,
  onPause,
  onEnded,
  onError,
  stopAllOtherAudio,
  setAudioRef,
}: UseAudioPlayerProps): UseAudioPlayerReturn {
  
  // Core audio state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [canSeek, setCanSeek] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  
  // Advanced controls state
  const [volume, setVolumeState] = useState(1)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [isLooping, setIsLooping] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
  const [repeatCount, setRepeatCount] = useState(0)
  
  // UI state
  const [showWaveform, setShowWaveform] = useState(true)

  // Use error handler for audio-specific errors
  const { reportError } = useErrorHandler()

  // Format time utility
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Enhanced error handling for audio events
  const handleAudioError = useCallback((error: Event, context: string) => {
    console.error(`Audio error in ${context}:`, error)
    
    // Report the error with audio-specific context
    const audioError = new Error(`Audio ${context} failed: ${error.type}`)
    reportError(audioError, `useAudioPlayer.${context}`)
    
    // Reset audio state
    setIsPlaying(false)
    setAudioLoaded(false)
    setCanSeek(false)
    setIsBuffering(false)
    
    // Call the original error handler if provided
    if (onError) {
      onError(error)
    }
  }, [reportError, onError])

  // Audio event handlers with error tracking
  const handleLoadedMetadata = useCallback(() => {
    try {
      if (audioRef.current) {
        setDuration(audioRef.current.duration)
        setAudioLoaded(true)
        audioRef.current.volume = volume
        audioRef.current.playbackRate = playbackRate
        audioRef.current.loop = isLooping
        
        if (setAudioRef) {
          setAudioRef(generationId, audioRef.current)
        }
        
        console.log('Audio metadata loaded:', generationId, 'duration:', audioRef.current.duration)
      }
    } catch (error) {
      handleAudioError(error as Event, 'loadedMetadata')
    }
  }, [generationId, volume, playbackRate, isLooping, setAudioRef, handleAudioError])

  const handleCanPlay = useCallback(() => {
    try {
      if (audioRef.current) {
        setTimeout(() => {
          setCanSeek(true)
          setIsBuffering(false)
          console.log('Audio can play - seeking enabled for:', generationId)
        }, 500)
      }
    } catch (error) {
      handleAudioError(error as Event, 'canPlay')
    }
  }, [generationId, handleAudioError])

  // ... rest of the audio player implementation with error tracking for each handler ...

  // The control functions would also include error tracking:
  const play = useCallback(() => {
    try {
      if (audioRef.current) {
        // Reset repeat count when manually starting playback
        setRepeatCount(0)
        
        // Stop all other audio if callback provided
        if (stopAllOtherAudio) {
          stopAllOtherAudio(generationId)
        }
        
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
            if (!canSeek) {
              setTimeout(() => {
                setCanSeek(true)
                console.log('Seeking enabled after playback start:', generationId)
              }, 1000)
            }
            console.log('Audio playback started successfully:', generationId)
          })
          .catch((error) => {
            console.error('Playback error:', generationId, error)
            reportError(error, 'useAudioPlayer.play')
            setIsPlaying(false)
          })
      }
    } catch (error) {
      handleAudioError(error as Event, 'play')
    }
  }, [generationId, canSeek, stopAllOtherAudio, reportError, handleAudioError])

  // Similar error tracking would be added to other control functions...

  return {
    // Audio ref
    audioRef,
    
    // Playback state
    isPlaying,
    currentTime,
    duration,
    audioLoaded,
    canSeek,
    isBuffering,
    
    // Advanced controls state
    volume,
    playbackRate,
    isLooping,
    repeatMode,
    repeatCount,
    
    // UI state
    showWaveform,
    
    // Control functions
    play,
    pause: () => {}, // Implement with error tracking
    stop: () => {}, // Implement with error tracking
    seek: () => {}, // Implement with error tracking
    skipForward: () => {}, // Implement with error tracking
    skipBackward: () => {}, // Implement with error tracking
    
    // Advanced control functions
    setVolume: () => {}, // Implement with error tracking
    setPlaybackRate: () => {}, // Implement with error tracking
    toggleLoop: () => {}, // Implement with error tracking
    toggleRepeat: () => {}, // Implement with error tracking
    toggleMute: () => {}, // Implement with error tracking
    toggleWaveform: () => setShowWaveform(prev => !prev),
    
    // Utility functions
    formatTime,
  }
}