'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bot,
  Plus,
  Search,
  Filter,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit,
  Copy,
  Calendar,
  User,
  Activity,
  MoreVertical,
  ArrowRight,
  Zap,
  Brain,
  Users,
  Download,
  Upload,
  Code,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Agent {
  agent_id: string
  name: string
  description?: string
  agent_type: string
  status: 'idle' | 'running' | 'stopped' | 'error'
  created_at: string
  updated_at: string
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
    personality?: string
    tools?: string[]
  }
  capabilities?: {
    expertise?: string[]
    taskTypes?: string[]
    complexity?: string
    contextAwareness?: number
  }
  metadata?: {
    version?: string
    author?: string
    tags?: string[]
  }
  usage_stats?: {
    total_runs: number
    success_rate: number
    avg_response_time: number
    last_used: string
  }
}

interface AgentTeam {
  id: string
  name: string
  description: string
  agents: string[]
  created_at: string
  active: boolean
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [teams, setTeams] = useState<AgentTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'teams'>('grid')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAgents()
    loadTeams()
  }, [])

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (response.ok) {
        const data = await response.json()
        setAgents(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/agent-groups')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
    }
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.agent_type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
    const matchesType = typeFilter === 'all' || agent.agent_type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      case 'running': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'stopped': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'error': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <Clock className="w-4 h-4" />
      case 'running': return <CheckCircle className="w-4 h-4" />
      case 'stopped': return <XCircle className="w-4 h-4" />
      case 'error': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'assistant': return <Bot className="w-4 h-4" />
      case 'researcher': return <Search className="w-4 h-4" />
      case 'analyzer': return <Brain className="w-4 h-4" />
      case 'orchestrator': return <Zap className="w-4 h-4" />
      default: return <Bot className="w-4 h-4" />
    }
  }

  const handleRunAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: 'Test run',
          sessionId: 'agent-test',
          userId: 'user'
        })
      })
      
      if (response.ok) {
        // Refresh agents to show updated status
        loadAgents()
      }
    } catch (error) {
      console.error('Failed to run agent:', error)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadAgents()
      }
    } catch (error) {
      console.error('Failed to delete agent:', error)
    }
  }

  const handleBulkAction = (action: string) => {
    if (selectedAgents.size === 0) return
    
    switch (action) {
      case 'run':
        selectedAgents.forEach(agentId => handleRunAgent(agentId))
        break
      case 'delete':
        if (confirm(`Delete ${selectedAgents.size} selected agents?`)) {
          selectedAgents.forEach(agentId => handleDeleteAgent(agentId))
        }
        break
      case 'export':
        // TODO: Implement export functionality
        alert('Export functionality coming soon!')
        break
    }
    setSelectedAgents(new Set())
  }

  const toggleAgentSelection = (agentId: string) => {
    const newSelection = new Set(selectedAgents)
    if (newSelection.has(agentId)) {
      newSelection.delete(agentId)
    } else {
      newSelection.add(agentId)
    }
    setSelectedAgents(newSelection)
  }

  const renderAgent = (agent: Agent) => {
    const isSelected = selectedAgents.has(agent.agent_id)
    
    if (viewMode === 'list') {
      return (
        <div key={agent.agent_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleAgentSelection(agent.agent_id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getTypeIcon(agent.agent_type)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {getStatusIcon(agent.status)}
                        {agent.status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        {agent.agent_type}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {agent.description || 'No description available'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-3">
                    <div>
                      <span className="font-medium">Model:</span>
                      <span className="ml-2">{agent.config?.model || 'Default'}</span>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">{new Date(agent.created_at).toLocaleDateString()}</span>
                    </div>
                    {agent.usage_stats && (
                      <>
                        <div>
                          <span className="font-medium">Runs:</span>
                          <span className="ml-2">{agent.usage_stats.total_runs}</span>
                        </div>
                        <div>
                          <span className="font-medium">Success Rate:</span>
                          <span className="ml-2">{(agent.usage_stats.success_rate * 100).toFixed(1)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                  {agent.capabilities?.expertise && (
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.expertise.slice(0, 3).map((expertise) => (
                        <span key={expertise} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {expertise}
                        </span>
                      ))}
                      {agent.capabilities.expertise.length > 3 && (
                        <span className="text-xs text-gray-500">+{agent.capabilities.expertise.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => handleRunAgent(agent.agent_id)}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run
                </Button>
                <Link href={`/agents/${agent.agent_id}/edit`}>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                <Button size="sm" variant="outline">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeleteAgent(agent.agent_id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Grid view
    return (
      <div key={agent.agent_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleAgentSelection(agent.agent_id)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              {getTypeIcon(agent.agent_type)}
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                {agent.name}
              </h3>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
              {getStatusIcon(agent.status)}
              {agent.status}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {agent.description || 'No description available'}
          </p>
          
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span>{agent.agent_type}</span>
              <span>{agent.config?.model || 'Default'}</span>
            </div>
            {agent.usage_stats && (
              <span>{agent.usage_stats.total_runs} runs</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleRunAgent(agent.agent_id)}
              className="flex-1 text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              Run
            </Button>
            <Link href={`/agents/${agent.agent_id}/edit`}>
              <Button size="sm" variant="outline" className="text-xs">
                <Edit className="w-3 h-3" />
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="text-xs">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderTeams = () => (
    <div className="space-y-4">
      {teams.map((team) => (
        <div key={team.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {team.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                {team.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{team.agents.length} agents</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(team.created_at).toLocaleDateString()}</span>
                </div>
                <div className={`flex items-center gap-1 ${team.active ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${team.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span>{team.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Edit className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {team.agents.map((agentId) => {
              const agent = agents.find(a => a.agent_id === agentId)
              if (!agent) return null
              
              return (
                <div key={agentId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {getTypeIcon(agent.agent_type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {agent.name}
                    </div>
                    <div className="text-sm text-gray-500">{agent.agent_type}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Agent Management
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                {filteredAgents.length} agents • {teams.length} teams
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedAgents.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    {selectedAgents.size} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('run')}>
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('teams')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'teams'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Teams
                </button>
              </div>
              <Link href="/teams">
                <Button variant="outline" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Manage Teams
                </Button>
              </Link>
              <Link href="/agents/create">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Agent
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
        {viewMode !== 'teams' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
                
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search agents..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="idle">Idle</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="assistant">Assistant</option>
                    <option value="researcher">Researcher</option>
                    <option value="analyzer">Analyzer</option>
                    <option value="orchestrator">Orchestrator</option>
                  </select>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Actions</h4>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Agents
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Code className="w-4 h-4 mr-2" />
                    View API
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-500">Loading agents...</span>
                </div>
              ) : filteredAgents.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No agents found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first agent'}
                  </p>
                  <Link href="/agents/create">
                    <Button>Create Your First Agent</Button>
                  </Link>
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' 
                    : 'space-y-4'
                }>
                  {filteredAgents.map(renderAgent)}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'teams' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Agent Teams
              </h2>
              <Link href="/teams/create">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Team
                </Button>
              </Link>
            </div>
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No teams found
                </h3>
                <p className="text-gray-500 mb-4">
                  Create teams to organize your agents for collaborative tasks
                </p>
                <Link href="/teams/create">
                  <Button>Create Your First Team</Button>
                </Link>
              </div>
            ) : (
              renderTeams()
            )}
          </div>
        )}
      </div>
    </div>
  )
}