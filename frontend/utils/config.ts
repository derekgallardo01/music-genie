// =============================================================================
// CRITICAL FIX: Unified Frontend Configuration System
// File: utils/config.ts - COMPLETELY REWRITTEN
// =============================================================================

/**
 * UNIFIED Environment configuration for Music Genie
 * Fixes configuration inconsistencies and provides single source of truth
 */

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

const getEnvironment = (): 'development' | 'production' | 'staging' | 'test' => {
  // Check multiple possible environment indicators
  const nodeEnv = process.env.NODE_ENV?.toLowerCase()
  const customEnv = process.env.NEXT_PUBLIC_ENVIRONMENT?.toLowerCase()
  const vercelEnv = process.env.VERCEL_ENV?.toLowerCase()
  
  // Priority order: custom env > vercel env > node env
  const env = customEnv || vercelEnv || nodeEnv || 'development'
  
  switch (env) {
    case 'production':
    case 'prod':
      return 'production'
    case 'staging':
    case 'stage':
    case 'preview':
      return 'staging'
    case 'test':
    case 'testing':
      return 'test'
    default:
      return 'development'
  }
}

// =============================================================================
// API URL CONFIGURATION - FIXES HARDCODED URLs
// =============================================================================

const getApiUrlInternal = (): string => {
  // Try multiple environment variable names for flexibility
  const apiUrl = 
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.REACT_APP_API_URL // For compatibility

  if (apiUrl) {
    // Validate URL format
    try {
      const url = new URL(apiUrl)
      // Remove trailing slash for consistency
      return url.origin + (url.pathname !== '/' ? url.pathname : '').replace(/\/$/, '')
    } catch (error) {
      console.warn('⚠️ Invalid API URL in environment variables:', apiUrl)
    }
  }

  // Environment-specific defaults
  const env = getEnvironment()
  const defaults = {
    development: 'http://localhost:8000',
    staging: 'https://staging-api.musicgenie.com',
    production: 'https://api.musicgenie.com',
    test: 'http://localhost:8001'
  }

  const defaultUrl = defaults[env]
  console.log(`🔗 Using ${env} API URL: ${defaultUrl}`)
  
  return defaultUrl
}

// =============================================================================
// FEATURE FLAGS - ENVIRONMENT AWARE
// =============================================================================

interface FeatureFlags {
  analytics: boolean
  realTimeProcessing: boolean
  advancedMixer: boolean
  debugMode: boolean
  errorReporting: boolean
  performanceMonitoring: boolean
  rateLimitWarnings: boolean
  offlineSupport: boolean
}

const getFeatureFlags = (): FeatureFlags => {
  const env = getEnvironment()
  
  return {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'false',
    realTimeProcessing: process.env.NEXT_PUBLIC_REAL_TIME === 'true' || env === 'production',
    advancedMixer: process.env.NEXT_PUBLIC_ADVANCED_MIXER !== 'false',
    debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true' || env === 'development',
    errorReporting: process.env.NEXT_PUBLIC_ERROR_REPORTING !== 'false' && env !== 'development',
    performanceMonitoring: process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING === 'true',
    rateLimitWarnings: process.env.NEXT_PUBLIC_RATE_LIMIT_WARNINGS !== 'false',
    offlineSupport: process.env.NEXT_PUBLIC_OFFLINE_SUPPORT === 'true'
  }
}

// =============================================================================
// AUDIO CONFIGURATION
// =============================================================================

interface AudioConfig {
  maxFileSizeMB: number
  supportedFormats: string[]
  defaultSampleRate: number
  streamingEnabled: boolean
  compressionLevel: number
  maxDurationSeconds: number
}

const getAudioConfig = (): AudioConfig => {
  const env = getEnvironment()
  
  // Environment-specific limits
  const limits = {
    development: { maxFileSizeMB: 200, maxDuration: 60 },
    staging: { maxFileSizeMB: 150, maxDuration: 45 },
    production: { maxFileSizeMB: 100, maxDuration: 30 },
    test: { maxFileSizeMB: 50, maxDuration: 15 }
  }
  
  const envLimits = limits[env]
  
  return {
    maxFileSizeMB: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '') || envLimits.maxFileSizeMB,
    supportedFormats: process.env.NEXT_PUBLIC_SUPPORTED_FORMATS?.split(',') || ['wav', 'mp3'],
    defaultSampleRate: parseInt(process.env.NEXT_PUBLIC_DEFAULT_SAMPLE_RATE || '') || 32000,
    streamingEnabled: process.env.NEXT_PUBLIC_STREAMING === 'true' || env === 'production',
    compressionLevel: parseInt(process.env.NEXT_PUBLIC_COMPRESSION_LEVEL || '') || 6,
    maxDurationSeconds: parseInt(process.env.NEXT_PUBLIC_MAX_DURATION || '') || envLimits.maxDuration
  }
}

// =============================================================================
// UI CONFIGURATION
// =============================================================================

interface UIConfig {
  maxRecentTracks: number
  defaultPageSize: number
  animationsEnabled: boolean
  theme: 'dark' | 'light' | 'auto'
  compactMode: boolean
  autoRefreshInterval: number
  showAdvancedControls: boolean
}

const getUIConfig = (): UIConfig => {
  const env = getEnvironment()
  
  return {
    maxRecentTracks: parseInt(process.env.NEXT_PUBLIC_MAX_RECENT_TRACKS || '') || 
      (env === 'development' ? 100 : 50),
    defaultPageSize: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '') || 20,
    animationsEnabled: process.env.NEXT_PUBLIC_ANIMATIONS_ENABLED !== 'false',
    theme: (process.env.NEXT_PUBLIC_THEME as 'dark' | 'light' | 'auto') || 'dark',
    compactMode: process.env.NEXT_PUBLIC_COMPACT_MODE === 'true',
    autoRefreshInterval: parseInt(process.env.NEXT_PUBLIC_AUTO_REFRESH || '') || 
      (env === 'development' ? 10000 : 30000),
    showAdvancedControls: process.env.NEXT_PUBLIC_ADVANCED_CONTROLS !== 'false'
  }
}

// =============================================================================
// API CONFIGURATION
// =============================================================================

interface ApiConfig {
  timeout: number
  retryAttempts: number
  retryDelay: number
  rateLimitBuffer: number
  batchSize: number
}

const getApiConfig = (): ApiConfig => {
  const env = getEnvironment()
  
  const timeouts = {
    development: 60000,  // 1 minute for development
    staging: 45000,      // 45 seconds for staging
    production: 30000,   // 30 seconds for production
    test: 10000         // 10 seconds for testing
  }
  
  return {
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '') || timeouts[env],
    retryAttempts: parseInt(process.env.NEXT_PUBLIC_RETRY_ATTEMPTS || '') || 3,
    retryDelay: parseInt(process.env.NEXT_PUBLIC_RETRY_DELAY || '') || 1000,
    rateLimitBuffer: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_BUFFER || '') || 0.8, // 80% of rate limit
    batchSize: parseInt(process.env.NEXT_PUBLIC_BATCH_SIZE || '') || 10
  }
}

// =============================================================================
// MAIN CONFIGURATION INTERFACE
// =============================================================================

export interface AppConfig {
  environment: 'development' | 'production' | 'staging' | 'test'
  apiUrl: string
  features: FeatureFlags
  audio: AudioConfig
  ui: UIConfig
  api: ApiConfig
  version: string
  buildTime: string
}

// =============================================================================
// CONFIGURATION FACTORY - SINGLE SOURCE OF TRUTH
// =============================================================================

const createConfig = (): AppConfig => {
  const environment = getEnvironment()
  
  return {
    environment,
    apiUrl: getApiUrlInternal(),
    features: getFeatureFlags(),
    audio: getAudioConfig(),
    ui: getUIConfig(),
    api: getApiConfig(),
    version: process.env.NEXT_PUBLIC_VERSION || '2.1.0',
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString()
  }
}

// =============================================================================
// SINGLETON CONFIGURATION INSTANCE
// =============================================================================

// Create singleton configuration instance
export const config = createConfig()

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get full API URL for an endpoint
 */
const getApiUrl = (endpoint: string = ''): string => {
  const baseUrl = config.apiUrl
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl
}

/**
 * Check if debug mode is enabled
 */
const isDebugMode = (): boolean => {
  return config.features.debugMode
}

/**
 * Check if we're in production environment
 */
const isProduction = (): boolean => {
  return config.environment === 'production'
}

/**
 * Check if we're in development environment
 */
const isDevelopment = (): boolean => {
  return config.environment === 'development'
}

/**
 * Get environment-specific configuration
 */
const getEnvironmentConfig = () => {
  return {
    environment: config.environment,
    debugMode: config.features.debugMode,
    apiUrl: config.apiUrl,
    version: config.version
  }
}

/**
 * Validate configuration on startup
 */
const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  // Validate API URL
  try {
    new URL(config.apiUrl)
  } catch {
    errors.push(`Invalid API URL: ${config.apiUrl}`)
  }
  
  // Validate numeric configs
  if (config.api.timeout <= 0) {
    errors.push('API timeout must be positive')
  }
  
  if (config.ui.maxRecentTracks <= 0) {
    errors.push('Max recent tracks must be positive')
  }
  
  if (config.audio.maxFileSizeMB <= 0) {
    errors.push('Max file size must be positive')
  }
  
  // Validate arrays
  if (!Array.isArray(config.audio.supportedFormats) || config.audio.supportedFormats.length === 0) {
    errors.push('Supported formats must be a non-empty array')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// =============================================================================
// CONFIGURATION LOGGING (DEBUG MODE ONLY)
// =============================================================================

if (isDebugMode()) {
  console.group('🔧 Music Genie Configuration')
  console.log('Environment:', config.environment)
  console.log('API URL:', config.apiUrl)
  console.log('Version:', config.version)
  console.log('Features:', config.features)
  console.log('Build Time:', config.buildTime)
  console.groupEnd()
  
  // Validate configuration
  const validation = validateConfig()
  if (!validation.valid) {
    console.group('⚠️ Configuration Errors')
    validation.errors.forEach(error => console.error(error))
    console.groupEnd()
  } else {
    console.log('✅ Configuration is valid')
  }
}

// =============================================================================
// EXPORTS - MAKE SURE ALL ARE EXPORTED
// =============================================================================

export default config

// Named exports for convenience
export {
  getApiUrl,
  isDebugMode,
  isDevelopment,
  isProduction,
  getEnvironmentConfig,
  validateConfig
}