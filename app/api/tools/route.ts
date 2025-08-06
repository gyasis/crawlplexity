// API routes for tool management

import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { ToolRegistry } from '@/lib/tools/ToolRegistry';

const db = new Database('fireplexity.db');
const toolRegistry = new ToolRegistry('fireplexity.db');

// GET /api/tools - List all tools
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const agentId = searchParams.get('agentId');

    if (agentId) {
      // Get tools assigned to specific agent
      const tools = toolRegistry.getAgentTools(agentId);
      return NextResponse.json({ tools });
    }

    // Get all tools or by category
    const tools = toolRegistry.listTools(category || undefined);
    
    return NextResponse.json({
      tools: tools.map(t => ({
        toolId: t.metadata.toolId,
        name: t.tool.name,
        category: t.tool.category,
        description: t.tool.description,
        parameters: t.tool.parameters,
        isActive: t.metadata.isActive
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tools - Create new tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, description, parameters, handlerCode } = body;

    // Validate required fields
    if (!name || !category || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create tool definition
    const toolDefinition = {
      name,
      category,
      description,
      parameters: parameters || { type: 'object', properties: {}, required: [] },
      handler: eval(handlerCode || 'async (params) => ({ result: "Tool executed", params })')
    };

    // Register tool
    const toolId = await toolRegistry.registerTool(
      toolDefinition,
      `/lib/tools/custom/${name}.ts`
    );

    // Also save handler code to database
    const stmt = db.prepare(`
      UPDATE tools SET handler_code = ? WHERE tool_id = ?
    `);
    stmt.run(handlerCode || '', toolId);

    return NextResponse.json({
      toolId,
      message: 'Tool created successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/tools/:id - Update tool
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolId, description, parameters, handlerCode, isActive } = body;

    if (!toolId) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Update tool in database
    const updates = [];
    const values = [];

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (parameters !== undefined) {
      updates.push('parameters = ?');
      values.push(JSON.stringify(parameters));
    }
    if (handlerCode !== undefined) {
      updates.push('handler_code = ?');
      values.push(handlerCode);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(toolId);

      const stmt = db.prepare(`
        UPDATE tools SET ${updates.join(', ')} WHERE tool_id = ?
      `);
      stmt.run(...values);
    }

    return NextResponse.json({
      message: 'Tool updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/:id - Delete tool
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const toolId = searchParams.get('id');

    if (!toolId) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    // Delete tool from database (cascade will handle related records)
    const stmt = db.prepare('DELETE FROM tools WHERE tool_id = ?');
    const result = stmt.run(toolId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Tool deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}