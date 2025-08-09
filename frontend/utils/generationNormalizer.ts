// utils/generationNormalizer.ts - Fix missing fields in generation data

/**
 * CRITICAL FIX: Normalize generation data to ensure all required fields exist
 * This fixes issues with missing play_count, file_size, etc.
 */

export interface CompleteGeneration {
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
  
  /**
   * Normalize any generation data to ensure completeness
   */
  export function normalizeGenerationData(rawData: any): CompleteGeneration {
    // Handle both API responses and database records
    const data = rawData.data || rawData
  
    return {
      id: data.id || Date.now(),
      generation_id: data.generation_id || 'unknown',
      prompt: data.prompt || 'No prompt',
      status: data.status || 'unknown',
      generation_time: parseFloat(data.generation_time || '0'),
      device: cleanDeviceName(data.device || 'Unknown'),
      precision: cleanPrecisionName(data.precision || 'Unknown'),
      realtime_factor: parseFloat(data.realtime_factor || '0'),
      created_at: data.created_at || new Date().toISOString(),
      audio_url: data.audio_url || '',
      file_size_mb: parseFloat(data.file_size_mb || '0'),
      play_count: parseInt(data.play_count || '0'),
      download_count: parseInt(data.download_count || '0'),
      is_favorited: Boolean(data.is_favorited),
      last_played: data.last_played || null,
      duration: parseFloat(data.duration || data.audio_duration || '10')
    }
  }
  
  /**
   * Clean device names for display
   */
  function cleanDeviceName(device: string): string {
    if (!device || device === 'Unknown') return 'Unknown'
    
    const deviceStr = String(device).toLowerCase()
    
    if (deviceStr.includes('cuda') || deviceStr.includes('gpu')) {
      return 'CUDA'
    } else if (deviceStr.includes('mps')) {
      return 'MPS'
    } else if (deviceStr.includes('cpu')) {
      return 'CPU'
    }
    
    return device
  }
  
  /**
   * Clean precision names for display
   */
  function cleanPrecisionName(precision: string): string {
    if (!precision || precision === 'Unknown') return 'FP32'
    
    const precisionStr = String(precision).toLowerCase()
    
    if (precisionStr.includes('fp16') || precisionStr.includes('float16')) {
      return 'FP16'
    } else if (precisionStr.includes('fp32') || precisionStr.includes('float32')) {
      return 'FP32'
    } else if (precisionStr.includes('int8')) {
      return 'INT8'
    }
    
    return precision
  }
  
  /**
   * Safe number parsing with fallback
   */
  export function safeParseFloat(value: any, fallback: number = 0): number {
    if (value === null || value === undefined) return fallback
    const parsed = parseFloat(String(value))
    return isNaN(parsed) ? fallback : parsed
  }
  
  /**
   * Safe integer parsing with fallback
   */
  export function safeParseInt(value: any, fallback: number = 0): number {
    if (value === null || value === undefined) return fallback
    const parsed = parseInt(String(value), 10)
    return isNaN(parsed) ? fallback : parsed
  }
  
  /**
   * Format realtime factor with emoji indicator
   */
  export function formatRealtimeFactor(factor: number): string {
    if (factor >= 2) {
      return `${factor.toFixed(1)}x ⚡` // Very fast
    } else if (factor >= 1) {
      return `${factor.toFixed(1)}x ✅` // Real-time or faster
    } else if (factor > 0) {
      return `${factor.toFixed(1)}x 🐌` // Slower than real-time
    }
    return '0.0x ❓' // Unknown/error
  }
  
  /**
   * Get device emoji for display
   */
  export function getDeviceEmoji(device: string): string {
    const deviceStr = String(device).toLowerCase()
    
    if (deviceStr.includes('cuda') || deviceStr.includes('gpu')) {
      return '🚀' // GPU
    } else if (deviceStr.includes('mps')) {
      return '🍎' // Apple Silicon
    } else if (deviceStr.includes('cpu')) {
      return '🖥️' // CPU
    }
    
    return '❓' // Unknown
  }
  
  /**
   * Get status emoji for display
   */
  export function getStatusEmoji(status: string): string {
    const statusStr = String(status).toLowerCase()
    
    switch (statusStr) {
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
   * Format file size with appropriate unit
   */
  export function formatFileSize(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`
    }
    return `${mb.toFixed(1)}MB`
  }
  
  /**
   * Format duration in human readable format
   */
  export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  /**
   * Normalize API response data specifically for new generations
   */
  export function normalizeApiResponse(apiResponse: any): CompleteGeneration {
    if (!apiResponse) {
      throw new Error('API response is null or undefined')
    }
  
    // Extract numeric values from strings if needed
    const generationTime = safeParseFloat(
      String(apiResponse.generation_time || '0').replace('s', '')
    )
    
    const duration = safeParseFloat(
      String(apiResponse.duration || '10').replace(' seconds', '')
    )
  
    return {
      id: Date.now(), // Temporary ID for new generations
      generation_id: apiResponse.generation_id || 'unknown',
      prompt: apiResponse.prompt || 'No prompt',
      status: apiResponse.status || 'completed',
      generation_time: generationTime,
      device: cleanDeviceName(apiResponse.device || apiResponse.stats?.device || 'Unknown'),
      precision: cleanPrecisionName(apiResponse.precision || apiResponse.stats?.precision || 'Unknown'),
      realtime_factor: safeParseFloat(apiResponse.realtime_factor || apiResponse.stats?.realtime_factor),
      created_at: new Date().toISOString(),
      audio_url: apiResponse.audio_url || '',
      file_size_mb: safeParseFloat(apiResponse.file_size_mb || apiResponse.stats?.file_size_mb),
      play_count: 0, // New generations start with 0 plays
      download_count: 0, // New generations start with 0 downloads  
      is_favorited: false, // New generations start unfavorited
      last_played: null,
      duration: duration
    }
  }
  
  /**
   * Batch normalize multiple generation records
   */
  export function normalizeGenerationArray(data: any[]): CompleteGeneration[] {
    if (!Array.isArray(data)) {
      console.warn('normalizeGenerationArray: data is not an array', data)
      return []
    }
  
    return data.map((item, index) => {
      try {
        return normalizeGenerationData(item)
      } catch (error) {
        console.error(`Failed to normalize generation at index ${index}:`, error, item)
        // Return a fallback object instead of crashing
        return {
          id: Date.now() + index,
          generation_id: `error_${index}`,
          prompt: 'Error loading generation',
          status: 'failed',
          generation_time: 0,
          device: 'Unknown',
          precision: 'Unknown',
          realtime_factor: 0,
          created_at: new Date().toISOString(),
          audio_url: '',
          file_size_mb: 0,
          play_count: 0,
          download_count: 0,
          is_favorited: false,
          last_played: null,
          duration: 0
        }
      }
    })
  }
  
  /**
   * Check if generation data is valid
   */
  export function isValidGeneration(data: any): boolean {
    return data && 
           data.generation_id && 
           data.prompt && 
           typeof data.generation_id === 'string' &&
           typeof data.prompt === 'string'
  }
  
  /**
   * Debug log generation data (only in development)
   */
  export function debugLogGeneration(generation: CompleteGeneration, label: string = 'Generation'): void {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 ${label} Debug Info`)
      console.log('ID:', generation.generation_id)
      console.log('Prompt:', generation.prompt)
      console.log('Status:', generation.status, getStatusEmoji(generation.status))
      console.log('Device:', generation.device, getDeviceEmoji(generation.device))
      console.log('Precision:', generation.precision)
      console.log('Generation Time:', generation.generation_time + 's')
      console.log('Realtime Factor:', formatRealtimeFactor(generation.realtime_factor))
      console.log('File Size:', formatFileSize(generation.file_size_mb))
      console.log('Play Count:', generation.play_count)
      console.log('Audio URL:', generation.audio_url)
      console.groupEnd()
    }
  }