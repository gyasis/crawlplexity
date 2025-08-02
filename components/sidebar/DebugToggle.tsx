'use client'

import React, { useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { DebugLogsModal } from './DebugLogsModal'
import { ChevronDown, Trash2, Copy, Check, ExternalLink } from 'lucide-react'

export function DebugToggle() {
  const { 
    debugMode, 
    setDebugMode, 
    debugLogs, 
    clearDebugLogs,
    sidebarState 
  } = useSidebar()
  
  // Debug logging to see actual state values
  React.useEffect(() => {
    console.log('🐛 DebugToggle - debugMode state:', debugMode, typeof debugMode)
  }, [debugMode])
  
  const [showLogs, setShowLogs] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  
  const isExpanded = sidebarState === 'expanded'
  
  const copyLog = (log: any) => {
    const logText = JSON.stringify(log, null, 2)
    navigator.clipboard.writeText(logText)
    setCopiedLogId(log.id)
    setTimeout(() => setCopiedLogId(null), 2000)
  }
  
  const formatDebugLog = (log: any) => {
    // Get the debug type from either debugType property or data.type
    const debugType = log.debugType || log.data?.type || log.type
    
    // Format LLM-specific debug events
    if (debugType === 'llm_request') {
      const data = log.data
      return `🤖 LLM Request: ${data.model} (temp=${data.parameters?.temperature}, max=${data.parameters?.max_tokens})`
    }
    
    if (debugType === 'llm_response') {
      const data = log.data
      return `📡 LLM Response: ${data.model} - ${data.responseTimeFormatted} (${data.contentLength} chars)`
    }
    
    if (debugType === 'cache_hit') {
      const data = log.data
      return `✅ Cache Hit: ${data.model} (${data.contentLength} chars)`
    }
    
    // Format cache-specific debug events
    if (debugType === 'cache_event') {
      const data = log.data
      const icon = data.type === 'cache_hit' ? '✅' : 
                   data.type === 'cache_miss' ? '❌' : 
                   data.type === 'cache_set' ? '💾' : 
                   data.type === 'cache_evict' ? '🗑️' : '🗄️'
      
      let description = `${icon} ${data.type.replace('cache_', '').toUpperCase()}: ${data.keyPreview}`
      
      if (data.cacheType) {
        description += ` (${data.cacheType})`
      }
      
      if (data.operationType && data.operationType !== 'generic') {
        description += ` [${data.operationType}]`
      }
      
      if (data.model) {
        description += ` - ${data.model}`
      }
      
      if (data.dataSize) {
        description += ` (${Math.round(data.dataSize / 1024)}KB)`
      }
      
      return description
    }
    
    if (debugType === 'test' || debugType === 'request') {
      return `🧪 Test: ${log.data?.message || log.message}`
    }
    
    // Default formatting for other types
    return `${debugType}: ${log.message || JSON.stringify(log.data, null, 2).slice(0, 100)}${JSON.stringify(log).length > 100 ? '...' : ''}`
  }
  
  if (!isExpanded) {
    // Semi-collapsed view
    return (
      <div className="flex justify-center">
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center transition-colors
            ${debugMode 
              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }
          `}
          title={`Debug mode: ${debugMode ? 'ON' : 'OFF'}`}
        >
          <span className="text-xs font-bold">
            {debugMode ? '✓' : '?'}
          </span>
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {/* Debug Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Debug Mode
        </span>
        <button
          onClick={() => {
            console.log('🐛 Debug toggle clicked - current state:', debugMode, 'setting to:', !debugMode)
            setDebugMode(!debugMode)
          }}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
            ${debugMode ? 'bg-orange-500' : 'bg-gray-200 dark:bg-zinc-700'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${debugMode ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      
      {/* Debug Status */}
      {debugMode && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-600 dark:text-green-400">
              ● Debug Active
            </span>
            <span className="text-gray-500">
              {debugLogs.length} logs
            </span>
          </div>
          
          {/* Debug Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
            >
              <span>Logs</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showLogs ? 'rotate-180' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowLogsModal(true)}
              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 rounded transition-colors"
              title="Open logs in modal"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            
            <button
              onClick={clearDebugLogs}
              disabled={debugLogs.length === 0}
              className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-600 dark:text-red-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear logs"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          
          {/* Debug Logs */}
          {showLogs && (
            <div className="max-h-48 overflow-y-auto space-y-1 bg-black rounded-lg p-2">
              {debugLogs.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  No debug logs yet
                </div>
              ) : (
                debugLogs.slice(-10).map((log) => (
                  <div
                    key={log.id}
                    className="group relative bg-zinc-900 rounded p-2 text-xs font-mono"
                  >
                    <div 
                      className="flex items-start justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-green-400 mb-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-300 break-all">
                          {formatDebugLog(log)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyLog(log)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded transition-all"
                          title="Copy log"
                        >
                          {copiedLogId === log.id ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                        <div className="w-3 h-3 flex items-center justify-center text-gray-500">
                          {expandedLogId === log.id ? '−' : '+'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded details */}
                    {expandedLogId === log.id && (
                      <div className="mt-2 pt-2 border-t border-zinc-700 text-xs">
                        <div className="text-gray-400 mb-2">Details:</div>
                        <pre className="text-gray-300 whitespace-pre-wrap text-xs overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Debug Logs Modal */}
      <DebugLogsModal 
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />
    </div>
  )
}