// Types for Crawlplexity - replacing Vercel AI SDK types

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

export interface SearchResult {
  url: string
  title: string
  description?: string
  content?: string
  publishedDate?: string
  author?: string
  markdown?: string
  image?: string
  favicon?: string
  siteName?: string
  success?: boolean
  searchRank?: number
}

export interface StreamEvent {
  type: 'status' | 'sources' | 'text' | 'content' | 'ticker' | 'follow_up_questions' | 'metrics' | 'complete' | 'completed' | 'error' | 'warning' | 'debug_event'
  message?: string
  sources?: SearchResult[]
  content?: string
  symbol?: string
  questions?: string[]
  error?: string
  suggestion?: string
  technical_details?: string
  details?: string
  id?: string
  timestamp?: string
  data?: any
  debugType?: string
  [key: string]: any
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  sources: SearchResult[]
  followUpQuestions: string[]
  ticker?: string
  error?: string
  warnings?: Array<{
    type: string
    message: string
    details?: string
  }>
}

// Enhanced Model Management Types
export interface ModelInfo {
  id: string
  name: string
  provider: string
  available: boolean
  priority: number
  cost_per_1k_tokens: number
  task_types: string[]
  max_tokens: number
  category: 'local' | 'remote' | 'custom'
  isCustom?: boolean
  remoteServerId?: string
}

export interface CustomModel {
  id: string
  name: string
  provider: string
  modelIdentifier: string
  description?: string
  maxTokens?: number
  costPer1kTokens?: number
  taskTypes?: string[]
  apiKey?: string
  apiBase?: string
  customParams?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface RemoteServer {
  id: string
  name: string
  type: 'ollama' | 'openai-compatible' | 'custom'
  endpoint: string
  apiKey?: string
  description?: string
  isActive: boolean
  lastHealthCheck?: Date
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  discoveredModels?: string[]
  customHeaders?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

export interface ModelDiscoveryResult {
  models: {
    name: string
    size?: string
    digest?: string
    details?: {
      format?: string
      family?: string
      families?: string[]
      parameter_size?: string
      quantization_level?: string
    }
    modified_at?: string
  }[]
  serverId: string
  serverName: string
  endpoint: string
}

export interface ModelManagementState {
  customModels: CustomModel[]
  remoteServers: RemoteServer[]
  isLoading: boolean
  error?: string
}