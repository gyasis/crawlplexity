import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/agent-service';

// GET /api/agents/[agentId] - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentService = getAgentService();
    const agent = await agentService.getAgentStatus(params.agentId);
    
    if (!agent) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error(`[API] Failed to get agent ${params.agentId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[agentId] - Update agent status
export async function PUT(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { status } = await request.json();
    
    if (!status || !['idle', 'running', 'stopped', 'error'].includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid status. Must be one of: idle, running, stopped, error' 
        },
        { status: 400 }
      );
    }

    const agentService = getAgentService();
    await agentService.updateAgentStatus(params.agentId, status);
    
    return NextResponse.json({
      success: true,
      message: `Agent ${params.agentId} status updated to ${status}`
    });
  } catch (error) {
    console.error(`[API] Failed to update agent ${params.agentId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[agentId] - Delete agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentService = getAgentService();
    await agentService.deleteAgent(params.agentId);
    
    return NextResponse.json({
      success: true,
      message: `Agent ${params.agentId} deleted successfully`
    });
  } catch (error) {
    console.error(`[API] Failed to delete agent ${params.agentId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}