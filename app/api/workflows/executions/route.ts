import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/lib/workflow-service';

// GET /api/workflows/executions - Get workflow executions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const workflowId = searchParams.get('workflow_id');
    const limit = searchParams.get('limit');

    const workflowService = getWorkflowService();

    if (workflowId) {
      // Get executions for a specific workflow
      const executions = await workflowService.getWorkflowExecutions(workflowId, {
        status: status || undefined,
        limit: limit ? parseInt(limit) : undefined
      });

      return NextResponse.json({
        success: true,
        data: executions,
        message: 'Workflow executions retrieved successfully'
      });
    } else {
      // Get all executions across all workflows
      const executions = await workflowService.getAllWorkflowExecutions({
        status: status || undefined,
        limit: limit ? parseInt(limit) : undefined
      });

      return NextResponse.json({
        success: true,
        data: executions,
        message: 'All workflow executions retrieved successfully'
      });
    }
  } catch (error) {
    console.error('[API] Failed to get workflow executions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve workflow executions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}