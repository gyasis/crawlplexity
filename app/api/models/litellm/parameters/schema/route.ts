import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching parameter schema from LiteLLM service')
    
    // Forward to LiteLLM service
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    const response = await fetch(`${litellmUrl}/parameters/schema`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      console.error(`❌ LiteLLM parameter schema fetch failed: ${response.status}`)
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch parameter schema from LiteLLM service',
          status: response.status
        },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    console.log(`✅ Retrieved parameter schema with ${Object.keys(result.schema || {}).length} parameters`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error in parameter schema API:', error)
    
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