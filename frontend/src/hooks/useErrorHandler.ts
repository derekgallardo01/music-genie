// hooks/useErrorHandler.ts - FIXED Serialization Issues
import { useCallback } from 'react'
import { isDebugMode } from '../../utils/config'

// =============================================================================
// FIXED ERROR REPORT INTERFACE - Serializable Only
// =============================================================================

interface ErrorReport {
  // Basic error info (serializable)
  name: string
  message: string
  stack?: string
  
  // Context info (serializable)
  context: string
  timestamp: string
  userAgent: string
  url: string
  
  // Additional serializable data
  code?: string
  status?: number
  details?: any // Will be serialized safely
}

// =============================================================================
// SAFE ERROR SERIALIZATION HELPER
// =============================================================================

function serializeError(error: Error): Partial<ErrorReport> {
  try {
    // Handle ApiServiceError specifically
    if (error.name === 'ApiServiceError' && 'toJSON' in error && typeof error.toJSON === 'function') {
      return (error as any).toJSON()
    }

    // Safely extract basic error properties
    const serialized: Partial<ErrorReport> = {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
    }

    // Safely add stack if available
    if (error.stack) {
      serialized.stack = error.stack
    }

    // Safely add custom properties if they exist and are serializable
    if ('code' in error && typeof (error as any).code === 'string') {
      serialized.code = (error as any).code
    }

    if ('status' in error && typeof (error as any).status === 'number') {
      serialized.status = (error as any).status
    }

    if ('details' in error) {
      try {
        // Test if details can be serialized
        JSON.stringify((error as any).details)
        serialized.details = (error as any).details
      } catch {
        // If details can't be serialized, convert to string
        serialized.details = String((error as any).details)
      }
    }

    return serialized

  } catch (serializationError) {
    // Fallback if serialization completely fails
    return {
      name: 'SerializationError',
      message: 'Failed to serialize original error',
      details: {
        originalError: String(error),
        serializationError: String(serializationError)
      }
    }
  }
}

// =============================================================================
// ENHANCED ERROR HANDLER WITH SAFE SERIALIZATION
// =============================================================================

export function useErrorHandler() {
  const reportError = useCallback((error: Error, context?: string) => {
    try {
      // Safely serialize the error
      const serializedError = serializeError(error)
      
      const errorReport: ErrorReport = {
        ...serializedError,
        name: serializedError.name || 'Error',
        message: serializedError.message || 'Unknown error',
        context: context || 'Unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }

      // Log to console in debug mode
      if (isDebugMode()) {
        console.group('🚨 Error Report')
        console.error('Error:', errorReport)
        console.error('Original Error Object:', error)
        console.groupEnd()
      }

      // Send to error reporting service
      // Example: Sentry.captureException(error, { extra: errorReport })
      
      // Or send to your own endpoint (with proper error handling)
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // }).catch(() => {
      //   // Fail silently if error reporting fails
      // })

      return errorReport

    } catch (reportingError) {
      // If error reporting itself fails, at least log to console
      console.error('Failed to report error:', reportingError)
      console.error('Original error was:', error)
      
      return {
        name: 'ErrorReportingFailure',
        message: 'Failed to report error',
        context: context || 'Unknown',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        details: {
          reportingError: String(reportingError),
          originalError: String(error)
        }
      }
    }
  }, [])

  const handleAsyncError = useCallback((promise: Promise<any>, context?: string) => {
    return promise.catch((error) => {
      const errorReport = reportError(error, context)
      
      // Re-throw the original error so calling code can handle it
      throw error
    })
  }, [reportError])

  // Additional helper for handling unknown errors
  const handleUnknownError = useCallback((error: unknown, context?: string) => {
    let processedError: Error

    if (error instanceof Error) {
      processedError = error
    } else if (typeof error === 'string') {
      processedError = new Error(error)
    } else if (error && typeof error === 'object') {
      try {
        processedError = new Error(JSON.stringify(error))
      } catch {
        processedError = new Error('Unknown error object')
      }
    } else {
      processedError = new Error(`Unknown error: ${String(error)}`)
    }

    return reportError(processedError, context)
  }, [reportError])

  return {
    reportError,
    handleAsyncError,
    handleUnknownError
  }
}