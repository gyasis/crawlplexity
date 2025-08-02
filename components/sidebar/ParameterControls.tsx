'use client'

import React from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { RotateCcw } from 'lucide-react'

export function ParameterControls() {
  const { 
    parameters, 
    updateParameter, 
    resetParameters,
    sidebarState,
    availableModels,
    selectedModel
  } = useSidebar()
  
  const isExpanded = sidebarState === 'expanded'
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel)
  const modelMaxTokens = selectedModelInfo?.max_tokens || 4096
  
  if (!isExpanded) {
    // Semi-collapsed view - just show a summary icon
    return (
      <div className="flex justify-center">
        <div 
          className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          title={`T: ${parameters.temperature}, Max: ${parameters.max_tokens}`}
        >
          <span className="text-blue-600 dark:text-blue-400 text-xs font-mono">
            {parameters.temperature}
          </span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Temperature
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {parameters.temperature.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={parameters.temperature}
          onChange={(e) => updateParameter('temperature', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>
      
      {/* Max Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Max Tokens
          </label>
          <input
            type="number"
            min="1"
            max={modelMaxTokens}
            value={parameters.max_tokens}
            onChange={(e) => {
              const value = parseInt(e.target.value)
              if (!isNaN(value) && value > 0 && value <= modelMaxTokens) {
                updateParameter('max_tokens', value)
              }
            }}
            className="w-20 px-2 py-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
            title={`Max tokens for ${selectedModelInfo?.name || 'this model'}: ${modelMaxTokens.toLocaleString()}`}
          />
        </div>
        <input
          type="range"
          min="100"
          max={modelMaxTokens}
          step="100"
          value={Math.min(parameters.max_tokens, modelMaxTokens)}
          onChange={(e) => updateParameter('max_tokens', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
          title={`Slide to adjust max tokens (up to ${modelMaxTokens.toLocaleString()})`}
        />
      </div>
      
      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Top P
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {parameters.top_p?.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={parameters.top_p || 1.0}
          onChange={(e) => updateParameter('top_p', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      
      {/* Frequency Penalty */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Frequency Penalty
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {parameters.frequency_penalty?.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="-2"
          max="2"
          step="0.1"
          value={parameters.frequency_penalty || 0.0}
          onChange={(e) => updateParameter('frequency_penalty', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
      
      {/* Parameter Presets */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Presets
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              updateParameter('temperature', 0.3)
              updateParameter('top_p', 0.9)
              updateParameter('frequency_penalty', 0.0)
              updateParameter('presence_penalty', 0.0)
            }}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Precise
          </button>
          <button
            onClick={() => {
              updateParameter('temperature', 0.7)
              updateParameter('top_p', 1.0)
              updateParameter('frequency_penalty', 0.0)
              updateParameter('presence_penalty', 0.0)
            }}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Balanced
          </button>
          <button
            onClick={() => {
              updateParameter('temperature', 0.9)
              updateParameter('top_p', 1.0)
              updateParameter('frequency_penalty', 0.5)
              updateParameter('presence_penalty', 0.5)
            }}
            className="px-3 py-2 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Creative
          </button>
          <button
            onClick={resetParameters}
            className="px-3 py-2 text-xs bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}