import { CustomModel, RemoteServer, ModelManagementState } from '@/app/types'

const STORAGE_KEYS = {
  CUSTOM_MODELS: 'crawlplexity-custom-models',
  REMOTE_SERVERS: 'crawlplexity-remote-servers',
  LAST_SYNC: 'crawlplexity-models-last-sync'
}

export class ModelStorage {
  static generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  }

  static async getCustomModels(): Promise<CustomModel[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS)
      if (!stored) return []
      
      const models = JSON.parse(stored)
      return models.map((model: any) => ({
        ...model,
        createdAt: new Date(model.createdAt),
        updatedAt: new Date(model.updatedAt)
      }))
    } catch (error) {
      console.error('Error loading custom models:', error)
      return []
    }
  }

  static async saveCustomModel(model: Omit<CustomModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomModel> {
    try {
      const models = await this.getCustomModels()
      const newModel: CustomModel = {
        ...model,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      models.push(newModel)
      localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(models))
      
      return newModel
    } catch (error) {
      console.error('Error saving custom model:', error)
      throw new Error('Failed to save custom model')
    }
  }

  static async updateCustomModel(id: string, updates: Partial<CustomModel>): Promise<CustomModel> {
    try {
      const models = await this.getCustomModels()
      const modelIndex = models.findIndex(m => m.id === id)
      
      if (modelIndex === -1) {
        throw new Error('Model not found')
      }
      
      const updatedModel = {
        ...models[modelIndex],
        ...updates,
        id,
        updatedAt: new Date()
      }
      
      models[modelIndex] = updatedModel
      localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(models))
      
      return updatedModel
    } catch (error) {
      console.error('Error updating custom model:', error)
      throw new Error('Failed to update custom model')
    }
  }

  static async deleteCustomModel(id: string): Promise<void> {
    try {
      const models = await this.getCustomModels()
      const filteredModels = models.filter(m => m.id !== id)
      localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(filteredModels))
    } catch (error) {
      console.error('Error deleting custom model:', error)
      throw new Error('Failed to delete custom model')
    }
  }

  static async getRemoteServers(): Promise<RemoteServer[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REMOTE_SERVERS)
      if (!stored) return []
      
      const servers = JSON.parse(stored)
      return servers.map((server: any) => ({
        ...server,
        createdAt: new Date(server.createdAt),
        updatedAt: new Date(server.updatedAt),
        lastHealthCheck: server.lastHealthCheck ? new Date(server.lastHealthCheck) : undefined
      }))
    } catch (error) {
      console.error('Error loading remote servers:', error)
      return []
    }
  }

  static async saveRemoteServer(server: Omit<RemoteServer, 'id' | 'createdAt' | 'updatedAt'>): Promise<RemoteServer> {
    try {
      const servers = await this.getRemoteServers()
      const newServer: RemoteServer = {
        ...server,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      servers.push(newServer)
      localStorage.setItem(STORAGE_KEYS.REMOTE_SERVERS, JSON.stringify(servers))
      
      return newServer
    } catch (error) {
      console.error('Error saving remote server:', error)
      throw new Error('Failed to save remote server')
    }
  }

  static async updateRemoteServer(id: string, updates: Partial<RemoteServer>): Promise<RemoteServer> {
    try {
      const servers = await this.getRemoteServers()
      const serverIndex = servers.findIndex(s => s.id === id)
      
      if (serverIndex === -1) {
        throw new Error('Server not found')
      }
      
      const updatedServer = {
        ...servers[serverIndex],
        ...updates,
        id,
        updatedAt: new Date()
      }
      
      servers[serverIndex] = updatedServer
      localStorage.setItem(STORAGE_KEYS.REMOTE_SERVERS, JSON.stringify(servers))
      
      return updatedServer
    } catch (error) {
      console.error('Error updating remote server:', error)
      throw new Error('Failed to update remote server')
    }
  }

  static async deleteRemoteServer(id: string): Promise<void> {
    try {
      const servers = await this.getRemoteServers()
      const filteredServers = servers.filter(s => s.id !== id)
      localStorage.setItem(STORAGE_KEYS.REMOTE_SERVERS, JSON.stringify(filteredServers))
    } catch (error) {
      console.error('Error deleting remote server:', error)
      throw new Error('Failed to delete remote server')
    }
  }

  static async setRemoteServers(servers: RemoteServer[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.REMOTE_SERVERS, JSON.stringify(servers))
    } catch (error) {
      console.error('Error setting remote servers:', error)
      throw new Error('Failed to set remote servers')
    }
  }

  static async getAllModelData(): Promise<ModelManagementState> {
    try {
      const [customModels, remoteServers] = await Promise.all([
        this.getCustomModels(),
        this.getRemoteServers()
      ])
      
      return {
        customModels,
        remoteServers,
        isLoading: false
      }
    } catch (error) {
      console.error('Error loading model data:', error)
      return {
        customModels: [],
        remoteServers: [],
        isLoading: false,
        error: 'Failed to load model data'
      }
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_MODELS)
      localStorage.removeItem(STORAGE_KEYS.REMOTE_SERVERS)
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC)
    } catch (error) {
      console.error('Error clearing model data:', error)
      throw new Error('Failed to clear model data')
    }
  }

  static async exportData(): Promise<string> {
    try {
      const data = await this.getAllModelData()
      return JSON.stringify({
        ...data,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }, null, 2)
    } catch (error) {
      console.error('Error exporting model data:', error)
      throw new Error('Failed to export model data')
    }
  }

  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData)
      
      if (data.customModels) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(data.customModels))
      }
      
      if (data.remoteServers) {
        localStorage.setItem(STORAGE_KEYS.REMOTE_SERVERS, JSON.stringify(data.remoteServers))
      }
    } catch (error) {
      console.error('Error importing model data:', error)
      throw new Error('Failed to import model data')
    }
  }
}

export const validateModelIdentifier = (provider: string, modelId: string): boolean => {
  if (!provider || !modelId) return false
  
  const validProviders = [
    'openai', 'anthropic', 'google', 'groq', 'ollama', 
    'huggingface', 'replicate', 'together', 'cohere', 
    'bedrock', 'azure', 'vertex', 'custom'
  ]
  
  return validProviders.includes(provider.toLowerCase())
}

export const validateEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint)
    return ['http:', 'https:'].includes(url.protocol)
  } catch {
    return false
  }
}

export const sanitizeModelName = (name: string): string => {
  return name.trim().replace(/[^a-zA-Z0-9\s\-_.]/g, '')
}