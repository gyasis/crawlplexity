import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    
    // Fetch models from LiteLLM service
    const response = await fetch(`${litellmUrl}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response.ok) {
      console.error(`LiteLLM models API returned ${response.status}`)
      
      // Return fallback models if LiteLLM service is unavailable
      return NextResponse.json({
        available_models: [
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            provider: 'openai',
            available: true,
            priority: 1,
            cost_per_1k_tokens: 0.15,
            task_types: ['general', 'search', 'summary', 'followup'],
            max_tokens: 4096
          }
        ],
        total_available: 1,
        source: 'fallback'
      })
    }
    
    const data = await response.json()
    
    // Transform the data if needed to match our expected format
    const transformedModels = data.available_models?.map((model: any) => ({
      id: model.model || model.id,
      name: model.model || model.name || model.id,
      provider: model.provider,
      available: model.available ?? true,
      priority: model.priority || 999,
      cost_per_1k_tokens: model.cost_per_1k_tokens || 0,
      task_types: model.task_types || ['general'],
      max_tokens: model.max_tokens || 2048
    })) || []
    
    return NextResponse.json({
      available_models: transformedModels,
      total_available: transformedModels.length,
      source: 'litellm'
    })
    
  } catch (error) {
    console.error('Error fetching models from LiteLLM:', error)
    
    // Return fallback models on error
    return NextResponse.json({
      available_models: [
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          provider: 'openai',
          available: true,
          priority: 1,
          cost_per_1k_tokens: 0.15,
          task_types: ['general', 'search', 'summary', 'followup'],
          max_tokens: 4096
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          provider: 'anthropic',
          available: true,
          priority: 2,
          cost_per_1k_tokens: 0.25,
          task_types: ['general', 'summary', 'followup'],
          max_tokens: 4096
        },
        {
          id: 'llama3.1:8b',
          name: 'Llama 3.1 8B',
          provider: 'ollama',
          available: true,
          priority: 5,
          cost_per_1k_tokens: 0.0,
          task_types: ['general', 'summary'],
          max_tokens: 2048
        }
      ],
      total_available: 3,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// Health check endpoint for the models API
export async function HEAD(request: NextRequest) {
  try {
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    
    const response = await fetch(`${litellmUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    
    if (response.ok) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}