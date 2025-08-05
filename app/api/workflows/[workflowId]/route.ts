import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/lib/workflow-service';

// GET /api/workflows/[workflowId] - Get specific workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const resolvedParams = await params;
    const workflowService = getWorkflowService();
    const workflow = await workflowService.getWorkflow(resolvedParams.workflowId);
    
    if (!workflow) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Workflow not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    console.error('[API] Failed to get workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[workflowId] - Update workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const resolvedParams = await params;
    const updates = await request.json();
    
    const workflowService = getWorkflowService();
    await workflowService.updateWorkflow(resolvedParams.workflowId, updates);
    
    return NextResponse.json({
      success: true,
      message: 'Workflow updated successfully'
    });
  } catch (error) {
    console.error('[API] Failed to update workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[workflowId] - Delete workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const resolvedParams = await params;
    const workflowService = getWorkflowService();
    await workflowService.deleteWorkflow(resolvedParams.workflowId);
    
    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('[API] Failed to delete workflow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}