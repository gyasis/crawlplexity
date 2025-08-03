import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/agent-service';

// POST /api/agents/chat - Process chat message with agent orchestration
export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, userId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message is required' 
        },
        { status: 400 }
      );
    }

    const agentService = getAgentService();
    
    // Initialize if not already done
    await agentService.initialize();
    
    // Process the message using SmallTalk's orchestration
    const response = await agentService.chat(message, sessionId, userId);
    
    return NextResponse.json({
      success: true,
      data: {
        response,
        sessionId: sessionId || 'default',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[API] Agent chat failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/chat/stats - Get orchestration statistics
export async function GET() {
  try {
    const agentService = getAgentService();
    const stats = await agentService.getOrchestrationStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] Failed to get chat stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve chat statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}