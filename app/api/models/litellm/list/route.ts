import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Listing dynamic models')
    
    // Forward to LiteLLM service
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    const response = await fetch(`${litellmUrl}/models/dynamic`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      console.error(`❌ LiteLLM list dynamic models failed: ${response.status}`)
      
      return NextResponse.json(
        { 
          dynamic_models: [],
          total: 0,
          redis_available: false,
          error: 'Failed to fetch dynamic models from LiteLLM service'
        },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    console.log(`📋 Retrieved ${result.total} dynamic models`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error in list dynamic models API:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({
        dynamic_models: [],
        total: 0,
        redis_available: false,
        error: 'Request timeout'
      })
    }
    
    return NextResponse.json({
      dynamic_models: [],
      total: 0,
      redis_available: false,
      error: 'Internal server error'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Refreshing dynamic models')
    
    // Forward to LiteLLM service
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    const response = await fetch(`${litellmUrl}/models/refresh`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error(`❌ LiteLLM refresh models failed: ${response.status} - ${errorData.detail}`)
      
      return NextResponse.json(
        { 
          error: 'Failed to refresh models',
          details: errorData.detail
        },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    console.log(`🔄 Model refresh: ${result.old_count} -> ${result.new_count} models`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error in refresh models API:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}