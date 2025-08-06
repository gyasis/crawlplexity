// Tool Registry - Manages all available tools in the system

import { ToolDefinition, ToolRegistryEntry, ToolExecutionResult, ToolExecutionContext } from './types';
import Database from 'better-sqlite3';
import path from 'path';

export class ToolRegistry {
  private tools: Map<string, ToolRegistryEntry> = new Map();
  private db: Database.Database;
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(dbPath: string = 'fireplexity.db') {
    this.db = new Database(dbPath);
    this.loadToolsFromDatabase();
  }

  /**
   * Register a new tool in the system
   */
  async registerTool(tool: ToolDefinition, filePath: string): Promise<string> {
    // Check if tool with same name exists
    if (this.getToolByName(tool.name)) {
      throw new Error(`Tool with name ${tool.name} already exists`);
    }

    // Generate tool ID
    const toolId = this.generateToolId();

    // Save to database
    const stmt = this.db.prepare(`
      INSERT INTO tools (tool_id, name, category, description, file_path, parameters, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      toolId,
      tool.name,
      tool.category,
      tool.description,
      filePath,
      JSON.stringify(tool.parameters),
      1
    );

    // Add to registry
    this.tools.set(toolId, {
      tool,
      metadata: {
        toolId,
        filePath,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return toolId;
  }

  /**
   * Execute a tool with given parameters
   */
  async executeTool(
    toolId: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // Check if tool exists and is active
      const entry = this.tools.get(toolId);
      if (!entry) {
        throw new Error(`Tool ${toolId} not found`);
      }

      if (!entry.metadata.isActive) {
        throw new Error(`Tool ${toolId} is not active`);
      }

      // Check rate limits
      if (!this.checkRateLimit(toolId, context.agentId)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          timestamp: new Date().toISOString()
        };
      }

      // Validate parameters
      this.validateParameters(entry.tool.parameters, params);

      // Execute tool handler
      const result = await entry.tool.handler(params);

      // Log execution
      this.logExecution(toolId, context, params, result, Date.now() - startTime, 'success');

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      // Log error
      this.logExecution(toolId, context, params, null, Date.now() - startTime, 'error', error.message);

      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): ToolRegistryEntry | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get tool by name
   */
  getToolByName(name: string): ToolRegistryEntry | undefined {
    for (const entry of this.tools.values()) {
      if (entry.tool.name === name) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get all tools for a specific agent
   */
  getAgentTools(agentId: string): ToolDefinition[] {
    const stmt = this.db.prepare(`
      SELECT t.*, at.configuration, at.permissions
      FROM tools t
      JOIN agent_tools at ON t.tool_id = at.tool_id
      WHERE at.agent_id = ? AND at.is_active = 1 AND t.is_active = 1
    `);

    const rows = stmt.all(agentId) as any[];
    const tools: ToolDefinition[] = [];

    for (const row of rows) {
      const entry = this.tools.get(row.tool_id);
      if (entry) {
        tools.push(entry.tool);
      }
    }

    return tools;
  }

  /**
   * Assign a tool to an agent
   */
  assignToolToAgent(toolId: string, agentId: string, configuration?: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agent_tools (agent_id, tool_id, configuration)
      VALUES (?, ?, ?)
    `);

    stmt.run(agentId, toolId, JSON.stringify(configuration || {}));
  }

  /**
   * Remove tool assignment from agent
   */
  removeToolFromAgent(toolId: string, agentId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM agent_tools WHERE agent_id = ? AND tool_id = ?
    `);

    stmt.run(agentId, toolId);
  }

  /**
   * List all available tools
   */
  listTools(category?: string): ToolRegistryEntry[] {
    const tools: ToolRegistryEntry[] = [];
    
    for (const entry of this.tools.values()) {
      if (!category || entry.tool.category === category) {
        tools.push(entry);
      }
    }

    return tools;
  }

  /**
   * Load tools from database on startup
   */
  private loadToolsFromDatabase(): void {
    const stmt = this.db.prepare(`
      SELECT * FROM tools WHERE is_active = 1
    `);

    const rows = stmt.all() as any[];

    for (const row of rows) {
      // Dynamically import tool handlers from file paths
      // In production, these would be loaded from the actual files
      // For now, we'll create placeholder handlers
      const tool: ToolDefinition = {
        name: row.name,
        description: row.description,
        category: row.category,
        parameters: JSON.parse(row.parameters),
        handler: this.createPlaceholderHandler(row.name)
      };

      this.tools.set(row.tool_id, {
        tool,
        metadata: {
          toolId: row.tool_id,
          filePath: row.file_path,
          isActive: row.is_active === 1,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }
      });
    }
  }

  /**
   * Create placeholder handler for tools
   */
  private createPlaceholderHandler(toolName: string): (params: any) => Promise<any> {
    return async (params: any) => {
      // Placeholder implementation
      // In production, this would load the actual tool handler
      return {
        toolName,
        params,
        message: `Tool ${toolName} executed with parameters`,
        timestamp: new Date().toISOString()
      };
    };
  }

  /**
   * Validate tool parameters
   */
  private validateParameters(schema: any, params: Record<string, unknown>): void {
    const required = schema.required || [];
    
    for (const field of required) {
      if (!(field in params)) {
        throw new Error(`Required parameter '${field}' is missing`);
      }
    }

    for (const [key, value] of Object.entries(params)) {
      const paramSchema = schema.properties[key];
      if (!paramSchema) {
        throw new Error(`Unknown parameter '${key}'`);
      }

      // Type validation
      const expectedType = paramSchema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (expectedType !== actualType) {
        throw new Error(`Parameter '${key}' must be of type ${expectedType}, got ${actualType}`);
      }

      // Enum validation
      if (paramSchema.enum && !paramSchema.enum.includes(value)) {
        throw new Error(`Parameter '${key}' must be one of: ${paramSchema.enum.join(', ')}`);
      }
    }
  }

  /**
   * Check rate limits for tool execution
   */
  private checkRateLimit(toolId: string, agentId: string): boolean {
    const key = `${toolId}:${agentId}`;
    const now = Date.now();
    const limit = this.rateLimiters.get(key);

    // Get rate limit from database
    const stmt = this.db.prepare(`
      SELECT rate_limit FROM agent_tools 
      WHERE agent_id = ? AND tool_id = ?
    `);
    const row = stmt.get(agentId, toolId) as any;
    const maxCalls = row?.rate_limit || 100;

    if (!limit || now > limit.resetTime) {
      this.rateLimiters.set(key, {
        count: 1,
        resetTime: now + 60000 // 1 minute window
      });
      return true;
    }

    if (limit.count >= maxCalls) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Log tool execution
   */
  private logExecution(
    toolId: string,
    context: ToolExecutionContext,
    params: any,
    result: any,
    executionTime: number,
    status: string,
    errorMessage?: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO tool_execution_logs 
      (tool_id, agent_id, conversation_id, input_params, output_result, execution_time_ms, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      toolId,
      context.agentId,
      context.conversationId || null,
      JSON.stringify(params),
      result ? JSON.stringify(result) : null,
      executionTime,
      status,
      errorMessage || null
    );
  }

  /**
   * Generate unique tool ID
   */
  private generateToolId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}