import { NextResponse } from 'next/server'
import { getCacheManager } from '@/lib/cache-manager'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const cacheManager = getCacheManager()
    
    switch (action) {
      case 'stats':
        const stats = cacheManager.getStats()
        return NextResponse.json({
          cache_stats: stats,
          timestamp: new Date().toISOString(),
          status: 'healthy'
        })
        
      case 'clear':
        await cacheManager.clear()
        return NextResponse.json({
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        })
        
      default:
        const defaultStats = cacheManager.getStats()
        return NextResponse.json({
          service: 'Crawlplexity Cache Manager',
          cache_stats: defaultStats,
          actions: {
            stats: '/api/crawlplexity/cache?action=stats',
            clear: '/api/crawlplexity/cache?action=clear'
          },
          timestamp: new Date().toISOString()
        })
    }
    
  } catch (error) {
    console.error('Cache API error:', error)
    return NextResponse.json(
      { 
        error: 'Cache operation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, pattern } = body
    
    const cacheManager = getCacheManager()
    
    switch (action) {
      case 'invalidate':
        if (!pattern) {
          return NextResponse.json(
            { error: 'Pattern is required for invalidation' },
            { status: 400 }
          )
        }
        
        await cacheManager.invalidatePattern(pattern)
        return NextResponse.json({
          message: `Cache entries matching "${pattern}" invalidated`,
          timestamp: new Date().toISOString()
        })
        
      case 'clear':
        await cacheManager.clear()
        return NextResponse.json({
          message: 'All cache cleared',
          timestamp: new Date().toISOString()
        })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: invalidate, clear' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('Cache POST API error:', error)
    return NextResponse.json(
      { 
        error: 'Cache operation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}