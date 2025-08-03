'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bot, 
  Search, 
  Microscope, 
  Users, 
  Plus,
  X,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface ActiveAgentsBarProps {
  // Current active selections
  activeAgents: Agent[]
  activeGroups: AgentGroup[]
  
  // Available options
  availableAgents: Agent[]
  availableGroups: AgentGroup[]
  
  // Current mode (determines which gets priority)
  currentMode: 'search' | 'deep-research' | 'agents' | 'agent-groups'
  
  // Callbacks
  onAddAgent: (agent: Agent) => void
  onRemoveAgent: (agentId: string) => void
  onAddGroup: (group: AgentGroup) => void
  onRemoveGroup: (groupId: string) => void
  onModeSwitch: (mode: 'search' | 'deep-research' | 'agents' | 'agent-groups') => void
}

export function ActiveAgentsBar({
  activeAgents,
  activeGroups,
  availableAgents,
  availableGroups,
  currentMode,
  onAddAgent,
  onRemoveAgent,
  onAddGroup,
  onRemoveGroup,
  onModeSwitch
}: ActiveAgentsBarProps) {
  const hasActiveItems = activeAgents.length > 0 || activeGroups.length > 0

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'search': return <Search className="w-4 h-4" />
      case 'deep-research': return <Microscope className="w-4 h-4" />
      case 'agents': return <Bot className="w-4 h-4" />
      case 'agent-groups': return <Users className="w-4 h-4" />
      default: return <Search className="w-4 h-4" />
    }
  }

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'search': return 'Search'
      case 'deep-research': return 'Deep Research'
      case 'agents': return 'Agents'
      case 'agent-groups': return 'Agent Groups'
      default: return 'Search'
    }
  }

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'search': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
      case 'deep-research': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
      case 'agents': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'agent-groups': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Current Mode Indicator */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getModeColor(currentMode)}`}>
        {getModeIcon(currentMode)}
        <span>{getModeLabel(currentMode)}</span>
      </div>

      {/* Active Agents */}
      {activeAgents.map((agent) => (
        <div
          key={agent.agent_id}
          className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full"
        >
          <Bot className="w-3 h-3" />
          <span>{agent.name}</span>
          <button
            onClick={() => onRemoveAgent(agent.agent_id)}
            className="hover:text-blue-600 dark:hover:text-blue-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Active Groups */}
      {activeGroups.map((group) => (
        <div
          key={group.id}
          className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs rounded-full"
        >
          <Users className="w-3 h-3" />
          <span>{group.name}</span>
          <div className="text-xs text-green-600 dark:text-green-400">({group.agents.length})</div>
          <button
            onClick={() => onRemoveGroup(group.id)}
            className="hover:text-green-600 dark:hover:text-green-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mode Switcher */}
      <div className="flex items-center gap-1">
        <Button
          variant={currentMode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeSwitch('search')}
          className="h-8"
        >
          <Search className="w-3 h-3" />
        </Button>
        <Button
          variant={currentMode === 'deep-research' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeSwitch('deep-research')}
          className="h-8"
        >
          <Microscope className="w-3 h-3" />
        </Button>
        {hasActiveItems && (
          <>
            <Button
              variant={currentMode === 'agents' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeSwitch('agents')}
              className="h-8"
            >
              <Bot className="w-3 h-3" />
            </Button>
            <Button
              variant={currentMode === 'agent-groups' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeSwitch('agent-groups')}
              className="h-8"
            >
              <Users className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>

      {/* Add Agent/Group Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Plus className="w-3 h-3" />
          </Button>
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
                  onClick={() => onAddAgent(agent)}
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
              <DropdownMenuLabel>Add Agent Group</DropdownMenuLabel>
              {availableGroups
                .filter(group => !activeGroups.find(g => g.id === group.id))
                .map((group) => (
                <DropdownMenuItem 
                  key={group.id}
                  onClick={() => onAddGroup(group)}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="font-medium">{group.name}</div>
                    <div className="text-xs text-gray-500">
                      {group.description || `${group.agents.length} agents`}
                    </div>
                  </div>
                  {group.active && <div className="w-2 h-2 rounded-full bg-green-500" />}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {availableAgents.length === 0 && availableGroups.length === 0 && (
            <DropdownMenuItem disabled>
              No agents or groups available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}