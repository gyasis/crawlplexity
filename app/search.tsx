'use client'

import { UnifiedChatInput } from '@/components/chat/UnifiedChatInput'

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

interface SearchComponentProps {
  onSubmit: (query: string) => void
  isLoading: boolean
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

export function SearchComponent({ 
  onSubmit, 
  isLoading,
  activeAgents = [],
  activeGroups = [],
  availableAgents = [],
  availableGroups = [],
  onAddAgent,
  onRemoveAgent,
  onAddGroup,
  onRemoveGroup
}: SearchComponentProps) {
  return (
    <div className="max-w-4xl mx-auto pt-12">
      <UnifiedChatInput 
        onSubmit={onSubmit}
        placeholder="Ask anything..."
        disabled={isLoading}
        className=""
        activeAgents={activeAgents}
        activeGroups={activeGroups}
        availableAgents={availableAgents}
        availableGroups={availableGroups}
        onAddAgent={onAddAgent}
        onRemoveAgent={onRemoveAgent}
        onAddGroup={onAddGroup}
        onRemoveGroup={onRemoveGroup}
      />
    </div>
  )
}