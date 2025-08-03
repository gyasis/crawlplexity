'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, FileText, Cpu, Bot, Sliders, Tags } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface AgentConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (agent: any) => void
  editingAgent?: any
}

interface AgentManifest {
  config: {
    name: string
    model: string
    personality: string
    temperature: number
    maxTokens: number
    tools: string[]
    mcpServers: string[]
    promptTemplates: Record<string, string>
    promptTemplateFiles: Record<string, string>
  }
  capabilities: {
    expertise: string[]
    tools: string[]
    personalityTraits: string[]
    taskTypes: string[]
    complexity: 'basic' | 'intermediate' | 'advanced' | 'expert'
    contextAwareness: number
    collaborationStyle: string
  }
  metadata: {
    version: string
    author: string
    description: string
    tags: string[]
    created: string
    updated: string
  }
}

export function AgentConfigModal({ isOpen, onClose, onSave, editingAgent }: AgentConfigModalProps) {
  const [manifest, setManifest] = useState<AgentManifest>({
    config: {
      name: '',
      model: 'gpt-4o',
      personality: '',
      temperature: 0.7,
      maxTokens: 4096,
      tools: [],
      mcpServers: [],
      promptTemplates: {},
      promptTemplateFiles: {}
    },
    capabilities: {
      expertise: [],
      tools: [],
      personalityTraits: [],
      taskTypes: ['conversation'],
      complexity: 'intermediate',
      contextAwareness: 0.8,
      collaborationStyle: 'collaborative'
    },
    metadata: {
      version: '1.0.0',
      author: 'User',
      description: '',
      tags: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  })

  const [yamlMode, setYamlMode] = useState(false)
  const [yamlContent, setYamlContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingAgent) {
      // Load existing agent data
      setManifest(editingAgent)
    } else {
      // Reset to default
      setManifest({
        config: {
          name: '',
          model: 'gpt-4o',
          personality: '',
          temperature: 0.7,
          maxTokens: 4096,
          tools: [],
          mcpServers: [],
          promptTemplates: {},
          promptTemplateFiles: {}
        },
        capabilities: {
          expertise: [],
          tools: [],
          personalityTraits: [],
          taskTypes: ['conversation'],
          complexity: 'intermediate',
          contextAwareness: 0.8,
          collaborationStyle: 'collaborative'
        },
        metadata: {
          version: '1.0.0',
          author: 'User',
          description: '',
          tags: [],
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }
      })
    }
  }, [editingAgent])

  useEffect(() => {
    if (yamlMode) {
      // Convert manifest to YAML
      setYamlContent(JSON.stringify(manifest, null, 2))
    }
  }, [yamlMode, manifest])

  const handleSave = async () => {
    setSaving(true)
    try {
      let finalManifest = manifest

      if (yamlMode) {
        try {
          finalManifest = JSON.parse(yamlContent)
        } catch (error) {
          alert('Invalid YAML/JSON format')
          setSaving(false)
          return
        }
      }

      finalManifest.metadata.updated = new Date().toISOString()
      
      await onSave(finalManifest)
      onClose()
    } catch (error) {
      console.error('Failed to save agent:', error)
      alert('Failed to save agent. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (field: string, value: any) => {
    setManifest(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value
      }
    }))
  }

  const updateCapabilities = (field: string, value: any) => {
    setManifest(prev => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [field]: value
      }
    }))
  }

  const updateMetadata = (field: string, value: any) => {
    setManifest(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }))
  }

  const addArrayItem = (section: 'capabilities', field: string, value: string) => {
    if (!value.trim()) return
    
    setManifest(prev => {
      const currentArray = prev[section][field] as string[]
      if (!currentArray.includes(value.trim())) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: [...currentArray, value.trim()]
          }
        }
      }
      return prev
    })
  }

  const removeArrayItem = (section: 'capabilities' | 'metadata', field: string, index: number) => {
    setManifest(prev => {
      const currentArray = prev[section][field] as string[]
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: currentArray.filter((_, i) => i !== index)
        }
      }
    })
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            {editingAgent ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={!yamlMode ? "default" : "outline"}
              size="sm"
              onClick={() => setYamlMode(false)}
            >
              <Sliders className="w-4 h-4 mr-2" />
              Form Mode
            </Button>
            <Button
              variant={yamlMode ? "default" : "outline"}
              size="sm"
              onClick={() => setYamlMode(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              YAML Mode
            </Button>
          </div>

          {yamlMode ? (
            /* YAML Editor */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Agent Configuration (YAML/JSON)</label>
                <Textarea
                  value={yamlContent}
                  onChange={(e) => setYamlContent(e.target.value)}
                  className="font-mono text-sm"
                  rows={20}
                  placeholder="Enter agent configuration in YAML or JSON format..."
                />
              </div>
            </div>
          ) : (
            /* Form Mode */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Basic Configuration
                </h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Agent Name</label>
                  <Input
                    value={manifest.config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="e.g., Research Assistant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <Select value={manifest.config.model} onValueChange={(value) => updateConfig('model', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">GPT-4O</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Personality</label>
                  <Textarea
                    value={manifest.config.personality}
                    onChange={(e) => updateConfig('personality', e.target.value)}
                    placeholder="Describe the agent's personality and behavior..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Temperature</label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={manifest.config.temperature}
                      onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Tokens</label>
                    <Input
                      type="number"
                      min="256"
                      max="32768"
                      value={manifest.config.maxTokens}
                      onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Capabilities
                </h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Expertise Areas</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add expertise area..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addArrayItem('capabilities', 'expertise', e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {manifest.capabilities.expertise.map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                      >
                        {item}
                        <button
                          onClick={() => removeArrayItem('capabilities', 'expertise', index)}
                          className="hover:text-blue-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Task Types</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add task type..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addArrayItem('capabilities', 'taskTypes', e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {manifest.capabilities.taskTypes.map((item, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 text-xs rounded-full"
                      >
                        {item}
                        <button
                          onClick={() => removeArrayItem('capabilities', 'taskTypes', index)}
                          className="hover:text-green-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Complexity Level</label>
                  <Select value={manifest.capabilities.complexity} onValueChange={(value) => updateCapabilities('complexity', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Context Awareness</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={manifest.capabilities.contextAwareness}
                    onChange={(e) => updateCapabilities('contextAwareness', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Tags className="w-5 h-5" />
                  Metadata
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      value={manifest.metadata.description}
                      onChange={(e) => updateMetadata('description', e.target.value)}
                      placeholder="Brief description of the agent's purpose..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Author</label>
                    <Input
                      value={manifest.metadata.author}
                      onChange={(e) => updateMetadata('author', e.target.value)}
                      placeholder="Agent creator"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addArrayItem('metadata', 'tags', e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {manifest.metadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-xs rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removeArrayItem('metadata', 'tags', index)}
                          className="hover:text-purple-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !manifest.config.name.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Agent'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}