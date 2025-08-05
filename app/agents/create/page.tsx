'use client'

import React, { useState, useEffect } from 'react'
import { 
  Bot,
  ArrowLeft,
  Save,
  Play,
  Settings,
  Brain,
  Zap,
  Users,
  Code,
  FileText,
  Sparkles,
  AlertCircle,
  Info,
  Plus,
  X,
  Upload,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface AgentConfig {
  name: string
  description: string
  agent_type: string
  model: string
  temperature: number
  maxTokens: number
  personality: string
  systemPrompt: string
  tools: string[]
  capabilities: {
    expertise: string[]
    taskTypes: string[]
    complexity: 'beginner' | 'intermediate' | 'advanced'
    contextAwareness: number
  }
  metadata: {
    version: string
    author: string
    tags: string[]
  }
  advanced: {
    timeout: number
    retryAttempts: number
    memoryEnabled: boolean
    loggingLevel: 'none' | 'basic' | 'detailed'
    rateLimiting: {
      enabled: boolean
      requestsPerMinute: number
    }
  }
}

const AGENT_TYPES = [
  { 
    id: 'assistant', 
    name: 'General Assistant', 
    icon: Bot, 
    description: 'Versatile agent for general tasks and conversations',
    color: 'text-blue-600 dark:text-blue-400'
  },
  { 
    id: 'researcher', 
    name: 'Research Specialist', 
    icon: Brain, 
    description: 'Specialized in research, analysis, and information gathering',
    color: 'text-purple-600 dark:text-purple-400'
  },
  { 
    id: 'analyzer', 
    name: 'Data Analyzer', 
    icon: Zap, 
    description: 'Expert in data processing, analysis, and insights',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  { 
    id: 'orchestrator', 
    name: 'Task Orchestrator', 
    icon: Settings, 
    description: 'Coordinates multiple agents and complex workflows',
    color: 'text-green-600 dark:text-green-400'
  },
  { 
    id: 'creative', 
    name: 'Creative Writer', 
    icon: Sparkles, 
    description: 'Focused on creative writing, content generation, and storytelling',
    color: 'text-pink-600 dark:text-pink-400'
  },
  { 
    id: 'support', 
    name: 'Customer Support', 
    icon: Users, 
    description: 'Specialized in customer service and support interactions',
    color: 'text-indigo-600 dark:text-indigo-400'
  }
]

const AVAILABLE_TOOLS = [
  'web_search', 'file_reader', 'code_executor', 'calculator', 'calendar', 
  'email_sender', 'database_query', 'api_caller', 'image_generator', 'translator'
]

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google' },
  { id: 'llama-3-70b', name: 'Llama 3 70B', provider: 'Meta' },
]

export default function CreateAgentPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newExpertise, setNewExpertise] = useState('')
  const [newTaskType, setNewTaskType] = useState('')

  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    agent_type: 'assistant',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    personality: '',
    systemPrompt: '',
    tools: [],
    capabilities: {
      expertise: [],
      taskTypes: [],
      complexity: 'intermediate',
      contextAwareness: 5
    },
    metadata: {
      version: '1.0.0',
      author: '',
      tags: []
    },
    advanced: {
      timeout: 30000,
      retryAttempts: 3,
      memoryEnabled: true,
      loggingLevel: 'basic',
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60
      }
    }
  })

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
  }

  const addTag = () => {
    if (newTag.trim() && !config.metadata.tags.includes(newTag.trim())) {
      updateConfig('metadata.tags', [...config.metadata.tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    updateConfig('metadata.tags', config.metadata.tags.filter(t => t !== tag))
  }

  const addExpertise = () => {
    if (newExpertise.trim() && !config.capabilities.expertise.includes(newExpertise.trim())) {
      updateConfig('capabilities.expertise', [...config.capabilities.expertise, newExpertise.trim()])
      setNewExpertise('')
    }
  }

  const removeExpertise = (expertise: string) => {
    updateConfig('capabilities.expertise', config.capabilities.expertise.filter(e => e !== expertise))
  }

  const addTaskType = () => {
    if (newTaskType.trim() && !config.capabilities.taskTypes.includes(newTaskType.trim())) {
      updateConfig('capabilities.taskTypes', [...config.capabilities.taskTypes, newTaskType.trim()])
      setNewTaskType('')
    }
  }

  const removeTaskType = (taskType: string) => {
    updateConfig('capabilities.taskTypes', config.capabilities.taskTypes.filter(t => t !== taskType))
  }

  const toggleTool = (tool: string) => {
    const tools = config.tools.includes(tool)
      ? config.tools.filter(t => t !== tool)
      : [...config.tools, tool]
    updateConfig('tools', tools)
  }

  const handleSave = async () => {
    if (!config.name.trim()) {
      alert('Please enter an agent name')
      return
    }

    setSaving(true)
    
    try {
      const agentData = {
        name: config.name,
        description: config.description,
        agent_type: config.agent_type,
        config: {
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          personality: config.personality,
          systemPrompt: config.systemPrompt,
          tools: config.tools,
          timeout: config.advanced.timeout,
          retryAttempts: config.advanced.retryAttempts,
          memoryEnabled: config.advanced.memoryEnabled,
          loggingLevel: config.advanced.loggingLevel,
          rateLimiting: config.advanced.rateLimiting
        },
        capabilities: config.capabilities,
        metadata: config.metadata
      }

      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      })

      if (response.ok) {
        const result = await response.json()
        router.push(`/agents?created=${result.data.agent_id}`)
      } else {
        throw new Error('Failed to create agent')
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
      alert('Failed to create agent. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      // TODO: Implement test functionality
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Agent test completed successfully!')
    } catch (error) {
      console.error('Test failed:', error)
      alert('Agent test failed. Please check your configuration.')
    } finally {
      setTesting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="Enter agent name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={config.metadata.author}
                    onChange={(e) => updateConfig('metadata.author', e.target.value)}
                    placeholder="Your name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) => updateConfig('description', e.target.value)}
                  placeholder="Describe what this agent does and its purpose..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Agent Type
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AGENT_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = config.agent_type === type.id
                  return (
                    <button
                      key={type.id}
                      onClick={() => updateConfig('agent_type', type.id)}
                      className={`p-4 text-left rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className={`w-5 h-5 ${type.color}`} />
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {type.name}
                        </h5>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {type.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Model Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language Model
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => updateConfig('model', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Temperature: {config.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                    min={100}
                    max={8192}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Context Awareness: {config.capabilities.contextAwareness}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.capabilities.contextAwareness}
                    onChange={(e) => updateConfig('capabilities.contextAwareness', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personality
              </label>
              <textarea
                value={config.personality}
                onChange={(e) => updateConfig('personality', e.target.value)}
                placeholder="Describe the agent's personality, tone, and communication style..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                System Prompt
              </label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => updateConfig('systemPrompt', e.target.value)}
                placeholder="Enter the system prompt that defines the agent's behavior and instructions..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Tools & Capabilities
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Available Tools
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {AVAILABLE_TOOLS.map((tool) => (
                    <button
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        config.tools.includes(tool)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {tool.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Areas of Expertise
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newExpertise}
                    onChange={(e) => setNewExpertise(e.target.value)}
                    placeholder="Add expertise..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
                  />
                  <Button size="sm" onClick={addExpertise}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.capabilities.expertise.map((expertise) => (
                    <span
                      key={expertise}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-md text-sm"
                    >
                      {expertise}
                      <button onClick={() => removeExpertise(expertise)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task Types
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value)}
                    placeholder="Add task type..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addTaskType()}
                  />
                  <Button size="sm" onClick={addTaskType}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.capabilities.taskTypes.map((taskType) => (
                    <span
                      key={taskType}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-md text-sm"
                    >
                      {taskType}
                      <button onClick={() => removeTaskType(taskType)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Complexity Level
              </label>
              <div className="flex gap-4">
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => updateConfig('capabilities.complexity', level)}
                    className={`px-4 py-2 rounded-lg border transition-colors capitalize ${
                      config.capabilities.complexity === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Metadata & Advanced Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={config.metadata.version}
                    onChange={(e) => updateConfig('metadata.version', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button size="sm" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {config.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-md text-sm"
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-4"
                >
                  {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={config.advanced.timeout}
                        onChange={(e) => updateConfig('advanced.timeout', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        value={config.advanced.retryAttempts}
                        onChange={(e) => updateConfig('advanced.retryAttempts', parseInt(e.target.value))}
                        min={0}
                        max={10}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Logging Level
                      </label>
                      <select
                        value={config.advanced.loggingLevel}
                        onChange={(e) => updateConfig('advanced.loggingLevel', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="none">None</option>
                        <option value="basic">Basic</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Rate Limiting (req/min)
                      </label>
                      <input
                        type="number"
                        value={config.advanced.rateLimiting.requestsPerMinute}
                        onChange={(e) => updateConfig('advanced.rateLimiting.requestsPerMinute', parseInt(e.target.value))}
                        disabled={!config.advanced.rateLimiting.enabled}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.advanced.memoryEnabled}
                            onChange={(e) => updateConfig('advanced.memoryEnabled', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Enable Memory</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.advanced.rateLimiting.enabled}
                            onChange={(e) => updateConfig('advanced.rateLimiting.enabled', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Enable Rate Limiting</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return config.name.trim() && config.agent_type
      case 2:
        return config.model && config.temperature >= 0 && config.maxTokens > 0
      case 3:
        return true // All optional
      case 4:
        return true // All optional
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link href="/agents">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Agents
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Agent
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !config.name.trim()}
                className="flex items-center gap-2"
              >
                {testing ? (
                  <div className="w-4 h-4 border border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {testing ? 'Testing...' : 'Test Agent'}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !canProceed()}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-24 h-1 mx-2 ${
                    step < currentStep
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Basic Info</span>
            <span>Configuration</span>
            <span>Capabilities</span>
            <span>Finalization</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            disabled={currentStep === 4 || !canProceed()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}