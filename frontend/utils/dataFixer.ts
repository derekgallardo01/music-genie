// utils/dataFixer.ts - CRITICAL FIX for History Tab Data Issues


export interface DatabaseGeneration {
    id: number
    generation_id: string
    prompt: string
    status: string
    created_at: string
    audio_url: string
    generation_time?: number
    device_used?: string
    device?: string
    precision?: string
    realtime_factor?: number
    file_size_mb?: number
    play_count?: number
    download_count?: number
    is_favorited?: boolean
    last_played?: string
    duration?: number
    file_path?: string
    total_time?: number
    save_time?: number
    sample_rate?: number
  }
  
  export interface NormalizedGeneration {
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
    duration: number
  }
  
  /**
   * Fix device names to be consistent and user-friendly
   */
  function normalizeDevice(device: string | undefined | null): string {
    if (!device) return 'Unknown'
    
    const deviceStr = String(device).toLowerCase().trim()
    
    if (deviceStr.includes('cuda') || deviceStr.includes('gpu')) {
      return 'CUDA'
    } else if (deviceStr.includes('mps')) {
      return 'MPS'
    } else if (deviceStr.includes('cpu')) {
      return 'CPU'
    }
    
    // Handle raw device strings like 'cuda:0'
    if (deviceStr.startsWith('cuda')) {
      return 'CUDA'
    }
    
    return device.toUpperCase()
  }
  
  /**
   * Fix precision names to be consistent
   */
  function normalizePrecision(precision: string | undefined | null): string {
    if (!precision) return 'FP32'
    
    const precisionStr = String(precision).toLowerCase().trim()
    
    if (precisionStr.includes('fp16') || precisionStr.includes('float16') || precisionStr.includes('half')) {
      return 'FP16'
    } else if (precisionStr.includes('fp32') || precisionStr.includes('float32') || precisionStr.includes('float')) {
      return 'FP32'
    } else if (precisionStr.includes('int8') || precisionStr.includes('8bit')) {
      return 'INT8'
    }
    
    return 'FP32' // Default fallback
  }
  
  /**
   * Estimate file size if missing (common issue)
   */
  function estimateFileSize(duration: number = 10, sample_rate: number = 32000): number {
    // Estimate based on typical 16-bit WAV file
    // Formula: duration * sample_rate * 2 bytes * 2 channels / (1024 * 1024)
    const estimatedBytes = duration * sample_rate * 2 * 2
    const estimatedMB = estimatedBytes / (1024 * 1024)
    return Math.round(estimatedMB * 100) / 100 // Round to 2 decimal places
  }
  
  /**
   * Calculate realtime factor if missing
   */
  function calculateRealtimeFactor(generationTime: number, duration: number): number {
    if (!generationTime || !duration || generationTime <= 0) {
      return 0
    }
    return Math.round((duration / generationTime) * 100) / 100
  }
  
  /**
   * MAIN FUNCTION: Fix and normalize generation data from API/Database
   */
  export function fixGenerationData(rawData: DatabaseGeneration): NormalizedGeneration {
    // Handle undefined/null values
    const safeData = rawData || {}
    
    // Basic required fields
    const id = safeData.id || Date.now()
    const generation_id = safeData.generation_id || `unknown_${id}`
    const prompt = safeData.prompt || 'No prompt available'
    const status = safeData.status || 'unknown'
    const created_at = safeData.created_at || new Date().toISOString()
    const audio_url = safeData.audio_url || ''
    
    // Duration handling (multiple possible sources)
    const duration = safeData.duration || 10.0
    
    // Generation time (could be in different fields)
    const generation_time = safeData.generation_time || safeData.total_time || 0
    
    // Device and precision normalization
    const device = normalizeDevice(safeData.device_used || safeData.device)
    const precision = normalizePrecision(safeData.precision)
    
    // File size handling (CRITICAL FIX)
    let file_size_mb = safeData.file_size_mb || 0
    
    // If file size is 0 or missing, estimate it
    if (file_size_mb <= 0) {
      file_size_mb = estimateFileSize(duration, safeData.sample_rate || 32000)
      console.log(`📊 Estimated file size for ${generation_id}: ${file_size_mb}MB`)
    }
    
    // Realtime factor calculation
    let realtime_factor = safeData.realtime_factor || 0
    
    // If realtime factor is 0 or missing, calculate it
    if (realtime_factor <= 0 && generation_time > 0) {
      realtime_factor = calculateRealtimeFactor(generation_time, duration)
      console.log(`⚡ Calculated realtime factor for ${generation_id}: ${realtime_factor}x`)
    }
    
    // Play tracking data
    const play_count = Math.max(0, safeData.play_count || 0)
    const download_count = Math.max(0, safeData.download_count || 0)
    const is_favorited = Boolean(safeData.is_favorited)
    const last_played = safeData.last_played || null
    
    const normalized: NormalizedGeneration = {
      id,
      generation_id,
      prompt,
      status,
      generation_time: Math.max(0, generation_time),
      device,
      precision,
      realtime_factor: Math.max(0, realtime_factor),
      created_at,
      audio_url,
      file_size_mb: Math.max(0, file_size_mb),
      play_count,
      download_count,
      is_favorited,
      last_played,
      duration: Math.max(0, duration)
    }
    
    return normalized
  }
  
  /**
   * Fix an array of generation data
   */
  export function fixGenerationArray(rawArray: DatabaseGeneration[]): NormalizedGeneration[] {
    if (!Array.isArray(rawArray)) {
      console.warn('⚠️ fixGenerationArray: Input is not an array', rawArray)
      return []
    }
    
    return rawArray.map((item, index) => {
      try {
        return fixGenerationData(item)
      } catch (error) {
        console.error(`❌ Failed to fix generation data at index ${index}:`, error, item)
        
        // Return a fallback object
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
   * Debug helper to log data issues
   */
  export function debugDataIssues(data: DatabaseGeneration[], label: string = 'Data'): void {
    if (process.env.NODE_ENV !== 'development') return
    
    console.group(`🔍 ${label} Debug Analysis`)
    
    const issues = {
      missingFileSizes: data.filter(d => !d.file_size_mb || d.file_size_mb <= 0).length,
      missingDevices: data.filter(d => !d.device && !d.device_used).length,
      missingGenerationTime: data.filter(d => !d.generation_time && !d.total_time).length,
      missingRealtimeFactor: data.filter(d => !d.realtime_factor || d.realtime_factor <= 0).length,
      missingAudioUrls: data.filter(d => !d.audio_url).length,
      total: data.length
    }
    
    console.log('📊 Data Issues Found:')
    Object.entries(issues).forEach(([key, count]) => {
      if (count > 0 && key !== 'total') {
        console.log(`  ${key}: ${count}/${issues.total}`)
      }
    })
    
    if (data.length > 0) {
      console.log('📝 First item raw data:', data[0])
      console.log('✅ First item fixed data:', fixGenerationData(data[0]))
    }
    
    console.groupEnd()
  }
  
  /**
   * Validate that generation data is complete
   */
  export function validateGenerationData(generation: NormalizedGeneration): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    if (!generation.generation_id) issues.push('Missing generation_id')
    if (!generation.prompt) issues.push('Missing prompt')
    if (generation.file_size_mb <= 0) issues.push('Invalid file_size_mb')
    if (generation.generation_time <= 0) issues.push('Invalid generation_time')
    if (!generation.audio_url) issues.push('Missing audio_url')
    if (!generation.device || generation.device === 'Unknown') issues.push('Unknown device')
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
  
  /**
   * Get formatted display values for UI
   */
  export function getDisplayValues(generation: NormalizedGeneration) {
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
      
      device: generation.device,
      precision: generation.precision,
      
      statusEmoji: generation.status === 'completed' ? '✅' 
        : generation.status === 'failed' ? '❌'
        : generation.status === 'processing' ? '⏳' 
        : '❓',
      
      deviceEmoji: generation.device.includes('CUDA') ? '🚀'
        : generation.device.includes('MPS') ? '🍎'
        : generation.device.includes('CPU') ? '🖥️'
        : '❓'
    }
  }
  
  /**
   * Export for easy usage in components
   */
  export default {
    fixGenerationData,
    fixGenerationArray,
    debugDataIssues,
    validateGenerationData,
    getDisplayValues,
    normalizeDevice,
    normalizePrecision
  }