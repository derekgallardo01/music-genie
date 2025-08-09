'use client'
import { motion } from 'framer-motion'

export interface Tab {
  id: string
  label: string
  icon: string
  badge?: string | number
  disabled?: boolean
  tooltip?: string
}

interface TabNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
  fullWidth?: boolean
  centered?: boolean
  animated?: boolean
  showKeyboardHint?: boolean
  className?: string
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  fullWidth = false,
  centered = false,
  animated = true,
  showKeyboardHint = true,
  className = '',
}: TabNavigationProps) {

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-1',
          tab: 'px-3 py-2 text-sm',
          icon: 'text-sm',
          badge: 'text-xs px-1.5 py-0.5'
        }
      case 'lg':
        return {
          container: 'p-3',
          tab: 'px-8 py-4 text-lg',
          icon: 'text-lg',
          badge: 'text-sm px-2 py-1'
        }
      default:
        return {
          container: 'p-2',
          tab: 'px-6 py-3 text-base',
          icon: 'text-base',
          badge: 'text-xs px-2 py-0.5'
        }
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'pills':
        return {
          container: 'bg-black/20 backdrop-blur-lg rounded-2xl',
          activeTab: 'bg-blue-600 text-white shadow-lg',
          inactiveTab: 'text-blue-200 hover:text-white hover:bg-white/10'
        }
      case 'underline':
        return {
          container: 'bg-transparent border-b border-white/20',
          activeTab: 'text-white border-b-2 border-blue-400 bg-transparent',
          inactiveTab: 'text-blue-200 hover:text-white border-b-2 border-transparent hover:border-white/20'
        }
      case 'minimal':
        return {
          container: 'bg-transparent',
          activeTab: 'text-blue-400 bg-blue-400/10',
          inactiveTab: 'text-blue-200 hover:text-white hover:bg-white/5'
        }
      default:
        return {
          container: 'bg-white/10 backdrop-blur-lg rounded-2xl',
          activeTab: 'bg-blue-600 text-white shadow-lg',
          inactiveTab: 'text-blue-200 hover:text-white hover:bg-white/10'
        }
    }
  }

  const getOrientationClasses = () => {
    return orientation === 'vertical' 
      ? 'flex-col space-y-1' 
      : 'flex-row space-x-1'
  }

  const getContainerClasses = () => {
    let classes = `flex ${getOrientationClasses()}`
    
    if (fullWidth && orientation === 'horizontal') {
      classes += ' w-full'
    }
    
    if (centered) {
      classes += orientation === 'vertical' ? ' items-center' : ' justify-center'
    }
    
    return classes
  }

  const sizeClasses = getSizeClasses()
  const variantClasses = getVariantClasses()

  return (
    <div className={`tab-navigation ${className}`}>
      {/* Tab Container */}
      <div className={centered ? 'flex justify-center' : ''}>
        <div className={`${variantClasses.container} ${sizeClasses.container}`}>
          <div className={getContainerClasses()}>
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
                className={`
                  ${sizeClasses.tab} rounded-xl font-medium transition-all duration-200 
                  relative flex items-center gap-2 group
                  ${fullWidth && orientation === 'horizontal' ? 'flex-1' : ''}
                  ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${activeTab === tab.id ? variantClasses.activeTab : variantClasses.inactiveTab}
                  ${animated ? 'hover:scale-105' : ''}
                `}
                whileHover={animated && !tab.disabled ? { scale: 1.02 } : undefined}
                whileTap={animated && !tab.disabled ? { scale: 0.98 } : undefined}
                title={tab.tooltip}
              >
                {/* Tab Icon */}
                <span className={sizeClasses.icon}>
                  {tab.icon}
                </span>

                {/* Tab Label */}
                <span className={orientation === 'vertical' ? 'text-center' : ''}>
                  {tab.label}
                </span>

                {/* Badge */}
                {tab.badge && (
                  <span className={`
                    ${sizeClasses.badge} bg-red-500 text-white rounded-full 
                    font-medium min-w-[1.25rem] text-center
                    ${typeof tab.badge === 'number' && tab.badge > 99 ? 'px-1' : ''}
                  `}>
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}

                {/* Active indicator for underline variant */}
                {variant === 'underline' && activeTab === tab.id && animated && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Ripple effect */}
                {animated && !tab.disabled && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 group-active:opacity-20 transition-opacity duration-200" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Keyboard navigation hint - positioned below container */}
      {showKeyboardHint && tabs.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="flex items-center justify-center gap-2 mt-3 text-xs text-blue-300/50"
        >
          <span className="hidden sm:inline">Navigate with</span>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono shadow-sm min-w-[2rem] text-center">
              Tab
            </kbd>
            <span className="text-blue-400/60 mx-1">+</span>
            <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs font-mono shadow-sm min-w-[2rem] text-center">
              ←→
            </kbd>
          </div>
          <span className="hidden sm:inline">keys</span>
        </motion.div>
      )}
    </div>
  )
}