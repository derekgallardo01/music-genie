// components/Tooltip.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

interface TooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  className?: string
}

const Tooltip = ({
  content,
  position = 'top',
  children,
  className = ''
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)

  // Define tooltip position styles
  const positionStyles = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  }

  // Define arrow position styles
  const arrowStyles = {
    top: 'bottom-[-4px] border-t-white/20',
    bottom: 'top-[-4px] border-b-white/20',
    left: 'right-[-4px] border-l-white/20',
    right: 'left-[-4px] border-r-white/20'
  }

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute z-10 bg-black/80 text-white text-xs font-medium
              px-3 py-1.5 rounded-lg border border-white/20
              ${positionStyles[position]} flex items-center justify-center
              whitespace-nowrap shadow-lg
            `}
          >
            {content}
            <div
              className={`
                absolute w-0 h-0 border-8 border-transparent
                ${arrowStyles[position]}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Tooltip