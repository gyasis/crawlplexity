import { NextRequest, NextResponse } from 'next/server';
import { getSmallTalkServer } from '@/lib/smalltalk-server';

// POST /api/smalltalk/reload-agents - Reload all agents from YAML files
export async function POST(request: NextRequest) {
  try {
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

    const result = await smalltalkServer.reloadAgentsFromYAML();

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to reload agents',
          details: result.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        registeredCount: result.registeredCount,
        totalCount: result.totalCount,
        availableAgents: smalltalkServer.getAgentList()
      }
    });

  } catch (error) {
    console.error('[API] Failed to reload SmallTalk agents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reload agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/smalltalk/reload-agents - Get current agent status
export async function GET() {
  try {
    const smalltalkServer = getSmallTalkServer();
    
    return NextResponse.json({
      success: true,
      data: {
        isActive: smalltalkServer.isActive(),
        availableAgents: smalltalkServer.getAgentList(),
        totalAgents: smalltalkServer.getAgentList().length
      }
    });

  } catch (error) {
    console.error('[API] Failed to get SmallTalk status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get SmallTalk status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}