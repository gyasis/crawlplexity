import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/lib/workflow-service';

// POST /api/workflows/[workflowId]/execute - Execute workflow
export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const executionData = await request.json();
    
    const workflowService = getWorkflowService();
    const executionId = await workflowService.executeWorkflow(
      params.workflowId,
      executionData.inputData || {},
      executionData.sessionId,
      executionData.userId
    );
    
    return NextResponse.json({
      success: true,
      data: { execution_id: executionId },
      message: 'Workflow execution started'
    });
  } catch (error) {
    console.error('[API] Failed to execute workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to execute workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/workflows/[workflowId]/execute - Get execution history
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const workflowService = getWorkflowService();
    const executions = await workflowService.getWorkflowExecutions(
      params.workflowId,
      { limit, status }
    );
    
    return NextResponse.json({
      success: true,
      data: executions
    });
  } catch (error) {
    console.error('[API] Failed to get workflow executions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve executions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}