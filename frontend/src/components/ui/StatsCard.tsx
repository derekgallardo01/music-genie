'use client'
import { motion } from 'framer-motion'

interface StatsCardProps {
  icon: string
  value: string | number
  label: string
  subtext?: string
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
    label: string
  }
  gradient: string
  size?: 'sm' | 'md' | 'lg'
  clickable?: boolean
  onClick?: () => void
  loading?: boolean
  animated?: boolean
  className?: string
}

export default function StatsCard({
  icon,
  value,
  label,
  subtext,
  trend,
  gradient,
  size = 'md',
  clickable = false,
  onClick,
  loading = false,
  animated = true,
  className = '',
}: StatsCardProps) {

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-4',
          icon: 'text-2xl mb-1',
          value: 'text-xl',
          label: 'text-sm',
          subtext: 'text-xs'
        }
      case 'lg':
        return {
          container: 'p-8',
          icon: 'text-4xl mb-3',
          value: 'text-3xl',
          label: 'text-lg',
          subtext: 'text-sm'
        }
      default:
        return {
          container: 'p-6',
          icon: 'text-3xl mb-2',
          value: 'text-2xl',
          label: 'text-base',
          subtext: 'text-xs'
        }
    }
  }

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return '📈'
      case 'down':
        return '📉'
      default:
        return '➡️'
    }
  }

  const getTrendColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-blue-400'
    }
  }

  const sizeClasses = getSizeClasses()

  const CardContent = () => (
    <>
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
        </div>
      )}

      {/* Icon */}
      <div className={`${sizeClasses.icon}`}>
        {loading ? '⏳' : icon}
      </div>

      {/* Value */}
      <div className={`${sizeClasses.value} font-bold text-white mb-1`}>
        {loading ? '...' : value}
      </div>

      {/* Label */}
      <div className={`text-gray-200 ${sizeClasses.label} mb-2`}>
        {label}
      </div>

      {/* Subtext */}
      {subtext && (
        <div className={`text-gray-300/70 ${sizeClasses.subtext} mb-2`}>
          {subtext}
        </div>
      )}

      {/* Trend Indicator */}
      {trend && !loading && (
        <div className={`flex items-center gap-1 mt-2 ${sizeClasses.subtext}`}>
          <span className={getTrendColor(trend.direction)}>
            {getTrendIcon(trend.direction)}
          </span>
          <span className={getTrendColor(trend.direction)}>
            {trend.value}
          </span>
          <span className="text-gray-400">
            {trend.label}
          </span>
        </div>
      )}

      {/* Click indicator */}
      {clickable && !loading && (
        <div className="absolute top-2 right-2 text-white/30 group-hover:text-white/60 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      )}

      {/* Hover glow effect */}
      {animated && !loading && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      )}
    </>
  )

  if (clickable && onClick) {
    return (
      <motion.button
        whileHover={animated ? { scale: 1.02 } : undefined}
        whileTap={animated ? { scale: 0.98 } : undefined}
        onClick={onClick}
        disabled={loading}
        className={`
          relative bg-gradient-to-r ${gradient} rounded-lg border 
          transition-all duration-200 hover:shadow-lg group
          disabled:opacity-50 disabled:cursor-not-allowed
          text-left w-full
          ${sizeClasses.container}
          ${className}
        `}
      >
        <CardContent />
      </motion.button>
    )
  }

  return (
    <motion.div
      whileHover={animated && !loading ? { scale: 1.02 } : undefined}
      className={`
        relative bg-gradient-to-r ${gradient} rounded-lg border 
        transition-all duration-200 hover:shadow-lg group
        ${sizeClasses.container}
        ${className}
      `}
    >
      <CardContent />
    </motion.div>
  )
}