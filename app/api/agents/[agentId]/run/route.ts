import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/agent-service';

// POST /api/agents/[agentId]/run - Execute agent with input
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const resolvedParams = await params;
  const agentId = resolvedParams.agentId;
  
  try {
    const requestData = await request.json();
    const { input, sessionId, userId } = requestData;

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Input message is required and must be a string' 
        },
        { status: 400 }
      );
    }

    const agentService = getAgentService();
    
    // Verify agent exists
    const agent = await agentService.getAgentStatus(agentId);
    if (!agent) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent not found' 
        },
        { status: 404 }
      );
    }

    // Check if agent is already running
    if (agent.status === 'running') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent is already running. Please wait for it to complete.' 
        },
        { status: 409 }
      );
    }

    // Create agent run record
    const runId = await agentService.createAgentRun(
      agentId, 
      sessionId || 'agent-test', 
      userId || 'user'
    );

    // Update agent status to running
    await agentService.updateAgentStatus(agentId, 'running');

    let result: string;
    let error: string | undefined;

    try {
      console.log(`[API] Starting agent run ${runId} for agent ${agentId} with input: "${input}"`);
      
      // Execute the agent with the provided input
      result = await agentService.chatWithAgent(
        agentId,
        input,
        sessionId || 'agent-test',
        userId || 'user'
      );

      console.log(`[API] Agent run ${runId} completed successfully`);
      
      // Update agent status to idle on success
      await agentService.updateAgentStatus(agentId, 'idle');
      
    } catch (executionError) {
      console.error(`[API] Agent run ${runId} failed:`, executionError);
      
      error = executionError instanceof Error ? executionError.message : 'Unknown execution error';
      result = '';
      
      // Update agent status to error on failure
      await agentService.updateAgentStatus(agentId, 'error');
    }

    // Complete the agent run record
    await agentService.completeAgentRun(runId, result, error);

    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent execution failed',
          details: error,
          runId
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        runId,
        agentId,
        result,
        message: `Agent ${agentId} executed successfully`
      }
    });

  } catch (error) {
    console.error(`[API] Failed to run agent ${agentId}:`, error);
    
    // Try to update agent status to error if possible
    try {
      const agentService = getAgentService();
      await agentService.updateAgentStatus(agentId, 'error');
    } catch (statusError) {
      console.error('[API] Failed to update agent status to error:', statusError);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to run agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/[agentId]/run - Get agent run history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const resolvedParams = await params;
  const agentId = resolvedParams.agentId;
  
  try {
    const agentService = getAgentService();
    
    // Verify agent exists
    const agent = await agentService.getAgentStatus(agentId);
    if (!agent) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Agent not found' 
        },
        { status: 404 }
      );
    }

    // Get run history for this agent
    const runs = await agentService.getAgentRuns(agentId, 20); // Get last 20 runs

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        runs,
        totalRuns: runs.length
      }
    });

  } catch (error) {
    console.error(`[API] Failed to get run history for agent ${agentId}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve run history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}