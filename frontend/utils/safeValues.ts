// utils/safeValues.ts - Utility functions for safe value handling

/**
 * Safely format a number with fallback
 */
export function safeNumber(value: number | undefined | null, decimals: number = 1, fallback: number = 0): string {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback.toFixed(decimals)
    }
    return value.toFixed(decimals)
  }
  
  /**
   * Safely get a number value with fallback
   */
  export function safeNumberValue(value: number | undefined | null, fallback: number = 0): number {
    if (value === null || value === undefined || isNaN(value)) {
      return fallback
    }
    return value
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
   * Safely format a date string
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
   * Safely format a date to just the date part
   */
  export function safeDateOnly(dateString: string | undefined | null, fallback: string = 'Unknown'): string {
    if (!dateString) {
      return fallback
    }
    
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return fallback
    }
  }
  
  /**
   * Safely format time duration
   */
  export function safeTime(seconds: number | undefined | null): string {
    const safeSeconds = safeNumberValue(seconds, 0)
    const mins = Math.floor(safeSeconds / 60)
    const secs = Math.floor(safeSeconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  /**
   * Safely get file size with unit
   */
  export function safeFileSize(mb: number | undefined | null): string {
    const safeMb = safeNumberValue(mb, 0)
    if (safeMb >= 1024) {
      return `${(safeMb / 1024).toFixed(1)}GB`
    }
    return `${safeMb.toFixed(1)}MB`
  }
  
  /**
   * Safely normalize generation data
   */
  export interface SafeGeneration {
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
    last_played: string | null
    duration?: number
  }
  
  export function safeGeneration(gen: any): SafeGeneration {
    return {
      id: gen.id || 0,
      generation_id: safeString(gen.generation_id, 'unknown'),
      prompt: safeString(gen.prompt, 'No prompt'),
      status: safeString(gen.status, 'unknown'),
      generation_time: safeNumberValue(gen.generation_time, 0),
      device: safeString(gen.device, 'Unknown'),
      precision: safeString(gen.precision, 'Unknown'),
      realtime_factor: safeNumberValue(gen.realtime_factor, 0),
      created_at: gen.created_at || new Date().toISOString(),
      audio_url: safeString(gen.audio_url, ''),
      file_size_mb: safeNumberValue(gen.file_size_mb, 0),
      play_count: safeNumberValue(gen.play_count, 0),
      download_count: safeNumberValue(gen.download_count, 0),
      is_favorited: Boolean(gen.is_favorited),
      last_played: gen.last_played || null,
      duration: gen.duration ? safeNumberValue(gen.duration, 0) : undefined
    }
  }
  
  /**
   * Safely normalize stats data
   */
  export interface SafeStats {
    total_generations: number
    successful_generations: number
    failed_generations: number
    success_rate: number
    avg_generation_time: number
    total_audio_duration: number
    total_plays: number
    total_downloads: number
    avg_plays_per_generation: number
    popular_prompts: Array<{ prompt: string; plays: number }>
    days_analyzed: number
    total_file_size_mb: number
    avg_file_size_mb: number
    most_used_device: string
    most_used_precision: string
  }
  
  export function safeStats(stats: any): SafeStats {
    return {
      total_generations: safeNumberValue(stats.total_generations, 0),
      successful_generations: safeNumberValue(stats.successful_generations, 0),
      failed_generations: safeNumberValue(stats.failed_generations, 0),
      success_rate: safeNumberValue(stats.success_rate, 0),
      avg_generation_time: safeNumberValue(stats.avg_generation_time, 0),
      total_audio_duration: safeNumberValue(stats.total_audio_duration, 0),
      total_plays: safeNumberValue(stats.total_plays, 0),
      total_downloads: safeNumberValue(stats.total_downloads, 0),
      avg_plays_per_generation: safeNumberValue(stats.avg_plays_per_generation, 0),
      popular_prompts: Array.isArray(stats.popular_prompts) ? stats.popular_prompts : [],
      days_analyzed: safeNumberValue(stats.days_analyzed, 7),
      total_file_size_mb: safeNumberValue(stats.total_file_size_mb, 0),
      avg_file_size_mb: safeNumberValue(stats.avg_file_size_mb, 0),
      most_used_device: safeString(stats.most_used_device, 'Unknown'),
      most_used_precision: safeString(stats.most_used_precision, 'Unknown')
    }
  }
  
  /**
   * Check if a value is safe to use
   */
  export function isSafeValue(value: any): boolean {
    return value !== null && value !== undefined && !isNaN(value)
  }
  
  /**
   * Batch process generations to make them safe
   */
  export function safeGenerations(generations: any[]): SafeGeneration[] {
    if (!Array.isArray(generations)) {
      return []
    }
    
    return generations.map(gen => safeGeneration(gen))
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
    const safeFactor = safeNumberValue(factor, 0)
    
    if (safeFactor >= 2) {
      return `${safeFactor.toFixed(1)}x ⚡`
    } else if (safeFactor >= 1) {
      return `${safeFactor.toFixed(1)}x ✅`
    } else if (safeFactor > 0) {
      return `${safeFactor.toFixed(1)}x 🐌`
    }
    
    return '0x ❓'
  }