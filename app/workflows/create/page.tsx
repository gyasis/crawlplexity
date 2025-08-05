'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  GitBranch, 
  Save, 
  Play, 
  ArrowLeft, 
  Settings, 
  Plus,
  LayoutGrid,
  List,
  Eye,
  Code,
  Zap,
  Bot,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { VisualWorkflowCanvas } from '@/components/sidebar/VisualWorkflowCanvas'
import { Node, Edge, Position } from '@xyflow/react'
import { useRouter } from 'next/navigation'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'agent' | 'output' | 'condition' | 'parallel'
  label: string
  agentId?: string
  config?: Record<string, any>
}

interface WorkflowSettings {
  name: string
  description: string
  workflow_type: 'agent' | 'agentic' | 'hybrid'
  orchestration_mode: 'sequential' | 'parallel' | 'auto'
  timeout: number
  retryPolicy: {
    maxAttempts: number
    backoffStrategy: 'fixed' | 'exponential' | 'linear'
    retryDelay: number
  }
  errorHandling: {
    strategy: 'stop' | 'continue' | 'fallback' | 'retry'
    fallbackWorkflow?: string
    notifications: boolean
  }
}

export default function CreateWorkflowPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'visual' | 'list' | 'preview' | 'code'>('visual')
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: { label: 'Start Trigger' },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [settings, setSettings] = useState<WorkflowSettings>({
    name: '',
    description: '',
    workflow_type: 'hybrid',
    orchestration_mode: 'auto',
    timeout: 300000,
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      retryDelay: 1000
    },
    errorHandling: {
      strategy: 'retry',
      notifications: true
    }
  })

  useEffect(() => {
    loadAgents()
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
    }
  }

  const handleNodesChange = useCallback((newNodes: Node[]) => {
    setNodes(newNodes)
  }, [])

  const handleEdgesChange = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges)
  }, [])

  const handleSave = async () => {
    if (!settings.name.trim()) {
      alert('Please enter a workflow name')
      return
    }

    if (nodes.length < 2) {
      alert('Workflow must have at least a trigger and one other node')
      return
    }

    setSaving(true)
    
    try {
      const workflowDefinition = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        connections: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: 'output',
          targetHandle: 'input'
        })),
        settings: {
          orchestrationMode: settings.orchestration_mode,
          timeout: settings.timeout,
          retryPolicy: settings.retryPolicy,
          errorHandling: settings.errorHandling
        }
      }

      const workflowData = {
        name: settings.name,
        description: settings.description || `Workflow with ${nodes.length} nodes`,
        definition: workflowDefinition,
        workflow_type: settings.workflow_type,
        orchestration_mode: settings.orchestration_mode,
        category: 'custom',
        status: 'draft'
      }

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/workflows?created=${result.data.workflow_id}`)
      } else {
        throw new Error('Failed to save workflow')
      }
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Failed to save workflow. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleTestRun = async () => {
    if (!settings.name.trim()) {
      alert('Please save the workflow first')
      return
    }

    // TODO: Implement test run functionality
    alert('Test run functionality coming soon!')
  }

  const addNode = (type: 'agent' | 'output' | 'condition' | 'parallel') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { 
        x: Math.random() * 400 + 200, 
        y: Math.random() * 300 + 200 
      },
      data: { 
        label: type === 'agent' ? 'Select Agent' : 
               type === 'output' ? 'Output' :
               type === 'condition' ? 'Condition' : 'Parallel'
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
    
    setNodes(prev => [...prev, newNode])
  }

  const renderToolbar = () => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <Link href="/workflows">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Workflows
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Workflow Builder
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('visual')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'visual'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="Visual Canvas"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'code'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
            title="Code View"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        <Button variant="outline" onClick={handleTestRun} className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Test Run
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>
    </div>
  )

  const renderNodePalette = () => (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
        Node Palette
      </h3>
      <div className="space-y-2">
        <button
          onClick={() => addNode('agent')}
          className="w-full flex items-center gap-3 p-3 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        >
          <Bot className="w-5 h-5 text-blue-600" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Agent</div>
            <div className="text-xs text-gray-500">AI agent task</div>
          </div>
        </button>
        
        <button
          onClick={() => addNode('condition')}
          className="w-full flex items-center gap-3 p-3 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
        >
          <Activity className="w-5 h-5 text-yellow-600" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Condition</div>
            <div className="text-xs text-gray-500">Decision point</div>
          </div>
        </button>
        
        <button
          onClick={() => addNode('parallel')}
          className="w-full flex items-center gap-3 p-3 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          <Zap className="w-5 h-5 text-purple-600" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Parallel</div>
            <div className="text-xs text-gray-500">Concurrent tasks</div>
          </div>
        </button>
        
        <button
          onClick={() => addNode('output')}
          className="w-full flex items-center gap-3 p-3 text-left rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
        >
          <Settings className="w-5 h-5 text-green-600" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Output</div>
            <div className="text-xs text-gray-500">Final result</div>
          </div>
        </button>
      </div>
    </div>
  )

  const renderSettingsPanel = () => (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
        Workflow Settings
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter workflow name..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={settings.description}
            onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this workflow does..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            value={settings.workflow_type}
            onChange={(e) => setSettings(prev => ({ ...prev, workflow_type: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="agent">Agent - Structured workflow</option>
            <option value="agentic">Agentic - Autonomous agents</option>
            <option value="hybrid">Hybrid - Mixed approach</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Orchestration Mode
          </label>
          <select
            value={settings.orchestration_mode}
            onChange={(e) => setSettings(prev => ({ ...prev, orchestration_mode: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="sequential">Sequential</option>
            <option value="parallel">Parallel</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Timeout (ms)
          </label>
          <input
            type="number"
            value={settings.timeout}
            onChange={(e) => setSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
            min={1000}
            max={3600000}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Retry Policy
          </label>
          <div className="space-y-2">
            <input
              type="number"
              value={settings.retryPolicy.maxAttempts}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                retryPolicy: {...prev.retryPolicy, maxAttempts: parseInt(e.target.value)}
              }))}
              placeholder="Max attempts"
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={settings.retryPolicy.backoffStrategy}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                retryPolicy: {...prev.retryPolicy, backoffStrategy: e.target.value as any}
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="fixed">Fixed delay</option>
              <option value="exponential">Exponential backoff</option>
              <option value="linear">Linear backoff</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMainContent = () => {
    switch (viewMode) {
      case 'visual':
        return (
          <div className="flex-1 bg-gray-50 dark:bg-gray-900">
            <VisualWorkflowCanvas
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              agents={agents}
              maxNodes={50} // Allow many more nodes in full-page mode
            />
          </div>
        )
      
      case 'list':
        return (
          <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Workflow Nodes ({nodes.length})
            </h3>
            <div className="space-y-3">
              {nodes.map((node, index) => (
                <div key={node.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {String(node.data.label)}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {node.type}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'preview':
        return (
          <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Workflow Preview
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {settings.name || 'Untitled Workflow'}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {settings.description || 'No description provided'}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Type:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400 capitalize">{settings.workflow_type}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Nodes:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{nodes.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Connections:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{edges.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Timeout:</span>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">{settings.timeout / 1000}s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'code':
        return (
          <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Workflow Definition (JSON)
            </h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400">
                {JSON.stringify({
                  name: settings.name,
                  description: settings.description,
                  workflow_type: settings.workflow_type,
                  definition: {
                    nodes: nodes.map(node => ({
                      id: node.id,
                      type: node.type,
                      position: node.position,
                      data: node.data
                    })),
                    connections: edges.map(edge => ({
                      id: edge.id,
                      source: edge.source,
                      target: edge.target
                    })),
                    settings
                  }
                }, null, 2)}
              </pre>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {renderToolbar()}
      <div className="flex-1 flex">
        {renderNodePalette()}
        {renderMainContent()}
        {renderSettingsPanel()}
      </div>
    </div>
  )
}