'use client'
import { useState } from 'react'
import ProfessionalWaveform from '../ProfessionalWaveform'

interface WaveformSectionProps {
  audioUrl: string
  isPlaying: boolean
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  className?: string
  height?: number
  barWidth?: number
  barGap?: number
  showToggle?: boolean
  showFallback?: boolean
  title?: string
  compact?: boolean
}

export default function WaveformSection({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  className = '',
  height = 120,
  barWidth = 2,
  barGap = 1,
  showToggle = true,
  showFallback = true,
  title = 'Live waveform',
  compact = false,
}: WaveformSectionProps) {
  const [showWaveform, setShowWaveform] = useState(true)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const toggleWaveform = () => {
    setShowWaveform(!showWaveform)
  }

  return (
    <div className={`waveform-section ${className}`}>
      {/* Professional Waveform */}
      {showWaveform && (
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm">📊</span>
              <span className="text-blue-200 text-sm font-medium">{title}</span>
            </div>
            {showToggle && (
              <button
                onClick={toggleWaveform}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-blue-200 transition-colors"
                title="Switch to progress bar"
              >
                📊 → 📊
              </button>
            )}
          </div>
          <ProfessionalWaveform
            audioUrl={audioUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            height={height}
            barWidth={barWidth}
            barGap={barGap}
            className="shadow-lg rounded-lg"
          />
        </div>
      )}

      {/* Fallback Progress Bar */}
      {!showWaveform && showFallback && (
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 text-sm">📊</span>
              <span className="text-purple-200 text-sm font-medium">Progress bar</span>
            </div>
            {showToggle && (
              <button
                onClick={toggleWaveform}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-purple-200 transition-colors"
                title="Switch to waveform"
              >
                📊 → 📊
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-blue-200">
            <span className={`font-mono ${compact ? 'min-w-[2.5rem]' : 'min-w-[3rem]'} text-white`}>
              {formatTime(currentTime)}
            </span>
            
            <div className="flex-1 relative">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className={`w-full bg-white/20 rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
                  compact ? 'h-2 hover:h-2.5' : 'h-2 hover:h-3'
                }`}
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, rgba(255,255,255,0.2) ${
                    duration ? (currentTime / duration) * 100 : 0
                  }%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
              
              {/* Progress Indicator */}
              <div 
                className={`absolute top-1/2 transform -translate-y-1/2 bg-yellow-400 rounded-full shadow-lg pointer-events-none transition-all duration-200 ${
                  compact ? 'w-2.5 h-2.5' : 'w-3 h-3'
                }`}
                style={{
                  left: `${duration ? (currentTime / duration) * 100 : 0}%`
                }}
              />
              
              {/* Time markers for longer tracks */}
              {duration > 60 && !compact && (
                <div className="absolute top-full mt-1 left-0 right-0 flex justify-between text-xs text-gray-400">
                  <span>0:00</span>
                  <span>{formatTime(duration / 2)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              )}
            </div>
            
            <span className={`font-mono ${compact ? 'min-w-[2.5rem]' : 'min-w-[3rem]'} text-white`}>
              {formatTime(duration)}
            </span>
          </div>
          
          {/* Additional Progress Info */}
          {!compact && duration > 0 && (
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>Progress: {((currentTime / duration) * 100).toFixed(1)}%</span>
              <span>Remaining: {formatTime(duration - currentTime)}</span>
            </div>
          )}
        </div>
      )}

      {/* Waveform Controls */}
      {showToggle && (
        <div className="flex justify-center mt-2">
          <button
            onClick={toggleWaveform}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              showWaveform
                ? 'bg-blue-600/30 border-blue-400/30 text-blue-200 hover:bg-blue-600/50'
                : 'bg-purple-600/30 border-purple-400/30 text-purple-200 hover:bg-purple-600/50'
            }`}
          >
            {showWaveform ? '📊 Waveform' : '📊 Progress Bar'}
          </button>
        </div>
      )}
    </div>
  )
}