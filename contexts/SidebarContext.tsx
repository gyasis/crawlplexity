'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types
export type SidebarState = 'expanded' | 'semi-collapsed' | 'collapsed'

export interface ModelInfo {
  id: string
  name: string
  provider: string
  available: boolean
  priority: number
  cost_per_1k_tokens: number
  task_types: string[]
  max_tokens: number
}

export interface LLMParameters {
  temperature: number
  max_tokens: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

export interface SidebarContextType {
  // Sidebar state
  sidebarState: SidebarState
  setSidebarState: (state: SidebarState) => void
  
  // Models
  availableModels: ModelInfo[]
  selectedModel: string | null
  setSelectedModel: (model: string) => void
  loadModels: () => Promise<void>
  modelsLoading: boolean
  
  // Parameters
  parameters: LLMParameters
  updateParameter: <K extends keyof LLMParameters>(key: K, value: LLMParameters[K]) => void
  resetParameters: () => void
  
  // Debug mode
  debugMode: boolean
  setDebugMode: (enabled: boolean) => void
  
  // Debug logs
  debugLogs: any[]
  addDebugLog: (log: any) => void
  clearDebugLogs: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

// Default parameters
const DEFAULT_PARAMETERS: LLMParameters = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1.0,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
}

interface SidebarProviderProps {
  children: ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  // Sidebar state
  const [sidebarState, setSidebarState] = useState<SidebarState>('semi-collapsed')
  
  // Models
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [modelsLoading, setModelsLoading] = useState(false)
  
  // Parameters
  const [parameters, setParameters] = useState<LLMParameters>(DEFAULT_PARAMETERS)
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false)
  const [debugLogs, setDebugLogs] = useState<any[]>([])
  
  // Load available models from API
  const loadModels = async () => {
    setModelsLoading(true)
    try {
      const response = await fetch('/api/models')
      if (response.ok) {
        const data = await response.json()
        setAvailableModels(data.available_models || [])
        
        // Set default model if none selected
        if (!selectedModel && data.available_models?.length > 0) {
          const defaultModel = data.available_models.find((m: ModelInfo) => m.priority === 1) || data.available_models[0]
          setSelectedModel(defaultModel.id)
        }
      } else {
        console.error('Failed to load models:', response.status)
      }
    } catch (error) {
      console.error('Error loading models:', error)
    } finally {
      setModelsLoading(false)
    }
  }
  
  // Update a single parameter
  const updateParameter = <K extends keyof LLMParameters>(key: K, value: LLMParameters[K]) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }))
  }
  
  // Reset parameters to defaults
  const resetParameters = () => {
    setParameters(DEFAULT_PARAMETERS)
  }
  
  // Add debug log entry
  const addDebugLog = (log: any) => {
    setDebugLogs(prev => [
      ...prev.slice(-49), // Keep last 50 logs
      {
        ...log,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      }
    ])
  }
  
  // Clear debug logs
  const clearDebugLogs = () => {
    setDebugLogs([])
  }
  
  // Load models on mount
  useEffect(() => {
    loadModels()
  }, [])
  
  // Persist sidebar state to localStorage
  useEffect(() => {
    const stored = localStorage.getItem('crawlplexity-sidebar-state')
    if (stored && ['expanded', 'semi-collapsed', 'collapsed'].includes(stored)) {
      setSidebarState(stored as SidebarState)
    } else {
      // Set default to semi-collapsed if no stored state
      setSidebarState('semi-collapsed')
    }
  }, [])
  
  useEffect(() => {
    localStorage.setItem('crawlplexity-sidebar-state', sidebarState)
  }, [sidebarState])
  
  // Persist debug mode to localStorage
  useEffect(() => {
    const stored = localStorage.getItem('crawlplexity-debug-mode')
    if (stored) {
      setDebugMode(stored === 'true')
    }
  }, [])
  
  useEffect(() => {
    localStorage.setItem('crawlplexity-debug-mode', debugMode.toString())
  }, [debugMode])
  
  const contextValue: SidebarContextType = {
    sidebarState,
    setSidebarState,
    availableModels,
    selectedModel,
    setSelectedModel,
    loadModels,
    modelsLoading,
    parameters,
    updateParameter,
    resetParameters,
    debugMode,
    setDebugMode,
    debugLogs,
    addDebugLog,
    clearDebugLogs,
  }
  
  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}