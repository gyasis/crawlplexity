'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bot, 
  Play, 
  Pause, 
  Square, 
  Plus, 
  Settings2, 
  Users, 
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Edit
} from 'lucide-react'
import { AgentConfigModal } from './AgentConfigModal'

interface Agent {
  agent_id: string
  name: string
  description?: string
  status: 'idle' | 'running' | 'stopped' | 'error'
  agent_type?: string
  created_at: string
  updated_at: string
}

interface AgentManagementProps {
  isExpanded: boolean
  isSemiCollapsed: boolean
}

export function AgentManagement({ isExpanded, isSemiCollapsed }: AgentManagementProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orchestrationEnabled, setOrchestrationEnabled] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  useEffect(() => {
    loadAgents()
    const interval = setInterval(loadAgents, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
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

  const updateAgentStatus = async (agentId: string, status: Agent['status']) => {
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        await loadAgents() // Refresh agent list
      }
    } catch (error) {
      console.error('Failed to update agent status:', error)
    }
  }

  const handleCreateAgent = () => {
    setEditingAgent(null)
    setIsModalOpen(true)
  }

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setIsModalOpen(true)
  }

  const handleSaveAgent = async (agentManifest: any) => {
    try {
      const method = editingAgent ? 'PUT' : 'POST'
      const url = editingAgent ? `/api/agents/${editingAgent.agent_id}` : '/api/agents'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentManifest)
      })

      if (response.ok) {
        await loadAgents() // Refresh agent list
        setIsModalOpen(false)
        setEditingAgent(null)
      } else {
        throw new Error('Failed to save agent')
      }
    } catch (error) {
      console.error('Failed to save agent:', error)
      throw error
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAgent(null)
  }

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="w-3 h-3 text-green-500 animate-pulse" />
      case 'idle':
        return <Clock className="w-3 h-3 text-blue-500" />
      case 'stopped':
        return <Square className="w-3 h-3 text-gray-500" />
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return <CheckCircle className="w-3 h-3 text-gray-400" />
    }
  }

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'idle':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'stopped':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  // Semi-collapsed view
  if (isSemiCollapsed) {
    return (
      <div className="space-y-2">
        <div className="flex justify-center" title="Agent Management">
          <Bot className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex flex-col items-center space-y-1">
          {agents.slice(0, 3).map((agent) => (
            <div
              key={agent.agent_id}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={`${agent.name} (${agent.status})`}
            >
              {getStatusIcon(agent.status)}
            </div>
          ))}
          {agents.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MoreHorizontal className="w-3 h-3 text-gray-500" />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Expanded view
  if (!isExpanded) return null

  return (
    <div className="space-y-3">
      {/* Header with orchestration toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Bot className="w-4 h-4" />
          <span>Agents</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {agents.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOrchestrationEnabled(!orchestrationEnabled)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              orchestrationEnabled 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
            title={`Orchestration: ${orchestrationEnabled ? 'On' : 'Off'}`}
          >
            {orchestrationEnabled ? 'Auto' : 'Manual'}
          </button>
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Manage Agents"
          >
            <Settings2 className="w-3 h-3 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Agent List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {loading ? (
          <div className="text-xs text-gray-500 text-center py-4">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No agents configured
            <br />
            <button 
              onClick={handleCreateAgent}
              className="text-blue-500 hover:text-blue-600 mt-1"
            >
              Add your first agent
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.agent_id}
              className={`p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                currentAgent === agent.agent_id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={() => setCurrentAgent(currentAgent === agent.agent_id ? null : agent.agent_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getStatusIcon(agent.status)}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {agent.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {agent.agent_type || 'Assistant'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
              </div>
              
              {/* Expanded agent controls */}
              {currentAgent === agent.agent_id && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {agent.status !== 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAgentStatus(agent.agent_id, 'running')
                          }}
                          className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Start Agent"
                        >
                          <Play className="w-3 h-3 text-green-600" />
                        </button>
                      )}
                      {agent.status === 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAgentStatus(agent.agent_id, 'idle')
                          }}
                          className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded transition-colors"
                          title="Pause Agent"
                        >
                          <Pause className="w-3 h-3 text-yellow-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateAgentStatus(agent.agent_id, 'stopped')
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Stop Agent"
                      >
                        <Square className="w-3 h-3 text-red-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditAgent(agent)
                        }}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit Agent"
                      >
                        <Edit className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(agent.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  {agent.description && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {agent.description.substring(0, 60)}...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCreateAgent}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded transition-colors"
          title="Create New Agent"
        >
          <Plus className="w-3 h-3" />
          <span>New Agent</span>
        </button>
        <button
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
          title="Manage Teams"
        >
          <Users className="w-3 h-3" />
        </button>
      </div>

      {/* Agent Configuration Modal */}
      <AgentConfigModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAgent}
        editingAgent={editingAgent}
      />
    </div>
  )
}