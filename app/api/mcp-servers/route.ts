// API routes for MCP server management

import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { MCPManager } from '@/lib/mcp/MCPManager';

const db = new Database('fireplexity.db');
const mcpManager = new MCPManager('fireplexity.db');

// GET /api/mcp-servers - List all MCP servers
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = 'SELECT * FROM mcp_servers';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const stmt = db.prepare(query);
    const servers = stmt.all(...params) as any[];

    // Get real-time status from MCP manager
    const serverStatuses = mcpManager.getAllServersStatus();
    const statusMap = new Map(serverStatuses.map(s => [s.serverId, s]));

    return NextResponse.json({
      servers: servers.map(server => ({
        serverId: server.server_id,
        name: server.name,
        type: server.type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : null,
        url: server.url,
        capabilities: server.capabilities ? JSON.parse(server.capabilities) : [],
        status: statusMap.get(server.server_id)?.status || server.status,
        lastHealthCheck: statusMap.get(server.server_id)?.lastHealthCheck || server.last_health_check,
        createdAt: server.created_at
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/mcp-servers - Register new MCP server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, command, args, url, env, headers } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (type === 'stdio' && !command) {
      return NextResponse.json(
        { error: 'Command is required for stdio servers' },
        { status: 400 }
      );
    }

    if (type === 'http' && !url) {
      return NextResponse.json(
        { error: 'URL is required for HTTP servers' },
        { status: 400 }
      );
    }

    // Register server
    const serverId = await mcpManager.registerServer({
      name,
      type,
      command,
      args,
      url,
      env,
      headers
    });

    // Try to connect immediately
    try {
      await mcpManager.connectServer(serverId);
    } catch (connectError: any) {
      console.error(`Failed to connect to server ${name}:`, connectError.message);
    }

    return NextResponse.json({
      serverId,
      message: 'MCP server registered successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/mcp-servers/:id - Update MCP server
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, name, command, args, url, env, status } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (command !== undefined) {
      updates.push('command = ?');
      values.push(command);
    }
    if (args !== undefined) {
      updates.push('args = ?');
      values.push(JSON.stringify(args));
    }
    if (url !== undefined) {
      updates.push('url = ?');
      values.push(url);
    }
    if (env !== undefined) {
      updates.push('env = ?');
      values.push(JSON.stringify(env));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(serverId);

      const stmt = db.prepare(`
        UPDATE mcp_servers SET ${updates.join(', ')} WHERE server_id = ?
      `);
      stmt.run(...values);
    }

    return NextResponse.json({
      message: 'MCP server updated successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp-servers/:id - Delete MCP server
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('id');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    // Disconnect server first
    await mcpManager.disconnectServer(serverId);

    // Delete from database
    const stmt = db.prepare('DELETE FROM mcp_servers WHERE server_id = ?');
    const result = stmt.run(serverId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'MCP server deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/mcp-servers/:id/connect - Connect to MCP server
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    await mcpManager.connectServer(serverId);

    return NextResponse.json({
      message: 'Connected to MCP server successfully',
      status: mcpManager.getServerStatus(serverId)
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/mcp-servers/:id/disconnect - Disconnect from MCP server
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('id');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    await mcpManager.disconnectServer(serverId);

    return NextResponse.json({
      message: 'Disconnected from MCP server successfully'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/mcp-servers/:id/tools - Get tools from MCP server
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const serverId = searchParams.get('serverId');

    if (!serverId) {
      // Get all tools from all servers
      const tools = await mcpManager.getAllTools();
      return NextResponse.json({ tools });
    }

    // Get tools from specific server
    const response = await mcpManager.sendMCPRequest(serverId, 'tools/list', {});
    
    return NextResponse.json({
      serverId,
      tools: response.tools || []
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}