import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/lib/workflow-service';

// POST /api/workflows/templates/[templateId]/instantiate - Create workflow from template
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const instantiationData = await request.json();
    
    const workflowService = getWorkflowService();
    const workflowId = await workflowService.instantiateWorkflowFromTemplate(
      params.templateId,
      {
        name: instantiationData.name,
        description: instantiationData.description,
        customizations: instantiationData.customizations || {},
        userId: instantiationData.userId
      }
    );
    
    return NextResponse.json({
      success: true,
      data: { workflow_id: workflowId },
      message: 'Workflow created from template successfully'
    });
  } catch (error) {
    console.error('[API] Failed to instantiate workflow from template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create workflow from template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}