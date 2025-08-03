import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/lib/workflow-service';

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const workflowType = searchParams.get('type'); // 'agent', 'agentic', 'hybrid'
    const status = searchParams.get('status'); // 'draft', 'active', 'archived'
    const limit = parseInt(searchParams.get('limit') || '50');

    const workflowService = getWorkflowService();
    const workflows = await workflowService.getWorkflowList({
      category,
      workflowType,
      status,
      limit
    });
    
    return NextResponse.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    console.error('[API] Failed to get workflows:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve workflows',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create new workflow
export async function POST(request: NextRequest) {
  try {
    const workflowData = await request.json();
    
    // Validate workflow structure
    if (!workflowData.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid workflow: name is required' 
        },
        { status: 400 }
      );
    }

    if (!workflowData.definition) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid workflow: definition is required' 
        },
        { status: 400 }
      );
    }

    const workflowService = getWorkflowService();
    const workflowId = await workflowService.createWorkflow(workflowData);
    
    return NextResponse.json({
      success: true,
      data: { workflow_id: workflowId },
      message: `Workflow '${workflowData.name}' created successfully`
    });
  } catch (error) {
    console.error('[API] Failed to create workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}