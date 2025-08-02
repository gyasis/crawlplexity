'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Server, Globe, Cpu, Loader2, AlertCircle, CheckCircle, Trash2, Edit3 } from 'lucide-react'
import { CustomModel, RemoteServer, ModelDiscoveryResult } from '@/app/types'
import { ModelStorage } from '@/lib/model-storage'

interface ModelManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onModelAdded?: (model: CustomModel) => void
  onServerAdded?: (server: RemoteServer) => void
}

type TabType = 'custom' | 'remote'
type CustomModelFormData = Omit<CustomModel, 'id' | 'createdAt' | 'updatedAt'>
type RemoteServerFormData = Omit<RemoteServer, 'id' | 'createdAt' | 'updatedAt' | 'healthStatus' | 'lastHealthCheck'>

const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI', icon: '🤖' },
  { value: 'anthropic', label: 'Anthropic', icon: '🧠' },
  { value: 'google', label: 'Google', icon: '🔍' },
  { value: 'groq', label: 'Groq', icon: '⚡' },
  { value: 'huggingface', label: 'HuggingFace', icon: '🤗' },
  { value: 'replicate', label: 'Replicate', icon: '🔄' },
  { value: 'together', label: 'Together AI', icon: '🤝' },
  { value: 'cohere', label: 'Cohere', icon: '🎯' },
  { value: 'custom', label: 'Custom', icon: '🛠️' }
]

const SERVER_TYPE_OPTIONS = [
  { value: 'ollama', label: 'Ollama', icon: '🦙' },
  { value: 'openai-compatible', label: 'OpenAI Compatible', icon: '🔗' },
  { value: 'custom', label: 'Custom API', icon: '🛠️' }
]

export function ModelManagementModal({ isOpen, onClose, onModelAdded, onServerAdded }: ModelManagementModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('custom')
  const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const [remoteServers, setRemoteServers] = useState<RemoteServer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showCustomForm, setShowCustomForm] = useState(false)
  const [showRemoteForm, setShowRemoteForm] = useState(false)
  const [editingModel, setEditingModel] = useState<CustomModel | null>(null)
  const [editingServer, setEditingServer] = useState<RemoteServer | null>(null)

  const [customFormData, setCustomFormData] = useState<CustomModelFormData>({
    name: '',
    provider: 'openai',
    modelIdentifier: '',
    description: '',
    maxTokens: 2048,
    costPer1kTokens: 0,
    taskTypes: ['general'],
    apiKey: '',
    apiBase: '',
    customParams: {}
  })

  const [remoteFormData, setRemoteFormData] = useState<RemoteServerFormData>({
    name: '',
    type: 'ollama',
    endpoint: '',
    apiKey: '',
    description: '',
    isActive: true,
    discoveredModels: [],
    customHeaders: {}
  })

  const [discoveryResult, setDiscoveryResult] = useState<ModelDiscoveryResult | null>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load data from client-side ModelStorage
      const [customModels, remoteServers] = await Promise.all([
        ModelStorage.getCustomModels(),
        ModelStorage.getRemoteServers()
      ])

      setCustomModels(customModels)
      setRemoteServers(remoteServers)
    } catch (error) {
      setError('Failed to load model data')
      console.error('Error loading model data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)

      const method = editingModel ? 'PUT' : 'POST'
      const body = editingModel 
        ? { ...customFormData, id: editingModel.id }
        : customFormData

      const response = await fetch('/api/models/custom', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save model')
      }

      const { model } = await response.json()
      
      if (editingModel) {
        setCustomModels(prev => prev.map(m => m.id === model.id ? model : m))
      } else {
        setCustomModels(prev => [...prev, model])
        onModelAdded?.(model)
      }

      resetCustomForm()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save model')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoteServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)

      const method = editingServer ? 'PUT' : 'POST'
      const body = editingServer 
        ? { ...remoteFormData, id: editingServer.id }
        : remoteFormData

      const response = await fetch('/api/models/remote-servers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save server')
      }

      const { server } = await response.json()
      
      // Persist to client-side ModelStorage
      if (editingServer) {
        // Update existing server
        const currentServers = await ModelStorage.getRemoteServers()
        const updatedServers = currentServers.map(s => s.id === server.id ? server : s)
        await ModelStorage.setRemoteServers(updatedServers)
      } else {
        // Add new server
        await ModelStorage.saveRemoteServer(server)
      }
      
      // Reload UI data to show the updated server
      await loadData()
      
      // Call callback to refresh models in SidebarContext
      onServerAdded?.(server)

      resetRemoteForm()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscoverModels = async (serverId?: string) => {
    try {
      setIsDiscovering(true)
      setError(null)

      const response = await fetch('/api/models/remote-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover',
          serverId,
          endpoint: remoteFormData.endpoint,
          type: remoteFormData.type,
          name: remoteFormData.name
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Discovery failed')
      }

      const { discovery } = await response.json()
      setDiscoveryResult(discovery)
      
      if (serverId) {
        await loadData()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Model discovery failed')
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this custom model?')) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/models/custom?id=${modelId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete model')
      }

      setCustomModels(prev => prev.filter(m => m.id !== modelId))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete model')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this remote server?')) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/models/remote-servers?id=${serverId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete server')
      }

      setRemoteServers(prev => prev.filter(s => s.id !== serverId))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete server')
    } finally {
      setIsLoading(false)
    }
  }

  const resetCustomForm = () => {
    setCustomFormData({
      name: '',
      provider: 'openai',
      modelIdentifier: '',
      description: '',
      maxTokens: 2048,
      costPer1kTokens: 0,
      taskTypes: ['general'],
      apiKey: '',
      apiBase: '',
      customParams: {}
    })
    setEditingModel(null)
    setShowCustomForm(false)
  }

  const resetRemoteForm = () => {
    setRemoteFormData({
      name: '',
      type: 'ollama',
      endpoint: '',
      apiKey: '',
      description: '',
      isActive: true,
      discoveredModels: [],
      customHeaders: {}
    })
    setEditingServer(null)
    setShowRemoteForm(false)
    setDiscoveryResult(null)
  }

  const startEditModel = (model: CustomModel) => {
    setCustomFormData({
      name: model.name,
      provider: model.provider,
      modelIdentifier: model.modelIdentifier,
      description: model.description || '',
      maxTokens: model.maxTokens || 2048,
      costPer1kTokens: model.costPer1kTokens || 0,
      taskTypes: model.taskTypes || ['general'],
      apiKey: model.apiKey || '',
      apiBase: model.apiBase || '',
      customParams: model.customParams || {}
    })
    setEditingModel(model)
    setShowCustomForm(true)
  }

  const startEditServer = (server: RemoteServer) => {
    setRemoteFormData({
      name: server.name,
      type: server.type,
      endpoint: server.endpoint,
      apiKey: server.apiKey || '',
      description: server.description || '',
      isActive: server.isActive,
      discoveredModels: server.discoveredModels || [],
      customHeaders: server.customHeaders || {}
    })
    setEditingServer(server)
    setShowRemoteForm(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Model Management
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'custom'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Custom Models
          </button>
          <button
            onClick={() => setActiveTab('remote')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'remote'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Server className="w-4 h-4" />
            Remote Servers
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'custom' && (
            <CustomModelsTab
              models={customModels}
              showForm={showCustomForm}
              formData={customFormData}
              editingModel={editingModel}
              isLoading={isLoading}
              onShowForm={() => setShowCustomForm(true)}
              onFormDataChange={setCustomFormData}
              onSubmit={handleCustomModelSubmit}
              onCancel={resetCustomForm}
              onEdit={startEditModel}
              onDelete={handleDeleteModel}
            />
          )}

          {activeTab === 'remote' && (
            <RemoteServersTab
              servers={remoteServers}
              showForm={showRemoteForm}
              formData={remoteFormData}
              editingServer={editingServer}
              isLoading={isLoading}
              isDiscovering={isDiscovering}
              discoveryResult={discoveryResult}
              onShowForm={() => setShowRemoteForm(true)}
              onFormDataChange={setRemoteFormData}
              onSubmit={handleRemoteServerSubmit}
              onCancel={resetRemoteForm}
              onEdit={startEditServer}
              onDelete={handleDeleteServer}
              onDiscover={handleDiscoverModels}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Custom Models Tab Component
interface CustomModelsTabProps {
  models: CustomModel[]
  showForm: boolean
  formData: CustomModelFormData
  editingModel: CustomModel | null
  isLoading: boolean
  onShowForm: () => void
  onFormDataChange: (data: CustomModelFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onEdit: (model: CustomModel) => void
  onDelete: (id: string) => void
}

function CustomModelsTab({
  models,
  showForm,
  formData,
  editingModel,
  isLoading,
  onShowForm,
  onFormDataChange,
  onSubmit,
  onCancel,
  onEdit,
  onDelete
}: CustomModelsTabProps) {
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {editingModel ? 'Edit Custom Model' : 'Add Custom Model'}
          </h3>
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                placeholder="e.g., GPT-4 Turbo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => onFormDataChange({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                required
              >
                {PROVIDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Identifier
            </label>
            <input
              type="text"
              value={formData.modelIdentifier}
              onChange={(e) => onFormDataChange({ ...formData, modelIdentifier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              placeholder="e.g., huggingface/meta-llama/Llama-3.1-8B-Instruct"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={(e) => onFormDataChange({ ...formData, maxTokens: parseInt(e.target.value) || 2048 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost per 1k Tokens
              </label>
              <input
                type="number"
                step="0.001"
                value={formData.costPer1kTokens}
                onChange={(e) => onFormDataChange({ ...formData, costPer1kTokens: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => onFormDataChange({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                placeholder="sk-..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Base (Optional)
              </label>
              <input
                type="url"
                value={formData.apiBase}
                onChange={(e) => onFormDataChange({ ...formData, apiBase: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                placeholder="https://api.example.com/v1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Brief description of this model..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingModel ? 'Update' : 'Add'} Model
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Custom Models</h3>
        <button
          onClick={onShowForm}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Custom Model
        </button>
      </div>

      {models.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No custom models configured yet.</p>
          <p className="text-sm">Add a custom model to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      {model.provider}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {model.modelIdentifier}
                  </p>
                  {model.description && (
                    <p className="text-sm text-gray-500 mb-2">{model.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Max tokens: {model.maxTokens}</span>
                    <span>Cost: ${model.costPer1kTokens}/1k tokens</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(model)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(model.id)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Remote Servers Tab Component
interface RemoteServersTabProps {
  servers: RemoteServer[]
  showForm: boolean
  formData: RemoteServerFormData
  editingServer: RemoteServer | null
  isLoading: boolean
  isDiscovering: boolean
  discoveryResult: ModelDiscoveryResult | null
  onShowForm: () => void
  onFormDataChange: (data: RemoteServerFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onEdit: (server: RemoteServer) => void
  onDelete: (id: string) => void
  onDiscover: (serverId?: string) => void
}

function RemoteServersTab({
  servers,
  showForm,
  formData,
  editingServer,
  isLoading,
  isDiscovering,
  discoveryResult,
  onShowForm,
  onFormDataChange,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
  onDiscover
}: RemoteServersTabProps) {
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {editingServer ? 'Edit Remote Server' : 'Add Remote Server'}
          </h3>
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Server Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                placeholder="e.g., Local Ollama"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Server Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => onFormDataChange({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                required
              >
                {SERVER_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Endpoint URL
            </label>
            <input
              type="url"
              value={formData.endpoint}
              onChange={(e) => onFormDataChange({ ...formData, endpoint: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              placeholder="e.g., http://192.168.0.159:11434"
              required
            />
          </div>

          {formData.type !== 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => onFormDataChange({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                placeholder="Bearer token or API key"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Brief description of this server..."
            />
          </div>

          {formData.type === 'ollama' && formData.endpoint && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Model Discovery</h4>
                <button
                  type="button"
                  onClick={() => onDiscover()}
                  disabled={isDiscovering}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isDiscovering ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  Discover Models
                </button>
              </div>

              {discoveryResult && (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Found {discoveryResult.models.length} models
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {discoveryResult.models.map((model, index) => (
                      <div key={index} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {model.name}
                        {model.size && <span className="text-gray-500 ml-2">({model.size})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingServer ? 'Update' : 'Add'} Server
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Remote Servers</h3>
        <button
          onClick={onShowForm}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Remote Server
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No remote servers configured yet.</p>
          <p className="text-sm">Add an Ollama server to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div
              key={server.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {server.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      server.healthStatus === 'healthy' 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : server.healthStatus === 'unhealthy'
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {server.healthStatus}
                    </span>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                      {server.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {server.endpoint}
                  </p>
                  {server.description && (
                    <p className="text-sm text-gray-500 mb-2">{server.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {server.discoveredModels && server.discoveredModels.length > 0 && (
                      <span>{server.discoveredModels.length} models available</span>
                    )}
                    {server.lastHealthCheck && (
                      <span>Last checked: {server.lastHealthCheck.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {server.type === 'ollama' && (
                    <button
                      onClick={() => onDiscover(server.id)}
                      disabled={isDiscovering}
                      className="p-2 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      {isDiscovering ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(server)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(server.id)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}