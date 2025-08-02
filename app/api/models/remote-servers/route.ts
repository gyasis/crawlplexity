import { NextRequest, NextResponse } from 'next/server'
import { RemoteServer, ModelDiscoveryResult } from '@/app/types'
import { validateEndpoint } from '@/lib/model-storage'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const serverId = url.searchParams.get('id')
    const action = url.searchParams.get('action')
    
    if (serverId && action === 'health') {
      const healthStatus = await checkServerHealth(serverId)
      return NextResponse.json({ health: healthStatus })
    }
    
    if (serverId) {
      const servers = await getStoredRemoteServers()
      const server = servers.find(s => s.id === serverId)
      
      if (!server) {
        return NextResponse.json(
          { error: 'Server not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({ server })
    }
    
    const servers = await getStoredRemoteServers()
    return NextResponse.json({ 
      servers,
      total: servers.length 
    })
    
  } catch (error) {
    console.error('Error fetching remote servers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch remote servers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === 'discover') {
      return await handleModelDiscovery(body)
    }
    
    const validation = validateRemoteServerData(body)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    let healthStatus: 'healthy' | 'unhealthy' | 'unknown' = 'unknown'
    let discoveredModels: string[] = []
    
    try {
      const health = await testServerConnection(body.endpoint, body.type, body.apiKey, body.customHeaders)
      healthStatus = health.healthy ? 'healthy' : 'unhealthy'
      
      if (health.healthy && body.type === 'ollama') {
        const models = await discoverOllamaModels(body.endpoint)
        discoveredModels = models.map(m => m.name)
      }
    } catch (error) {
      console.warn('Server health check failed during creation:', error)
      healthStatus = 'unhealthy'
    }
    
    const remoteServer: Omit<RemoteServer, 'id' | 'createdAt' | 'updatedAt'> = {
      name: body.name.trim(),
      type: body.type,
      endpoint: body.endpoint.replace(/\/$/, ''),
      apiKey: body.apiKey || undefined,
      description: body.description || '',
      isActive: true,
      healthStatus,
      discoveredModels,
      customHeaders: body.customHeaders || {},
      lastHealthCheck: healthStatus !== 'unknown' ? new Date() : undefined
    }
    
    const savedServer = await saveRemoteServerToStorage(remoteServer)
    
    return NextResponse.json({ 
      server: savedServer,
      modelsDiscovered: discoveredModels.length
    })
    
  } catch (error) {
    console.error('Error creating remote server:', error)
    return NextResponse.json(
      { error: 'Failed to create remote server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }
    
    const validation = validateRemoteServerData(updates, true)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    if (updates.endpoint) {
      updates.endpoint = updates.endpoint.replace(/\/$/, '')
    }
    
    const updatedServer = await updateRemoteServerInStorage(id, updates)
    
    return NextResponse.json({ server: updatedServer })
    
  } catch (error) {
    console.error('Error updating remote server:', error)
    
    if (error instanceof Error && error.message === 'Server not found') {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update remote server' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const serverId = url.searchParams.get('id')
    
    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      )
    }
    
    await deleteRemoteServerFromStorage(serverId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Server deleted successfully' 
    })
    
  } catch (error) {
    console.error('Error deleting remote server:', error)
    return NextResponse.json(
      { error: 'Failed to delete remote server' },
      { status: 500 }
    )
  }
}

async function handleModelDiscovery(body: any): Promise<NextResponse> {
  try {
    const { serverId, endpoint, type } = body
    
    if (!endpoint || !type) {
      return NextResponse.json(
        { error: 'Endpoint and type are required for discovery' },
        { status: 400 }
      )
    }
    
    let discoveryResult: ModelDiscoveryResult
    
    if (type === 'ollama') {
      const models = await discoverOllamaModels(endpoint)
      discoveryResult = {
        models,
        serverId: serverId || 'unknown',
        serverName: body.name || 'Unknown Server',
        endpoint
      }
    } else {
      return NextResponse.json(
        { error: 'Model discovery not implemented for this server type' },
        { status: 400 }
      )
    }
    
    if (serverId) {
      await updateRemoteServerInStorage(serverId, {
        discoveredModels: discoveryResult.models.map(m => m.name),
        lastHealthCheck: new Date(),
        healthStatus: 'healthy'
      })
    }
    
    return NextResponse.json({ discovery: discoveryResult })
    
  } catch (error) {
    console.error('Error during model discovery:', error)
    return NextResponse.json(
      { error: `Model discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

async function checkServerHealth(serverId: string): Promise<{ healthy: boolean; error?: string; lastCheck: Date }> {
  try {
    const servers = await getStoredRemoteServers()
    const server = servers.find(s => s.id === serverId)
    
    if (!server) {
      return { healthy: false, error: 'Server not found', lastCheck: new Date() }
    }
    
    const result = await testServerConnection(server.endpoint, server.type, server.apiKey, server.customHeaders)
    
    await updateRemoteServerInStorage(serverId, {
      healthStatus: result.healthy ? 'healthy' : 'unhealthy',
      lastHealthCheck: new Date()
    })
    
    return { ...result, lastCheck: new Date() }
    
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      lastCheck: new Date()
    }
  }
}

async function testServerConnection(
  endpoint: string, 
  type: string, 
  apiKey?: string, 
  customHeaders?: Record<string, string>
): Promise<{ healthy: boolean; error?: string }> {
  try {
    let testUrl: string
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    switch (type) {
      case 'ollama':
        testUrl = `${endpoint}/api/tags`
        break
      case 'openai-compatible':
        testUrl = `${endpoint}/v1/models`
        break
      default:
        testUrl = `${endpoint}/health`
    }
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      return { 
        healthy: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }
    }
    
    return { healthy: true }
    
  } catch (error) {
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    }
  }
}

async function discoverOllamaModels(endpoint: string): Promise<Array<{
  name: string
  size?: string
  digest?: string
  details?: any
  modified_at?: string
}>> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: HTTP ${response.status}`)
    }
    
    const data = await response.json()
    return data.models || []
    
  } catch (error) {
    console.error('Error discovering Ollama models:', error)
    throw error
  }
}

function validateRemoteServerData(data: any, isUpdate = false): { valid: boolean; error?: string } {
  if (!isUpdate) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { valid: false, error: 'Name is required and must be a non-empty string' }
    }
    
    if (!data.endpoint || typeof data.endpoint !== 'string') {
      return { valid: false, error: 'Endpoint is required and must be a string' }
    }
    
    if (!validateEndpoint(data.endpoint)) {
      return { valid: false, error: 'Invalid endpoint URL' }
    }
    
    if (!data.type || !['ollama', 'openai-compatible', 'custom'].includes(data.type)) {
      return { valid: false, error: 'Type must be one of: ollama, openai-compatible, custom' }
    }
  }
  
  if (data.endpoint && !validateEndpoint(data.endpoint)) {
    return { valid: false, error: 'Invalid endpoint URL' }
  }
  
  if (data.type && !['ollama', 'openai-compatible', 'custom'].includes(data.type)) {
    return { valid: false, error: 'Type must be one of: ollama, openai-compatible, custom' }
  }
  
  return { valid: true }
}

async function getStoredRemoteServers(): Promise<RemoteServer[]> {
  // API routes run on server-side where localStorage is not available
  // Client will handle persistence via ModelStorage
  return []
}

async function saveRemoteServerToStorage(server: Omit<RemoteServer, 'id' | 'createdAt' | 'updatedAt'>): Promise<RemoteServer> {
  const servers = await getStoredRemoteServers()
  const newServer: RemoteServer = {
    ...server,
    id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  // Note: This function now only returns the server object
  // Client-side persistence will be handled by the frontend
  return newServer
}

async function updateRemoteServerInStorage(id: string, updates: Partial<RemoteServer>): Promise<RemoteServer> {
  const servers = await getStoredRemoteServers()
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
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('crawlplexity-remote-servers', JSON.stringify(servers))
  }
  
  return updatedServer
}

async function deleteRemoteServerFromStorage(id: string): Promise<void> {
  const servers = await getStoredRemoteServers()
  const filteredServers = servers.filter(s => s.id !== id)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('crawlplexity-remote-servers', JSON.stringify(filteredServers))
  }
}