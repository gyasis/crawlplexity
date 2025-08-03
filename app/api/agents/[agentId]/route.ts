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

// PUT /api/agents/[agentId] - Update agent status or full agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const data = await request.json();
    const agentService = getAgentService();
    
    // Check if this is a status-only update
    if (data.status && Object.keys(data).length === 1) {
      if (!['idle', 'running', 'stopped', 'error'].includes(data.status)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid status. Must be one of: idle, running, stopped, error' 
          },
          { status: 400 }
        );
      }

      await agentService.updateAgentStatus(params.agentId, data.status);
      
      return NextResponse.json({
        success: true,
        message: `Agent ${params.agentId} status updated to ${data.status}`
      });
    }
    
    // Full agent update - recreate the agent
    if (data.config?.name) {
      // Delete existing agent
      await agentService.deleteAgent(params.agentId);
      
      // Create new agent with updated data
      const newAgentId = await agentService.createAgent(data);
      
      return NextResponse.json({
        success: true,
        data: { agent_id: newAgentId },
        message: `Agent ${params.agentId} updated successfully`
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid update data. Provide either status or full agent manifest.' 
      },
      { status: 400 }
    );
    
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