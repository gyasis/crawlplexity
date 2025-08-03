'use client'

import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play,
  Square,
  Zap,
  GitBranch,
  MoreHorizontal
} from 'lucide-react'

interface WorkflowExecution {
  execution_id: string
  workflow_id: string
  workflow_name?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  duration_ms?: number
  error_message?: string
}

interface WorkflowStatusIndicatorsProps {
  isExpanded: boolean
  isSemiCollapsed: boolean
}

export function WorkflowStatusIndicators({ isExpanded, isSemiCollapsed }: WorkflowStatusIndicatorsProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActiveExecutions()
    const interval = setInterval(loadActiveExecutions, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const loadActiveExecutions = async () => {
    try {
      // Fetch active and recent executions from the API
      const response = await fetch('/api/workflows/executions?status=running,pending,completed,failed&limit=10')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Transform the data to include workflow names
          const executionsWithNames = await Promise.all(
            data.data.map(async (execution: any) => {
              try {
                const workflowResponse = await fetch(`/api/workflows/${execution.workflow_id}`)
                if (workflowResponse.ok) {
                  const workflowData = await workflowResponse.json()
                  return {
                    ...execution,
                    workflow_name: workflowData.success ? workflowData.data.name : 'Unknown Workflow'
                  }
                }
              } catch (error) {
                console.error('Failed to load workflow name:', error)
              }
              return {
                ...execution,
                workflow_name: 'Unknown Workflow'
              }
            })
          )
          setExecutions(executionsWithNames)
        } else {
          setExecutions([])
        }
      } else {
        // Fallback to mock data for development
        const mockExecutions: WorkflowExecution[] = [
          {
            execution_id: 'exec-1',
            workflow_id: 'wf-1',
            workflow_name: 'Research Pipeline',
            status: 'running',
            started_at: new Date(Date.now() - 30000).toISOString(),
            duration_ms: 30000
          },
          {
            execution_id: 'exec-2', 
            workflow_id: 'wf-2',
            workflow_name: 'Content Generation',
            status: 'completed',
            started_at: new Date(Date.now() - 120000).toISOString(),
            duration_ms: 85000
          }
        ]
        setExecutions(mockExecutions)
      }
    } catch (error) {
      console.error('Failed to load workflow executions:', error)
      // Fallback to empty state
      setExecutions([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="w-3 h-3 text-green-500 animate-pulse" />
      case 'pending':
        return <Clock className="w-3 h-3 text-blue-500" />
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      case 'cancelled':
        return <Square className="w-3 h-3 text-gray-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const getStatusColor = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '--'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  // Semi-collapsed view - show only status dots
  if (isSemiCollapsed) {
    const activeExecutions = executions.filter(exec => exec.status === 'running' || exec.status === 'pending')
    
    if (activeExecutions.length === 0) {
      return (
        <div className="flex justify-center" title="No active workflows">
          <GitBranch className="w-4 h-4 text-gray-400" />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center space-y-1">
        {activeExecutions.slice(0, 3).map((execution) => (
          <div
            key={execution.execution_id}
            className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={`${execution.workflow_name} - ${execution.status}`}
          >
            {getStatusIcon(execution.status)}
          </div>
        ))}
        {activeExecutions.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <MoreHorizontal className="w-3 h-3 text-gray-500" />
          </div>
        )}
      </div>
    )
  }

  // Expanded view
  if (!isExpanded) return null

  const activeExecutions = executions.filter(exec => exec.status === 'running' || exec.status === 'pending')
  const recentExecutions = executions.filter(exec => exec.status === 'completed' || exec.status === 'failed').slice(0, 2)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <GitBranch className="w-4 h-4" />
          <span>Workflows</span>
          {(activeExecutions.length > 0 || recentExecutions.length > 0) && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {activeExecutions.length + recentExecutions.length}
            </span>
          )}
        </div>
        {activeExecutions.length > 0 && (
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400">Active</span>
          </div>
        )}
      </div>

      {/* Active Executions */}
      {activeExecutions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Running
          </div>
          {activeExecutions.map((execution) => (
            <div
              key={execution.execution_id}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getStatusIcon(execution.status)}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {execution.workflow_name || 'Unnamed Workflow'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {execution.status === 'running' ? (
                        `Running for ${formatDuration(Date.now() - new Date(execution.started_at).getTime())}`
                      ) : (
                        'Pending...'
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${getStatusColor(execution.status)}`}>
                    {execution.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Executions */}
      {recentExecutions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Recent
          </div>
          {recentExecutions.map((execution) => (
            <div
              key={execution.execution_id}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getStatusIcon(execution.status)}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {execution.workflow_name || 'Unnamed Workflow'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {execution.status === 'completed' 
                        ? `Completed in ${formatDuration(execution.duration_ms)}`
                        : execution.error_message?.substring(0, 30) + '...' || 'Failed'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${getStatusColor(execution.status)}`}>
                    {execution.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {activeExecutions.length === 0 && recentExecutions.length === 0 && !loading && (
        <div className="text-xs text-gray-500 text-center py-4">
          No workflow activity
          <br />
          <span className="text-blue-500 hover:text-blue-600 cursor-pointer">
            Create your first workflow
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-xs text-gray-500 text-center py-4">
          Loading workflow status...
        </div>
      )}
    </div>
  )
}