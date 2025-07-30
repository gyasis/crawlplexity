'use client'

import React, { useState } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { ChevronDown, Trash2, Copy, Check } from 'lucide-react'

export function DebugToggle() {
  const { 
    debugMode, 
    setDebugMode, 
    debugLogs, 
    clearDebugLogs,
    sidebarState 
  } = useSidebar()
  
  const [showLogs, setShowLogs] = useState(false)
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null)
  
  const isExpanded = sidebarState === 'expanded'
  
  const copyLog = (log: any) => {
    const logText = JSON.stringify(log, null, 2)
    navigator.clipboard.writeText(logText)
    setCopiedLogId(log.id)
    setTimeout(() => setCopiedLogId(null), 2000)
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
          onClick={() => setDebugMode(!debugMode)}
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-green-400 mb-1">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-gray-300 break-all">
                          {log.type}: {log.message || JSON.stringify(log.data, null, 2).slice(0, 100)}
                          {JSON.stringify(log).length > 100 && '...'}
                        </div>
                      </div>
                      <button
                        onClick={() => copyLog(log)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-800 rounded transition-all"
                        title="Copy log"
                      >
                        {copiedLogId === log.id ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}