import { SmallTalk, WebInterface, createAgent } from 'smalltalk-ai';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

export class SmallTalkAPIServer {
  private app: SmallTalk;
  private server: WebInterface;
  private isRunning = false;

  constructor() {
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
      port: 3001, // Different port from Next.js (18563)
      host: 'localhost',
      apiOnly: true,
      cors: {
        origin: '*',
        credentials: true
      }
    });

    this.app.addInterface(this.server);
    this.setupAgentsFromYAML();
  }

  private setupAgentsFromYAML(): void {
    try {
      const agentsPath = resolve(process.cwd(), 'configs', 'agents');
      
      if (!existsSync(agentsPath)) {
        console.warn(`[SmallTalk] Agents directory not found: ${agentsPath}. Using fallback agents.`);
        this.setupFallbackAgents();
        return;
      }

      const files = readdirSync(agentsPath).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
      let registeredCount = 0;

      console.log(`[SmallTalk] Loading ${files.length} agents from YAML files...`);

      for (const file of files) {
        try {
          const filePath = join(agentsPath, file);
          const yamlContent = readFileSync(filePath, 'utf8');
          const manifest = this.parseSimpleYaml(yamlContent);
          const agentId = file.replace(/\.(yaml|yml)$/, '');
          
          this.registerSmallTalkAgent(agentId, manifest);
          registeredCount++;
          
        } catch (error) {
          console.error(`[SmallTalk] Failed to load agent from ${file}:`, error);
          // Continue loading other agents even if one fails
        }
      }

      console.log(`[SmallTalk] Successfully registered ${registeredCount}/${files.length} agents from YAML files`);
      
      if (registeredCount === 0) {
        console.warn('[SmallTalk] No agents loaded from YAML. Using fallback agents.');
        this.setupFallbackAgents();
      }
      
    } catch (error) {
      console.error('[SmallTalk] Failed to setup agents from YAML:', error);
      console.log('[SmallTalk] Falling back to default agents');
      this.setupFallbackAgents();
    }
  }

  private parseSimpleYaml(yamlContent: string): any {
    const lines = yamlContent.split('\n');
    const manifest: any = {
      config: { name: 'Unknown Agent' },
      capabilities: {},
      metadata: {}
    };

    let currentSection: 'config' | 'capabilities' | 'metadata' | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('config:')) {
        currentSection = 'config';
      } else if (trimmed.startsWith('capabilities:')) {
        currentSection = 'capabilities';
      } else if (trimmed.startsWith('metadata:')) {
        currentSection = 'metadata';
      } else if (trimmed.includes(':') && currentSection) {
        const [key, ...valueParts] = trimmed.split(':');
        let value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        
        // Convert numeric strings to numbers for specific fields
        if (['temperature', 'maxTokens', 'contextAwareness'].includes(key.trim())) {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            value = numValue as any;
          }
        }
        
        // Handle array-like fields that might be stored as single values
        if (['expertise', 'taskTypes', 'tags'].includes(key.trim())) {
          value = value ? value.split(',').map(v => v.trim()) : [] as any;
        }
        
        if (currentSection === 'config') {
          (manifest.config as any)[key.trim()] = value;
        } else if (currentSection === 'capabilities') {
          (manifest.capabilities as any)[key.trim()] = value;
        } else if (currentSection === 'metadata') {
          (manifest.metadata as any)[key.trim()] = value;
        }
      }
    }

    return manifest;
  }

  private registerSmallTalkAgent(agentId: string, manifest: any): void {
    try {
      // Create SmallTalk agent from YAML manifest
      const agent = createAgent(
        agentId,
        manifest.metadata?.description || manifest.config?.personality || `${manifest.config.name} - AI Assistant`,
        {
          temperature: manifest.config?.temperature || 0.7,
          maxTokens: manifest.config?.maxTokens || 4096
        }
      );

      // Map YAML capabilities to SmallTalk agent capabilities
      const capabilities = {
        expertise: Array.isArray(manifest.capabilities?.expertise) 
          ? manifest.capabilities.expertise 
          : manifest.capabilities?.expertise 
            ? [manifest.capabilities.expertise]
            : ['general assistance'],
        complexity: manifest.capabilities?.complexity || 'intermediate',
        taskTypes: Array.isArray(manifest.capabilities?.taskTypes)
          ? manifest.capabilities.taskTypes
          : manifest.capabilities?.taskTypes
            ? [manifest.capabilities.taskTypes]
            : ['general'],
        contextAwareness: (manifest.capabilities?.contextAwareness || 5) / 10, // Convert to 0-1 scale
        collaborationStyle: this.mapCollaborationStyle(manifest.metadata?.tags),
        tools: manifest.config?.tools || [],
        personalityTraits: this.extractPersonalityTraits(manifest.config?.personality)
      };

      this.app.addAgent(agent, capabilities);
      console.log(`[SmallTalk] ✅ Registered agent: ${agentId} with expertise: ${capabilities.expertise.join(', ')}`);
      
    } catch (error) {
      console.error(`[SmallTalk] Failed to register agent ${agentId}:`, error);
      throw error;
    }
  }

  private mapCollaborationStyle(tags: any): string {
    if (!tags) return 'independent';
    
    const tagString = Array.isArray(tags) ? tags.join(' ') : tags;
    const lowerTags = tagString.toLowerCase();
    
    if (lowerTags.includes('orchestrator') || lowerTags.includes('manager')) return 'leading';
    if (lowerTags.includes('support') || lowerTags.includes('assistant')) return 'supporting';
    if (lowerTags.includes('creative') || lowerTags.includes('research')) return 'independent';
    
    return 'independent';
  }

  private extractPersonalityTraits(personality: string): string[] {
    if (!personality) return ['helpful', 'professional'];
    
    const traits: string[] = [];
    const lowerPersonality = personality.toLowerCase();
    
    if (lowerPersonality.includes('analytical') || lowerPersonality.includes('precise')) traits.push('analytical');
    if (lowerPersonality.includes('creative') || lowerPersonality.includes('imaginative')) traits.push('creative');
    if (lowerPersonality.includes('helpful') || lowerPersonality.includes('assist')) traits.push('helpful');
    if (lowerPersonality.includes('direct') || lowerPersonality.includes('straight')) traits.push('direct');
    if (lowerPersonality.includes('thorough') || lowerPersonality.includes('detailed')) traits.push('thorough');
    
    return traits.length > 0 ? traits : ['helpful', 'professional'];
  }

  private setupFallbackAgents(): void {
    // Minimal fallback agents in case YAML loading fails
    const fallbackAgent = createAgent(
      'general-assistant',
      'A helpful AI assistant for general tasks and questions.',
      { temperature: 0.7 }
    );

    this.app.addAgent(fallbackAgent, {
      expertise: ['general assistance', 'questions', 'conversation'],
      complexity: 'intermediate',
      taskTypes: ['general', 'conversation'],
      contextAwareness: 0.8,
      collaborationStyle: 'independent',
      tools: [],
      personalityTraits: ['helpful', 'professional']
    });

    console.log('[SmallTalk] ⚠️  Using fallback agent only');
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      await this.app.start();
      this.isRunning = true;
      console.log('🤖 SmallTalk API server started on http://localhost:3001');
      console.log('📋 Available agents:', this.app.listAgents().join(', '));
      console.log('🎯 Orchestration enabled for intelligent agent selection');
    } catch (error) {
      console.error('❌ Failed to start SmallTalk API server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.app.stop();
      this.isRunning = false;
      console.log('🛑 SmallTalk API server stopped');
    } catch (error) {
      console.error('❌ Error stopping SmallTalk API server:', error);
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getAgentList(): string[] {
    return this.app.listAgents();
  }

  async reloadAgentsFromYAML(): Promise<{ success: boolean; message: string; registeredCount?: number; totalCount?: number }> {
    try {
      console.log('[SmallTalk] Reloading agents from YAML...');
      
      // Clear existing agents
      const existingAgents = this.app.listAgents();
      for (const agentId of existingAgents) {
        try {
          this.app.removeAgent(agentId);
        } catch (error) {
          console.warn(`[SmallTalk] Warning: Could not remove agent ${agentId}:`, error);
        }
      }
      
      // Reload from YAML
      this.setupAgentsFromYAML();
      
      const newAgents = this.app.listAgents();
      const registeredCount = newAgents.length;
      
      return {
        success: true,
        message: `Successfully reloaded ${registeredCount} agents from YAML files`,
        registeredCount,
        totalCount: registeredCount
      };
      
    } catch (error) {
      console.error('[SmallTalk] Failed to reload agents:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during reload'
      };
    }
  }

  async reloadSingleAgent(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[SmallTalk] Reloading single agent: ${agentId}`);
      
      const agentsPath = resolve(process.cwd(), 'configs', 'agents');
      const yamlFile = `${agentId}.yaml`;
      const filePath = join(agentsPath, yamlFile);
      
      if (!existsSync(filePath)) {
        return {
          success: false,
          message: `Agent YAML file not found: ${yamlFile}`
        };
      }
      
      // Remove existing agent if it exists
      try {
        this.app.removeAgent(agentId);
      } catch (error) {
        // Agent might not exist, that's ok
      }
      
      // Load and register the agent
      const yamlContent = readFileSync(filePath, 'utf8');
      const manifest = this.parseSimpleYaml(yamlContent);
      this.registerSmallTalkAgent(agentId, manifest);
      
      return {
        success: true,
        message: `Successfully reloaded agent: ${agentId}`
      };
      
    } catch (error) {
      console.error(`[SmallTalk] Failed to reload agent ${agentId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error during agent reload'
      };
    }
  }
}

// Singleton instance
let smalltalkServer: SmallTalkAPIServer | null = null;

export function getSmallTalkServer(): SmallTalkAPIServer {
  if (!smalltalkServer) {
    smalltalkServer = new SmallTalkAPIServer();
  }
  return smalltalkServer;
}

// Auto-start if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = getSmallTalkServer();
  server.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down SmallTalk API server...');
    await server.stop();
    process.exit(0);
  });
}