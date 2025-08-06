// API routes for tool assignment to agents

import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { ToolRegistry } from '@/lib/tools/ToolRegistry';

const db = new Database('fireplexity.db');
const toolRegistry = new ToolRegistry('fireplexity.db');

// POST /api/tools/assign - Assign tool to agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, toolId, configuration, permissions, rateLimit } = body;

    if (!agentId || !toolId) {
      return NextResponse.json(
        { error: 'Agent ID and Tool ID are required' },
        { status: 400 }
      );
    }

    // Check if tool exists
    const tool = toolRegistry.getTool(toolId);
    if (!tool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Assign tool to agent with configuration
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO agent_tools 
      (agent_id, tool_id, configuration, permissions, rate_limit, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      agentId,
      toolId,
      JSON.stringify(configuration || {}),
      JSON.stringify(permissions || { read: true, write: false, execute: true }),
      rateLimit || 100,
      1
    );

    return NextResponse.json({
      message: 'Tool assigned successfully',
      assignment: {
        agentId,
        toolId,
        toolName: tool.tool.name
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/assign - Remove tool from agent
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');
    const toolId = searchParams.get('toolId');

    if (!agentId || !toolId) {
      return NextResponse.json(
        { error: 'Agent ID and Tool ID are required' },
        { status: 400 }
      );
    }

    // Remove tool assignment
    const stmt = db.prepare(`
      DELETE FROM agent_tools WHERE agent_id = ? AND tool_id = ?
    `);
    
    const result = stmt.run(agentId, toolId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Tool assignment removed successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/tools/assign - Get tool assignments for agent
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // Get tool assignments with details
    const stmt = db.prepare(`
      SELECT 
        at.*,
        t.name as tool_name,
        t.category,
        t.description,
        t.parameters
      FROM agent_tools at
      JOIN tools t ON at.tool_id = t.tool_id
      WHERE at.agent_id = ? AND at.is_active = 1
    `);

    const assignments = stmt.all(agentId) as any[];

    return NextResponse.json({
      agentId,
      assignments: assignments.map(a => ({
        toolId: a.tool_id,
        toolName: a.tool_name,
        category: a.category,
        description: a.description,
        parameters: JSON.parse(a.parameters),
        configuration: JSON.parse(a.configuration || '{}'),
        permissions: JSON.parse(a.permissions || '{}'),
        rateLimit: a.rate_limit,
        assignedAt: a.assigned_at
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/tools/assign - Update tool assignment configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, toolId, configuration, permissions, rateLimit, isActive } = body;

    if (!agentId || !toolId) {
      return NextResponse.json(
        { error: 'Agent ID and Tool ID are required' },
        { status: 400 }
      );
    }

    // Build update query
    const updates = [];
    const values = [];

    if (configuration !== undefined) {
      updates.push('configuration = ?');
      values.push(JSON.stringify(configuration));
    }
    if (permissions !== undefined) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }
    if (rateLimit !== undefined) {
      updates.push('rate_limit = ?');
      values.push(rateLimit);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    values.push(agentId, toolId);

    const stmt = db.prepare(`
      UPDATE agent_tools 
      SET ${updates.join(', ')}
      WHERE agent_id = ? AND tool_id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Tool assignment updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}