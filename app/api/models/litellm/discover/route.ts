import { NextRequest, NextResponse } from 'next/server'

interface RemoteServerRequest {
  server_url: string
  server_type: 'ollama' | 'litellm'
}

export async function POST(request: NextRequest) {
  try {
    const body: RemoteServerRequest = await request.json()
    
    // 🔒 SECURITY: Validate required fields
    if (!body.server_url) {
      return NextResponse.json(
        { error: 'Server URL is required' },
        { status: 400 }
      )
    }
    
    // 🔒 SECURITY: Validate server type
    if (!['ollama', 'litellm'].includes(body.server_type)) {
      return NextResponse.json(
        { error: 'Server type must be "ollama" or "litellm"' },
        { status: 400 }
      )
    }
    
    // 🔒 SECURITY: Basic URL validation
    try {
      new URL(body.server_url.startsWith('http') ? body.server_url : `http://${body.server_url}`)
    } catch {
      return NextResponse.json(
        { error: 'Invalid server URL format' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 Discovering models from ${body.server_type} server: ${body.server_url}`)
    
    // Forward to LiteLLM service
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    const response = await fetch(`${litellmUrl}/models/discover-remote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server_url: body.server_url,
        server_type: body.server_type
      }),
      signal: AbortSignal.timeout(45000) // 45 second timeout for discovery
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error(`❌ LiteLLM remote discovery failed: ${response.status} - ${errorData.detail}`)
      
      return NextResponse.json(
        { 
          error: 'Failed to discover remote server models',
          details: errorData.detail,
          suggestion: response.status === 400 
            ? 'Please check the server URL and ensure the server is accessible'
            : 'Please try again or contact support'
        },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    console.log(`✅ Successfully discovered ${result.discovered} models from ${body.server_type} server`)
    console.log(`📊 Registration: ${result.registered} success, ${result.failed} failed`)
    
    return NextResponse.json({
      success: true,
      server_url: result.server_url,
      server_type: result.server_type,
      discovered: result.discovered,
      registered: result.registered,
      failed: result.failed,
      models: result.models,
      message: `Discovered ${result.discovered} models from ${body.server_type} server. ${result.registered} registered successfully.`
    })
    
  } catch (error) {
    console.error('Error in discover remote server API:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { 
          error: 'Discovery timeout', 
          suggestion: 'The server took too long to respond. Please check if it\'s accessible and try again.' 
        },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        suggestion: 'Please try again or contact support if the issue persists'
      },
      { status: 500 }
    )
  }
}