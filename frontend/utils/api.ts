// =============================================================================
// FIXED API LAYER - utils/api.ts
// Resolves all import errors, type issues, and data normalization problems
// =============================================================================

import { config, getApiUrl, isDebugMode } from './config'

// =============================================================================
// INLINE TYPE DEFINITIONS (FIXES IMPORT ISSUES)
// =============================================================================

interface RequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
}

export interface Generation {
  id: number
  generation_id: string
  prompt: string
  status: 'processing' | 'completed' | 'failed'
  device: string
  precision: string
  generation_time: number
  realtime_factor: number
  audio_url: string
  file_path?: string
  file_size_mb: number
  duration: number
  sample_rate: number
  play_count: number
  download_count: number
  is_favorited: boolean
  last_played?: string | null
  created_at: string
  updated_at?: string
  user_id?: number
  error_message?: string
  model_version?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

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

export interface Stats {
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
  total_file_size_mb?: number
  avg_file_size_mb?: number
  most_used_device?: string
  most_used_precision?: string
  peak_generation_hour?: number
  busiest_day?: string
  avg_downloads_per_generation?: number
  most_popular_genre?: string
  avg_track_duration?: number
  success_rate_by_device?: Record<string, number>
  generation_trends?: Array<{ date: string; count: number }>
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical' | 'error'
  timestamp: string
  version: string
  health_score?: number
  components: {
    model?: { status: string; device?: string }
    database?: { status: string; error?: string }
    audio_storage?: { status: string; path: string; writable: boolean }
    system?: { cpu_percent: number; memory_percent: number; disk_percent: number }
    gpu?: { available: boolean; device_count: number; current_device?: number }
  }
}

// =============================================================================
// DATA NORMALIZATION FUNCTIONS (FIXES INCONSISTENT DATA)
// =============================================================================

/**
 * Normalize generation data to ensure consistent structure
 */
export const normalizeGeneration = (data: any): Generation => {
  // Handle various backend data formats
  return {
    id: data.id || 0,
    generation_id: data.generation_id || data.generationId || '',
    prompt: data.prompt || '',
    status: data.status || 'completed',
    
    // Handle device field variations
    device: data.device || data.device_used || 'Unknown',
    precision: data.precision || 'float32',
    
    // Handle timing field variations
    generation_time: data.generation_time || data.total_time || 0,
    realtime_factor: data.realtime_factor || data.realtimeFactor || 1.0,
    
    // Audio properties
    audio_url: data.audio_url || data.audioUrl || '',
    file_path: data.file_path || data.filePath,
    file_size_mb: data.file_size_mb || data.fileSizeMb || 0,
    duration: data.duration || 30,
    sample_rate: data.sample_rate || data.sampleRate || 32000,
    
    // User interaction data with safe defaults
    play_count: data.play_count || data.playCount || 0,
    download_count: data.download_count || data.downloadCount || 0,
    is_favorited: Boolean(data.is_favorited || data.isFavorited),
    last_played: data.last_played || data.lastPlayed || null,
    
    // Timestamps
    created_at: data.created_at || data.createdAt || new Date().toISOString(),
    updated_at: data.updated_at || data.updatedAt,
    
    // Optional fields
    user_id: data.user_id || data.userId,
    error_message: data.error_message || data.errorMessage,
    model_version: data.model_version || data.modelVersion || 'musicgen-small'
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

// =============================================================================
// ERROR HANDLING CLASSES (NO EXPORT TO AVOID REDECLARATION)
// =============================================================================

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
    
    // Ensure error is serializable
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      stack: this.stack
    }
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// =============================================================================
// HTTP CLIENT WITH RETRY LOGIC
// =============================================================================

interface RequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
}

class HttpClient {
  private defaultOptions: RequestOptions = {
    timeout: config.api?.timeout || 30000,
    retries: config.api?.retryAttempts || 3,
    retryDelay: config.api?.retryDelay || 1000,
    headers: {
      'Content-Type': 'application/json',
    }
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const finalOptions = { ...this.defaultOptions, ...options }
    const url = getApiUrl(endpoint)
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= finalOptions.retries!; attempt++) {
      try {
        if (isDebugMode() && attempt > 0) {
          console.log(`🔄 API Retry ${attempt}/${finalOptions.retries} for ${method} ${endpoint}`)
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout!)

        const requestOptions: RequestInit = {
          method,
          headers: finalOptions.headers,
          signal: controller.signal,
        }

        if (data && method !== 'GET') {
          requestOptions.body = JSON.stringify(data)
        }

        if (isDebugMode()) {
          console.log(`🔗 API Request: ${method} ${url}`)
          if (data) console.log(`📤 Request Body:`, data)
        }

        const response = await fetch(url, requestOptions)
        clearTimeout(timeoutId)

        if (!response.ok) {
          let errorData: any = {}
          
          try {
            const text = await response.text()
            if (text) {
              try {
                errorData = JSON.parse(text)
              } catch {
                errorData = { message: text }
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse error response:', parseError)
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
          }
          
          throw new ApiError(
            errorData.message || errorData.error || `HTTP ${response.status}`,
            response.status,
            errorData.code,
            errorData
          )
        }

        const contentType = response.headers.get('content-type')
        let result: T

        if (contentType && contentType.includes('application/json')) {
          result = await response.json()
        } else {
          result = await response.text() as unknown as T
        }
        
        if (isDebugMode()) {
          console.log(`✅ API Success: ${method} ${endpoint}`, result)
        }

        return result

      } catch (error) {
        lastError = error as Error
        
        if (error instanceof ApiError) {
          // Don't retry client errors (4xx)
          if (error.status && error.status >= 400 && error.status < 500) {
            throw error
          }
        }

        if (attempt < finalOptions.retries!) {
          await new Promise(resolve => setTimeout(resolve, finalOptions.retryDelay!))
        }
      }
    }

    // All retries failed
    if (lastError instanceof ApiError) {
      throw lastError
    } else if (lastError?.name === 'AbortError') {
      throw new NetworkError(`Request timeout after ${finalOptions.timeout}ms`)
    } else {
      throw new NetworkError(`Network error: ${lastError?.message || 'Unknown error'}`)
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options)
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', endpoint, data, options)
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options)
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options)
  }
}

const httpClient = new HttpClient()

// =============================================================================
// MAIN API CLASS
// =============================================================================

export class MusicGenieAPI {
  
  /**
   * Generate music with proper validation and normalization
   */
  async generateMusic(request: GenerateRequest): Promise<Generation> {
    // Ensure prompt is a string and trim it
    const prompt = (request.prompt ?? '').trim();
    console.log('Received prompt:', prompt, 'Length:', prompt.length); // Debug log
    if (!prompt || prompt.length < 3) {
      throw new ValidationError('Prompt must be at least 3 characters long', 'prompt');
    }
    
    if (request.duration && (request.duration <= 0 || request.duration > 120)) {
      throw new ValidationError('Duration must be between 0 and 120 seconds', 'duration');
    }
  
    const response = await httpClient.post<ApiResponse<Generation>>('/generate', {
      prompt,
      duration: request.duration || 30,
      device: request.device || 'auto',
      precision: request.precision || 'float32'
    }, {
      timeout: 120000
    });
  
    if (!response.success) {
      throw new ApiError(response.error || 'Generation failed');
    }
  
    const normalizedGeneration = normalizeGeneration(response.data || response);
    const validation = validateGeneration(normalizedGeneration);
    if (!validation.valid) {
      console.warn('🔍 Generation data validation issues:', validation.issues);
    }
  
    if (isDebugMode()) {
      console.log('🎼 Generated music:', normalizedGeneration);
    }
  
    return normalizedGeneration;
  }

  /**
   * Get recent generations with consistent data structure
   */
  async fetchRecentGenerations(limit: number = 20): Promise<Generation[]> {
    const response = await httpClient.get<ApiResponse<Generation[]>>(
      `/recent?limit=${Math.min(limit, 1000)}`
    )

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to fetch recent generations')
    }

    const generations = (response.data || []).map(normalizeGeneration)
    
    if (isDebugMode()) {
      console.log(`📚 Fetched ${generations.length} recent generations`)
      
      // Log any data issues
      generations.forEach((gen, index) => {
        const validation = validateGeneration(gen)
        if (!validation.valid) {
          console.warn(`🔍 Generation ${index} validation issues:`, validation.issues)
        }
      })
    }

    return generations
  }

  /**
   * Get most played generations
   */
  async fetchMostPlayed(limit: number = 10): Promise<Generation[]> {
    const response = await httpClient.get<ApiResponse<Generation[]>>(
      `/most-played?limit=${limit}`
    )

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to fetch most played')
    }

    return (response.data || []).map(normalizeGeneration)
  }

  /**
   * Search generations
   */
  async searchGenerations(query: string, limit: number = 50): Promise<Generation[]> {
    if (!query.trim()) {
      throw new ValidationError('Search query cannot be empty', 'query')
    }

    const response = await httpClient.get<ApiResponse<Generation[]>>(
      `/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`
    )

    if (!response.success) {
      throw new ApiError(response.error || 'Search failed')
    }

    return (response.data || []).map(normalizeGeneration)
  }

  /**
   * Get user favorites
   */
  async fetchFavorites(limit: number = 50): Promise<Generation[]> {
    const response = await httpClient.get<ApiResponse<Generation[]>>(
      `/favorites?limit=${limit}`
    )

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to fetch favorites')
    }

    return (response.data || []).map(normalizeGeneration)
  }

  /**
   * Track play with proper validation
   */
  async trackPlay(generationId: string, playDuration?: number): Promise<void> {
    if (!generationId) {
      throw new ValidationError('Generation ID is required', 'generationId')
    }

    const request: PlayTrackRequest = { generation_id: generationId }
    if (playDuration !== undefined && playDuration > 0) {
      request.play_duration = playDuration
    }

    const response = await httpClient.post<ApiResponse>('/track-play', request)

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to track play')
    }

    if (isDebugMode()) {
      console.log(`🎧 Play tracked: ${generationId}${playDuration ? ` (${playDuration.toFixed(1)}s)` : ''}`)
    }
  }

  /**
   * Toggle favorite with proper response handling
   */
  async toggleFavorite(generationId: string): Promise<boolean> {
    if (!generationId) {
      throw new ValidationError('Generation ID is required', 'generationId')
    }

    const request: FavoriteRequest = { generation_id: generationId }
    const response = await httpClient.post<ApiResponse<{ is_favorited: boolean }>>(
      '/favorite', 
      request
    )

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to toggle favorite')
    }

    const isFavorited = response.data?.is_favorited ?? false

    if (isDebugMode()) {
      console.log(`❤️ Favorite ${isFavorited ? 'added' : 'removed'}: ${generationId}`)
    }

    return isFavorited
  }

  /**
   * Download track with proper error handling
   */
  async downloadTrack(generationId: string, prompt: string): Promise<void> {
    if (!generationId) {
      throw new ValidationError('Generation ID is required', 'generationId')
    }

    try {
      const url = getApiUrl(`/download/${generationId}`)
      const response = await fetch(url, { method: 'POST' })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `Download failed with status ${response.status}` 
        }))
        throw new ApiError(errorData.error || 'Download failed', response.status)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${prompt.slice(0, 50).replace(/[^a-zA-Z0-9\s-_]/g, '')}.wav`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)

      if (isDebugMode()) {
        console.log(`💾 Downloaded: ${generationId}`)
      }

    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get generation statistics
   */
  async fetchStats(days: number = 7): Promise<Stats> {
    const response = await httpClient.get<ApiResponse<Stats>>(
      `/stats?days=${Math.max(1, Math.min(days, 365))}`
    )

    if (!response.success) {
      throw new ApiError(response.error || 'Failed to fetch statistics')
    }

    return response.data!
  }

  /**
   * Get system health status
   */
  async fetchSystemHealth(): Promise<SystemHealth> {
    const response = await httpClient.get<SystemHealth>('/health')
    return response
  }

  /**
   * Get model status
   */
  async fetchModelStatus(): Promise<{
    loaded: boolean
    device?: string
    gpu_available: boolean
    mps_available: boolean
    model_type?: string
  }> {
    const response = await httpClient.get<{
      loaded: boolean
      device?: string
      gpu_available: boolean
      mps_available: boolean
      model_type?: string
    }>('/model/status')
    return response
  }

  /**
   * Reload model
   */
  async reloadModel(): Promise<{ success: boolean; message?: string; device?: string }> {
    const response = await httpClient.post<{ 
      success: boolean 
      message?: string 
      device?: string 
    }>('/model/reload')
    
    return response
  }
}

// =============================================================================
// SINGLETON API INSTANCE
// =============================================================================

export const api = new MusicGenieAPI()

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if error is a network connectivity issue
 */
export const isNetworkError = (error: Error): boolean => {
  return error instanceof NetworkError || 
         error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('timeout')
}

/**
 * Check if error is a validation issue
 */
export const isValidationError = (error: Error): boolean => {
  return error instanceof ValidationError
}

/**
 * Check if error is an API server error
 */
export const isServerError = (error: Error): boolean => {
  return error instanceof ApiError && 
         error.status !== undefined && 
         error.status >= 500
}

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: Error): string => {
  if (error instanceof ValidationError) {
    return error.message
  }
  
  if (error instanceof NetworkError) {
    return 'Network connection error. Please check your internet connection and try again.'
  }
  
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return 'The requested resource was not found.'
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (error.status && error.status >= 500) {
      return 'Server error. Please try again later.'
    }
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        break
      }
      
      // Don't retry validation errors or 4xx errors
      if (error instanceof ValidationError) {
        throw error
      }
      
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// =============================================================================
// EXPORTS (EXPORT INDIVIDUAL FUNCTIONS INSTEAD OF CLASSES)
// =============================================================================

export default api


// Export error checking functions
export const isApiError = (error: Error): error is ApiError => {
  return error instanceof ApiError
}

export const createApiError = (message: string, status?: number, code?: string, details?: any): ApiError => {
  return new ApiError(message, status, code, details)
}

export const createNetworkError = (message: string): NetworkError => {
  return new NetworkError(message)
}

export const createValidationError = (message: string, field?: string): ValidationError => {
  return new ValidationError(message, field)
}