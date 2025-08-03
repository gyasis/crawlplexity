// Workflow Service - handles visual workflow management with dual orchestration support
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import Database from 'better-sqlite3';
import { getAgentService } from './agent-service';
import { getSmallTalkServer } from './smalltalk-server';
import * as yaml from 'yaml';

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables?: Record<string, any>;
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: 'agent' | 'trigger' | 'condition' | 'merger' | 'output' | 'custom';
  position: { x: number; y: number };
  data: {
    agentId?: string;
    agentMode?: 'agent' | 'agentic'; // Supports both structured and autonomous agent behavior
    label?: string;
    config?: Record<string, any>;
    parameters?: Record<string, any>;
  };
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    condition?: string;
    dataMapping?: Record<string, string>;
  };
}

export interface WorkflowSettings {
  orchestrationMode: 'auto' | 'manual';
  orchestrationConfig?: OrchestrationConfig;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  errorHandling?: ErrorHandlingConfig;
}

export interface OrchestrationConfig {
  strategy?: 'sequential' | 'parallel' | 'conditional' | 'hybrid';
  rules?: OrchestrationRule[];
  contextSharing?: 'full' | 'selective' | 'private';
  agentSwitching?: {
    enabled: boolean;
    conditions?: string[];
    fallbackAgents?: string[];
  };
}

export interface OrchestrationRule {
  id: string;
  name: string;
  type: 'routing' | 'condition' | 'escalation' | 'retry';
  conditionExpression: string;
  action: {
    type: 'route_to_agent' | 'execute_parallel' | 'escalate' | 'retry' | 'fallback';
    target?: string | string[];
    parameters?: Record<string, any>;
  };
  priority: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  retryDelay: number;
  retryableErrors?: string[];
}

export interface ErrorHandlingConfig {
  strategy: 'stop' | 'continue' | 'fallback' | 'retry';
  fallbackWorkflow?: string;
  notifications?: boolean;
}

export interface Workflow {
  workflow_id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  visual_layout?: any;
  workflow_type: 'agent' | 'agentic' | 'hybrid';
  orchestration_mode: 'auto' | 'manual';
  orchestration_config?: OrchestrationConfig;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  category: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  team_id?: string;
  performance_metrics: any;
}

export interface WorkflowExecution {
  execution_id: string;
  workflow_id: string;
  triggered_by: string;
  trigger_context?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input_data?: any;
  output_data?: any;
  execution_log?: any;
  orchestration_trace?: any;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  error_details?: any;
  user_id?: string;
  session_id?: string;
}

export interface WorkflowTemplate {
  template_id: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  definition: WorkflowDefinition;
  visual_layout?: any;
  preview_image?: string;
  tags: string[];
  usage_count: number;
  rating: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_featured: boolean;
  complexity_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_nodes: number;
  orchestration_type: 'agent' | 'agentic' | 'hybrid';
}

export class CrawlplexityWorkflowService {
  private dbPath: string;
  private isInitialized = false;

  constructor() {
    this.dbPath = resolve(process.cwd(), 'data/research_memory.db');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure database tables exist
      await this.ensureDatabaseTables();
      
      this.isInitialized = true;
      console.log('[WorkflowService] Initialized successfully');
    } catch (error) {
      console.error('[WorkflowService] Initialization failed:', error);
      throw error;
    }
  }

  private async ensureDatabaseTables(): Promise<void> {
    const db = this.getDatabase();
    
    try {
      // Check if workflow tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('workflows', 'workflow_executions', 'workflow_templates')
      `).all();
      
      if (tables.length < 3) {
        console.log('[WorkflowService] Creating missing workflow tables...');
        // Tables should be created by the database migration script
        // This is just a verification
      }
    } finally {
      db.close();
    }
  }

  // Workflow CRUD operations
  async createWorkflow(workflowData: Partial<Workflow>): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    const workflowId = this.generateWorkflowId(workflowData.name!);
    const db = this.getDatabase();

    try {
      db.prepare(`
        INSERT INTO workflows (
          workflow_id, name, description, definition, visual_layout,
          workflow_type, orchestration_mode, orchestration_config,
          created_by, category, version, status, team_id, performance_metrics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        workflowId,
        workflowData.name,
        workflowData.description || '',
        JSON.stringify(workflowData.definition),
        JSON.stringify(workflowData.visual_layout || {}),
        workflowData.workflow_type || 'agent',
        workflowData.orchestration_mode || 'auto',
        JSON.stringify(workflowData.orchestration_config || {}),
        workflowData.created_by || 'system',
        workflowData.category || 'custom',
        workflowData.version || '1.0.0',
        workflowData.status || 'draft',
        workflowData.team_id || null,
        JSON.stringify(workflowData.performance_metrics || {})
      ]);

      return workflowId;
    } finally {
      db.close();
    }
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      const workflow = db.prepare(`
        SELECT * FROM workflows WHERE workflow_id = ?
      `).get(workflowId) as any;
      
      if (!workflow) return null;

      return {
        ...workflow,
        definition: JSON.parse(workflow.definition),
        visual_layout: JSON.parse(workflow.visual_layout || '{}'),
        orchestration_config: JSON.parse(workflow.orchestration_config || '{}'),
        performance_metrics: JSON.parse(workflow.performance_metrics || '{}')
      };
    } finally {
      db.close();
    }
  }

  async getWorkflowList(filters: {
    category?: string | null;
    workflowType?: string | null;
    status?: string | null;
    limit?: number;
  } = {}): Promise<Workflow[]> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      let query = 'SELECT * FROM workflows WHERE 1=1';
      const params: any[] = [];

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.workflowType) {
        query += ' AND workflow_type = ?';
        params.push(filters.workflowType);
      }

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY updated_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const workflows = db.prepare(query).all(params) as any[];
      
      return workflows.map(workflow => ({
        ...workflow,
        definition: JSON.parse(workflow.definition),
        visual_layout: JSON.parse(workflow.visual_layout || '{}'),
        orchestration_config: JSON.parse(workflow.orchestration_config || '{}'),
        performance_metrics: JSON.parse(workflow.performance_metrics || '{}')
      }));
    } finally {
      db.close();
    }
  }

  async updateWorkflow(workflowId: string, updates: Partial<Workflow>): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      const setClause = [];
      const params = [];

      if (updates.name) {
        setClause.push('name = ?');
        params.push(updates.name);
      }
      if (updates.description !== undefined) {
        setClause.push('description = ?');
        params.push(updates.description);
      }
      if (updates.definition) {
        setClause.push('definition = ?');
        params.push(JSON.stringify(updates.definition));
      }
      if (updates.visual_layout) {
        setClause.push('visual_layout = ?');
        params.push(JSON.stringify(updates.visual_layout));
      }
      if (updates.workflow_type) {
        setClause.push('workflow_type = ?');
        params.push(updates.workflow_type);
      }
      if (updates.orchestration_mode) {
        setClause.push('orchestration_mode = ?');
        params.push(updates.orchestration_mode);
      }
      if (updates.orchestration_config) {
        setClause.push('orchestration_config = ?');
        params.push(JSON.stringify(updates.orchestration_config));
      }
      if (updates.status) {
        setClause.push('status = ?');
        params.push(updates.status);
      }

      setClause.push('updated_at = datetime("now")');
      params.push(workflowId);

      db.prepare(`
        UPDATE workflows 
        SET ${setClause.join(', ')}
        WHERE workflow_id = ?
      `).run(params);
    } finally {
      db.close();
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      db.prepare('DELETE FROM workflows WHERE workflow_id = ?').run(workflowId);
    } finally {
      db.close();
    }
  }

  // Workflow execution
  async executeWorkflow(
    workflowId: string, 
    inputData: any = {}, 
    sessionId?: string, 
    userId?: string
  ): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    const executionId = this.generateExecutionId();
    const workflow = await this.getWorkflow(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Create execution record
    const db = this.getDatabase();
    
    try {
      db.prepare(`
        INSERT INTO workflow_executions (
          execution_id, workflow_id, triggered_by, trigger_context,
          status, input_data, session_id, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        executionId,
        workflowId,
        'user',
        JSON.stringify({ sessionId, userId }),
        'pending',
        JSON.stringify(inputData),
        sessionId || null,
        userId || null
      ]);
    } finally {
      db.close();
    }

    // Execute workflow asynchronously
    this.executeWorkflowAsync(executionId, workflow, inputData, sessionId, userId)
      .catch(error => {
        console.error(`[WorkflowService] Execution ${executionId} failed:`, error);
        this.updateExecutionStatus(executionId, 'failed', undefined, error.message);
      });

    return executionId;
  }

  private async executeWorkflowAsync(
    executionId: string,
    workflow: Workflow,
    inputData: any,
    sessionId?: string,
    userId?: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.updateExecutionStatus(executionId, 'running');

      let result: any;

      if (workflow.orchestration_mode === 'auto') {
        // Use SmallTalk's intelligent orchestration
        result = await this.executeWithSmallTalkOrchestration(workflow, inputData, sessionId);
      } else {
        // Use manual orchestration configuration
        result = await this.executeWithManualOrchestration(workflow, inputData, sessionId);
      }

      const duration = Date.now() - startTime;
      await this.updateExecutionStatus(executionId, 'completed', result, undefined, duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      await this.updateExecutionStatus(executionId, 'failed', undefined, error.message, duration);
      throw error;
    }
  }

  private async executeWithSmallTalkOrchestration(
    workflow: Workflow,
    inputData: any,
    sessionId?: string
  ): Promise<any> {
    // Convert workflow to SmallTalk orchestration request
    const agentService = getAgentService();
    
    // Build context message for SmallTalk
    const contextMessage = this.buildSmallTalkContext(workflow, inputData);
    
    // Execute through SmallTalk's intelligent orchestration
    const response = await agentService.chat(contextMessage, sessionId);
    
    return {
      type: 'smalltalk_orchestration',
      response,
      workflow_type: workflow.workflow_type,
      agent_decisions: 'auto' // SmallTalk made the agent decisions
    };
  }

  private async executeWithManualOrchestration(
    workflow: Workflow,
    inputData: any,
    sessionId?: string
  ): Promise<any> {
    const { definition, orchestration_config } = workflow;
    
    // Execute workflow based on manual orchestration configuration
    const results: any[] = [];
    const context = { ...inputData };
    
    // Process nodes in order based on orchestration strategy
    switch (orchestration_config?.strategy || 'sequential') {
      case 'sequential':
        return await this.executeSequentialFlow(definition.nodes, definition.connections, context, sessionId);
      
      case 'parallel':
        return await this.executeParallelFlow(definition.nodes, definition.connections, context, sessionId);
      
      case 'conditional':
        return await this.executeConditionalFlow(definition.nodes, definition.connections, context, sessionId);
      
      case 'hybrid':
        return await this.executeHybridFlow(definition.nodes, definition.connections, context, sessionId);
      
      default:
        return await this.executeSequentialFlow(definition.nodes, definition.connections, context, sessionId);
    }
  }

  private buildSmallTalkContext(workflow: Workflow, inputData: any): string {
    const agentNodes = workflow.definition.nodes.filter(node => node.type === 'agent');
    const workflowType = workflow.workflow_type;
    
    let context = `[Workflow: ${workflow.name}] `;
    
    if (workflowType === 'agentic') {
      context += `Please use agentic behavior (autonomous decision-making) for this task. `;
    } else if (workflowType === 'agent') {
      context += `Please use structured agent behavior (follow defined workflow) for this task. `;
    } else {
      context += `Please use hybrid behavior (mix of structured and autonomous) for this task. `;
    }
    
    if (agentNodes.length > 0) {
      const agentIds = agentNodes.map(node => node.data.agentId).filter(Boolean);
      context += `Involve these agents: ${agentIds.join(', ')}. `;
    }
    
    context += `Task: ${JSON.stringify(inputData)}`;
    
    return context;
  }

  private async executeSequentialFlow(nodes: WorkflowNode[], connections: WorkflowConnection[], context: any, sessionId?: string): Promise<any> {
    // Find trigger node
    const triggerNode = nodes.find(node => node.type === 'trigger');
    if (!triggerNode) throw new Error('No trigger node found');

    const agentService = getAgentService();
    let currentResult = context;
    
    // Execute nodes in sequence following connections
    let currentNodeId = triggerNode.id;
    const visited = new Set<string>();
    
    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      
      const currentNode = nodes.find(node => node.id === currentNodeId);
      if (!currentNode) break;
      
      if (currentNode.type === 'agent' && currentNode.data.agentId) {
        // Execute agent node
        const agentMode = currentNode.data.agentMode || 'agent';
        let message = JSON.stringify(currentResult);
        
        if (agentMode === 'agentic') {
          message = `[Agentic Mode] ${message}`;
        }
        
        currentResult = await agentService.chatWithAgent(
          currentNode.data.agentId,
          message,
          sessionId
        );
      }
      
      // Find next node
      const nextConnection = connections.find(conn => conn.source === currentNodeId);
      currentNodeId = nextConnection?.target || '';
    }
    
    return currentResult;
  }

  private async executeParallelFlow(nodes: WorkflowNode[], connections: WorkflowConnection[], context: any, sessionId?: string): Promise<any> {
    const agentService = getAgentService();
    const agentNodes = nodes.filter(node => node.type === 'agent' && node.data.agentId);
    
    // Execute all agent nodes in parallel
    const promises = agentNodes.map(async (node) => {
      const agentMode = node.data.agentMode || 'agent';
      let message = JSON.stringify(context);
      
      if (agentMode === 'agentic') {
        message = `[Agentic Mode] ${message}`;
      }
      
      return {
        nodeId: node.id,
        agentId: node.data.agentId,
        result: await agentService.chatWithAgent(node.data.agentId!, message, sessionId)
      };
    });
    
    const results = await Promise.all(promises);
    return { type: 'parallel_results', results };
  }

  private async executeConditionalFlow(nodes: WorkflowNode[], connections: WorkflowConnection[], context: any, sessionId?: string): Promise<any> {
    // Implement conditional logic based on connection conditions
    const agentService = getAgentService();
    
    // Find trigger and condition nodes
    const triggerNode = nodes.find(node => node.type === 'trigger');
    const conditionNodes = nodes.filter(node => node.type === 'condition');
    
    // Evaluate conditions and route to appropriate agents
    for (const conditionNode of conditionNodes) {
      const condition = conditionNode.data.config?.condition;
      if (condition && this.evaluateCondition(condition, context)) {
        // Find connected agent nodes
        const targetConnections = connections.filter(conn => conn.source === conditionNode.id);
        
        for (const connection of targetConnections) {
          const targetNode = nodes.find(node => node.id === connection.target);
          if (targetNode?.type === 'agent' && targetNode.data.agentId) {
            const result = await agentService.chatWithAgent(
              targetNode.data.agentId,
              JSON.stringify(context),
              sessionId
            );
            return { condition: condition, result };
          }
        }
      }
    }
    
    return { type: 'conditional_flow', message: 'No conditions matched' };
  }

  private async executeHybridFlow(nodes: WorkflowNode[], connections: WorkflowConnection[], context: any, sessionId?: string): Promise<any> {
    // Combine sequential and parallel execution based on node configuration
    const sequentialNodes = nodes.filter(node => node.data.config?.executionMode !== 'parallel');
    const parallelNodes = nodes.filter(node => node.data.config?.executionMode === 'parallel');
    
    // Execute sequential part first
    const sequentialResult = await this.executeSequentialFlow(sequentialNodes, connections, context, sessionId);
    
    // Then execute parallel parts
    const parallelResult = await this.executeParallelFlow(parallelNodes, connections, { ...context, sequentialResult }, sessionId);
    
    return {
      type: 'hybrid_flow',
      sequentialResult,
      parallelResult
    };
  }

  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // Simple condition evaluation - in production, use a safer evaluation method
      const func = new Function('context', `return ${condition}`);
      return func(context);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  async getAllWorkflowExecutions(
    filters: { limit?: number; status?: string | null } = {}
  ): Promise<WorkflowExecution[]> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      let query = 'SELECT * FROM workflow_executions WHERE 1=1';
      const params: any[] = [];

      if (filters.status) {
        const statuses = filters.status.split(',').map(s => s.trim());
        const placeholders = statuses.map(() => '?').join(',');
        query += ` AND status IN (${placeholders})`;
        params.push(...statuses);
      }

      query += ' ORDER BY started_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const executions = db.prepare(query).all(params) as any[];
      
      return executions.map(execution => ({
        ...execution,
        trigger_context: JSON.parse(execution.trigger_context || '{}'),
        input_data: JSON.parse(execution.input_data || '{}'),
        output_data: JSON.parse(execution.output_data || '{}'),
        execution_log: JSON.parse(execution.execution_log || '{}'),
        orchestration_trace: JSON.parse(execution.orchestration_trace || '{}'),
        error_details: JSON.parse(execution.error_details || '{}')
      }));
    } finally {
      db.close();
    }
  }

  async getWorkflowExecutions(
    workflowId: string,
    filters: { limit?: number; status?: string | null } = {}
  ): Promise<WorkflowExecution[]> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      let query = 'SELECT * FROM workflow_executions WHERE workflow_id = ?';
      const params: any[] = [workflowId];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY started_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const executions = db.prepare(query).all(params) as any[];
      
      return executions.map(execution => ({
        ...execution,
        trigger_context: JSON.parse(execution.trigger_context || '{}'),
        input_data: JSON.parse(execution.input_data || '{}'),
        output_data: JSON.parse(execution.output_data || '{}'),
        execution_log: JSON.parse(execution.execution_log || '{}'),
        orchestration_trace: JSON.parse(execution.orchestration_trace || '{}'),
        error_details: JSON.parse(execution.error_details || '{}')
      }));
    } finally {
      db.close();
    }
  }

  private async updateExecutionStatus(
    executionId: string,
    status: WorkflowExecution['status'],
    result?: any,
    error?: string,
    duration?: number
  ): Promise<void> {
    const db = this.getDatabase();
    
    try {
      const updates = ['status = ?'];
      const params = [status];

      if (status === 'completed' || status === 'failed') {
        updates.push('completed_at = datetime("now")');
      }

      if (result) {
        updates.push('output_data = ?');
        params.push(JSON.stringify(result));
      }

      if (error) {
        updates.push('error_message = ?');
        params.push(error);
      }

      if (duration) {
        updates.push('duration_ms = ?');
        params.push(duration);
      }

      params.push(executionId);

      db.prepare(`
        UPDATE workflow_executions 
        SET ${updates.join(', ')}
        WHERE execution_id = ?
      `).run(params);
    } finally {
      db.close();
    }
  }

  // Template management
  async getWorkflowTemplates(filters: {
    category?: string | null;
    complexity?: string | null;
    orchestrationType?: string | null;
    featured?: boolean;
  } = {}): Promise<WorkflowTemplate[]> {
    if (!this.isInitialized) await this.initialize();

    const db = this.getDatabase();
    
    try {
      let query = 'SELECT * FROM workflow_templates WHERE 1=1';
      const params: any[] = [];

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.complexity) {
        query += ' AND complexity_level = ?';
        params.push(filters.complexity);
      }

      if (filters.orchestrationType) {
        query += ' AND orchestration_type = ?';
        params.push(filters.orchestrationType);
      }

      if (filters.featured) {
        query += ' AND is_featured = ?';
        params.push(filters.featured);
      }

      query += ' ORDER BY usage_count DESC, rating DESC';

      const templates = db.prepare(query).all(params) as any[];
      
      return templates.map(template => ({
        ...template,
        definition: JSON.parse(template.definition),
        visual_layout: JSON.parse(template.visual_layout || '{}'),
        tags: JSON.parse(template.tags || '[]')
      }));
    } finally {
      db.close();
    }
  }

  async createWorkflowTemplate(templateData: Partial<WorkflowTemplate>): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    const templateId = this.generateTemplateId(templateData.name!);
    const db = this.getDatabase();

    try {
      db.prepare(`
        INSERT INTO workflow_templates (
          template_id, name, description, category, subcategory,
          definition, visual_layout, tags, created_by,
          complexity_level, estimated_nodes, orchestration_type,
          is_public, is_featured
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        templateId,
        templateData.name,
        templateData.description || '',
        templateData.category,
        templateData.subcategory || null,
        JSON.stringify(templateData.definition),
        JSON.stringify(templateData.visual_layout || {}),
        JSON.stringify(templateData.tags || []),
        templateData.created_by || 'system',
        templateData.complexity_level || 'beginner',
        templateData.estimated_nodes || 3,
        templateData.orchestration_type || 'agent',
        templateData.is_public || false,
        templateData.is_featured || false
      ]);

      return templateId;
    } finally {
      db.close();
    }
  }

  async instantiateWorkflowFromTemplate(
    templateId: string,
    options: {
      name: string;
      description?: string;
      customizations?: any;
      userId?: string;
    }
  ): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    // Get template
    const db = this.getDatabase();
    const template = db.prepare('SELECT * FROM workflow_templates WHERE template_id = ?').get(templateId) as any;
    db.close();

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create workflow from template
    const workflowData: Partial<Workflow> = {
      name: options.name,
      description: options.description || template.description,
      definition: JSON.parse(template.definition),
      visual_layout: JSON.parse(template.visual_layout || '{}'),
      workflow_type: template.orchestration_type,
      orchestration_mode: 'auto', // Default to auto for template instantiation
      category: template.category,
      created_by: options.userId
    };

    // Apply customizations if provided
    if (options.customizations) {
      if (options.customizations.definition) {
        workflowData.definition = { ...workflowData.definition, ...options.customizations.definition };
      }
      if (options.customizations.orchestration_mode) {
        workflowData.orchestration_mode = options.customizations.orchestration_mode;
      }
    }

    const workflowId = await this.createWorkflow(workflowData);

    // Update template usage count
    const updateDb = this.getDatabase();
    try {
      updateDb.prepare('UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE template_id = ?').run(templateId);
    } finally {
      updateDb.close();
    }

    return workflowId;
  }

  // Utility methods
  private generateWorkflowId(name: string): string {
    const timestamp = Date.now();
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `workflow-${sanitized}-${timestamp}`;
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(name: string): string {
    const timestamp = Date.now();
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `template-${sanitized}-${timestamp}`;
  }

  private getDatabase() {
    return new Database(this.dbPath);
  }
}

// Singleton instance
let workflowService: CrawlplexityWorkflowService | null = null;

export function getWorkflowService(): CrawlplexityWorkflowService {
  if (!workflowService) {
    workflowService = new CrawlplexityWorkflowService();
  }
  return workflowService;
}