'use client'
import { useState, useEffect } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  showResults?: boolean
  resultsCount?: number
  totalCount?: number
  debounceMs?: number
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'bordered'
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  showResults = false,
  resultsCount,
  totalCount,
  debounceMs = 300,
  disabled = false,
  size = 'md',
  variant = 'default',
  className = '',
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(value)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue)
      }
    }, debounceMs)
    
    return () => clearTimeout(timeoutId)
  }, [internalValue, onChange, debounceMs, value])

  // Sync external value changes
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange('')
    if (onClear) {
      onClear()
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm'
      case 'lg':
        return 'px-5 py-4 text-lg'
      default:
        return 'px-4 py-3 text-base'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-transparent border-0 border-b-2 border-white/30 rounded-none focus:border-blue-400'
      case 'bordered':
        return 'bg-white/5 border-2 border-white/30 focus:border-blue-400'
      default:
        return 'bg-white/20 border border-white/30 focus:border-blue-400'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'lg':
        return 'w-6 h-6'
      default:
        return 'w-5 h-5'
    }
  }

  return (
    <div className={`search-bar ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full ${getSizeClasses()} ${getVariantClasses()}
            pl-10 pr-12 rounded-lg text-white placeholder-white/60 
            focus:outline-none focus:ring-2 focus:ring-blue-400 
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
        
        {/* Search Icon */}
        <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 ${getIconSize()}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        
        {/* Clear Button */}
        {internalValue && (
          <button
            onClick={handleClear}
            disabled={disabled}
            className={`
              absolute right-3 top-1/2 transform -translate-y-1/2 
              text-white/60 hover:text-white/80 transition-colors p-1
              disabled:opacity-50 disabled:cursor-not-allowed
              ${getIconSize()}
            `}
            title="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* Loading Indicator */}
        {disabled && internalValue && (
          <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${getIconSize()}`}>
            <div className="animate-spin rounded-full border-2 border-white/20 border-t-blue-400 w-full h-full"></div>
          </div>
        )}
      </div>

      {/* Search Results Info */}
      {showResults && internalValue && (
        <div className="mt-2 text-sm text-blue-200">
          {resultsCount !== undefined && totalCount !== undefined ? (
            resultsCount > 0 ? (
              <>Found {resultsCount} result{resultsCount !== 1 ? 's' : ''} for "{internalValue}"</>
            ) : (
              <>No results found for "{internalValue}"</>
            )
          ) : (
            <>Searching for "{internalValue}"...</>
          )}
        </div>
      )}

      {/* Search Tips */}
      {!internalValue && !disabled && (
        <div className="mt-2 text-xs text-blue-300/70">
          💡 Try searching by genre, instrument, mood, or style
        </div>
      )}
    </div>
  )
}