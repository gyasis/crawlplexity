import { NextResponse, NextRequest } from 'next/server';
import { getVideoProcessingClient } from '@/lib/video-processing-client';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Video Test API called`);
  
  try {
    const body = await request.json();
    const { url, query = 'test query' } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    console.log(`[${requestId}] Testing video processing for URL: ${url}`);
    
    const videoClient = getVideoProcessingClient();
    
    // Test classification first
    console.log(`[${requestId}] Step 1: Testing URL classification`);
    const classification = await videoClient.classifyUrl(url);
    console.log(`[${requestId}] Classification result:`, classification);
    
    // Test video processing
    console.log(`[${requestId}] Step 2: Testing video processing`);
    const startTime = Date.now();
    
    const result = await videoClient.processVideo(url, query);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`[${requestId}] Video processing completed in ${processingTime}ms`);
    console.log(`[${requestId}] Result:`, {
      success: result.success,
      contentLength: result.processedContent?.length || 0,
      error: result.error,
      hasMetadata: !!result.metadata
    });
    
    return NextResponse.json({
      requestId,
      classification,
      result: {
        ...result,
        processingTimeMs: processingTime
      }
    });
    
  } catch (error) {
    console.error(`[${requestId}] Video test failed:`, error);
    return NextResponse.json({
      error: 'Video test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Video Test API - POST a URL to test video processing directly',
    example: {
      url: 'https://www.youtube.com/watch?v=et7XvBenEo8',
      query: 'three body problem explanation'
    }
  });
}