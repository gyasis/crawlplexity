'use client'

import React, { useState, useEffect } from 'react'
import { 
  GitBranch, 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Settings,
  Trash2,
  Edit,
  Copy,
  Calendar,
  User,
  Activity,
  MoreVertical,
  ArrowRight,
  Zap,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Workflow {
  workflow_id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft' | 'archived'
  workflow_type: 'agent' | 'agentic' | 'hybrid'
  created_at: string
  updated_at: string
  created_by?: string
  node_count?: number
  execution_count?: number
  last_execution?: string
}

interface WorkflowExecution {
  execution_id: string
  workflow_id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  start_time: string
  end_time?: string
  duration?: number
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadWorkflows()
    loadRecentExecutions()
  }, [])

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows')
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentExecutions = async () => {
    try {
      const response = await fetch('/api/workflows/executions?limit=10')
      if (response.ok) {
        const data = await response.json()
        setRecentExecutions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load recent executions:', error)
    }
  }

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter
    const matchesType = typeFilter === 'all' || workflow.workflow_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'agent': return <User className="w-4 h-4" />
      case 'agentic': return <Activity className="w-4 h-4" />
      case 'hybrid': return <Zap className="w-4 h-4" />
      default: return <GitBranch className="w-4 h-4" />
    }
  }

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputData: {},
          sessionId: 'user-session',
          userId: 'user'
        })
      })
      
      if (response.ok) {
        // Refresh executions to show the new one
        loadRecentExecutions()
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Workflow Management
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                {filteredWorkflows.length} workflows
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/workflows/templates">
                <Button variant="outline" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Browse Templates
                </Button>
              </Link>
              <Link href="/workflows/create">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search workflows..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="agent">Agent</option>
                    <option value="agentic">Agentic</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Workflows List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading workflows...</p>
                </div>
              ) : filteredWorkflows.length === 0 ? (
                <div className="p-8 text-center">
                  <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No workflows found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first workflow'}
                  </p>
                  <Link href="/workflows/create">
                    <Button>Create Your First Workflow</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWorkflows.map((workflow) => (
                    <div key={workflow.workflow_id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {getTypeIcon(workflow.workflow_type)}
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                              {workflow.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                              {workflow.status}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {workflow.workflow_type}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {workflow.description}
                          </p>
                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
                            </div>
                            {workflow.node_count && (
                              <div className="flex items-center gap-1">
                                <GitBranch className="w-4 h-4" />
                                <span>{workflow.node_count} nodes</span>
                              </div>
                            )}
                            {workflow.execution_count && (
                              <div className="flex items-center gap-1">
                                <Play className="w-4 h-4" />
                                <span>{workflow.execution_count} executions</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleExecuteWorkflow(workflow.workflow_id)}
                            className="flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Execute
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Workflows</span>
                  <span className="font-medium text-gray-900 dark:text-white">{workflows.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Active</span>
                  <span className="font-medium text-green-600">{workflows.filter(w => w.status === 'active').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Drafts</span>
                  <span className="font-medium text-gray-600">{workflows.filter(w => w.status === 'draft').length}</span>
                </div>
              </div>
            </div>

            {/* Recent Executions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Recent Executions
              </h3>
              {recentExecutions.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent executions</p>
              ) : (
                <div className="space-y-3">
                  {recentExecutions.slice(0, 5).map((execution) => (
                    <div key={execution.execution_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          execution.status === 'completed' ? 'bg-green-500' :
                          execution.status === 'running' ? 'bg-blue-500' :
                          execution.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <span className="text-gray-900 dark:text-white truncate">
                          {workflows.find(w => w.workflow_id === execution.workflow_id)?.name || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(execution.start_time).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}