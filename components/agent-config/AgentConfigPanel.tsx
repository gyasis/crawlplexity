'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Settings, 
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
}

interface Tool {
  toolId: string;
  name: string;
  category: string;
  description: string;
}

interface MCPServer {
  serverId: string;
  name: string;
  type: string;
  status: string;
}

const defaultAgents: Agent[] = [
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'A knowledgeable research assistant specializing in gathering and analyzing information',
    capabilities: ['research', 'analysis', 'information gathering', 'summarization']
  },
  {
    id: 'coding-assistant',
    name: 'Coding Assistant', 
    description: 'An expert programming assistant proficient in multiple languages and debugging',
    capabilities: ['programming', 'debugging', 'code review', 'software development']
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'A data analysis expert with powerful computational tools',
    capabilities: ['data analysis', 'statistics', 'visualization', 'reporting']
  }
];

export function AgentConfigPanel() {
  const [agents] = useState<Agent[]>(defaultAgents);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [mcpServers, setMCPServers] = useState<MCPServer[]>([]);
  const [agentTools, setAgentTools] = useState<string[]>([]);
  const [agentServers, setAgentServers] = useState<string[]>([]);

  // Load available tools and MCP servers
  useEffect(() => {
    // Mock data - in production these would come from API calls
    setTools([
      { toolId: '1', name: 'calculator', category: 'computation', description: 'Mathematical calculations' },
      { toolId: '2', name: 'web_search', category: 'search', description: 'Web search functionality' },
      { toolId: '3', name: 'file_operations', category: 'utility', description: 'File management operations' }
    ]);

    setMCPServers([
      { serverId: '1', name: 'context7', type: 'stdio', status: 'connected' },
      { serverId: '2', name: 'filesystem', type: 'stdio', status: 'connected' },
      { serverId: '3', name: 'github', type: 'stdio', status: 'disconnected' }
    ]);
  }, []);

  // Load agent assignments when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      // Mock loading agent tools and servers
      // In production, this would fetch from API
      if (selectedAgent.id === 'research-assistant') {
        setAgentTools(['1', '2']); // calculator, web_search
        setAgentServers(['1', '2']); // context7, filesystem
      } else if (selectedAgent.id === 'coding-assistant') {
        setAgentTools(['1', '3']); // calculator, file_operations
        setAgentServers(['1', '2']); // context7, filesystem
      } else if (selectedAgent.id === 'data-analyst') {
        setAgentTools(['1', '2', '3']); // all tools
        setAgentServers(['1']); // context7
      } else {
        setAgentTools([]);
        setAgentServers([]);
      }
    }
  }, [selectedAgent]);

  const toggleTool = (toolId: string) => {
    setAgentTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const toggleServer = (serverId: string) => {
    setAgentServers(prev => 
      prev.includes(serverId) 
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const saveConfiguration = async () => {
    if (!selectedAgent) return;

    // Mock save - in production this would call the API
    console.log('Saving configuration for agent:', selectedAgent.id);
    console.log('Tools:', agentTools);
    console.log('MCP Servers:', agentServers);
    
    // Show success message or handle errors
    alert('Configuration saved successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Configuration</h1>
        <p className="text-gray-600">
          Assign tools and MCP servers to your AI agents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Available Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={cn(
                  'p-3 border rounded-lg cursor-pointer transition-colors',
                  selectedAgent?.id === agent.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-gray-600">{agent.description}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {agent.capabilities.slice(0, 2).map((cap) => (
                    <Badge key={cap} variant="secondary" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                  {agent.capabilities.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.capabilities.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        {selectedAgent ? (
          <>
            {/* Tools Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Tools for {selectedAgent.name}</span>
                  <Badge variant="outline">{agentTools.length} assigned</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tools.map((tool) => {
                  const isAssigned = agentTools.includes(tool.toolId);
                  return (
                    <div
                      key={tool.toolId}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer transition-colors',
                        isAssigned
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      onClick={() => toggleTool(tool.toolId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tool.name}</span>
                            {isAssigned ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 border border-gray-300 rounded-full" />
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{tool.description}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {tool.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* MCP Servers Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>MCP Servers for {selectedAgent.name}</span>
                  <Badge variant="outline">{agentServers.length} assigned</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mcpServers.map((server) => {
                  const isAssigned = agentServers.includes(server.serverId);
                  return (
                    <div
                      key={server.serverId}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer transition-colors',
                        isAssigned
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300',
                        server.status !== 'connected' && 'opacity-60'
                      )}
                      onClick={() => server.status === 'connected' && toggleServer(server.serverId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{server.name}</span>
                            {isAssigned ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 border border-gray-300 rounded-full" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {server.type}
                            </Badge>
                            <Badge 
                              variant={server.status === 'connected' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {server.status}
                            </Badge>
                          </div>
                        </div>
                        {server.status !== 'connected' && (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="text-center py-12">
                <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an Agent
                </h3>
                <p className="text-gray-600">
                  Choose an agent from the left panel to configure its tools and MCP servers.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Save Button */}
      {selectedAgent && (
        <div className="flex justify-end">
          <Button onClick={saveConfiguration} className="gap-2">
            <Settings className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      )}
    </div>
  );
}