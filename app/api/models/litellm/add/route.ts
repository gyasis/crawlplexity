import { NextRequest, NextResponse } from 'next/server'

interface DynamicModelConfig {
  model: string
  provider: string
  api_key?: string
  api_base?: string
  priority?: number
  cost_per_1k_tokens?: number
  task_types?: string[]
  max_tokens?: number
  temperature?: number
  health_check_endpoint?: string
  health_check_interval?: number
  health_check_timeout?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: DynamicModelConfig = await request.json()
    
    // 🔒 SECURITY: Validate required fields
    if (!body.model || !body.provider) {
      return NextResponse.json(
        { error: 'Model and provider are required' },
        { status: 400 }
      )
    }
    
    // 🔒 SECURITY: Validate provider
    const allowedProviders = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'custom']
    if (!allowedProviders.includes(body.provider)) {
      return NextResponse.json(
        { error: `Provider must be one of: ${allowedProviders.join(', ')}` },
        { status: 400 }
      )
    }
    
    // 🔒 SECURITY: Sanitize input
    const sanitizedConfig: DynamicModelConfig = {
      model: body.model.trim(),
      provider: body.provider.trim(),
      api_key: body.api_key?.trim(),
      api_base: body.api_base?.trim(),
      priority: Math.max(1, Math.min(999, body.priority || 999)),
      cost_per_1k_tokens: Math.max(0, body.cost_per_1k_tokens || 0),
      task_types: body.task_types || ['general'],
      max_tokens: Math.max(1, Math.min(32768, body.max_tokens || 2048)),
      temperature: Math.max(0, Math.min(1, body.temperature || 0.7)),
      health_check_endpoint: body.health_check_endpoint?.trim(),
      health_check_interval: Math.max(10, Math.min(300, body.health_check_interval || 60)),
      health_check_timeout: Math.max(5, Math.min(60, body.health_check_timeout || 10))
    }
    
    console.log(`🚀 Adding dynamic model: ${sanitizedConfig.model} (${sanitizedConfig.provider})`)
    
    // Forward to LiteLLM service
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    const response = await fetch(`${litellmUrl}/models/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sanitizedConfig),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error(`❌ LiteLLM add model failed: ${response.status} - ${errorData.detail}`)
      
      return NextResponse.json(
        { 
          error: 'Failed to add model',
          details: errorData.detail,
          suggestion: 'Please check your model configuration and try again'
        },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    console.log(`✅ Successfully added dynamic model: ${sanitizedConfig.model}`)
    
    return NextResponse.json({
      success: true,
      model: sanitizedConfig.model,
      provider: sanitizedConfig.provider,
      validation: result.validation,
      message: `Model '${sanitizedConfig.model}' added successfully`
    })
    
  } catch (error) {
    console.error('Error in add dynamic model API:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', suggestion: 'The model validation took too long. Please try again.' },
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