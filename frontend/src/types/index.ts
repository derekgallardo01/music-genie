// =============================================================================
// CRITICAL FIX #5: Standardized Frontend Types
// File: types/index.ts - COMPLETELY REWRITTEN FOR CONSISTENCY
// =============================================================================

/**
 * FIXED: Consistent type definitions matching backend API
 * NO MORE inconsistent field names or missing properties
 */

// =============================================================================
// CORE GENERATION TYPES - STANDARDIZED
// =============================================================================

export interface Generation {
  // Primary identification
  id: number
  generation_id: string
  prompt: string
  status: 'processing' | 'completed' | 'failed'

  // FIXED: Consistent field names (matching backend exactly)
  device: string                    // NO MORE device_used
  precision: string
  generation_time: number           // NO MORE total_time
  realtime_factor: number

  // Audio file properties
  audio_url: string
  file_path?: string
  file_size_mb: number              // Always a number, never undefined
  duration: number
  sample_rate: number

  // User interaction data (always present with defaults)
  play_count: number
  download_count: number
  is_favorited: boolean
  last_played?: string | null

  // Timestamps
  created_at: string
  updated_at?: string

  // Optional fields
  user_id?: number
  error_message?: string
  model_version?: string
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface GenerationResponse extends ApiResponse<Generation> {
  // Specific fields for generation endpoint
  generation_id: string
  audio_url: string
}

export interface RecentGenerationsResponse extends ApiResponse<Generation[]> {
  // Additional metadata for recent generations
  total_count?: number
  limit?: number
}

export interface StatsResponse extends ApiResponse<Stats> {
  period_days?: number
}

// =============================================================================
// STATISTICS AND ANALYTICS TYPES
// =============================================================================

export interface Stats {
  // Time period
  period_days: number
  calculated_at: string

  // Generation counts
  total_generations: number
  successful_generations: number
  failed_generations: number
  success_rate: number

  // Performance metrics
  avg_generation_time: number
  avg_realtime_factor: number
  total_file_size_mb: number
  avg_file_size_mb: number

  // User engagement
  total_plays: number
  total_downloads: number
  total_favorites: number

  // Device breakdown
  device_breakdown: Record<string, {
    count: number
    avg_time: number
  }>

  // Recent activity
  recent_24h_generations: number
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'error'
  timestamp: string
  version: string
  health_score?: number
  components: {
    model?: {
      status: string
      device?: string
    }
    database?: {
      status: string
      error?: string
    }
    audio_storage?: {
      status: string
      path: string
      writable: boolean
    }
    system?: {
      cpu_percent: number
      memory_percent: number
      disk_percent: number
    }
    gpu?: {
      available: boolean
      device_count: number
      current_device?: number
    }
  }
}

// =============================================================================
// REQUEST TYPES
// =============================================================================

export interface GenerateRequest {
  prompt: string
  duration?: number
  device?: string
  precision?: string
}

export interface PlayTrackRequest {
  generation_id: string
  play_duration?: number
}

export interface FavoriteRequest {
  generation_id: string
}

export interface SearchRequest {
  q: string
  limit?: number
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface UIState {
  activeTab: 'generate' | 'history' | 'popular' | 'stats'
  loading: boolean
  error: string | null
}

export interface GenerationState {
  isGenerating: boolean
  currentGeneration: Generation | null
  recentGenerations: Generation[]
  favorites: Generation[]
  mostPlayed: Generation[]
  searchResults: Generation[]
  searchQuery: string
}

export interface AudioState {
  currentlyPlaying: string | null
  audioRefs: Record<string, HTMLAudioElement>
  volume: number
  muted: boolean
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface GenerateFormData {
  prompt: string
  duration: number
  device: string
  precision: string
}

export interface GenerateFormErrors {
  prompt?: string
  duration?: string
  device?: string
  precision?: string
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

export interface GenerationCardProps {
  generation: Generation
  onPlay: (generationId: string, playDuration?: number) => void
  onDownload: (generationId: string, prompt: string) => void
  onToggleFavorite: (generationId: string) => void
  onAudioRef: (generationId: string, ref: HTMLAudioElement | null) => void
  stopAllOtherAudio: (currentGenerationId: string) => void
  showDetailedInfo?: boolean
  compact?: boolean
}

export interface AudioPlayerProps {
  generation: Generation
  onPlay: (generationId: string, playDuration?: number) => void
  onAudioRef: (generationId: string, ref: HTMLAudioElement | null) => void
  stopAllOtherAudio: (currentGenerationId: string) => void
  autoPlay?: boolean
}

export interface TabProps {
  stopAllOtherAudio: (currentGenerationId: string) => void
  setAudioRef: (generationId: string, ref: HTMLAudioElement | null) => void
  trackPlay: (generationId: string, playDuration?: number) => void
  downloadTrack: (generationId: string, prompt: string) => void
  toggleFavorite: (generationId: string) => void
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
  value?: any
}

export interface AppError {
  type: 'api' | 'validation' | 'network' | 'system'
  message: string
  code?: string
  details?: any
  timestamp: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Status types
export type GenerationStatus = 'processing' | 'completed' | 'failed'
export type SystemStatus = 'healthy' | 'warning' | 'critical' | 'error'
export type DeviceType = 'CPU' | 'CUDA' | 'MPS'
export type PrecisionType = 'float32' | 'float16' | 'int8'

// =============================================================================
// CONSTANTS
// =============================================================================

export const API_ENDPOINTS = {
  GENERATE: '/generate',
  RECENT: '/recent',
  MOST_PLAYED: '/most-played',
  SEARCH: '/search',
  STATS: '/stats',
  FAVORITES: '/favorites',
  TRACK_PLAY: '/track-play',
  DOWNLOAD: '/download',
  FAVORITE: '/favorite',
  HEALTH: '/health',
  MODEL_STATUS: '/model/status',
  MODEL_RELOAD: '/model/reload',
} as const

export const DEFAULT_LIMITS = {
  RECENT_GENERATIONS: 50,
  MOST_PLAYED: 10,
  SEARCH_RESULTS: 50,
  STATS_DAYS: 7,
  FAVORITES: 50,
} as const

export const AUDIO_FORMATS = ['wav', 'mp3', 'ogg'] as const
export const DEVICES = ['auto', 'CPU', 'CUDA', 'MPS'] as const
export const PRECISIONS = ['float32', 'float16', 'int8'] as const

export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  processing: 'Processing...',
  completed: 'Completed',
  failed: 'Failed'
}

export const DEVICE_LABELS: Record<string, string> = {
  'CPU': '💻 CPU',
  'CUDA': '🚀 GPU (CUDA)',
  'MPS': '🍎 Apple Silicon',
  'auto': '🔄 Auto-detect'
}

// =============================================================================
// TYPE GUARDS AND VALIDATION
// =============================================================================

export const isGeneration = (obj: any): obj is Generation => {
  return obj && 
         typeof obj.generation_id === 'string' && 
         typeof obj.prompt === 'string' &&
         typeof obj.device === 'string' &&
         typeof obj.generation_time === 'number' &&
         typeof obj.file_size_mb === 'number'
}

export const isApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
  return obj && typeof obj.success === 'boolean'
}

export const isStats = (obj: any): obj is Stats => {
  return obj && 
         typeof obj.total_generations === 'number' &&
         typeof obj.successful_generations === 'number' &&
         typeof obj.avg_generation_time === 'number'
}

export const isApiError = (obj: any): obj is ApiError => {
  return obj && 
         typeof obj.code === 'string' && 
         typeof obj.message === 'string'
}

export const isSystemHealth = (obj: any): obj is SystemHealth => {
  return obj && 
         typeof obj.status === 'string' &&
         typeof obj.timestamp === 'string' &&
         obj.components && typeof obj.components === 'object'
}

// =============================================================================
// UTILITY FUNCTIONS FOR TYPE CONVERSION
// =============================================================================

/**
 * Convert API response to Generation with proper defaults
 */
export const normalizeGeneration = (data: any): Generation => {
  return {
    id: data.id || 0,
    generation_id: data.generation_id || '',
    prompt: data.prompt || '',
    status: data.status || 'completed',
    
    // FIXED: Use consistent field names
    device: data.device || 'Unknown',
    precision: data.precision || 'float32',
    generation_time: data.generation_time || 0,
    realtime_factor: data.realtime_factor || 1.0,
    
    // Audio properties
    audio_url: data.audio_url || '',
    file_path: data.file_path,
    file_size_mb: data.file_size_mb || 0,
    duration: data.duration || 30,
    sample_rate: data.sample_rate || 32000,
    
    // User interaction (always present)
    play_count: data.play_count || 0,
    download_count: data.download_count || 0,
    is_favorited: data.is_favorited || false,
    last_played: data.last_played || null,
    
    // Timestamps
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at,
    
    // Optional fields
    user_id: data.user_id,
    error_message: data.error_message,
    model_version: data.model_version || 'musicgen-small'
  }
}

/**
 * Validate generation data completeness
 */
export const validateGeneration = (generation: Generation): { valid: boolean; issues: string[] } => {
  const issues: string[] = []
  
  if (!generation.generation_id) issues.push('Missing generation_id')
  if (!generation.prompt) issues.push('Missing prompt')
  if (!generation.audio_url) issues.push('Missing audio_url')
  if (generation.file_size_mb <= 0) issues.push('Invalid file_size_mb')
  if (generation.generation_time <= 0) issues.push('Invalid generation_time')
  if (!generation.device || generation.device === 'Unknown') issues.push('Unknown device')
  
  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Format display values for UI
 */
export const getDisplayValues = (generation: Generation) => {
  return {
    fileSize: generation.file_size_mb >= 1024 
      ? `${(generation.file_size_mb / 1024).toFixed(1)}GB`
      : `${generation.file_size_mb.toFixed(1)}MB`,
    
    generationTime: `${generation.generation_time.toFixed(1)}s`,
    
    realtimeFactor: generation.realtime_factor >= 2
      ? `${generation.realtime_factor.toFixed(1)}x ⚡`
      : generation.realtime_factor >= 1
      ? `${generation.realtime_factor.toFixed(1)}x ✅`
      : generation.realtime_factor > 0
      ? `${generation.realtime_factor.toFixed(1)}x 🐌`
      : '0x ❓',
    
    device: DEVICE_LABELS[generation.device] || generation.device,
    
    statusEmoji: generation.status === 'completed' ? '✅' 
      : generation.status === 'failed' ? '❌'
      : generation.status === 'processing' ? '⏳' 
      : '❓',
    
    playCount: generation.play_count > 0 ? `${generation.play_count} plays` : 'Not played',
    downloadCount: generation.download_count > 0 ? `${generation.download_count} downloads` : 'Not downloaded'
  }
}