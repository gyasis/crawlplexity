'use client'

import React, { useState } from 'react'
import { 
  X, 
  Search, 
  Filter, 
  ToggleLeft, 
  ToggleRight, 
  Info,
  Eye,
  EyeOff,
  AlertCircle
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

interface ParameterState {
  active: boolean
  value: any
}

interface AdvancedParameterModalProps {
  isOpen: boolean
  onClose: () => void
  parameterSchema: Record<string, ParameterSchema>
  parameterStates: Record<string, ParameterState>
  onToggleParameter: (paramKey: string) => void
  onUpdateParameter: (paramKey: string, value: any) => void
  collapsibleSections: Record<string, {
    title: string
    description: string
    icon: string
    default_expanded: boolean
    priority: number
  }>
}

export function AdvancedParameterModal({
  isOpen,
  onClose,
  parameterSchema,
  parameterStates,
  onToggleParameter,
  onUpdateParameter,
  collapsibleSections
}: AdvancedParameterModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null)

  if (!isOpen) return null

  // Filter parameters based on search and category
  const filteredParameters = Object.entries(parameterSchema).filter(([key, config]) => {
    // Search filter
    if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !config.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    // Category filter
    if (selectedCategory !== 'all' && config.category !== selectedCategory) {
      return false
    }
    
    // Active filter
    if (showOnlyActive && !parameterStates[key]?.active) {
      return false
    }
    
    return true
  })

  // Group filtered parameters by section
  const sectionGroups: Record<string, [string, ParameterSchema][]> = {}
  filteredParameters.forEach(([key, config]) => {
    const section = config.collapsible_section
    if (!sectionGroups[section]) {
      sectionGroups[section] = []
    }
    sectionGroups[section].push([key, config])
  })

  // Get unique categories for filter
  const categories = [...new Set(Object.values(parameterSchema).map(p => p.category))]

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  // Render parameter input
  const renderParameterInput = (paramKey: string, config: ParameterSchema, state: ParameterState) => {
    const isActive = state.active || !config.can_deactivate
    
    switch (config.ui_type) {
      case 'range':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={config.minimum}
              max={config.maximum}
              step={config.step || 0.1}
              value={state.value ?? config.default}
              onChange={(e) => onUpdateParameter(paramKey, parseFloat(e.target.value))}
              disabled={!isActive}
              className={`flex-1 h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider ${!isActive ? 'opacity-50' : ''}`}
            />
            <span className="text-sm font-mono w-16 text-right">
              {(state.value ?? config.default).toFixed(2)}
            </span>
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
            onChange={(e) => onUpdateParameter(paramKey, parseInt(e.target.value))}
            disabled={!isActive}
            className={`px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${!isActive ? 'opacity-50' : ''}`}
          />
        )
      
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={state.value ?? config.default}
              onChange={(e) => onUpdateParameter(paramKey, e.target.checked)}
              disabled={!isActive}
              className={`rounded border-gray-300 text-orange-600 focus:ring-orange-500 ${!isActive ? 'opacity-50' : ''}`}
            />
            <span className={`text-sm ${!isActive ? 'opacity-50' : ''}`}>
              {config.description}
            </span>
          </label>
        )
      
      case 'select':
        if (config.enum) {
          return (
            <select
              value={state.value ?? config.default}
              onChange={(e) => onUpdateParameter(paramKey, e.target.value)}
              disabled={!isActive}
              className={`px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${!isActive ? 'opacity-50' : ''}`}
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
            onChange={(e) => onUpdateParameter(paramKey, e.target.value)}
            disabled={!isActive}
            className={`px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 ${!isActive ? 'opacity-50' : ''}`}
            placeholder={config.description}
          />
        )
      
      case 'textarea':
        return (
          <textarea
            value={Array.isArray(state.value) ? state.value.join('\n') : (state.value ?? '')}
            onChange={(e) => {
              const value = e.target.value
              const arrayValue = value ? value.split('\n').filter(s => s.trim()) : null
              onUpdateParameter(paramKey, arrayValue)
            }}
            disabled={!isActive}
            rows={3}
            className={`px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none ${!isActive ? 'opacity-50' : ''}`}
            placeholder="Enter values separated by newlines"
          />
        )
      
      case 'json':
        return (
          <textarea
            value={state.value ? JSON.stringify(state.value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : null
                onUpdateParameter(paramKey, parsed)
              } catch {
                // Invalid JSON, don't update
              }
            }}
            disabled={!isActive}
            rows={4}
            className={`px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono ${!isActive ? 'opacity-50' : ''}`}
            placeholder='{"key": "value"}'
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

  const activeCount = Object.values(parameterStates).filter(s => s.active).length
  const totalCount = Object.keys(parameterSchema).length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Advanced Parameter Management
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeCount} active / {totalCount} total parameters
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search parameters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="min-w-32">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Only Active */}
            <button
              onClick={() => setShowOnlyActive(!showOnlyActive)}
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showOnlyActive 
                  ? 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200'
                  : 'bg-white dark:bg-zinc-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showOnlyActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>Active Only</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {Object.keys(sectionGroups).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>No parameters found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(collapsibleSections)
                .filter(([sectionKey]) => sectionGroups[sectionKey])
                .sort(([, a], [, b]) => a.priority - b.priority)
                .map(([sectionKey, sectionConfig]) => {
                  const sectionParams = sectionGroups[sectionKey] || []
                  const isExpanded = expandedSections[sectionKey] ?? true
                  const activeInSection = sectionParams.filter(([key]) => parameterStates[key]?.active).length

                  return (
                    <div key={sectionKey} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(sectionKey)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{sectionConfig.icon}</span>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {sectionConfig.title}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {activeInSection} / {sectionParams.length} active • {sectionConfig.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {isExpanded ? '−' : '+'}
                        </div>
                      </button>

                      {/* Section Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                          <div className="grid gap-6">
                            {sectionParams.map(([paramKey, config]) => {
                              const state = parameterStates[paramKey] || { active: config.default_active, value: config.default }
                              const canToggle = config.can_deactivate

                              return (
                                <div key={paramKey} className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
                                  {/* Parameter Header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start space-x-3 flex-1">
                                      {canToggle && (
                                        <button
                                          onClick={() => onToggleParameter(paramKey)}
                                          className="mt-1"
                                        >
                                          {state.active ? (
                                            <ToggleRight className="w-5 h-5 text-green-600" />
                                          ) : (
                                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                                          )}
                                        </button>
                                      )}
                                      
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                          <h5 className={`font-medium ${!state.active && canToggle ? 'text-gray-400' : 'text-gray-900 dark:text-white'} ${config.essential ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                            {config.essential && '🎯 '}
                                            {paramKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                          </h5>
                                          
                                          {config.modal_only && (
                                            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                                              Advanced
                                            </span>
                                          )}
                                          
                                          {!config.can_deactivate && (
                                            <AlertCircle className="w-4 h-4 text-orange-500" title="Cannot be deactivated" />
                                          )}
                                        </div>
                                        
                                        <p className={`text-sm mt-1 ${!state.active && canToggle ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                          {config.description}
                                        </p>
                                      </div>
                                      
                                      {/* Tooltip */}
                                      <button
                                        onMouseEnter={() => setTooltipVisible(paramKey)}
                                        onMouseLeave={() => setTooltipVisible(null)}
                                        className="text-gray-400 hover:text-gray-600 mt-1"
                                      >
                                        <Info className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Tooltip Display */}
                                  {tooltipVisible === paramKey && (
                                    <div className="mb-3 p-3 bg-gray-900 text-white text-sm rounded-lg">
                                      {config.tooltip}
                                    </div>
                                  )}

                                  {/* Parameter Input */}
                                  <div className="mt-3">
                                    {renderParameterInput(paramKey, config, state)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredParameters.length} of {totalCount} parameters
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}