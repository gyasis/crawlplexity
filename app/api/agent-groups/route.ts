import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/agent-service';

// GET /api/agent-groups - List all agent groups
export async function GET() {
  try {
    const agentService = getAgentService();
    const groups = await agentService.getAgentGroups();
    
    return NextResponse.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('[API] Failed to get agent groups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve agent groups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/agent-groups - Create new agent group
export async function POST(request: NextRequest) {
  try {
    const { name, description, agents } = await request.json();
    
    if (!name || !Array.isArray(agents)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name and agents array are required' 
        },
        { status: 400 }
      );
    }

    const agentService = getAgentService();
    const groupId = await agentService.createAgentGroup({
      name,
      description,
      agents
    });
    
    return NextResponse.json({
      success: true,
      data: { id: groupId, name, description, agents }
    });
  } catch (error) {
    console.error('[API] Failed to create agent group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create agent group',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}