import { NextRequest, NextResponse } from 'next/server';
import { getSmallTalkServer } from '@/lib/smalltalk-server';

// POST /api/smalltalk/reload-agent - Reload a specific agent from YAML
export async function POST(request: NextRequest) {
  try {
    const { agentId } = await request.json();
    
    if (!agentId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent ID is required' 
        },
        { status: 400 }
      );
    }

    const smalltalkServer = getSmallTalkServer();
    
    if (!smalltalkServer.isActive()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SmallTalk server is not running' 
        },
        { status: 503 }
      );
    }

    const result = await smalltalkServer.reloadSingleAgent(agentId);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to reload agent',
          details: result.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        agentId,
        availableAgents: smalltalkServer.getAgentList()
      }
    });

  } catch (error) {
    console.error('[API] Failed to reload SmallTalk agent:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reload agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}