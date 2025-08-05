'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Search, BookOpen, Bot } from 'lucide-react'

// Unified chat modes
export type ChatMode = 'search' | 'deep-research' | 'agents' | 'agent-groups'

// Mode configuration with UI metadata
export interface ModeConfig {
  id: ChatMode
  label: string
  icon: React.ComponentType<any>
  description: string
  color: string
  activeColor: string
}

// Mode configurations
export const MODE_CONFIGS: Record<ChatMode, ModeConfig> = {
  search: {
    id: 'search',
    label: 'Search',
    icon: Search,
    description: 'Regular search with web results',
    color: 'text-gray-600 dark:text-gray-400',
    activeColor: 'text-blue-600 dark:text-blue-400'
  },
  'deep-research': {
    id: 'deep-research',
    label: 'Deep Research',
    icon: BookOpen,
    description: 'Comprehensive research with analysis',
    color: 'text-gray-600 dark:text-gray-400',
    activeColor: 'text-green-600 dark:text-green-400'
  },
  agents: {
    id: 'agents',
    label: 'Agents',
    icon: Bot,
    description: 'SmallTalk agent orchestration',
    color: 'text-gray-600 dark:text-gray-400',
    activeColor: 'text-orange-600 dark:text-orange-400'
  },
  'agent-groups': {
    id: 'agent-groups',
    label: 'Agent Groups',
    icon: Bot,
    description: 'Agent team collaboration',
    color: 'text-gray-600 dark:text-gray-400',
    activeColor: 'text-purple-600 dark:text-purple-400'
  }
}

// Context interface
interface ModeContextType {
  // Core mode state
  currentMode: ChatMode
  switchMode: (mode: ChatMode) => void
  
  // Mode info helpers
  getCurrentModeConfig: () => ModeConfig
  getModeConfig: (mode: ChatMode) => ModeConfig
  
  // Legacy compatibility flags (for gradual migration)
  deepResearchEnabled: boolean
  agentModeEnabled: boolean
  
  // Mode status tracking
  isResearching: boolean
  setIsResearching: (researching: boolean) => void
  researchProgress: any
  setResearchProgress: (progress: any) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

interface ModeProviderProps {
  children: React.ReactNode
  initialMode?: ChatMode
}

export function ModeProvider({ children, initialMode = 'search' }: ModeProviderProps) {
  // Core mode state
  const [currentMode, setCurrentMode] = useState<ChatMode>(initialMode)
  
  // Research-specific state
  const [isResearching, setIsResearching] = useState(false)
  const [researchProgress, setResearchProgress] = useState<any>(null)
  
  // Unified mode switching with proper state management
  const switchMode = useCallback((mode: ChatMode) => {
    console.log(`🔄 Mode Switch: ${currentMode} → ${mode}`)
    
    // Reset research state when leaving deep-research mode
    if (currentMode === 'deep-research' && mode !== 'deep-research') {
      setIsResearching(false)
      setResearchProgress(null)
    }
    
    setCurrentMode(mode)
  }, [currentMode])
  
  // Helper functions
  const getCurrentModeConfig = useCallback(() => MODE_CONFIGS[currentMode], [currentMode])
  const getModeConfig = useCallback((mode: ChatMode) => MODE_CONFIGS[mode], [])
  
  // Legacy compatibility flags (computed from unified state)
  const deepResearchEnabled = currentMode === 'deep-research'
  const agentModeEnabled = currentMode === 'agents' || currentMode === 'agent-groups'
  
  const contextValue: ModeContextType = {
    // Core mode state
    currentMode,
    switchMode,
    
    // Mode info helpers
    getCurrentModeConfig,
    getModeConfig,
    
    // Legacy compatibility
    deepResearchEnabled,
    agentModeEnabled,
    
    // Research state
    isResearching,
    setIsResearching,
    researchProgress,
    setResearchProgress
  }
  
  return (
    <ModeContext.Provider value={contextValue}>
      {children}
    </ModeContext.Provider>
  )
}

// Custom hook for using mode context
export function useMode() {
  const context = useContext(ModeContext)
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider')
  }
  return context
}

// Helper hook for mode-specific logic
export function useModeSwitch() {
  const { currentMode, switchMode } = useMode()
  
  return {
    currentMode,
    isSearch: currentMode === 'search',
    isDeepResearch: currentMode === 'deep-research', 
    isAgents: currentMode === 'agents',
    switchToSearch: () => switchMode('search'),
    switchToDeepResearch: () => switchMode('deep-research'),
    switchToAgents: () => switchMode('agents'),
    switchMode
  }
}