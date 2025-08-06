import { SmallTalk, WebInterface, createAgent, Agent } from 'smalltalk-ai';
import { ToolRegistry } from './tools/ToolRegistry';
import { calculatorTool, advancedCalculatorTool } from './tools/computation/calculator';
import { webSearchTool, knowledgeSearchTool } from './tools/search/web_search';
import { fileOperationsTool } from './tools/utility/file_operations';
import { ToolDefinition } from './tools/types';
import Database from 'better-sqlite3';

export class EnhancedSmallTalkServer {
  private app: SmallTalk;
  private server: WebInterface;
  private toolRegistry: ToolRegistry;
  private mcpServers: Map<string, any> = new Map();
  private isRunning = false;
  private db: Database.Database;

  constructor() {
    // Initialize database
    this.db = new Database('fireplexity.db');
    
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry('fireplexity.db');
    
    // Create SmallTalk with orchestration
    this.app = new SmallTalk({
      llmProvider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      debugMode: process.env.NODE_ENV === 'development',
      orchestration: true,
      orchestrationConfig: {
        maxAutoResponses: 10,
        streamResponses: true,
        enableInterruption: true
      }
    });

    // Create API-only web interface
    this.server = new WebInterface({
      type: 'web',
      port: 3001,
      host: 'localhost',
      apiOnly: true,
      cors: {
        origin: '*',
        credentials: true
      }
    });

    this.app.addInterface(this.server);
    this.initializeTools();
    this.setupEnhancedAgents();
    this.initializeMCPServers();
  }

  /**
   * Initialize and register built-in tools
   */
  private async initializeTools(): Promise<void> {
    const builtInTools = [
      { tool: calculatorTool, path: '/lib/tools/computation/calculator.ts' },
      { tool: advancedCalculatorTool, path: '/lib/tools/computation/calculator.ts' },
      { tool: webSearchTool, path: '/lib/tools/search/web_search.ts' },
      { tool: knowledgeSearchTool, path: '/lib/tools/search/web_search.ts' },
      { tool: fileOperationsTool, path: '/lib/tools/utility/file_operations.ts' }
    ];

    for (const { tool, path } of builtInTools) {
      try {
        // Check if tool already exists
        if (!this.toolRegistry.getToolByName(tool.name)) {
          await this.toolRegistry.registerTool(tool, path);
          console.log(`✅ Registered tool: ${tool.name}`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to register tool ${tool.name}:`, error.message);
      }
    }
  }

  /**
   * Setup enhanced agents with tool capabilities
   */
  private setupEnhancedAgents(): void {
    // Research Assistant with tools
    const researchAssistant = createAgent(
      'research-assistant',
      `A knowledgeable research assistant with powerful tools at your disposal.
      
      You have access to:
      - Web Search: Find current information on any topic
      - Knowledge Search: Search internal documentation and knowledge base
      - Calculator: Perform mathematical calculations
      - File Operations: Read and analyze documents
      
      Use these tools to provide comprehensive, accurate, and up-to-date information.`,
      { temperature: 0.7 }
    );

    // Assign tools to research assistant
    const researchTools = ['web_search', 'knowledge_search', 'calculator', 'file_operations'];
    this.assignToolsToAgent('research-assistant', researchTools);

    // Add agent with tool capabilities
    this.app.addAgent(researchAssistant, {
      expertise: ['research', 'analysis', 'information gathering', 'summarization'],
      complexity: 'intermediate',
      taskTypes: ['research', 'analysis', 'questions'],
      contextAwareness: 0.9,
      collaborationStyle: 'independent',
      tools: this.getAgentToolDefinitions('research-assistant'),
      personalityTraits: ['analytical', 'helpful', 'thorough']
    });

    // Coding Assistant with tools
    const codingAssistant = createAgent(
      'coding-assistant',
      `An expert programming assistant with development tools.
      
      You have access to:
      - File Operations: Read, write, and manage code files
      - Knowledge Search: Search documentation and code examples
      - Advanced Calculator: Perform algorithm analysis and calculations
      
      Focus on clean, maintainable, well-documented code solutions.`,
      { temperature: 0.3 }
    );

    // Assign tools to coding assistant
    const codingTools = ['file_operations', 'knowledge_search', 'advanced_calculator'];
    this.assignToolsToAgent('coding-assistant', codingTools);

    this.app.addAgent(codingAssistant, {
      expertise: ['programming', 'debugging', 'code review', 'software development'],
      complexity: 'advanced',
      taskTypes: ['coding', 'debugging', 'technical'],
      contextAwareness: 0.9,
      collaborationStyle: 'leading',
      tools: this.getAgentToolDefinitions('coding-assistant'),
      personalityTraits: ['precise', 'logical', 'detail-oriented']
    });

    // Data Analyst with tools
    const dataAnalyst = createAgent(
      'data-analyst',
      `A data analysis expert with powerful computational tools.
      
      You have access to:
      - Advanced Calculator: Statistical analysis and complex calculations
      - File Operations: Read and process data files
      - Web Search: Find datasets and research papers
      
      Provide data-driven insights with clear visualizations and explanations.`,
      { temperature: 0.5 }
    );

    // Assign tools to data analyst
    const analystTools = ['advanced_calculator', 'file_operations', 'web_search'];
    this.assignToolsToAgent('data-analyst', analystTools);

    this.app.addAgent(dataAnalyst, {
      expertise: ['data analysis', 'statistics', 'visualization', 'reporting'],
      complexity: 'advanced',
      taskTypes: ['analysis', 'computation', 'reporting'],
      contextAwareness: 0.8,
      collaborationStyle: 'independent',
      tools: this.getAgentToolDefinitions('data-analyst'),
      personalityTraits: ['analytical', 'methodical', 'detail-oriented']
    });
  }

  /**
   * Initialize MCP servers from database
   */
  private async initializeMCPServers(): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM mcp_servers WHERE status = 'active'
      `);
      
      const servers = stmt.all() as any[];
      
      for (const server of servers) {
        const config = {
          name: server.name,
          type: server.type,
          command: server.command,
          args: JSON.parse(server.args || '[]'),
          url: server.url,
          env: JSON.parse(server.env || '{}')
        };

        // Add MCP server to SmallTalk
        try {
          await this.app.addMCPServer(config);
          this.mcpServers.set(server.server_id, config);
          console.log(`✅ Connected MCP server: ${server.name}`);
        } catch (error: any) {
          console.error(`❌ Failed to connect MCP server ${server.name}:`, error.message);
          
          // Update server status to error
          const updateStmt = this.db.prepare(`
            UPDATE mcp_servers SET status = 'error' WHERE server_id = ?
          `);
          updateStmt.run(server.server_id);
        }
      }
    } catch (error: any) {
      console.error('Failed to initialize MCP servers:', error.message);
    }
  }

  /**
   * Assign tools to an agent
   */
  private assignToolsToAgent(agentId: string, toolNames: string[]): void {
    for (const toolName of toolNames) {
      const toolEntry = this.toolRegistry.getToolByName(toolName);
      if (toolEntry) {
        this.toolRegistry.assignToolToAgent(toolEntry.metadata.toolId, agentId);
      }
    }
  }

  /**
   * Get tool definitions for an agent
   */
  private getAgentToolDefinitions(agentId: string): ToolDefinition[] {
    return this.toolRegistry.getAgentTools(agentId);
  }

  /**
   * Assign MCP server to agent
   */
  public assignMCPServerToAgent(serverId: string, agentId: string, configuration?: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agent_mcp_servers (agent_id, server_id, configuration)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(agentId, serverId, JSON.stringify(configuration || {}));
  }

  /**
   * Get MCP servers for an agent
   */
  public getAgentMCPServers(agentId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT m.*, am.configuration
      FROM mcp_servers m
      JOIN agent_mcp_servers am ON m.server_id = am.server_id
      WHERE am.agent_id = ? AND am.is_active = 1 AND m.status = 'active'
    `);
    
    return stmt.all(agentId) as any[];
  }

  /**
   * Start the enhanced SmallTalk server
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      await this.app.start();
      this.isRunning = true;
      
      console.log('🚀 Enhanced SmallTalk server started on http://localhost:3001');
      console.log('📋 Available agents:', this.app.listAgents().join(', '));
      console.log('🛠️  Registered tools:', this.toolRegistry.listTools().length);
      console.log('🔌 Connected MCP servers:', this.mcpServers.size);
      console.log('🎯 Orchestration enabled for intelligent agent selection');
    } catch (error) {
      console.error('❌ Failed to start Enhanced SmallTalk server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.app.stop();
      this.toolRegistry.close();
      this.db.close();
      this.isRunning = false;
      console.log('🛑 Enhanced SmallTalk server stopped');
    } catch (error) {
      console.error('❌ Error stopping Enhanced SmallTalk server:', error);
    }
  }

  /**
   * Get server status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      agents: this.app.listAgents(),
      tools: this.toolRegistry.listTools().map(t => ({
        name: t.tool.name,
        category: t.tool.category,
        description: t.tool.description
      })),
      mcpServers: Array.from(this.mcpServers.values()).map(s => ({
        name: s.name,
        type: s.type
      }))
    };
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getAgentList(): string[] {
    return this.app.listAgents();
  }
}

// Singleton instance
let enhancedServer: EnhancedSmallTalkServer | null = null;

export function getEnhancedSmallTalkServer(): EnhancedSmallTalkServer {
  if (!enhancedServer) {
    enhancedServer = new EnhancedSmallTalkServer();
  }
  return enhancedServer;
}

// Auto-start if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = getEnhancedSmallTalkServer();
  server.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down Enhanced SmallTalk server...');
    await server.stop();
    process.exit(0);
  });
}