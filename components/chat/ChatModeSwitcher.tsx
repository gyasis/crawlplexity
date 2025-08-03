'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bot, 
  Search, 
  Microscope, 
  Users, 
  ChevronDown,
  Plus,
  X,
  Check
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

export type ChatMode = 'search' | 'deep-research' | 'agent' | 'agent-group'

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
  agents: string[] // agent IDs
  active: boolean
}

interface ActiveContext {
  mode: ChatMode
  agentId?: string
  groupId?: string
  groupName?: string
  agents?: Agent[]
}

interface ChatModeSwitcherProps {
  currentMode: ChatMode
  activeContext: ActiveContext
  availableAgents: Agent[]
  availableGroups: AgentGroup[]
  onModeChange: (mode: ChatMode, context?: any) => void
  onAddAgent: (agentId: string) => void
  onAddGroup: (groupId: string) => void
  onRemoveAgent: (agentId: string) => void
  onRemoveGroup: (groupId: string) => void
}

export function ChatModeSwitcher({
  currentMode,
  activeContext,
  availableAgents,
  availableGroups,
  onModeChange,
  onAddAgent,
  onAddGroup,
  onRemoveAgent,
  onRemoveGroup
}: ChatModeSwitcherProps) {
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([])
  const [selectedGroups, setSelectedGroups] = useState<AgentGroup[]>([])

  // Update selected items when activeContext changes
  useEffect(() => {
    if (activeContext.agents) {
      setSelectedAgents(activeContext.agents)
    }
    if (activeContext.groupId) {
      const group = availableGroups.find(g => g.id === activeContext.groupId)
      if (group) {
        setSelectedGroups([group])
      }
    }
  }, [activeContext, availableGroups])

  const getModeIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'search': return <Search className="w-4 h-4" />
      case 'deep-research': return <Microscope className="w-4 h-4" />
      case 'agent': return <Bot className="w-4 h-4" />
      case 'agent-group': return <Users className="w-4 h-4" />
    }
  }

  const getModeLabel = (mode: ChatMode) => {
    switch (mode) {
      case 'search': return 'Search'
      case 'deep-research': return 'Deep Research'
      case 'agent': return 'Agent'
      case 'agent-group': return 'Agent Group'
    }
  }

  const getModeDescription = () => {
    switch (currentMode) {
      case 'search': 
        return 'Regular web search with AI analysis'
      case 'deep-research': 
        return '4-phase comprehensive research analysis'
      case 'agent': 
        return selectedAgents.length > 0 
          ? `Using: ${selectedAgents.map(a => a.name).join(', ')}`
          : 'SmallTalk agent orchestration'
      case 'agent-group': 
        return selectedGroups.length > 0
          ? `Using group: ${selectedGroups.map(g => g.name).join(', ')}`
          : 'Agent team collaboration'
    }
  }

  const handleAddAgent = (agent: Agent) => {
    if (!selectedAgents.find(a => a.agent_id === agent.agent_id)) {
      const newAgents = [...selectedAgents, agent]
      setSelectedAgents(newAgents)
      onAddAgent(agent.agent_id)
      
      // Switch to agent mode if not already
      if (currentMode !== 'agent') {
        onModeChange('agent', { agents: newAgents })
      }
    }
  }

  const handleRemoveAgent = (agentId: string) => {
    const newAgents = selectedAgents.filter(a => a.agent_id !== agentId)
    setSelectedAgents(newAgents)
    onRemoveAgent(agentId)
    
    // If no agents left, switch to search mode
    if (newAgents.length === 0 && currentMode === 'agent') {
      onModeChange('search')
    }
  }

  const handleAddGroup = (group: AgentGroup) => {
    if (!selectedGroups.find(g => g.id === group.id)) {
      const newGroups = [...selectedGroups, group]
      setSelectedGroups(newGroups)
      onAddGroup(group.id)
      
      // Switch to agent-group mode
      onModeChange('agent-group', { groupId: group.id, groupName: group.name })
    }
  }

  const handleRemoveGroup = (groupId: string) => {
    const newGroups = selectedGroups.filter(g => g.id !== groupId)
    setSelectedGroups(newGroups)
    onRemoveGroup(groupId)
    
    // If no groups left, switch to search mode
    if (newGroups.length === 0 && currentMode === 'agent-group') {
      onModeChange('search')
    }
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Current Mode Display */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          {getModeIcon(currentMode)}
          <span className="font-medium text-sm">{getModeLabel(currentMode)}</span>
        </div>
        
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {getModeDescription()}
        </div>
      </div>

      {/* Active Agents/Groups Display */}
      {(selectedAgents.length > 0 || selectedGroups.length > 0) && (
        <div className="flex items-center gap-1 flex-wrap">
          {selectedAgents.map((agent) => (
            <div
              key={agent.agent_id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full"
            >
              <Bot className="w-3 h-3" />
              <span>{agent.name}</span>
              <button
                onClick={() => handleRemoveAgent(agent.agent_id)}
                className="hover:text-blue-600 dark:hover:text-blue-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          {selectedGroups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 text-xs rounded-full"
            >
              <Users className="w-3 h-3" />
              <span>{group.name}</span>
              <button
                onClick={() => handleRemoveGroup(group.id)}
                className="hover:text-orange-600 dark:hover:text-orange-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mode Switcher Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="shrink-0">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Switch Mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Core Modes */}
          <DropdownMenuItem 
            onClick={() => onModeChange('search')}
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium">Regular Search</div>
              <div className="text-xs text-gray-500">Web search with AI analysis</div>
            </div>
            {currentMode === 'search' && <Check className="w-4 h-4 text-green-600" />}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => onModeChange('deep-research')}
            className="flex items-center gap-2"
          >
            <Microscope className="w-4 h-4" />
            <div className="flex-1">
              <div className="font-medium">Deep Research</div>
              <div className="text-xs text-gray-500">4-phase comprehensive analysis</div>
            </div>
            {currentMode === 'deep-research' && <Check className="w-4 h-4 text-green-600" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Add Agents</DropdownMenuLabel>
          
          {/* Available Agents */}
          {availableAgents.map((agent) => (
            <DropdownMenuItem 
              key={agent.agent_id}
              onClick={() => handleAddAgent(agent)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
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

          {availableGroups.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Add Agent Groups</DropdownMenuLabel>
              
              {availableGroups.map((group) => (
                <DropdownMenuItem 
                  key={group.id}
                  onClick={() => handleAddGroup(group)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}