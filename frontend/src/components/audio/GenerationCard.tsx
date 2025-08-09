'use client'
import { motion } from 'framer-motion'
import AudioPlayer from './AudioPlayer'
import { 
  type Generation,
  type ApiGeneration,
  normalizeGeneration,
  safeNumber, 
  safeString, 
  safeDate, 
  safeFileSize,
  safeRealtimeFactor,
  getStatusEmoji,
  getDeviceEmoji
} from '../../types/generation'

interface GenerationCardProps {
  generation: Generation | ApiGeneration // FIXED: Accept both types
  stopAllOtherAudio: (id: string) => void
  setAudioRef: (id: string, ref: HTMLAudioElement | null) => void
  trackPlay: (generationId: string, playDuration?: number) => void
  downloadTrack: (generationId: string, prompt: string) => void
  toggleFavorite: (generationId: string) => void
  className?: string
  showAudioPlayer?: boolean
  compact?: boolean
  index?: number
}

export default function GenerationCard({
  generation: rawGeneration,
  stopAllOtherAudio,
  setAudioRef,
  trackPlay,
  downloadTrack,
  toggleFavorite,
  className = '',
  showAudioPlayer = true,
  compact = false,
  index = 0,
}: GenerationCardProps) {
  
  // FIXED: Normalize the generation data to ensure type safety
  const generation: Generation = normalizeGeneration(rawGeneration)
  
  // Extract genre/mood from prompt for badges
  const extractBadges = (prompt: string) => {
    const badges = []
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('piano')) badges.push({ icon: '🎹', text: 'Piano', color: 'bg-blue-500/30 text-blue-200' })
    if (lowerPrompt.includes('jazz')) badges.push({ icon: '🎷', text: 'Jazz', color: 'bg-purple-500/30 text-purple-200' })
    if (lowerPrompt.includes('ambient')) badges.push({ icon: '🌙', text: 'Ambient', color: 'bg-cyan-500/30 text-cyan-200' })
    if (lowerPrompt.includes('electronic')) badges.push({ icon: '🎛️', text: 'Electronic', color: 'bg-pink-500/30 text-pink-200' })
    if (lowerPrompt.includes('classical')) badges.push({ icon: '🎻', text: 'Classical', color: 'bg-orange-500/30 text-orange-200' })
    if (lowerPrompt.includes('rock')) badges.push({ icon: '🎸', text: 'Rock', color: 'bg-red-500/30 text-red-200' })
    if (lowerPrompt.includes('upbeat')) badges.push({ icon: '⚡', text: 'Upbeat', color: 'bg-yellow-500/30 text-yellow-200' })
    if (lowerPrompt.includes('relaxing') || lowerPrompt.includes('calm')) badges.push({ icon: '😌', text: 'Relaxing', color: 'bg-green-500/30 text-green-200' })
    
    return badges.slice(0, 3) // Limit to 3 badges
  }

  const badges = extractBadges(generation.prompt)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative overflow-hidden rounded-2xl backdrop-blur-xl border
        bg-white/10 border-white/20 hover:bg-white/15
        transition-all duration-300 group
        ${className}
      `}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative p-6">
        {/* Status and Favorite Indicators */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {generation.is_favorited && (
            <div className="text-red-400 text-lg" title="Favorited">❤️</div>
          )}
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            generation.status === 'completed' 
              ? 'bg-green-600/30 text-green-200 border border-green-400/30'
              : generation.status === 'failed'
              ? 'bg-red-600/30 text-red-200 border border-red-400/30'
              : 'bg-yellow-600/30 text-yellow-200 border border-yellow-400/30'
          }`}>
            {getStatusEmoji(generation.status)}
          </div>
        </div>

        {/* Genre/mood badges */}
        {badges.length > 0 && !compact && (
          <div className="flex flex-wrap gap-2 mb-4">
            {badges.map((badge, badgeIndex) => (
              <span 
                key={badgeIndex}
                className={`px-3 py-1.5 ${badge.color} rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/10`}
              >
                <span className="text-sm">{badge.icon}</span>
                <span>{badge.text}</span>
              </span>
            ))}
          </div>
        )}

        {/* Main content */}
        <h3 className={`font-semibold mb-4 text-white leading-tight ${
          compact ? 'text-lg' : 'text-xl'
        }`}>
          &ldquo;{generation.prompt}&rdquo;
        </h3>

        {/* Metrics - TYPE-SAFE: All values use safe formatters */}
        <div className={`grid gap-4 mb-6 ${
          compact ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
        }`}>
          <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
            <span className="text-green-400 text-lg">⚡</span>
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">{safeNumber(generation.generation_time)}s</span>
              <span className="text-gray-400 text-xs">Generation</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
            <span className="text-blue-400 text-lg">🎧</span>
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">{generation.play_count}</span>
              <span className="text-gray-400 text-xs">Plays</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
            <span className="text-purple-400 text-lg">💾</span>
            <div className="flex flex-col">
              <span className="text-white font-medium text-sm">{safeFileSize(generation.file_size_mb)}</span>
              <span className="text-gray-400 text-xs">Size</span>
            </div>
          </div>
          
          {generation.download_count !== undefined && generation.download_count > 0 && (
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
              <span className="text-cyan-400 text-lg">⬇️</span>
              <div className="flex flex-col">
                <span className="text-white font-medium text-sm">{generation.download_count}</span>
                <span className="text-gray-400 text-xs">Downloads</span>
              </div>
            </div>
          )}
        </div>

        {/* Technical Details - TYPE-SAFE: Use safe formatters */}
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
              {safeRealtimeFactor(generation.realtime_factor)}
            </span>
          </div>
        )}

        {/* Audio Player - FIXED: Pass the normalized generation */}
        {showAudioPlayer && generation.audio_url && generation.status === 'completed' && (
          <AudioPlayer
            generation={generation} // This is now guaranteed to be the correct type
            stopAllOtherAudio={stopAllOtherAudio}
            setAudioRef={setAudioRef}
            trackPlay={trackPlay}
            downloadTrack={downloadTrack}
            toggleFavorite={toggleFavorite}
            className="mb-4"
          />
        )}

        {/* Failed Generation Message */}
        {generation.status === 'failed' && (
          <div className="bg-red-900/30 border border-red-400/30 rounded-lg p-3 mb-4">
            <div className="text-red-200 text-sm">
              ❌ This generation failed to complete. You can try generating with a similar prompt again.
            </div>
          </div>
        )}

        {/* Processing Generation Message */}
        {generation.status === 'processing' && (
          <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-lg p-3 mb-4">
            <div className="text-yellow-200 text-sm flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
              ⏳ This generation is still processing...
            </div>
          </div>
        )}

        {/* Generation timestamp - TYPE-SAFE: Use safe date formatter */}
        <div className="flex justify-between items-center text-xs text-blue-300/70 pt-4 border-t border-white/10">
          <span>Generated: {safeDate(generation.created_at).split(',')[0]}</span>
          <span>{safeDate(generation.created_at).split(',')[1] || ''}</span>
          {generation.last_played && (
            <span className="text-purple-300/70">
              Last played: {safeDate(generation.last_played).split(',')[0]}
            </span>
          )}
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-2 text-xs">
            <summary className="text-gray-400 cursor-pointer">🔍 Debug Info</summary>
            <div className="mt-2 p-2 bg-black/20 rounded text-gray-300 text-xs">
              <div><strong>Original:</strong> {JSON.stringify(rawGeneration, null, 2)}</div>
              <div><strong>Normalized:</strong> {JSON.stringify(generation, null, 2)}</div>
            </div>
          </details>
        )}
      </div>
    </motion.div>
  )
}