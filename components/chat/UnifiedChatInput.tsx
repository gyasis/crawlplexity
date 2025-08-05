'use client'

import React, { useState, useRef } from 'react'
import { Send, Settings, Users, ChevronDown, Plus, X, Bot } from 'lucide-react'
import { ModeSwitcher, ModeStatus } from './ModeSwitcher'
import { useMode } from '@/contexts/ModeContext'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Agent {
  agent_id: string
  name: string
  description?: string
  status: 'idle' | 'running' | 'stopped' | 'error'
  agent_type?: string
}

interface AgentGroup {
  id: string
  name: string
  description?: string
  agents: string[]
  active: boolean
}

interface UnifiedChatInputProps {
  onSubmit: (query: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  // Agent management props
  activeAgents?: Agent[]
  activeGroups?: AgentGroup[]
  availableAgents?: Agent[]
  availableGroups?: AgentGroup[]
  onAddAgent?: (agent: Agent) => void
  onRemoveAgent?: (agentId: string) => void
  onAddGroup?: (group: AgentGroup) => void
  onRemoveGroup?: (groupId: string) => void
}

export function UnifiedChatInput({ 
  onSubmit, 
  placeholder = "Ask anything...", 
  disabled = false,
  className = '',
  activeAgents = [],
  activeGroups = [],
  availableAgents = [],
  availableGroups = [],
  onAddAgent,
  onRemoveAgent,
  onAddGroup,
  onRemoveGroup
}: UnifiedChatInputProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { currentMode, switchMode } = useMode()
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !disabled) {
      onSubmit(query.trim())
      setQuery('')
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Mode Controls Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <ModeSwitcher variant="tabs" size="sm" />
          <ModeStatus />
        </div>
        
        {/* Active Agents/Groups Display */}
        <div className="flex items-center gap-2">
          {/* Active Agents */}
          {activeAgents.map((agent) => (
            <div
              key={agent.agent_id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full"
            >
              <Bot className="w-3 h-3" />
              <span>{agent.name}</span>
              {onRemoveAgent && (
                <button
                  onClick={() => onRemoveAgent(agent.agent_id)}
                  className="hover:text-blue-600 dark:hover:text-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Active Teams/Groups */}
          {activeGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-xs rounded-full"
              title={`Team: ${group.description}`}
            >
              <Users className="w-3 h-3" />
              <span className="font-medium">{group.name}</span>
              <div className="text-xs text-purple-600 dark:text-purple-400">({group.agents.length})</div>
              {onRemoveGroup && (
                <button
                  onClick={() => onRemoveGroup(group.id)}
                  className="hover:text-purple-600 dark:hover:text-purple-200"
                  title="Remove team"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add Agent/Group Dropdown - The "+" button functionality! */}
          {(availableAgents.length > 0 || availableGroups.length > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Add Agents or Groups"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {availableAgents.length > 0 && (
                  <>
                    <DropdownMenuLabel>Add Agent</DropdownMenuLabel>
                    {availableAgents
                      .filter(agent => !activeAgents.find(a => a.agent_id === agent.agent_id))
                      .map((agent) => (
                      <DropdownMenuItem 
                        key={agent.agent_id}
                        onClick={() => {
                          if (onAddAgent) {
                            onAddAgent(agent)
                            // Auto-switch to agents mode if not already
                            if (currentMode !== 'agents' && currentMode !== 'agent-groups') {
                              switchMode('agents')
                            }
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Bot className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.description || agent.agent_type}</div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'running' ? 'bg-green-500' :
                          agent.status === 'idle' ? 'bg-blue-500' :
                          agent.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {availableGroups.length > 0 && (
                  <>
                    {availableAgents.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>🎯 Predefined Teams</DropdownMenuLabel>
                    {availableGroups
                      .filter(group => !activeGroups.find(g => g.id === group.id))
                      .map((group) => (
                      <DropdownMenuItem 
                        key={group.id}
                        onClick={() => {
                          if (onAddGroup) {
                            onAddGroup(group)
                            // Auto-switch to agent-groups mode
                            switchMode('agent-groups')
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        <div className="flex-1">
                          <div className="font-medium">{group.name}</div>
                          <div className="text-xs text-gray-500">
                            {group.description}
                          </div>
                          <div className="text-xs text-gray-400">
                            {group.agents.length} agents
                          </div>
                        </div>
                        {group.active && <div className="w-2 h-2 rounded-full bg-green-500" />}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {availableAgents.filter(agent => !activeAgents.find(a => a.agent_id === agent.agent_id)).length === 0 && 
                 availableGroups.filter(group => !activeGroups.find(g => g.id === group.id)).length === 0 && (
                  <DropdownMenuItem disabled>
                    No additional agents or groups available
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <button 
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-end">
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              minHeight: '48px',
              maxHeight: '120px',
              overflow: 'auto'
            }}
          />
          
          <button
            type="submit"
            disabled={!query.trim() || disabled}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
      
      {/* Quick Commands Hint */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Commands: /research, /agents, /agent &nbsp;•&nbsp; 
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd> to send, 
        <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Shift+Enter</kbd> for new line
      </div>
    </div>
  )
}

// Simplified version for existing usage
export function ChatInput({ onSubmit, placeholder, disabled, className }: UnifiedChatInputProps) {
  return (
    <UnifiedChatInput 
      onSubmit={onSubmit}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}