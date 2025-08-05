'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users,
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
  Bot,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  TrendingUp,
  FileText,
  Download,
  Upload,
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
}

interface AgentTeam {
  id: string
  name: string
  description: string
  agents: string[]
  created_at: string
  updated_at: string
  active: boolean
  leader?: string
  category?: string
  collaboration_type: 'sequential' | 'parallel' | 'hierarchical' | 'mesh'
  performance_metrics?: {
    total_runs: number
    success_rate: number
    avg_response_time: number
    last_used: string
  }
  settings?: {
    auto_assign_tasks: boolean
    load_balancing: boolean
    fault_tolerance: boolean
    communication_protocol: 'direct' | 'broadcast' | 'hub'
  }
}

const COLLABORATION_TYPES = [
  {
    id: 'sequential',
    name: 'Sequential',
    description: 'Agents work one after another in order',
    icon: ArrowRight,
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    id: 'parallel',
    name: 'Parallel',
    description: 'Agents work simultaneously on different parts',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    id: 'hierarchical',
    name: 'Hierarchical',
    description: 'Leader agent coordinates subordinate agents',
    icon: Crown,
    color: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'mesh',
    name: 'Mesh',
    description: 'All agents can communicate with each other',
    icon: Target,
    color: 'text-green-600 dark:text-green-400'
  }
]

const TEAM_CATEGORIES = [
  { id: 'research', name: 'Research & Analysis', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  { id: 'development', name: 'Development', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  { id: 'support', name: 'Customer Support', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  { id: 'creative', name: 'Creative', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400' },
  { id: 'operations', name: 'Operations', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  { id: 'general', name: 'General Purpose', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' }
]

export default function TeamsPage() {
  const [teams, setTeams] = useState<AgentTeam[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'analytics'>('grid')
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadTeams()
    loadAgents()
  }, [])

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/agent-groups')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      if (response.ok) {
        const data = await response.json()
        setAgents(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || team.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && team.active) ||
                         (statusFilter === 'inactive' && !team.active)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const getCollaborationType = (type: string) => {
    return COLLABORATION_TYPES.find(t => t.id === type) || COLLABORATION_TYPES[0]
  }

  const getCategoryColor = (category?: string) => {
    return TEAM_CATEGORIES.find(c => c.id === category)?.color || TEAM_CATEGORIES[5].color
  }

  const getTeamAgents = (agentIds: string[]) => {
    return agentIds.map(id => agents.find(agent => agent.agent_id === id)).filter(Boolean) as Agent[]
  }

  const handleRunTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/agent-groups/${teamId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'Team test run',
          sessionId: 'team-test',
          userId: 'user'
        })
      })
      
      if (response.ok) {
        loadTeams()
      }
    } catch (error) {
      console.error('Failed to run team:', error)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return
    
    try {
      const response = await fetch(`/api/agent-groups/${teamId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadTeams()
      }
    } catch (error) {
      console.error('Failed to delete team:', error)
    }
  }

  const toggleTeamSelection = (teamId: string) => {
    const newSelection = new Set(selectedTeams)
    if (newSelection.has(teamId)) {
      newSelection.delete(teamId)
    } else {
      newSelection.add(teamId)
    }
    setSelectedTeams(newSelection)
  }

  const handleBulkAction = (action: string) => {
    if (selectedTeams.size === 0) return
    
    switch (action) {
      case 'activate':
        // TODO: Implement bulk activate
        alert('Bulk activate functionality coming soon!')
        break
      case 'deactivate':
        // TODO: Implement bulk deactivate
        alert('Bulk deactivate functionality coming soon!')
        break
      case 'export':
        // TODO: Implement export functionality
        alert('Export functionality coming soon!')
        break
      case 'delete':
        if (confirm(`Delete ${selectedTeams.size} selected teams?`)) {
          selectedTeams.forEach(teamId => handleDeleteTeam(teamId))
        }
        break
    }
    setSelectedTeams(new Set())
  }

  const renderTeam = (team: AgentTeam) => {
    const teamAgents = getTeamAgents(team.agents)
    const collaboration = getCollaborationType(team.collaboration_type)
    const CollabIcon = collaboration.icon
    const isSelected = selectedTeams.has(team.id)

    if (viewMode === 'list') {
      return (
        <div key={team.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTeamSelection(team.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        team.active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {team.active ? 'Active' : 'Inactive'}
                      </span>
                      {team.category && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(team.category)}`}>
                          {TEAM_CATEGORIES.find(c => c.id === team.category)?.name}
                        </span>
                      )}
                      <div className={`flex items-center gap-1 ${collaboration.color}`} title={collaboration.description}>
                        <CollabIcon className="w-4 h-4" />
                        <span className="text-xs">{collaboration.name}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {team.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">Agents:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{team.agents.length}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">Created:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{new Date(team.created_at).toLocaleDateString()}</span>
                    </div>
                    {team.performance_metrics && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">Success Rate:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{(team.performance_metrics.success_rate * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teamAgents.slice(0, 6).map((agent) => (
                      <div key={agent.agent_id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <Bot className="w-4 h-4 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {agent.name}
                          </div>
                          <div className="text-xs text-gray-500">{agent.agent_type}</div>
                        </div>
                        {team.leader === agent.agent_id && (
                          <span title="Team Leader">
                            <Crown className="w-3 h-3 text-yellow-500" />
                          </span>
                        )}
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'running' ? 'bg-green-500' :
                          agent.status === 'idle' ? 'bg-blue-500' :
                          agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                      </div>
                    ))}
                    {teamAgents.length > 6 && (
                      <div className="text-xs text-gray-500 p-2">
                        +{teamAgents.length - 6} more agents
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => handleRunTeam(team.id)}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run Team
                </Button>
                <Link href={`/teams/${team.id}/edit`}>
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
                  onClick={() => handleDeleteTeam(team.id)}
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
      <div key={team.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleTeamSelection(team.id)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                {team.name}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                team.active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
              }`}>
                {team.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {team.description}
          </p>
          
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                <span>{team.agents.length}</span>
              </div>
              <div className={`flex items-center gap-1 ${collaboration.color}`}>
                <CollabIcon className="w-3 h-3" />
                <span>{collaboration.name}</span>
              </div>
            </div>
            {team.performance_metrics && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{(team.performance_metrics.success_rate * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>

          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2">
              {teamAgents.slice(0, 4).map((agent) => (
                <div key={agent.agent_id} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    agent.status === 'running' ? 'bg-green-500' :
                    agent.status === 'idle' ? 'bg-blue-500' :
                    agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                  <span className="truncate">{agent.name}</span>
                  {team.leader === agent.agent_id && (
                    <Crown className="w-2 h-2 text-yellow-500" />
                  )}
                </div>
              ))}
              {teamAgents.length > 4 && (
                <div className="text-xs text-gray-500">
                  +{teamAgents.length - 4} more
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleRunTeam(team.id)}
              className="flex-1 text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              Run
            </Button>
            <Link href={`/teams/${team.id}/edit`}>
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

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{teams.length}</div>
              <div className="text-sm text-gray-500">Total Teams</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{teams.filter(t => t.active).length}</div>
              <div className="text-sm text-gray-500">Active Teams</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {teams.reduce((sum, team) => sum + team.agents.length, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Agents</div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(teams.filter(t => t.performance_metrics).reduce((sum, team) => 
                  sum + (team.performance_metrics?.success_rate || 0), 0) / 
                  Math.max(teams.filter(t => t.performance_metrics).length, 1) * 100)}%
              </div>
              <div className="text-sm text-gray-500">Avg Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Types */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Collaboration Types Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLLABORATION_TYPES.map((type) => {
            const count = teams.filter(t => t.collaboration_type === type.id).length
            const percentage = teams.length > 0 ? (count / teams.length * 100).toFixed(1) : '0'
            const Icon = type.icon
            
            return (
              <div key={type.id} className="text-center">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center`}>
                  <Icon className={`w-8 h-8 ${type.color}`} />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{type.name}</div>
                <div className="text-xs text-gray-500">{percentage}%</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Recent Team Activity
        </h3>
        <div className="space-y-3">
          {teams.slice(0, 5).map((team) => (
            <div key={team.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{team.name}</div>
                  <div className="text-sm text-gray-500">
                    {team.performance_metrics?.last_used ? 
                      `Last used ${new Date(team.performance_metrics.last_used).toLocaleDateString()}` :
                      `Created ${new Date(team.created_at).toLocaleDateString()}`
                    }
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  team.active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                }`}>
                  {team.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-gray-500">{team.agents.length} agents</span>
              </div>
            </div>
          ))}
        </div>
      </div>
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
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Team Management
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                {filteredTeams.length} teams • {teams.reduce((sum, team) => sum + team.agents.length, 0)} total agents
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedTeams.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-blue-700 dark:text-blue-400">
                    {selectedTeams.size} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                    <CheckCircle className="w-4 h-4" />
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
                  onClick={() => setViewMode('analytics')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    viewMode === 'analytics'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Analytics
                </button>
              </div>
              <Link href="/agents">
                <Button variant="outline" className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Manage Agents
                </Button>
              </Link>
              <Link href="/teams/create">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Team
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
        {viewMode === 'analytics' ? (
          renderAnalytics()
        ) : (
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
                      placeholder="Search teams..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Categories</option>
                    {TEAM_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Actions</h4>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Teams
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-500">Loading teams...</span>
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No teams found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Get started by creating your first team'}
                  </p>
                  <Link href="/teams/create">
                    <Button>Create Your First Team</Button>
                  </Link>
                </div>
              ) : (
                <div className={
                  viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' 
                    : 'space-y-4'
                }>
                  {filteredTeams.map(renderTeam)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}