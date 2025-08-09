'use client'
import Tooltip from '../Tooltip'

interface ControlsPanelProps {
  isPlaying: boolean
  isBuffering?: boolean
  audioLoaded?: boolean
  volume?: number
  playbackRate?: number
  isLooping?: boolean
  repeatMode?: 'none' | 'one' | 'all'
  showWaveform?: boolean
  isFavorited?: boolean
  duration?: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSkipForward: (seconds?: number) => void
  onSkipBackward: (seconds?: number) => void
  onVolumeChange?: (volume: number) => void
  onPlaybackRateChange?: (rate: number) => void
  onToggleLoop?: () => void
  onToggleRepeat?: () => void
  onToggleWaveform?: () => void
  onDownload?: () => void
  onToggleFavorite?: () => void
  onToggleMute?: () => void
  className?: string
  compact?: boolean
  showAdvancedControls?: boolean
}

export default function ControlsPanel({
  isPlaying,
  isBuffering = false,
  audioLoaded = true,
  volume = 1,
  playbackRate = 1,
  isLooping = false,
  repeatMode = 'none',
  showWaveform = true,
  isFavorited = false,
  duration = 0,
  onPlay,
  onPause,
  onStop,
  onSkipForward,
  onSkipBackward,
  onVolumeChange,
  onPlaybackRateChange,
  onToggleLoop,
  onToggleRepeat,
  onToggleWaveform,
  onDownload,
  onToggleFavorite,
  onToggleMute,
  className = '',
  compact = false,
  showAdvancedControls = false,
}: ControlsPanelProps) {

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`controls-panel ${className}`}>
      {/* Loading indicator */}
      {isBuffering && (
        <div className="flex items-center justify-center mb-4 p-3 sm:p-4 bg-black/30 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-2 border-blue-500 border-t-transparent mr-2 sm:mr-3"></div>
          <span className="text-blue-200 text-sm sm:text-base">Loading audio...</span>
        </div>
      )}

      {/* Main Controls - Mobile Responsive */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-black/20 rounded-xl p-3 sm:p-4 gap-3 sm:gap-0 ${
        compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
      }`}>
        
        {/* Primary Controls */}
        <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
          <Tooltip content="Skip Back 10s (Arrow Left)" position="top">
            <button
              onClick={() => onSkipBackward(10)}
              className={`${
                compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
              } bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/10`}
              title="Skip back 10s"
            >
              <span className={`text-white ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>⏪</span>
            </button>
          </Tooltip>
          
          <Tooltip content="Play/Pause (Spacebar)" position="top">
            <button
              onClick={isPlaying ? onPause : onPlay}
              className={`${
                compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4'
              } bg-gradient-to-r from-blue-600 to-purple-600 rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-white ${
                compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
              } hover:scale-105 shadow-lg border border-white/20`}
              title={isPlaying ? "Pause" : "Play"}
              disabled={!audioLoaded}
            >
              {isPlaying ? "⏸️" : "▶️"}
            </button>
          </Tooltip>
          
          <Tooltip content="Stop (S)" position="top">
            <button
              onClick={onStop}
              className={`${
                compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
              } bg-red-600/60 rounded-full hover:bg-red-600/80 transition-all duration-200 text-white hover:scale-105 border border-red-400/30`}
              title="Stop and reset"
            >
              <span className={`${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>⏹️</span>
            </button>
          </Tooltip>
          
          <Tooltip content="Skip Forward 10s (Arrow Right)" position="top">
            <button
              onClick={() => onSkipForward(10)}
              className={`${
                compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
              } bg-white/10 rounded-full hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/10`}
              title="Skip forward 10s"
            >
              <span className={`text-white ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>⏩</span>
            </button>
          </Tooltip>
        </div>
        
        {/* Secondary Controls - Stack on mobile, wrap if needed */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {onToggleWaveform && (
            <Tooltip content="Toggle Waveform (W)" position="top">
              <button
                onClick={onToggleWaveform}
                className={`${
                  compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
                } rounded-full transition-all duration-200 hover:scale-105 border ${
                  showWaveform 
                    ? "bg-green-600/60 hover:bg-green-600/80 border-green-400/30 text-white" 
                    : "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                }`}
                title={showWaveform ? "Hide waveform" : "Show waveform"}
              >
                <span className={`${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>📊</span>
              </button>
            </Tooltip>
          )}
          
          {onDownload && (
            <Tooltip content="Download (D)" position="top">
              <button
                onClick={onDownload}
                className={`${
                  compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
                } bg-blue-600/60 rounded-full hover:bg-blue-600/80 transition-all duration-200 hover:scale-105 border border-blue-400/30`}
                title="Download track"
              >
                <span className={`text-white ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>💾</span>
              </button>
            </Tooltip>
          )}
          
          {onToggleFavorite && (
            <Tooltip content="Toggle Favorite (F)" position="top">
              <button
                onClick={onToggleFavorite}
                className={`${
                  compact ? 'p-1.5 sm:p-2' : 'p-2 sm:p-2.5'
                } rounded-full transition-all duration-200 hover:scale-105 border ${
                  isFavorited
                    ? "bg-red-600/60 hover:bg-red-600/80 border-red-400/30"
                    : "bg-white/10 hover:bg-white/20 border-white/10"
                }`}
                title={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                <span className={`text-white ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>{isFavorited ? "❤️" : "🤍"}</span>
              </button>
            </Tooltip>
          )}
          
          {/* Status Pills - Hide on very small screens */}
          <div className="hidden xs:flex items-center gap-1 sm:gap-2 text-xs text-blue-200 ml-2">
            {duration > 0 && (
              <span className="bg-orange-600/30 px-2 py-1 rounded-full whitespace-nowrap">
                ⏱️ {formatTime(duration)}
              </span>
            )}
            {playbackRate !== 1 && (
              <span className="bg-cyan-600/30 px-2 py-1 rounded-full whitespace-nowrap">
                🚀 {playbackRate}x
              </span>
            )}
            {volume !== 1 && (
              <span className="bg-purple-600/30 px-2 py-1 rounded-full whitespace-nowrap">
                🔊 {Math.round(volume * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Controls - Mobile Responsive Grid */}
      {showAdvancedControls && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
          {/* Speed Control */}
          {onPlaybackRateChange && (
            <div className="bg-black/20 rounded-lg p-3 sm:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-cyan-400">🚀</span>
                <span className="text-white text-sm font-medium">Speed</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => onPlaybackRateChange(rate)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      playbackRate === rate
                        ? 'bg-cyan-600/80 text-white'
                        : 'bg-white/10 text-cyan-200 hover:bg-white/20'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Volume Control */}
          {onVolumeChange && (
            <div className="bg-black/20 rounded-lg p-3 sm:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-purple-400">🔊</span>
                <span className="text-white text-sm font-medium">Volume</span>
                {onToggleMute && (
                  <button
                    onClick={onToggleMute}
                    className="ml-auto p-1 bg-white/10 rounded hover:bg-white/20 transition-colors text-sm"
                    title={volume === 0 ? "Unmute" : "Mute"}
                  >
                    {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                  </button>
                )}
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onVolumeChange && onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
              <div className="text-center text-xs text-purple-200 mt-1">
                {Math.round(volume * 100)}%
              </div>
            </div>
          )}

          {/* Loop & Repeat Controls */}
          {(onToggleLoop || onToggleRepeat) && (
            <div className="bg-black/20 rounded-lg p-3 sm:p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-400">🔄</span>
                <span className="text-white text-sm font-medium">Repeat</span>
              </div>
              <div className="flex gap-2">
                {onToggleLoop && (
                  <button
                    onClick={onToggleLoop}
                    className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isLooping
                        ? 'bg-orange-600/80 text-white'
                        : 'bg-white/10 text-orange-200 hover:bg-white/20'
                    }`}
                    title="Toggle loop current track"
                  >
                    🔁 Loop
                  </button>
                )}
                {onToggleRepeat && (
                  <button
                    onClick={onToggleRepeat}
                    className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                      repeatMode !== 'none'
                        ? 'bg-orange-600/80 text-white'
                        : 'bg-white/10 text-orange-200 hover:bg-white/20'
                    }`}
                    title={`Repeat mode: ${repeatMode}`}
                  >
                    {repeatMode === 'none' && '🔄 Off'}
                    {repeatMode === 'one' && '🔂 One'}
                    {repeatMode === 'all' && '🔁 All'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Indicators - Mobile Responsive */}
      {!compact && (isLooping || repeatMode !== 'none' || playbackRate !== 1) && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 text-xs text-white/60 flex-wrap">
          {isLooping && <span className="bg-orange-500/30 px-2 py-1 rounded whitespace-nowrap">🔁 Loop</span>}
          {repeatMode !== 'none' && <span className="bg-orange-500/30 px-2 py-1 rounded whitespace-nowrap">🔄 Repeat {repeatMode}</span>}
          {playbackRate !== 1 && <span className="bg-cyan-500/30 px-2 py-1 rounded whitespace-nowrap">🚀 {playbackRate}x</span>}
        </div>
      )}

      {/* Mobile-specific styles */}
      <style jsx>{`
        @media (min-width: 475px) {
          .xs\\:flex {
            display: flex;
          }
        }

        @media (max-width: 474px) {
          .xs\\:flex {
            display: none;
          }
        }

        /* Custom slider styles for mobile */
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #6d28d9;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #6d28d9;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 640px) {
          .slider::-webkit-slider-thumb {
            width: 20px;
            height: 20px;
          }
          
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </div>
  )
}