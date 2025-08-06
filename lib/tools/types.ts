// Tool System Type Definitions

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'data_access' | 'computation' | 'communication' | 'search' | 'utility';
  parameters: ToolParameters;
  handler: (params: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
  timestamp?: string;
}

export interface ToolRegistryEntry {
  tool: ToolDefinition;
  metadata: {
    toolId: string;
    filePath: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface AgentToolConfiguration {
  toolId: string;
  configuration?: Record<string, any>;
  permissions?: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
  rateLimit?: number; // Calls per minute
}

export interface ToolExecutionContext {
  agentId: string;
  conversationId?: string;
  userId?: string;
  environment?: Record<string, string>;
}