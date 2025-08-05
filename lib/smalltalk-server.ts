import { SmallTalk, WebInterface, createAgent } from 'smalltalk-ai';

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
    this.setupDefaultAgents();
  }

  private setupDefaultAgents(): void {
    // Add default agents that match our YAML configs
    const helpfulAgent = createAgent(
      'research-assistant',
      'A knowledgeable research assistant specializing in gathering, analyzing, and summarizing information from various sources.',
      { temperature: 0.7 }
    );

    const codingAgent = createAgent(
      'coding-assistant', 
      'An expert programming assistant proficient in multiple languages, debugging, code review, and software architecture.',
      { temperature: 0.3 }
    );

    const conversationAgent = createAgent(
      'conversation-manager',
      'A skilled conversation facilitator and context manager who helps maintain engaging, productive dialogues.',
      { temperature: 0.8 }
    );

    // Add agents with capabilities for orchestration
    this.app.addAgent(helpfulAgent, {
      expertise: ['research', 'analysis', 'information gathering', 'summarization'],
      complexity: 'intermediate',
      taskTypes: ['research', 'analysis', 'questions'],
      contextAwareness: 0.9,
      collaborationStyle: 'independent',
      tools: [],
      personalityTraits: ['analytical', 'helpful', 'thorough']
    });

    this.app.addAgent(codingAgent, {
      expertise: ['programming', 'debugging', 'code review', 'software development'],
      complexity: 'advanced', 
      taskTypes: ['coding', 'debugging', 'technical'],
      contextAwareness: 0.9,
      collaborationStyle: 'leading',
      tools: [],
      personalityTraits: ['precise', 'logical', 'detail-oriented']
    });

    this.app.addAgent(conversationAgent, {
      expertise: ['conversation', 'context management', 'dialogue facilitation'],
      complexity: 'basic',
      taskTypes: ['conversation', 'management', 'facilitation'], 
      contextAwareness: 0.8,
      collaborationStyle: 'supportive',
      tools: [],
      personalityTraits: ['empathetic', 'patient', 'collaborative']
    });
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