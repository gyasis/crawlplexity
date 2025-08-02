import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ modelName: string }> }
) {
  try {
    const { modelName: rawModelName } = await params
    const modelName = decodeURIComponent(rawModelName)
    
    if (!modelName || modelName.trim() === '') {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      )
    }
    
    console.log(`🗑️ Removing dynamic model: ${modelName}`)
    
    // Forward to LiteLLM service
    const litellmUrl = process.env.LITELLM_API_URL || 'http://localhost:14782'
    const response = await fetch(`${litellmUrl}/models/${encodeURIComponent(modelName)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      console.error(`❌ LiteLLM remove model failed: ${response.status} - ${errorData.detail}`)
      
      return NextResponse.json(
        { 
          error: 'Failed to remove model',
          details: errorData.detail,
          suggestion: response.status === 404 
            ? 'Model not found or already removed'
            : 'Please try again or contact support'
        },
        { status: response.status }
      )
    }
    
    const result = await response.json()
    
    console.log(`✅ Successfully removed dynamic model: ${modelName}`)
    
    return NextResponse.json({
      success: true,
      model: modelName,
      message: `Model '${modelName}' removed successfully`
    })
    
  } catch (error) {
    console.error('Error in remove dynamic model API:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', suggestion: 'Please try again.' },
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