'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { 
  X, 
  Download, 
  Trash2, 
  Copy, 
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Bug,
  Clock,
  Terminal,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react'

interface DebugLogsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DebugLogsModal({ isOpen, onClose }: DebugLogsModalProps) {
  const { debugLogs, clearDebugLogs } = useSidebar()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [debugLogs, isOpen])

  if (!isOpen) return null

  // Filter logs based on search and type
  const filteredLogs = debugLogs.filter(log => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        JSON.stringify(log).toLowerCase().includes(searchLower) ||
        log.type?.toLowerCase().includes(searchLower) ||
        log.timestamp?.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Type filter
    if (selectedType !== 'all' && log.type !== selectedType) {
      return false
    }

    return true
  })

  // Get unique log types for filter dropdown
  const logTypes = [...new Set(debugLogs.map(log => log.type).filter(Boolean))]

  // Toggle log expansion
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  // Export logs as JSON
  const exportLogs = () => {
    const logsData = {
      exported_at: new Date().toISOString(),
      total_logs: filteredLogs.length,
      logs: filteredLogs
    }
    
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Copy logs to clipboard
  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(filteredLogs, null, 2))
      // You could add a toast notification here
      console.log('✅ Debug logs copied to clipboard')
    } catch (error) {
      console.error('❌ Failed to copy logs:', error)
    }
  }

  // Get icon for log type
  const getLogIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'debug':
        return <Bug className="w-4 h-4 text-blue-500" />
      default:
        return <Terminal className="w-4 h-4 text-gray-500" />
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString()
    } catch {
      return timestamp || 'Unknown'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Bug className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Debug Logs
              </h3>
              <p className="text-sm text-gray-500">
                {filteredLogs.length} of {debugLogs.length} logs shown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Type Filter */}
            <div className="min-w-32">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Types</option>
                {logTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={copyLogs}
              className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg transition-colors flex items-center gap-2"
              title="Copy logs to clipboard"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={exportLogs}
              className="px-3 py-2 text-sm bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-800 dark:text-green-200 rounded-lg transition-colors flex items-center gap-2"
              title="Export logs as JSON"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={clearDebugLogs}
              className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-lg transition-colors flex items-center gap-2"
              title="Clear all logs"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>

        {/* Logs Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bug className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p>
                {debugLogs.length === 0 
                  ? 'No debug logs yet. Enable debug mode and make some requests to see logs here.'
                  : 'No logs match your current filters.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => {
                const isExpanded = expandedLogs.has(log.id)
                const hasData = log.data && Object.keys(log.data).length > 0

                return (
                  <div
                    key={log.id || index}
                    className="bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* Log Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleLogExpansion(log.id || index.toString())}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        {getLogIcon(log.type)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {log.type || 'Log'}
                            </span>
                            {log.data?.type && (
                              <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                {log.data.type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimestamp(log.timestamp)}</span>
                            {log.data?.requested_model && (
                              <>
                                <span>•</span>
                                <span>Requested: {log.data.requested_model}</span>
                              </>
                            )}
                            {log.data?.selected_model && log.data.selected_model !== log.data?.requested_model && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Actual: {log.data.selected_model}
                                </span>
                              </>
                            )}
                            {log.data?.verification?.model_match_confirmed !== undefined && (
                              <>
                                <span>•</span>
                                <span className={log.data.verification.model_match_confirmed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {log.data.verification.model_match_confirmed ? '✓ Verified' : '⚠ Unverified'}
                                </span>
                                {log.data.verification.confidence_score && (
                                  <span className="text-xs">
                                    ({(log.data.verification.confidence_score * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {hasData && (
                        <div className="text-gray-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && hasData && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                        {/* Verification Summary */}
                        {log.data?.verification && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Model Verification Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-blue-700 dark:text-blue-300 font-medium">Intended LiteLLM ID:</span>
                                <div className="font-mono text-xs bg-white dark:bg-zinc-800 p-1 rounded mt-1">
                                  {log.data.verification.intended_litellm_id}
                                </div>
                              </div>
                              <div>
                                <span className="text-blue-700 dark:text-blue-300 font-medium">Actual Response Model:</span>
                                <div className="font-mono text-xs bg-white dark:bg-zinc-800 p-1 rounded mt-1">
                                  {log.data.verification.actual_response_model}
                                </div>
                              </div>
                              <div>
                                <span className="text-blue-700 dark:text-blue-300 font-medium">Match Status:</span>
                                <div className={`font-medium mt-1 ${log.data.verification.model_match_confirmed ? 'text-green-600' : 'text-red-600'}`}>
                                  {log.data.verification.model_match_confirmed ? '✅ Confirmed' : '❌ Mismatch'}
                                </div>
                              </div>
                              <div>
                                <span className="text-blue-700 dark:text-blue-300 font-medium">Confidence:</span>
                                <div className="mt-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${log.data.verification.confidence_score >= 0.8 ? 'bg-green-500' : log.data.verification.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${log.data.verification.confidence_score * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-mono">
                                      {(log.data.verification.confidence_score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <span className="text-blue-700 dark:text-blue-300 font-medium">Method:</span>
                                <div className="font-mono text-xs bg-white dark:bg-zinc-800 p-1 rounded mt-1">
                                  {log.data.verification.verification_method}
                                </div>
                              </div>
                              {log.data.verification.flags && log.data.verification.flags.length > 0 && (
                                <div>
                                  <span className="text-blue-700 dark:text-blue-300 font-medium">Flags:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {log.data.verification.flags.map((flag: string, i: number) => (
                                      <span key={i} className="px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                                        {flag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Full JSON Data */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Raw Data:</h4>
                          <pre className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-900 p-3 rounded overflow-x-auto whitespace-pre-wrap font-mono">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Debug logs are automatically cleared when the page is refreshed
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}