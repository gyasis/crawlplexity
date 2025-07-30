import { NextResponse } from 'next/server'
import { getSearchOrchestrator } from '@/lib/search-orchestrator'

export async function GET() {
  try {
    const searchOrchestrator = getSearchOrchestrator()
    const healthCheck = await searchOrchestrator.healthCheck()
    
    const status = healthCheck.overall ? 200 : 503
    
    // Get environment status
    const envStatus = {
      serper_api_key: !!process.env.SERPER_API_KEY,
      openai_api_key: !!process.env.OPENAI_API_KEY,
      crawl4ai_url: process.env.CRAWL4AI_API_URL || 'http://localhost:11235',
      feature_flag: process.env.FEATURE_FLAG_CRAWLPLEXITY === 'true',
    }
    
    const response = {
      status: healthCheck.overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        serper: {
          status: healthCheck.serper ? 'up' : 'down',
          description: 'Google search API via Serper'
        },
        crawl4ai: {
          status: healthCheck.crawl4ai ? 'up' : 'down',
          description: 'Web crawling service via Docker container'
        }
      },
      environment: envStatus,
      powered_by: 'Crawlplexity',
      version: '1.0.0'
    }
    
    return NextResponse.json(response, { status })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        serper: { status: 'unknown' },
        crawl4ai: { status: 'unknown' }
      },
      powered_by: 'Crawlplexity',
      version: '1.0.0'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}