'use client'

import React, { useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { ChevronDown, Loader2 } from 'lucide-react'

const PROVIDER_LOGOS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠', 
  google: '🔍',
  groq: '⚡',
  ollama: '🦙',
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  google: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  groq: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ollama: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function ModelSelector() {
  const { 
    availableModels, 
    selectedModel, 
    setSelectedModel, 
    modelsLoading,
    sidebarState 
  } = useSidebar()
  
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedModelInfo = availableModels.find(m => m.id === selectedModel)
  const isExpanded = sidebarState === 'expanded'
  
  if (modelsLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        {isExpanded && <span className="ml-2 text-sm text-gray-500">Loading models...</span>}
      </div>
    )
  }
  
  if (availableModels.length === 0) {
    return (
      <div className="p-4 text-center">
        {isExpanded ? (
          <div className="text-sm text-gray-500">No models available</div>
        ) : (
          <div className="w-8 h-8 rounded bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <span className="text-red-600 dark:text-red-400 text-xs">!</span>
          </div>
        )}
      </div>
    )
  }
  
  if (!isExpanded) {
    // Semi-collapsed view - just show provider icon
    return (
      <div 
        className="flex justify-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        title={selectedModelInfo ? `${selectedModelInfo.name} (${selectedModelInfo.provider})` : 'Select model'}
      >
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center text-sm
          ${selectedModelInfo ? PROVIDER_COLORS[selectedModelInfo.provider] || 'bg-gray-100' : 'bg-gray-100'}
        `}>
          {selectedModelInfo ? PROVIDER_LOGOS[selectedModelInfo.provider] || '🤖' : '🤖'}
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-6 h-6 rounded flex items-center justify-center text-xs
            ${selectedModelInfo ? PROVIDER_COLORS[selectedModelInfo.provider] || 'bg-gray-100' : 'bg-gray-100'}
          `}>
            {selectedModelInfo ? PROVIDER_LOGOS[selectedModelInfo.provider] || '🤖' : '🤖'}
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {selectedModelInfo?.name || 'Select Model'}
            </div>
            {selectedModelInfo && (
              <div className="text-xs text-gray-500 capitalize">
                {selectedModelInfo.provider}
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-1 w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {availableModels.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors
                  ${selectedModel === model.id ? 'bg-orange-50 dark:bg-orange-900/20' : ''}
                `}
              >
                <div className={`
                  w-6 h-6 rounded flex items-center justify-center text-xs
                  ${PROVIDER_COLORS[model.provider] || 'bg-gray-100'}
                `}>
                  {PROVIDER_LOGOS[model.provider] || '🤖'}
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {model.name}
                  </div>
                  <div className="text-xs text-gray-500 capitalize flex items-center gap-2">
                    <span>{model.provider}</span>
                    {model.cost_per_1k_tokens === 0 ? (
                      <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded text-xs">
                        Free
                      </span>
                    ) : (
                      <span className="text-xs">
                        ${model.cost_per_1k_tokens}/1k tokens
                      </span>
                    )}
                  </div>
                </div>
                {selectedModel === model.id && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}