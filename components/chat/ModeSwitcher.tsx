'use client'

import React from 'react'
import { useMode, ChatMode, MODE_CONFIGS } from '@/contexts/ModeContext'

interface ModeSwitcherProps {
  variant?: 'tabs' | 'buttons' | 'dropdown'
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  className?: string
}

export function ModeSwitcher({ 
  variant = 'tabs', 
  size = 'md', 
  showLabels = true,
  className = '' 
}: ModeSwitcherProps) {
  const { currentMode, switchMode } = useMode()
  
  const modes: ChatMode[] = ['search', 'deep-research', 'agents', 'agent-groups']
  
  // Size classes
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      button: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4', 
      gap: 'gap-2'
    },
    lg: {
      button: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  }
  
  const { button: buttonSize, icon: iconSize, gap } = sizeClasses[size]
  
  if (variant === 'tabs') {
    return (
      <div className={`flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ${className}`}>
        {modes.map((mode) => {
          const config = MODE_CONFIGS[mode]
          const Icon = config.icon
          const isActive = currentMode === mode
          
          return (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`
                flex items-center ${gap} ${buttonSize} rounded-md transition-all duration-200
                ${isActive 
                  ? `bg-white dark:bg-gray-700 ${config.activeColor} shadow-sm font-medium` 
                  : `${config.color} hover:bg-white/50 dark:hover:bg-gray-700/50`
                }
              `}
              title={config.description}
            >
              <Icon className={iconSize} />
              {showLabels && <span>{config.label}</span>}
            </button>
          )
        })}
      </div>
    )
  }
  
  if (variant === 'buttons') {
    return (
      <div className={`flex ${gap} ${className}`}>
        {modes.map((mode) => {
          const config = MODE_CONFIGS[mode]
          const Icon = config.icon
          const isActive = currentMode === mode
          
          return (
            <button
              key={mode}
              onClick={() => switchMode(mode)}
              className={`
                flex items-center ${gap} ${buttonSize} rounded-lg border transition-all duration-200
                ${isActive 
                  ? `border-current ${config.activeColor} bg-current/10 font-medium` 
                  : `border-gray-300 dark:border-gray-600 ${config.color} hover:border-current hover:bg-current/5`
                }
              `}
              title={config.description}
            >
              <Icon className={iconSize} />
              {showLabels && <span>{config.label}</span>}
            </button>
          )
        })}
      </div>
    )
  }
  
  if (variant === 'dropdown') {
    const currentConfig = MODE_CONFIGS[currentMode]
    const CurrentIcon = currentConfig.icon
    
    return (
      <div className={`relative ${className}`}>
        <select
          value={currentMode}
          onChange={(e) => switchMode(e.target.value as ChatMode)}
          className={`
            ${buttonSize} ${currentConfig.activeColor} bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-600 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50
            appearance-none cursor-pointer
          `}
        >
          {modes.map((mode) => {
            const config = MODE_CONFIGS[mode]
            return (
              <option key={mode} value={mode}>
                {config.label}
              </option>
            )
          })}
        </select>
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <CurrentIcon className={iconSize} />
        </div>
      </div>
    )
  }
  
  return null
}

// Compact mode indicator (for status display)
export function ModeIndicator({ className = '' }: { className?: string }) {
  const { currentMode } = useMode()
  const config = MODE_CONFIGS[currentMode]
  const Icon = config.icon
  
  return (
    <div className={`flex items-center gap-1 ${config.activeColor} ${className}`}>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  )
}

// Mode-specific status component
export function ModeStatus({ className = '' }: { className?: string }) {
  const { currentMode, isResearching, researchProgress } = useMode()
  
  if (currentMode === 'deep-research' && isResearching && researchProgress) {
    return (
      <div className={`text-xs text-green-600 dark:text-green-400 ${className}`}>
        Research Phase: {researchProgress.phase || 'Starting...'}
      </div>
    )
  }
  
  if (currentMode === 'agents') {
    return (
      <div className={`text-xs text-orange-600 dark:text-orange-400 ${className}`}>
        SmallTalk orchestration
      </div>
    )
  }
  
  if (currentMode === 'agent-groups') {
    return (
      <div className={`text-xs text-purple-600 dark:text-purple-400 ${className}`}>
        Agent team collaboration
      </div>
    )
  }
  
  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      Regular search
    </div>
  )
}