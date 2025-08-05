'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  Position,
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Bot, Play, Check, Settings } from 'lucide-react'

// Custom Node Components
const TriggerNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-300 dark:bg-green-900/30 dark:border-green-700">
    <div className="flex items-center gap-2">
      <Play className="w-4 h-4 text-green-600 dark:text-green-400" />
      <div className="font-medium text-green-800 dark:text-green-200">{data.label}</div>
    </div>
    <div className="text-xs text-green-600 dark:text-green-400 mt-1">Workflow Start</div>
  </div>
)

const AgentNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700">
    <div className="flex items-center gap-2">
      <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      <div className="font-medium text-blue-800 dark:text-blue-200">{data.label}</div>
    </div>
    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
      {data.agentId ? 'Configured' : 'Select Agent'}
    </div>
  </div>
)

const OutputNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-purple-100 border-2 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700">
    <div className="flex items-center gap-2">
      <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
      <div className="font-medium text-purple-800 dark:text-purple-200">{data.label}</div>
    </div>
    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Final Output</div>
  </div>
)

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  output: OutputNode,
}

interface VisualWorkflowCanvasProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  agents?: any[]
  maxNodes?: number
}

export function VisualWorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  agents = [],
  maxNodes = 5
}: VisualWorkflowCanvasProps) {
  const defaultNodes: Node[] = [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 50, y: 50 },
      data: { label: 'Start' },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  ]

  const [nodes, setNodes, onNodesStateChange] = useNodesState(
    initialNodes.length > 0 ? initialNodes : defaultNodes
  )
  const [edges, setEdges, onEdgesStateChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = addEdge(params, edges)
      setEdges(newEdge)
      onEdgesChange?.(newEdge)
    },
    [edges, setEdges, onEdgesChange]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const addNode = useCallback((type: 'agent' | 'output') => {
    if (nodes.length >= maxNodes) return

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { 
        x: 50 + (nodes.length * 200), 
        y: type === 'output' ? 150 : 50 
      },
      data: { 
        label: type === 'agent' ? 'Select Agent' : 'Output',
        agentId: undefined 
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }

    const newNodes = [...nodes, newNode]
    setNodes(newNodes)
    onNodesChange?.(newNodes)
  }, [nodes, setNodes, onNodesChange, maxNodes])

  const removeNode = useCallback((nodeId: string) => {
    if (nodeId === 'trigger-1') return // Can't remove trigger
    
    const newNodes = nodes.filter(n => n.id !== nodeId)
    const newEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    
    setNodes(newNodes)
    setEdges(newEdges)
    onNodesChange?.(newNodes)
    onEdgesChange?.(newEdges)
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }, [nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, selectedNodeId])

  const updateNode = useCallback((nodeId: string, updates: any) => {
    const newNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...updates } } : node
    )
    setNodes(newNodes)
    onNodesChange?.(newNodes)
  }, [nodes, setNodes, onNodesChange])

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  )

  return (
    <div className="h-full flex">
      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesStateChange}
          onEdgesChange={onEdgesStateChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{ 
            animated: true,
            style: { strokeWidth: 2 }
          }}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>

        {/* Add Node Buttons */}
        {nodes.length < maxNodes && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={() => addNode('agent')}
              className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
              title="Add Agent Node"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Add Agent</span>
            </button>
            {!nodes.some(n => n.type === 'output') && (
              <button
                onClick={() => addNode('output')}
                className="flex items-center gap-2 px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors"
                title="Add Output Node"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Add Output</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      {selectedNode && (
        <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Configure Node
            </h3>
            {selectedNode.id !== 'trigger-1' && (
              <button
                onClick={() => removeNode(selectedNode.id)}
                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {selectedNode.type === 'agent' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Agent
                </label>
                <select
                  value={String(selectedNode.data.agentId || '')}
                  onChange={(e) => {
                    const selectedAgent = agents.find(a => a.agent_id === e.target.value)
                    updateNode(selectedNode.id, {
                      agentId: e.target.value,
                      label: selectedAgent ? selectedAgent.name : 'Select Agent'
                    })
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Choose an agent...</option>
                  {agents.map((agent) => (
                    <option key={agent.agent_id} value={agent.agent_id}>
                      {agent.name} ({agent.agent_type || 'Assistant'})
                    </option>
                  ))}
                </select>
              </div>

              {!!selectedNode.data.agentId && (
                <div className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                  <div className="font-medium">Agent Selected:</div>
                  <div>{String(selectedNode.data.label || 'Unknown')}</div>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'trigger' && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              This is the workflow starting point. Connect it to other nodes to define the flow.
            </div>
          )}

          {selectedNode.type === 'output' && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              This node represents the final output of your workflow.
            </div>
          )}
        </div>
      )}
    </div>
  )
}