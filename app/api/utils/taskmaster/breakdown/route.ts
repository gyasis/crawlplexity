/**
 * API Route: POST /api/utils/taskmaster/breakdown
 * Break down a complex task into sequential steps using DSPy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDSPyService } from '@/lib/utils/services/dspy-service';
import { TaskOptions, UtilsError } from '@/lib/utils/types';

interface BreakdownRequest {
  task: string;
  task_type?: 'research' | 'content_creation' | 'analysis' | 'development' | 'general';
  output_format?: 'json' | 'markdown' | 'plain_text';
  max_steps?: number;
  include_estimates?: boolean;
  context?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: BreakdownRequest = await request.json();

    // Validate required fields
    if (!body.task || typeof body.task !== 'string' || body.task.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task description is required and must be a non-empty string',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate task length
    if (body.task.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task description must be less than 2000 characters',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate max_steps
    if (body.max_steps && (body.max_steps < 1 || body.max_steps > 20)) {
      return NextResponse.json(
        {
          success: false,
          error: 'max_steps must be between 1 and 20',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Prepare options
    const options: TaskOptions = {
      task_type: body.task_type || 'general',
      max_steps: body.max_steps || 10,
      include_estimates: body.include_estimates !== false,
      context: body.context || {}
    };

    // Get DSPy service and break down task
    const dspyService = getDSPyService();
    const result = await dspyService.breakdownTask(body.task, options);

    // Format response based on output_format
    let formattedResult: any = result;
    if (body.output_format === 'markdown') {
      formattedResult = {
        ...result,
        formatted_output: formatAsMarkdown(result)
      };
    } else if (body.output_format === 'plain_text') {
      formattedResult = {
        ...result,
        formatted_output: formatAsPlainText(result)
      };
    }

    return NextResponse.json({
      success: true,
      data: formattedResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Taskmaster breakdown API error:', error);

    if (error instanceof UtilsError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          module: error.module,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred while breaking down task',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to format result as markdown
function formatAsMarkdown(result: any): string {
  let markdown = `# Task Breakdown: ${result.original_task}\n\n`;
  
  markdown += `**Complexity Score:** ${result.breakdown.complexity_score}/10\n`;
  markdown += `**Estimated Total Time:** ${result.breakdown.total_estimated_time} minutes\n`;
  markdown += `**Task Type:** ${result.metadata.task_type}\n\n`;
  
  markdown += `## Steps\n\n`;
  
  result.breakdown.steps.forEach((step: any, index: number) => {
    markdown += `### ${step.order}. ${step.title}\n\n`;
    markdown += `${step.description}\n\n`;
    markdown += `**Estimated Time:** ${step.estimated_time} minutes\n\n`;
    
    if (step.resources_needed.length > 0) {
      markdown += `**Resources Needed:**\n`;
      step.resources_needed.forEach((resource: string) => {
        markdown += `- ${resource}\n`;
      });
      markdown += `\n`;
    }
    
    if (step.success_criteria.length > 0) {
      markdown += `**Success Criteria:**\n`;
      step.success_criteria.forEach((criteria: string) => {
        markdown += `- ${criteria}\n`;
      });
      markdown += `\n`;
    }
    
    if (step.commands && step.commands.length > 0) {
      markdown += `**Commands:**\n`;
      step.commands.forEach((command: string) => {
        markdown += `- \`${command}\`\n`;
      });
      markdown += `\n`;
    }
    
    if (step.dependencies.length > 0) {
      markdown += `**Dependencies:** ${step.dependencies.join(', ')}\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  return markdown;
}

// Helper function to format result as plain text
function formatAsPlainText(result: any): string {
  let text = `TASK BREAKDOWN: ${result.original_task}\n\n`;
  
  text += `Complexity Score: ${result.breakdown.complexity_score}/10\n`;
  text += `Estimated Total Time: ${result.breakdown.total_estimated_time} minutes\n`;
  text += `Task Type: ${result.metadata.task_type}\n\n`;
  
  text += `STEPS:\n\n`;
  
  result.breakdown.steps.forEach((step: any) => {
    text += `${step.order}. ${step.title}\n`;
    text += `   ${step.description}\n`;
    text += `   Time: ${step.estimated_time} minutes\n`;
    
    if (step.resources_needed.length > 0) {
      text += `   Resources: ${step.resources_needed.join(', ')}\n`;
    }
    
    if (step.success_criteria.length > 0) {
      text += `   Success Criteria: ${step.success_criteria.join(', ')}\n`;
    }
    
    if (step.commands && step.commands.length > 0) {
      text += `   Commands: ${step.commands.join(', ')}\n`;
    }
    
    if (step.dependencies.length > 0) {
      text += `   Dependencies: ${step.dependencies.join(', ')}\n`;
    }
    
    text += `\n`;
  });
  
  return text;
}