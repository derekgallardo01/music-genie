// types/generation.ts - Unified and compatible type definitions

/**
 * Base Generation interface that all components should use
 * Uses flexible types that can handle both null and undefined
 */
export interface Generation {
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
    last_played?: string | null // FIXED: Allow both undefined and null
    duration?: number
  }
  
  /**
   * API Response Generation (what comes from the backend)
   * May have missing fields or null values
   */
  export interface ApiGeneration {
    id?: number
    generation_id?: string
    prompt?: string
    status?: string
    generation_time?: number
    device?: string
    precision?: string
    realtime_factor?: number
    created_at?: string
    audio_url?: string
    file_size_mb?: number
    play_count?: number
    download_count?: number
    is_favorited?: boolean
    last_played?: string | null
    duration?: number
  }
  
  /**
   * Safely normalize an API generation to a complete Generation object
   */
  export function normalizeGeneration(apiGen: ApiGeneration): Generation {
    return {
      id: apiGen.id || 0,
      generation_id: apiGen.generation_id || 'unknown',
      prompt: apiGen.prompt || 'No prompt',
      status: apiGen.status || 'unknown',
      generation_time: apiGen.generation_time || 0,
      device: apiGen.device || 'Unknown',
      precision: apiGen.precision || 'Unknown',
      realtime_factor: apiGen.realtime_factor || 0,
      created_at: apiGen.created_at || new Date().toISOString(),
      audio_url: apiGen.audio_url || '',
      file_size_mb: apiGen.file_size_mb || 0,
      play_count: apiGen.play_count || 0,
      download_count: apiGen.download_count || 0,
      is_favorited: apiGen.is_favorited || false,
      last_played: apiGen.last_played || undefined, // Convert null to undefined
      duration: apiGen.duration || undefined
    }
  }
  
  /**
   * Safely format a number with fallback
   */
  export function safeNumber(value: number | undefined | null, decimals: number = 1): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0'
    }
    return value.toFixed(decimals)
  }
  
  /**
   * Safely format a string with fallback
   */
  export function safeString(value: string | undefined | null, fallback: string = 'Unknown'): string {
    if (!value || value.trim() === '') {
      return fallback
    }
    return value.trim()
  }
  
  /**
   * Safely format a date with fallback
   */
  export function safeDate(dateString: string | undefined | null, fallback: string = 'Unknown date'): string {
    if (!dateString) {
      return fallback
    }
    
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return fallback
    }
  }
  
  /**
   * Safely format file size with unit
   */
  export function safeFileSize(mb: number | undefined | null): string {
    const safeMb = mb || 0
    if (safeMb >= 1024) {
      return `${(safeMb / 1024).toFixed(1)}GB`
    }
    return `${safeMb.toFixed(1)}MB`
  }
  
  /**
   * Get status emoji with fallback
   */
  export function getStatusEmoji(status: string | undefined | null): string {
    const safeStatus = safeString(status, 'unknown').toLowerCase()
    
    switch (safeStatus) {
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'processing':
        return '⏳'
      default:
        return '❓'
    }
  }
  
  /**
   * Get device emoji with fallback
   */
  export function getDeviceEmoji(device: string | undefined | null): string {
    const safeDevice = safeString(device, 'unknown').toLowerCase()
    
    if (safeDevice.includes('cuda') || safeDevice.includes('gpu')) {
      return '🚀'
    } else if (safeDevice.includes('cpu')) {
      return '🖥️'
    } else if (safeDevice.includes('mps')) {
      return '🍎'
    }
    
    return '❓'
  }
  
  /**
   * Format realtime factor safely
   */
  export function safeRealtimeFactor(factor: number | undefined | null): string {
    const safeFactor = factor || 0
    
    if (safeFactor >= 2) {
      return `${safeFactor.toFixed(1)}x ⚡`
    } else if (safeFactor >= 1) {
      return `${safeFactor.toFixed(1)}x ✅`
    } else if (safeFactor > 0) {
      return `${safeFactor.toFixed(1)}x 🐌`
    }
    
    return '0x ❓'
  }