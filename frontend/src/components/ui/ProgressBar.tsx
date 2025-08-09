'use client'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number // 0-100
  stage: string
  timer?: number
  showTimer?: boolean
  showPercentage?: boolean
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'purple' | 'orange'
  className?: string
}

export default function ProgressBar({
  progress,
  stage,
  timer,
  showTimer = false,
  showPercentage = true,
  animated = true,
  size = 'md',
  color = 'blue',
  className = '',
}: ProgressBarProps) {
  
  const formatTime = (seconds: number): string => {
    return `${seconds.toFixed(1)}s`
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2 text-sm'
      case 'lg':
        return 'h-4 text-lg'
      default:
        return 'h-3 text-base'
    }
  }

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-emerald-500'
      case 'purple':
        return 'from-purple-500 to-violet-500'
      case 'orange':
        return 'from-orange-500 to-amber-500'
      default:
        return 'from-blue-500 to-purple-500'
    }
  }

  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-black/30 rounded-lg p-4 border border-white/20 ${className}`}
    >
      {/* Header with title and timer */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-white font-medium ${getSizeClasses()}`}>
          {stage || 'Progress'}
        </span>
        {showTimer && timer !== undefined && (
          <span className={`text-blue-300 font-mono ${getSizeClasses()}`}>
            ⏱️ {formatTime(timer)}
          </span>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className={`w-full bg-white/20 rounded-full mb-2 ${getSizeClasses()}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ 
            duration: animated ? 0.5 : 0, 
            ease: "easeOut" 
          }}
          className={`bg-gradient-to-r ${getColorClasses()} ${getSizeClasses()} rounded-full relative overflow-hidden`}
        >
          {/* Animated shimmer effect */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          )}
        </motion.div>
      </div>
      
      {/* Progress indicators */}
      {showPercentage && (
        <div className="flex justify-between text-xs text-blue-200 mb-2">
          <span>0%</span>
          <span className="font-medium">{clampedProgress.toFixed(0)}%</span>
          <span>100%</span>
        </div>
      )}
      
      {/* Stage description */}
      {stage && (
        <div className="text-center">
          <span className="text-blue-300 text-sm font-medium">
            {stage}
          </span>
        </div>
      )}

      {/* Progress steps indicator */}
      {clampedProgress < 100 && (
        <div className="flex justify-center mt-2">
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-blue-400 rounded-full"
                animate={{
                  height: [6, 16, 6],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completion indicator */}
      {clampedProgress >= 100 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex justify-center mt-2"
        >
          <div className="text-green-400 text-lg">✅</div>
        </motion.div>
      )}
    </motion.div>
  )
}