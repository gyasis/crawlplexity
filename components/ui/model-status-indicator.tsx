'use client'

import React, { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { Cpu, ChevronDown, ChevronUp } from 'lucide-react'

const PROVIDER_LOGOS: Record<string, string> = {
  openai: '🤖',
  anthropic: '🧠', 
  google: '🔍',
  groq: '⚡',
  ollama: '🦙',
  huggingface: '🤗',
  replicate: '🔄',
  together: '🤝',
  cohere: '🎯',
  custom: '🛠️'
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  google: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  groq: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  ollama: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  huggingface: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  replicate: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  together: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  cohere: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  custom: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
}

interface ModelStatusIndicatorProps {
  isVisible?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showDuringSearch?: boolean
}

export function ModelStatusIndicator({ 
  isVisible = true, 
  position = 'bottom-right',
  showDuringSearch = true 
}: ModelStatusIndicatorProps) {
  const { availableModels, selectedModel, modelsLoading } = useSidebar()
  const [isExpanded, setIsExpanded] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)

  const selectedModelInfo = availableModels.find(m => m.id === selectedModel)

  // Auto-show during search operations
  useEffect(() => {
    if (showDuringSearch && selectedModelInfo) {
      setShouldShow(true)
      
      // Auto-hide after 15 seconds if not expanded  
      const timer = setTimeout(() => {
        if (!isExpanded) {
          setShouldShow(false)
        }
      }, 15000)

      return () => clearTimeout(timer)
    }
  }, [selectedModelInfo, showDuringSearch, isExpanded])

  if (!isVisible || !selectedModelInfo || modelsLoading) {
    return null
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-40 transition-all duration-300 ${
      shouldShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
    }`}>
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
        {/* Collapsed View */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors w-full text-left"
        >
          <div className={`
            w-6 h-6 rounded flex items-center justify-center text-xs
            ${PROVIDER_COLORS[selectedModelInfo.provider] || 'bg-gray-100'}
          `}>
            {PROVIDER_LOGOS[selectedModelInfo.provider] || '🤖'}
          </div>
          
          {!isExpanded ? (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  Active Model
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {selectedModelInfo.name}
                </div>
              </div>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Current Model
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </>
          )}
        </button>

        {/* Expanded View */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-zinc-800">
            <div className="space-y-3">
              {/* Model Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`
                    w-5 h-5 rounded flex items-center justify-center text-xs
                    ${PROVIDER_COLORS[selectedModelInfo.provider] || 'bg-gray-100'}
                  `}>
                    {PROVIDER_LOGOS[selectedModelInfo.provider] || '🤖'}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedModelInfo.name}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Provider:</span>
                    <br />
                    <span className="capitalize">{selectedModelInfo.provider}</span>
                  </div>
                  <div>
                    <span className="font-medium">Cost:</span>
                    <br />
                    {selectedModelInfo.cost_per_1k_tokens === 0 ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
                    ) : (
                      <span>${selectedModelInfo.cost_per_1k_tokens}/1k</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Category & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedModelInfo.category && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedModelInfo.category === 'local' 
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : selectedModelInfo.category === 'remote'
                      ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                  }`}>
                    {selectedModelInfo.category}
                  </span>
                )}
                
                {selectedModelInfo.remoteServerId && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    remote server
                  </span>
                )}
              </div>

              {/* Quick Stats */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between">
                  <span>Max tokens: {selectedModelInfo.max_tokens.toLocaleString()}</span>
                  <span>Priority: {selectedModelInfo.priority}</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsExpanded(false)
                  setShouldShow(false)
                }}
                className="w-full mt-3 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Hide Model Info
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook to trigger model status display during searches
export function useModelStatusNotification() {
  const [showStatus, setShowStatus] = useState(false)

  const notifyModelUsage = () => {
    setShowStatus(true)
    setTimeout(() => setShowStatus(false), 5000)
  }

  return { showStatus, notifyModelUsage }
}