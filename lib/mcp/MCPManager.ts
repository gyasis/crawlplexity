// MCP Manager - Manages Model Context Protocol servers

import Database from 'better-sqlite3';
import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import EventEmitter from 'events';

export interface MCPServerConfig {
  serverId?: string;
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface MCPServerStatus {
  serverId: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastHealthCheck?: Date;
  capabilities?: string[];
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  serverId: string;
  serverName: string;
}

export class MCPManager extends EventEmitter {
  private db: Database.Database;
  private servers: Map<string, {
    config: MCPServerConfig;
    process?: ChildProcess;
    status: MCPServerStatus;
  }> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(dbPath: string = 'fireplexity.db') {
    super();
    this.db = new Database(dbPath);
    this.loadServersFromDatabase();
    this.startHealthChecks();
  }

  /**
   * Load MCP servers from database
   */
  private loadServersFromDatabase(): void {
    const stmt = this.db.prepare(`
      SELECT * FROM mcp_servers WHERE status = 'active'
    `);
    
    const servers = stmt.all() as any[];
    
    for (const server of servers) {
      const config: MCPServerConfig = {
        serverId: server.server_id,
        name: server.name,
        type: server.type,
        command: server.command,
        args: server.args ? JSON.parse(server.args) : undefined,
        url: server.url,
        env: server.env ? JSON.parse(server.env) : undefined
      };

      this.servers.set(server.server_id, {
        config,
        status: {
          serverId: server.server_id,
          name: server.name,
          status: 'disconnected',
          capabilities: server.capabilities ? JSON.parse(server.capabilities) : []
        }
      });
    }
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    try {
      if (server.config.type === 'stdio') {
        await this.connectStdioServer(server);
      } else if (server.config.type === 'http') {
        await this.connectHttpServer(server);
      }

      server.status.status = 'connected';
      server.status.lastHealthCheck = new Date();
      
      // Update database
      this.updateServerStatus(serverId, 'active');
      
      this.emit('server_connected', {
        serverId,
        serverName: server.config.name
      });

      console.log(`✅ Connected to MCP server: ${server.config.name}`);
    } catch (error: any) {
      server.status.status = 'error';
      server.status.error = error.message;
      
      // Update database
      this.updateServerStatus(serverId, 'error');
      
      this.emit('server_error', {
        serverId,
        serverName: server.config.name,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Connect to stdio MCP server
   */
  private async connectStdioServer(server: any): Promise<void> {
    const { command, args = [], env = {} } = server.config;
    
    if (!command) {
      throw new Error('Command is required for stdio server');
    }

    // Spawn the MCP server process
    const childProcess = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    server.process = childProcess;

    // Handle process events
    childProcess.on('error', (error) => {
      console.error(`MCP server ${server.config.name} error:`, error);
      server.status.status = 'error';
      server.status.error = error.message;
    });

    childProcess.on('exit', (code) => {
      console.log(`MCP server ${server.config.name} exited with code ${code}`);
      server.status.status = 'disconnected';
    });

    // Set up JSON-RPC communication
    let buffer = '';
    
    childProcess.stdout?.on('data', (data) => {
      buffer += data.toString();
      
      // Try to parse complete JSON-RPC messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMCPMessage(server.config.serverId, message);
          } catch (error) {
            console.error('Failed to parse MCP message:', error);
          }
        }
      }
    });

    childProcess.stderr?.on('data', (data) => {
      console.error(`MCP server ${server.config.name} stderr:`, data.toString());
    });

    // Send initialization message
    await this.sendMCPRequest(server.config.serverId, 'initialize', {
      protocolVersion: '1.0',
      clientInfo: {
        name: 'fireplexity',
        version: '1.0.0'
      }
    });

    // Get available tools
    await this.sendMCPRequest(server.config.serverId, 'tools/list', {});
  }

  /**
   * Connect to HTTP MCP server
   */
  private async connectHttpServer(server: any): Promise<void> {
    const { url, headers = {} } = server.config;
    
    if (!url) {
      throw new Error('URL is required for HTTP server');
    }

    // Test connection with health check
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP server returned status ${response.status}`);
    }

    // Get server capabilities
    const capabilitiesResponse = await fetch(`${url}/capabilities`, {
      method: 'GET',
      headers
    });

    if (capabilitiesResponse.ok) {
      const capabilities = await capabilitiesResponse.json();
      server.status.capabilities = capabilities.tools || [];
    }
  }

  /**
   * Send MCP request to server
   */
  async sendMCPRequest(serverId: string, method: string, params: any): Promise<any> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (server.config.type === 'stdio' && server.process) {
      // Send JSON-RPC request via stdio
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      };

      return new Promise((resolve, reject) => {
        const requestStr = JSON.stringify(request) + '\n';
        
        server.process!.stdin?.write(requestStr, (error) => {
          if (error) {
            reject(error);
          } else {
            // Set up response handler
            // In production, implement proper request/response correlation
            setTimeout(() => resolve({ success: true }), 100);
          }
        });
      });
    } else if (server.config.type === 'http') {
      // Send request via HTTP
      const response = await fetch(`${server.config.url}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...server.config.headers
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP request failed: ${response.status}`);
      }

      return await response.json();
    }

    throw new Error('Server not connected');
  }

  /**
   * Handle incoming MCP messages
   */
  private handleMCPMessage(serverId: string, message: any): void {
    // Handle different message types
    if (message.method === 'tools/list') {
      this.handleToolsList(serverId, message.result);
    } else if (message.method === 'tool/executed') {
      this.emit('tool_executed', {
        serverId,
        toolName: message.params.tool,
        result: message.result
      });
    }
    
    // Log for debugging
    console.log(`MCP message from ${serverId}:`, message);
  }

  /**
   * Handle tools list from MCP server
   */
  private handleToolsList(serverId: string, tools: any[]): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    // Store tools information
    const mcpTools: MCPTool[] = tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      serverId,
      serverName: server.config.name
    }));

    this.emit('tools_discovered', {
      serverId,
      serverName: server.config.name,
      tools: mcpTools
    });
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(serverId: string, toolName: string, params: any): Promise<any> {
    const startTime = Date.now();

    try {
      const result = await this.sendMCPRequest(serverId, 'tools/call', {
        name: toolName,
        arguments: params
      });

      // Log execution
      this.logMCPCall(serverId, toolName, params, result, Date.now() - startTime, 'success');

      return result;
    } catch (error: any) {
      // Log error
      this.logMCPCall(serverId, toolName, params, null, Date.now() - startTime, 'error', error.message);
      
      throw error;
    }
  }

  /**
   * Get all available MCP tools
   */
  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [serverId, server] of this.servers) {
      if (server.status.status === 'connected') {
        try {
          const response = await this.sendMCPRequest(serverId, 'tools/list', {});
          
          if (response.tools) {
            const tools = response.tools.map((tool: any) => ({
              name: tool.name,
              description: tool.description,
              parameters: tool.inputSchema,
              serverId,
              serverName: server.config.name
            }));
            
            allTools.push(...tools);
          }
        } catch (error) {
          console.error(`Failed to get tools from ${server.config.name}:`, error);
        }
      }
    }

    return allTools;
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    if (server.process) {
      // Send shutdown message
      try {
        await this.sendMCPRequest(serverId, 'shutdown', {});
      } catch (error) {
        // Ignore errors during shutdown
      }

      // Kill the process
      server.process.kill();
      server.process = undefined;
    }

    server.status.status = 'disconnected';
    this.updateServerStatus(serverId, 'inactive');

    this.emit('server_disconnected', {
      serverId,
      serverName: server.config.name
    });
  }

  /**
   * Start health checks for all servers
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [serverId, server] of this.servers) {
        if (server.status.status === 'connected') {
          try {
            await this.sendMCPRequest(serverId, 'ping', {});
            server.status.lastHealthCheck = new Date();
          } catch (error) {
            server.status.status = 'error';
            server.status.error = 'Health check failed';
            this.updateServerStatus(serverId, 'error');
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Update server status in database
   */
  private updateServerStatus(serverId: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE mcp_servers 
      SET status = ?, last_health_check = CURRENT_TIMESTAMP
      WHERE server_id = ?
    `);
    
    stmt.run(status, serverId);
  }

  /**
   * Log MCP server call
   */
  private logMCPCall(
    serverId: string,
    toolName: string,
    request: any,
    response: any,
    responseTime: number,
    status: string,
    errorMessage?: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO mcp_server_logs 
      (server_id, agent_id, tool_name, request, response, response_time_ms, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      serverId,
      'system', // Default agent ID for now
      toolName,
      JSON.stringify(request),
      response ? JSON.stringify(response) : null,
      responseTime,
      status,
      errorMessage || null
    );
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): MCPServerStatus | undefined {
    const server = this.servers.get(serverId);
    return server?.status;
  }

  /**
   * Get all servers status
   */
  getAllServersStatus(): MCPServerStatus[] {
    return Array.from(this.servers.values()).map(s => s.status);
  }

  /**
   * Register a new MCP server
   */
  async registerServer(config: MCPServerConfig): Promise<string> {
    // Generate server ID
    const serverId = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to database
    const stmt = this.db.prepare(`
      INSERT INTO mcp_servers (server_id, name, type, command, args, url, env, capabilities, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      serverId,
      config.name,
      config.type,
      config.command || null,
      config.args ? JSON.stringify(config.args) : null,
      config.url || null,
      config.env ? JSON.stringify(config.env) : null,
      '[]',
      'active'
    );

    // Add to memory
    config.serverId = serverId;
    this.servers.set(serverId, {
      config,
      status: {
        serverId,
        name: config.name,
        status: 'disconnected',
        capabilities: []
      }
    });

    return serverId;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Disconnect all servers
    for (const serverId of this.servers.keys()) {
      await this.disconnectServer(serverId);
    }

    // Close database
    this.db.close();
  }
}