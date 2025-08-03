import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowService } from '@/lib/workflow-service';

// GET /api/workflows/templates - Get workflow templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const complexity = searchParams.get('complexity'); // 'beginner', 'intermediate', 'advanced'
    const orchestrationType = searchParams.get('orchestration_type'); // 'agent', 'agentic', 'hybrid'
    const featured = searchParams.get('featured') === 'true';

    const workflowService = getWorkflowService();
    const templates = await workflowService.getWorkflowTemplates({
      category,
      complexity,
      orchestrationType,
      featured
    });
    
    return NextResponse.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('[API] Failed to get workflow templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/workflows/templates - Create workflow template
export async function POST(request: NextRequest) {
  try {
    const templateData = await request.json();
    
    // Validate template structure
    if (!templateData.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid template: name is required' 
        },
        { status: 400 }
      );
    }

    if (!templateData.definition) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid template: definition is required' 
        },
        { status: 400 }
      );
    }

    if (!templateData.category) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid template: category is required' 
        },
        { status: 400 }
      );
    }

    const workflowService = getWorkflowService();
    const templateId = await workflowService.createWorkflowTemplate(templateData);
    
    return NextResponse.json({
      success: true,
      data: { template_id: templateId },
      message: `Template '${templateData.name}' created successfully`
    });
  } catch (error) {
    console.error('[API] Failed to create workflow template:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}