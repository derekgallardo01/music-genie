// components/ErrorBoundary.tsx - Main Error Boundary Component
'use client'
import React, { Component, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { isDebugMode } from '../../utils/config'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  isolate?: boolean // If true, only this component fails, not the whole app
  name?: string // For debugging/logging
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
    
    this.handleRetry = this.handleRetry.bind(this)
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error(`🚨 Error Boundary Caught Error (${this.props.name || 'Unknown'}):`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    })

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Send to error reporting service (if available)
    this.reportError(error, errorInfo)
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo) {
    // In production, you'd send this to your error reporting service
    // like Sentry, Bugsnag, or custom analytics
    
    if (isDebugMode()) {
      console.group('🔍 Error Report Details')
      console.log('Error ID:', this.state.errorId)
      console.log('Component:', this.props.name || 'Unknown')
      console.log('Error:', error)
      console.log('Component Stack:', errorInfo.componentStack)
      console.log('Timestamp:', new Date().toISOString())
      console.groupEnd()
    }

    // Example: Send to error reporting service
    // errorReportingService.captureException(error, {
    //   tags: { component: this.props.name },
    //   extra: { componentStack: errorInfo.componentStack, errorId: this.state.errorId }
    // })
  }

  private handleRetry() {
    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Add small delay to prevent rapid retries
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      })
    }, 100)
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorId, this.handleRetry)
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          componentName={this.props.name}
          onRetry={this.handleRetry}
          isolate={this.props.isolate}
        />
      )
    }

    return this.props.children
  }
}

// Default Error Fallback Component
interface DefaultErrorFallbackProps {
  error: Error
  errorId: string
  componentName?: string
  onRetry: () => void
  isolate?: boolean
}

function DefaultErrorFallback({ 
  error, 
  errorId, 
  componentName, 
  onRetry, 
  isolate = false 
}: DefaultErrorFallbackProps) {
  const handleCopyError = () => {
    const errorReport = {
      id: errorId,
      component: componentName || 'Unknown',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
    
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
    console.log('Error report copied to clipboard')
  }

  const handleReportIssue = () => {
    // Open GitHub issues or support email
    const subject = encodeURIComponent(`Bug Report: ${error.message}`)
    const body = encodeURIComponent(`
Error ID: ${errorId}
Component: ${componentName || 'Unknown'}
Error: ${error.message}

Please describe what you were doing when this error occurred.
    `)
    
    window.open(`mailto:support@musicgenie.com?subject=${subject}&body=${body}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-red-900/20 border border-red-400/30 rounded-lg p-6 m-4"
    >
      <div className="flex items-start gap-4">
        <div className="text-red-400 text-2xl">⚠️</div>
        
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-red-300 text-lg font-semibold mb-2">
              {isolate ? 'Component Error' : 'Something went wrong'}
            </h3>
            <p className="text-red-200 text-sm">
              {isolate 
                ? `The ${componentName || 'component'} encountered an error and couldn't load properly.`
                : 'An unexpected error occurred. Don\'t worry, your data is safe.'
              }
            </p>
          </div>

          {/* Error Details (only in debug mode) */}
          {isDebugMode() && (
            <details className="bg-red-900/30 rounded p-3">
              <summary className="text-red-300 text-sm cursor-pointer mb-2">
                🔍 Error Details (Debug Mode)
              </summary>
              <div className="text-red-200 text-xs font-mono space-y-1">
                <div><strong>ID:</strong> {errorId}</div>
                <div><strong>Component:</strong> {componentName || 'Unknown'}</div>
                <div><strong>Message:</strong> {error.message}</div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 overflow-auto text-xs">{error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
            >
              🔄 Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-all duration-200"
            >
              🔃 Reload Page
            </button>
            
            {isDebugMode() && (
              <>
                <button
                  onClick={handleCopyError}
                  className="px-4 py-2 bg-blue-600/60 hover:bg-blue-600/80 text-white rounded-lg text-sm font-medium transition-all duration-200"
                >
                  📋 Copy Error
                </button>
                
                <button
                  onClick={handleReportIssue}
                  className="px-4 py-2 bg-purple-600/60 hover:bg-purple-600/80 text-white rounded-lg text-sm font-medium transition-all duration-200"
                >
                  🐛 Report Issue
                </button>
              </>
            )}
          </div>

          {/* Recovery Instructions */}
          <div className="text-red-200/80 text-xs space-y-1">
            <p>💡 <strong>What you can try:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• Click "Try Again" to retry the operation</li>
              <li>• Refresh the page to start over</li>
              <li>• Check your internet connection</li>
              {!isolate && <li>• Try a different browser or clear your cache</li>}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ErrorBoundary

// Specialized Error Boundaries for different use cases

// Audio-specific error boundary
export function AudioErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      name="AudioComponent"
      isolate={true}
      fallback={(error, errorId, retry) => (
        <div className="bg-orange-900/20 border border-orange-400/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-orange-400 text-lg">🎵</span>
            <div>
              <h4 className="text-orange-300 font-medium">Audio Player Error</h4>
              <p className="text-orange-200 text-sm">
                The audio player encountered an issue. This might be due to browser audio restrictions.
              </p>
              <button
                onClick={retry}
                className="mt-2 px-3 py-1 bg-orange-600/60 hover:bg-orange-600/80 text-white rounded text-sm"
              >
                🔄 Retry Audio
              </button>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('🎵 Audio Error:', {
          error: error.message,
          userAgent: navigator.userAgent,
          audioContext: typeof AudioContext !== 'undefined'
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Generation-specific error boundary
export function GenerationErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      name="GenerationComponent"
      isolate={true}
      fallback={(error, errorId, retry) => (
        <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-blue-400 text-lg">🎼</span>
            <div>
              <h4 className="text-blue-300 font-medium">Generation Error</h4>
              <p className="text-blue-200 text-sm">
                There was an issue with music generation. Please try again.
              </p>
              <button
                onClick={retry}
                className="mt-2 px-3 py-1 bg-blue-600/60 hover:bg-blue-600/80 text-white rounded text-sm"
              >
                🔄 Retry Generation
              </button>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('🎼 Generation Error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Stats/Charts error boundary
export function ChartErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      name="ChartComponent"
      isolate={true}
      fallback={(error, errorId, retry) => (
        <div className="bg-purple-900/20 border border-purple-400/30 rounded-lg p-4 text-center">
          <div className="text-purple-400 text-2xl mb-2">📊</div>
          <h4 className="text-purple-300 font-medium mb-1">Chart Loading Error</h4>
          <p className="text-purple-200 text-sm mb-3">
            Unable to display this chart right now.
          </p>
          <button
            onClick={retry}
            className="px-3 py-1 bg-purple-600/60 hover:bg-purple-600/80 text-white rounded text-sm"
          >
            🔄 Reload Chart
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}