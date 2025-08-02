'use client'

import React, { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { AdvancedParameterModal } from './AdvancedParameterModal'
import { 
  ChevronDown, 
  ChevronRight, 
  RotateCcw, 
  Settings2, 
  ToggleLeft, 
  ToggleRight,
  Info,
  Eye,
  EyeOff
} from 'lucide-react'

interface ParameterSchema {
  type: string
  default: any
  description: string
  required: boolean
  essential: boolean
  default_active: boolean
  ui_type: string
  category: string
  tooltip: string
  collapsible_section: string
  can_deactivate: boolean
  modal_only?: boolean
  minimum?: number
  maximum?: number
  step?: number
  enum?: string[]
}

interface ParameterSchemaResponse {
  schema: Record<string, ParameterSchema>
  meta: {
    version: string
    collapsible_sections: Record<string, {
      title: string
      description: string
      icon: string
      default_expanded: boolean
      priority: number
    }>
    parameter_counts: {
      total: number
      essential: number
      default_active: number
      modal_only: number
      can_deactivate: number
    }
  }
}

interface ParameterState {
  active: boolean
  value: any
}

export function EnhancedParameterControls() {
  const { 
    parameters, 
    updateParameter, 
    resetParameters,
    sidebarState,
    availableModels,
    selectedModel
  } = useSidebar()
  
  // Parameter schema and state
  const [parameterSchema, setParameterSchema] = useState<ParameterSchemaResponse | null>(null)
  const [parameterStates, setParameterStates] = useState<Record<string, ParameterState>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [showAdvancedModal, setShowAdvancedModal] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null)
  
  const isExpanded = sidebarState === 'expanded'
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel)
  
  // Load parameter schema from API
  useEffect(() => {
    const loadParameterSchema = async () => {
      try {
        const response = await fetch('/api/models/litellm/parameters/schema')
        if (response.ok) {
          const schema: ParameterSchemaResponse = await response.json()
          setParameterSchema(schema)
          
          // Initialize parameter states based on schema
          const initialStates: Record<string, ParameterState> = {}
          Object.entries(schema.schema).forEach(([key, config]) => {
            initialStates[key] = {
              active: config.default_active && config.can_deactivate,
              value: config.default
            }
          })
          setParameterStates(initialStates)
          
          // Initialize expanded sections based on schema
          const initialExpanded: Record<string, boolean> = {}
          Object.entries(schema.meta.collapsible_sections).forEach(([key, section]) => {
            initialExpanded[key] = section.default_expanded
          })
          setExpandedSections(initialExpanded)
        }
      } catch (error) {
        console.error('Failed to load parameter schema:', error)
      }
    }
    
    loadParameterSchema()
  }, [])
  
  // Toggle parameter active state
  const toggleParameterActive = (paramKey: string) => {
    setParameterStates(prev => ({
      ...prev,
      [paramKey]: {
        ...prev[paramKey],
        active: !prev[paramKey]?.active
      }
    }))
  }
  
  // Update parameter value
  const updateParameterValue = (paramKey: string, value: any) => {
    setParameterStates(prev => ({
      ...prev,
      [paramKey]: {
        ...prev[paramKey],
        value: value
      }
    }))
    
    // Also update the context for backward compatibility
    updateParameter(paramKey as any, value)
  }
  
  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }
  
  // Get active parameters for API calls in the format expected by the backend
  const getActiveParameters = () => {
    const activeParameters: Record<string, { active: boolean; value: any }> = {}
    Object.entries(parameterStates).forEach(([key, state]) => {
      const config = parameterSchema?.schema[key]
      if (config) {
        activeParameters[key] = {
          active: state.active || !config.can_deactivate,
          value: state.value ?? config.default
        }
      }
    })
    return { activeParameters }
  }
  
  // Export the active parameters to the parent context for API calls
  React.useEffect(() => {
    if (parameterSchema && Object.keys(parameterStates).length > 0) {
      // We could expose this through the context, but for now just store it
      ;(window as any).fireplexityActiveParameters = getActiveParameters()
    }
  }, [parameterStates, parameterSchema])
  
  // Render parameter input based on UI type
  const renderParameterInput = (paramKey: string, config: ParameterSchema, state: ParameterState) => {
    const isActive = state.active || !config.can_deactivate
    const inputProps = {
      disabled: !isActive,
      className: `${!isActive ? 'opacity-50' : ''} transition-opacity`
    }
    
    switch (config.ui_type) {
      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={config.minimum}
              max={config.maximum}
              step={config.step || 0.1}
              value={state.value ?? config.default}
              onChange={(e) => updateParameterValue(paramKey, parseFloat(e.target.value))}
              {...inputProps}
              className={`w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider ${inputProps.className}`}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>{config.minimum}</span>
              <span className="font-mono">{(state.value ?? config.default).toFixed(2)}</span>
              <span>{config.maximum}</span>
            </div>
          </div>
        )
      
      case 'number':
        return (
          <input
            type="number"
            min={config.minimum}
            max={config.maximum}
            step={config.step || 1}
            value={state.value ?? config.default}
            onChange={(e) => updateParameterValue(paramKey, parseInt(e.target.value))}
            {...inputProps}
            className={`w-full px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputProps.className}`}
          />
        )
      
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={state.value ?? config.default}
              onChange={(e) => updateParameterValue(paramKey, e.target.checked)}
              {...inputProps}
              className={`rounded border-gray-300 text-orange-600 focus:ring-orange-500 ${inputProps.className}`}
            />
            <span className="text-sm">{config.description}</span>
          </label>
        )
      
      case 'select':
        if (config.enum) {
          return (
            <select
              value={state.value ?? config.default}
              onChange={(e) => updateParameterValue(paramKey, e.target.value)}
              {...inputProps}
              className={`w-full px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputProps.className}`}
            >
              {config.enum.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )
        }
        return null
      
      case 'text':
        return (
          <input
            type="text"
            value={state.value ?? config.default ?? ''}
            onChange={(e) => updateParameterValue(paramKey, e.target.value)}
            {...inputProps}
            className={`w-full px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${inputProps.className}`}
            placeholder={config.description}
          />
        )
      
      default:
        return (
          <div className="text-xs text-gray-500 italic">
            Unsupported UI type: {config.ui_type}
          </div>
        )
    }
  }
  
  // Semi-collapsed view
  if (!isExpanded) {
    const activeCount = Object.values(parameterStates).filter(state => state.active).length
    return (
      <div className="flex justify-center">
        <div 
          className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          title={`${activeCount} parameters active`}
        >
          <Settings2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    )
  }
  
  if (!parameterSchema) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading parameter schema...
      </div>
    )
  }
  
  // Group parameters by section
  const sectionGroups: Record<string, [string, ParameterSchema][]> = {}
  Object.entries(parameterSchema.schema).forEach(([key, config]) => {
    if (config.modal_only) return // Skip modal-only parameters in main view
    
    const section = config.collapsible_section
    if (!sectionGroups[section]) {
      sectionGroups[section] = []
    }
    sectionGroups[section].push([key, config])
  })
  
  // Sort sections by priority
  const sortedSections = Object.entries(parameterSchema.meta.collapsible_sections)
    .sort(([, a], [, b]) => a.priority - b.priority)
  
  return (
    <div className="space-y-4">
      {/* Parameter Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
        <div className="text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {Object.values(parameterStates).filter(s => s.active).length} active
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">
            / {parameterSchema.meta.parameter_counts.total} total
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAdvancedModal(true)}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded transition-colors flex items-center gap-1"
            title="Advanced parameter selection"
          >
            <Settings2 className="w-3 h-3" />
            Advanced
          </button>
          <button
            onClick={resetParameters}
            className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-800 dark:text-orange-200 rounded transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Parameter Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              // Precise preset
              updateParameterValue('temperature', 0.3)
              updateParameterValue('top_p', 0.9)
              updateParameterValue('frequency_penalty', 0.0)
              updateParameterValue('presence_penalty', 0.0)
            }}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Precise
          </button>
          <button
            onClick={() => {
              // Balanced preset
              updateParameterValue('temperature', 0.7)
              updateParameterValue('top_p', 1.0)
              updateParameterValue('frequency_penalty', 0.0)
              updateParameterValue('presence_penalty', 0.0)
            }}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Balanced
          </button>
          <button
            onClick={() => {
              // Creative preset
              updateParameterValue('temperature', 0.9)
              updateParameterValue('top_p', 1.0)
              updateParameterValue('frequency_penalty', 0.5)
              updateParameterValue('presence_penalty', 0.5)
            }}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Creative
          </button>
          <button
            onClick={() => {
              // Reset all parameters to defaults
              if (parameterSchema) {
                Object.entries(parameterSchema.schema).forEach(([key, config]) => {
                  updateParameterValue(key, config.default)
                })
              }
            }}
            className="px-3 py-2 text-xs bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All
          </button>
        </div>
      </div>
      
      {/* Collapsible Parameter Sections */}
      {sortedSections.map(([sectionKey, sectionConfig]) => {
        const sectionParams = sectionGroups[sectionKey] || []
        if (sectionParams.length === 0) return null
        
        const isExpanded = expandedSections[sectionKey]
        const activeInSection = sectionParams.filter(([key]) => parameterStates[key]?.active).length
        
        return (
          <div key={sectionKey} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{sectionConfig.icon}</span>
                <div className="text-left">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {sectionConfig.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {activeInSection} / {sectionParams.length} active
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            {/* Section Content */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-4">
                {sectionParams.map(([paramKey, config]) => {
                  const state = parameterStates[paramKey] || { active: config.default_active, value: config.default }
                  const canToggle = config.can_deactivate
                  
                  return (
                    <div key={paramKey} className="space-y-2">
                      {/* Parameter Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {canToggle && (
                            <button
                              onClick={() => toggleParameterActive(paramKey)}
                              className="flex items-center space-x-1 text-sm"
                            >
                              {state.active ? (
                                <ToggleRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          )}
                          
                          <label className={`text-sm font-medium ${!state.active && canToggle ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'} ${config.essential ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                            {config.essential && '🎯 '}
                            {paramKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          
                          {/* Tooltip */}
                          <button
                            onMouseEnter={() => setTooltipVisible(paramKey)}
                            onMouseLeave={() => setTooltipVisible(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                        
                        {config.ui_type === 'range' || config.ui_type === 'number' ? (
                          <span className="text-sm text-gray-500 font-mono">
                            {typeof state.value === 'number' ? state.value.toFixed(2) : state.value}
                          </span>
                        ) : null}
                      </div>
                      
                      {/* Tooltip Display */}
                      {tooltipVisible === paramKey && (
                        <div className="bg-gray-900 text-white text-xs p-2 rounded-lg shadow-lg">
                          {config.tooltip}
                        </div>
                      )}
                      
                      {/* Parameter Input */}
                      {renderParameterInput(paramKey, config, state)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      
      {/* Advanced Parameter Modal */}
      <AdvancedParameterModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        parameterSchema={parameterSchema?.schema || {}}
        parameterStates={parameterStates}
        onToggleParameter={toggleParameterActive}
        onUpdateParameter={updateParameterValue}
        collapsibleSections={parameterSchema?.meta?.collapsible_sections || {}}
      />
    </div>
  )
}