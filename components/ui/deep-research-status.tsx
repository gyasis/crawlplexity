'use client'

import { useState, useEffect } from 'react'
import { Microscope, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, Search, FileText, Brain } from 'lucide-react'

interface DeepResearchStatusProps {
  status: string | null
  isActive: boolean
  progress?: ResearchProgress | null
}

interface StatusLine {
  id: string
  message: string
  timestamp: number
  completed: boolean
}

interface ResearchProgress {
  session_id: string
  current_phase: string
  phase_progress: number
  total_progress: number
  current_activity: string
  estimated_time_remaining: number
  phases_completed: string[]
  phase_details?: PhaseProgress[]
  current_subtask?: SubtaskProgress
  subtasks_completed?: SubtaskProgress[]
}

interface PhaseProgress {
  phase: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  start_time?: Date
  end_time?: Date
  subtasks: SubtaskProgress[]
  queries_executed?: QueryExecution[]
}

interface SubtaskProgress {
  subtask_id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  start_time?: Date
  end_time?: Date
  estimated_duration?: number
  phase: string
  current_operation?: string
  operations?: OperationProgress[]
}

interface OperationProgress {
  operation_id: string
  type: 'query_generation' | 'search_execution' | 'content_extraction' | 'analysis' | 'synthesis'
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  start_time?: Date
  end_time?: Date
  metadata?: any
}

interface QueryExecution {
  query_id: string
  query_text: string
  generated_from?: string
  execution_status: 'pending' | 'executing' | 'completed' | 'failed'
  start_time?: Date
  end_time?: Date
  results_count?: number
  relevant_results_count?: number
  processing_time?: number
  phase: string
  subtask_id?: string
}

export function DeepResearchStatus({ status, isActive, progress }: DeepResearchStatusProps) {
  const [statusLines, setStatusLines] = useState<StatusLine[]>([])
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['foundation']))
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status && isActive) {
      // Add new status line
      const newLine: StatusLine = {
        id: Math.random().toString(36).substring(7),
        message: status,
        timestamp: Date.now(),
        completed: false
      }
      
      setStatusLines(prev => {
        // Mark previous lines as completed if this is a new phase
        const updatedPrev = prev.map(line => ({ ...line, completed: true }))
        return [...updatedPrev, newLine]
      })
    }
  }, [status, isActive])

  useEffect(() => {
    if (!isActive) {
      // Mark all lines as completed when research finishes
      setStatusLines(prev => prev.map(line => ({ ...line, completed: true })))
      
      // Clear status lines after a delay
      const timer = setTimeout(() => {
        setStatusLines([])
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isActive])

  // Auto-expand current phase
  useEffect(() => {
    if (progress?.current_phase) {
      setExpandedPhases(prev => new Set([...prev, progress.current_phase]))
    }
  }, [progress?.current_phase])

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(phase)) {
        newSet.delete(phase)
      } else {
        newSet.add(phase)
      }
      return newSet
    })
  }

  const toggleSubtask = (subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(subtaskId)) {
        newSet.delete(subtaskId)
      } else {
        newSet.add(subtaskId)
      }
      return newSet
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-500 flex-shrink-0 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
      default:
        return <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
    }
  }

  const getSubtaskIcon = (type: string) => {
    if (type.includes('query') || type.includes('search')) {
      return <Search className="h-3 w-3 text-blue-500 flex-shrink-0" />
    }
    if (type.includes('analysis') || type.includes('synthesis')) {
      return <Brain className="h-3 w-3 text-purple-500 flex-shrink-0" />
    }
    return <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
  }

  const getPhaseTitle = (phase: string) => {
    const titles = {
      foundation: 'Foundation Research',
      perspective: 'Perspective Analysis',
      trend: 'Trend Analysis',
      synthesis: 'Research Synthesis'
    }
    return titles[phase as keyof typeof titles] || phase
  }

  // Show enhanced progress if available, otherwise fallback to simple status
  if (progress?.phase_details && progress.phase_details.length > 0) {
    return (
      <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-3">
          <Microscope className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
            Deep Research Progress
          </span>
          <span className="text-xs text-purple-600 dark:text-purple-400">
            {progress.total_progress}% complete
          </span>
          {isActive && (
            <div className="flex space-x-1 ml-auto">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{progress.current_activity}</span>
            <span>{Math.round(progress.estimated_time_remaining / 60)}min remaining</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.total_progress}%` }}
            />
          </div>
        </div>

        {/* Phases with subtasks */}
        <div className="space-y-2">
          {progress.phase_details.map((phase) => (
            <div key={phase.phase} className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => togglePhase(phase.phase)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {expandedPhases.has(phase.phase) ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
                {getStatusIcon(phase.status)}
                <span className="flex-1 text-sm font-medium">
                  {getPhaseTitle(phase.phase)}
                </span>
                <span className="text-xs text-gray-500">
                  {phase.progress}%
                </span>
              </button>

              {expandedPhases.has(phase.phase) && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Phase progress bar */}
                  <div className="ml-5">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Subtasks */}
                  {phase.subtasks.map((subtask) => (
                    <div key={subtask.subtask_id} className="ml-5">
                      <div className="flex items-center gap-2 p-2 rounded border border-gray-100 dark:border-gray-800">
                        {getSubtaskIcon(subtask.name)}
                        {getStatusIcon(subtask.status)}
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {subtask.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {subtask.description}
                          </div>
                          {subtask.current_operation && subtask.status === 'in_progress' && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {subtask.current_operation}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {subtask.progress}%
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Current queries if available */}
                  {phase.queries_executed && phase.queries_executed.length > 0 && (
                    <div className="ml-5">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                          Queries ({phase.queries_executed.length})
                        </summary>
                        <div className="mt-2 space-y-1 pl-4">
                          {phase.queries_executed.slice(-3).map((query) => (
                            <div key={query.query_id} className="flex items-start gap-2">
                              <Search className="h-2.5 w-2.5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="text-gray-700 dark:text-gray-300 font-mono text-xs">
                                  "{query.query_text}"
                                </div>
                                {query.results_count !== undefined && (
                                  <div className="text-gray-500 text-xs">
                                    {query.results_count} results • {query.processing_time}ms
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Fallback to simple status display
  if (statusLines.length === 0) {
    return null
  }

  return (
    <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <Microscope className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
          Deep Research Progress
        </span>
        {isActive && (
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {statusLines.map((line, index) => (
          <div 
            key={line.id}
            className="flex items-center gap-2 text-sm"
          >
            {line.completed ? (
              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
            ) : (
              <Clock className="h-3 w-3 text-purple-500 flex-shrink-0 animate-spin" />
            )}
            <span className={`${
              line.completed 
                ? 'text-gray-600 dark:text-gray-400' 
                : 'text-purple-700 dark:text-purple-300 font-medium'
            }`}>
              {line.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}