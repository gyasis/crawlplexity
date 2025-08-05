'use client'

import React, { useState, useCallback } from 'react'
import { 
  Plus, 
  Bot, 
  Play, 
  GitBranch, 
  Settings, 
  ArrowRight, 
  X,
  Check,
  AlertCircle,
  Save,
  LayoutGrid,
  List
} from 'lucide-react'
import { VisualWorkflowCanvas } from './VisualWorkflowCanvas'
import { Node, Edge, Position } from '@xyflow/react'

interface QuickWorkflowNode {
  id: string
  type: 'trigger' | 'agent' | 'output'
  label: string
  agentId?: string
  config?: Record<string, any>
}

interface QuickWorkflowBuilderProps {
  onClose: () => void
  onSave: (workflow: any) => Promise<void>
  initialTemplate?: WorkflowTemplate | null
}

interface WorkflowTemplate {
  template_id: string
  name: string
  description: string
  category: string
  definition: any
  complexity_level: string
  estimated_nodes: number
  orchestration_type: string
  created_at: string
}

export function QuickWorkflowBuilder({ onClose, onSave, initialTemplate }: QuickWorkflowBuilderProps) {
  const [nodes, setNodes] = useState<QuickWorkflowNode[]>([
    { id: 'trigger-1', type: 'trigger', label: 'Start' }
  ])
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'visual'>('visual') // Default to visual

  // Visual mode state
  const [visualNodes, setVisualNodes] = useState<Node[]>([])
  const [visualEdges, setVisualEdges] = useState<Edge[]>([])

  React.useEffect(() => {
    loadAvailableAgents()
    
    // Initialize from template if provided
    if (initialTemplate) {
      initializeFromTemplate(initialTemplate)
    }
  }, [initialTemplate])

  const initializeFromTemplate = (template: WorkflowTemplate) => {
    // Set workflow name and description from template
    setWorkflowName(template.name + ' (Copy)')
    setWorkflowDescription(template.description)

    // Convert template definition to quick workflow nodes
    if (template.definition?.nodes) {
      const templateNodes: QuickWorkflowNode[] = template.definition.nodes.map((node: any) => ({
        id: node.id,
        type: node.type === 'trigger' ? 'trigger' : node.type === 'output' ? 'output' : 'agent',
        label: node.data?.label || node.type,
        agentId: node.data?.agentId,
        config: node.data?.config || {}
      }))

      // Ensure we have at least a trigger node
      if (!templateNodes.some(n => n.type === 'trigger')) {
        templateNodes.unshift({ id: 'trigger-1', type: 'trigger', label: 'Start' })
      }

      const finalNodes = templateNodes.slice(0, 5) // Limit to 5 nodes for quick builder
      setNodes(finalNodes)
      
      // Convert to visual format
      const vNodes: Node[] = finalNodes.map((node, index) => ({
        id: node.id,
        type: node.type,
        position: { x: 50 + (index * 200), y: 50 },
        data: {
          label: node.label,
          agentId: node.agentId,
          config: node.config
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }))

      const vEdges: Edge[] = finalNodes.slice(0, -1).map((node, index) => ({
        id: `edge-${index}`,
        source: node.id,
        target: finalNodes[index + 1]?.id || '',
        animated: true,
      }))

      setVisualNodes(vNodes)
      setVisualEdges(vEdges)
    }
  }

  const loadAvailableAgents = async () => {
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

  const addNode = useCallback((type: 'agent' | 'output') => {
    if (nodes.length >= 5) return // Max 5 nodes for quick builder
    
    const newNode: QuickWorkflowNode = {
      id: `${type}-${Date.now()}`,
      type,
      label: type === 'agent' ? 'Select Agent' : 'Output'
    }
    
    setNodes(prev => [...prev, newNode])
  }, [nodes.length])

  const removeNode = useCallback((nodeId: string) => {
    if (nodeId === 'trigger-1') return // Can't remove trigger
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }, [selectedNodeId])

  const updateNode = useCallback((nodeId: string, updates: Partial<QuickWorkflowNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ))
  }, [])

  // Sync visual nodes back to list format
  const handleVisualNodesChange = useCallback((newNodes: Node[]) => {
    const listNodes: QuickWorkflowNode[] = newNodes.map(node => ({
      id: node.id,
      type: node.type as 'trigger' | 'agent' | 'output',
      label: String(node.data.label || ''),
      agentId: node.data.agentId as string | undefined,
      config: node.data.config || {}
    }))
    setNodes(listNodes)
    setVisualNodes(newNodes)
  }, [])

  const handleVisualEdgesChange = useCallback((newEdges: Edge[]) => {
    setVisualEdges(newEdges)
  }, [])

  const getCurrentNodes = () => viewMode === 'visual' ? visualNodes.length : nodes.length

  const handleSave = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name')
      return
    }

    const currentNodes = viewMode === 'visual' ? visualNodes : nodes
    if ((viewMode === 'visual' ? visualNodes.length : nodes.length) < 2) {
      alert('Workflow must have at least a trigger and one other node')
      return
    }

    setSaving(true)
    
    try {
      // Convert to workflow definition based on current view mode
      const workflowDefinition = viewMode === 'visual' ? {
        nodes: visualNodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        connections: visualEdges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: 'output',
          targetHandle: 'input'
        })),
        settings: {
          orchestrationMode: 'auto' as const,
          timeout: 300000,
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'exponential' as const,
            retryDelay: 1000
          }
        }
      } : {
        nodes: nodes.map((node, index) => ({
          id: node.id,
          type: node.type,
          position: { x: 50, y: index * 100 },
          data: {
            label: node.label,
            agentId: node.agentId,
            config: node.config || {}
          }
        })),
        connections: nodes.slice(0, -1).map((node, index) => ({
          id: `conn-${index}`,
          source: node.id,
          target: nodes[index + 1]?.id || '',
          sourceHandle: 'output',
          targetHandle: 'input'
        })),
        settings: {
          orchestrationMode: 'auto' as const,
          timeout: 300000,
          retryPolicy: {
            maxAttempts: 3,
            backoffStrategy: 'exponential' as const,
            retryDelay: 1000
          }
        }
      }

      const nodeCount = viewMode === 'visual' ? visualNodes.length : nodes.length
      const workflowData = {
        name: workflowName,
        description: workflowDescription || `Quick workflow with ${nodeCount} nodes`,
        definition: workflowDefinition,
        workflow_type: 'hybrid' as const,
        orchestration_mode: 'auto' as const,
        category: 'quick-build',
        status: 'active' as const
      }

      await onSave(workflowData)
      onClose()
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900 dark:text-white">Quick Builder</span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('visual')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'visual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Visual Canvas"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="List View"
            >
              <List className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Workflow Details */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workflow Name *
            </label>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Enter workflow name..."
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Main Content - Conditional Rendering */}
      {viewMode === 'visual' ? (
        <div className="flex-1 min-h-0">
          <VisualWorkflowCanvas
            initialNodes={visualNodes}
            initialEdges={visualEdges}
            onNodesChange={handleVisualNodesChange}
            onEdgesChange={handleVisualEdgesChange}
            agents={agents}
            maxNodes={5}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* Nodes */}
            {nodes.map((node, index) => (
              <div key={node.id}>
                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedNodeId === node.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {node.type === 'trigger' && <Play className="w-4 h-4 text-green-500" />}
                      {node.type === 'agent' && <Bot className="w-4 h-4 text-blue-500" />}
                      {node.type === 'output' && <Check className="w-4 h-4 text-purple-500" />}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {node.label}
                        </div>
                        <div className="text-xs text-gray-500">
                          {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {node.type === 'agent' && !node.agentId && (
                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                      )}
                      {node.id !== 'trigger-1' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNode(node.id)
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Remove node"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Node Configuration */}
                  {selectedNodeId === node.id && node.type === 'agent' && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Agent
                      </label>
                      <select
                        value={node.agentId || ''}
                        onChange={(e) => {
                          const selectedAgent = agents.find(a => a.agent_id === e.target.value)
                          updateNode(node.id, { 
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
                  )}
                </div>

                {/* Connection Arrow */}
                {index < nodes.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}

            {/* Add Node Buttons */}
            {nodes.length < 5 && (
              <div className="flex gap-2">
                <button
                  onClick={() => addNode('agent')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Bot className="w-3 h-3" />
                  <span>Add Agent</span>
                </button>
                {!nodes.some(n => n.type === 'output') && (
                  <button
                    onClick={() => addNode('output')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Add Output</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !workflowName.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  <span>Save Workflow</span>
                </>
              )}
            </button>
          </div>
          
          {/* Navigation Links */}
          <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => window.location.href = '/workflows/create'}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Advanced Workflow Builder"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Advanced Builder</span>
            </button>
            <button
              onClick={() => window.location.href = '/workflows/templates'}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
              title="Browse Templates"
            >
              <GitBranch className="w-3 h-3" />
              <span>Templates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}