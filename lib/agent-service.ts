import { SmallTalk } from '../smalltalk-integration/src/core/SmallTalk.js';
import { Agent } from '../smalltalk-integration/src/agents/Agent.js';
import { AgentCapabilities } from '../smalltalk-integration/src/agents/OrchestratorAgent.js';
import { ManifestParser, AgentManifest } from '../smalltalk-integration/src/utils/ManifestParser.js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export interface AgentStatus {
  agent_id: string;
  name: string;
  description?: string;
  status: 'idle' | 'running' | 'stopped' | 'error';
  agent_type?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentRun {
  run_id: number;
  agent_id: string;
  session_id?: string;
  start_time: string;
  end_time?: string;
  status: 'running' | 'completed' | 'failed' | 'interrupted';
  result?: string;
  error_message?: string;
  user_id?: string;
}

export class CrawlplexityAgentService {
  private smalltalk: SmallTalk;
  private dbPath: string;
  private configPath: string;
  private isInitialized = false;

  constructor() {
    this.dbPath = resolve(process.cwd(), 'data/research_memory.db');
    this.configPath = resolve(process.cwd(), 'configs');
    
    this.smalltalk = new SmallTalk({
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

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Log agent activities to database
    this.smalltalk.on('agent_response', async (event) => {
      await this.logAgentActivity(event);
    });

    this.smalltalk.on('agent_handoff', async (event) => {
      console.log(`[AgentService] Agent handoff: ${event.fromAgent} → ${event.toAgent}`);
    });

    this.smalltalk.on('plan_created', async (event) => {
      console.log(`[AgentService] Plan created: ${event.planId}`);
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load agents from configuration directory
      await this.loadAgentsFromConfig();
      
      // Sync agent status to database
      await this.syncAgentsToDatabase();
      
      this.isInitialized = true;
      console.log('[AgentService] Initialized successfully');
    } catch (error) {
      console.error('[AgentService] Initialization failed:', error);
      throw error;
    }
  }

  private async loadAgentsFromConfig(): Promise<void> {
    const agentsPath = join(this.configPath, 'agents');
    
    if (!existsSync(agentsPath)) {
      console.warn(`[AgentService] Agents directory not found: ${agentsPath}`);
      return;
    }

    try {
      const loadedAgents = await this.smalltalk.loadAgentsFromDirectory(agentsPath);
      console.log(`[AgentService] Loaded ${loadedAgents.length} agents from config`);
    } catch (error) {
      console.error('[AgentService] Failed to load agents from config:', error);
      throw error;
    }
  }

  private async syncAgentsToDatabase(): Promise<void> {
    const db = await this.getDatabase();
    const agents = this.smalltalk.getAgents();

    for (const agent of agents) {
      try {
        const manifestPath = join(this.configPath, 'agents', `${agent.name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
        
        await db.run(`
          INSERT OR REPLACE INTO agents (
            agent_id, name, description, manifest_path, status, agent_type, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          agent.name.toLowerCase().replace(/\s+/g, '-'),
          agent.name,
          agent.config.personality || '',
          manifestPath,
          'idle',
          'assistant' // Default type
        ]);
      } catch (error) {
        console.error(`[AgentService] Failed to sync agent ${agent.name} to database:`, error);
      }
    }

    await db.close();
  }

  async chat(message: string, sessionId?: string, userId?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const response = await this.smalltalk.processMessage(message, sessionId, userId);
      return response;
    } catch (error) {
      console.error('[AgentService] Chat processing failed:', error);
      throw error;
    }
  }

  async getAgentList(): Promise<AgentStatus[]> {
    const db = await this.getDatabase();
    
    try {
      const agents = await db.all(`
        SELECT agent_id, name, description, status, agent_type, created_at, updated_at 
        FROM agents 
        ORDER BY created_at DESC
      `);
      
      return agents as AgentStatus[];
    } finally {
      await db.close();
    }
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    const db = await this.getDatabase();
    
    try {
      const agent = await db.get(`
        SELECT agent_id, name, description, status, agent_type, created_at, updated_at 
        FROM agents 
        WHERE agent_id = ?
      `, [agentId]);
      
      return agent as AgentStatus || null;
    } finally {
      await db.close();
    }
  }

  async updateAgentStatus(agentId: string, status: AgentStatus['status']): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      await db.run(`
        UPDATE agents 
        SET status = ?, updated_at = datetime('now') 
        WHERE agent_id = ?
      `, [status, agentId]);
    } finally {
      await db.close();
    }
  }

  async createAgentRun(agentId: string, sessionId?: string, userId?: string): Promise<number> {
    const db = await this.getDatabase();
    
    try {
      const result = await db.run(`
        INSERT INTO agent_runs (agent_id, session_id, user_id, status)
        VALUES (?, ?, ?, 'running')
      `, [agentId, sessionId, userId]);
      
      return result.lastID!;
    } finally {
      await db.close();
    }
  }

  async completeAgentRun(runId: number, result?: string, error?: string): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      await db.run(`
        UPDATE agent_runs 
        SET end_time = datetime('now'), 
            status = ?, 
            result = ?,
            error_message = ?
        WHERE run_id = ?
      `, [error ? 'failed' : 'completed', result, error, runId]);
    } finally {
      await db.close();
    }
  }

  async getAgentRuns(agentId?: string, limit = 50): Promise<AgentRun[]> {
    const db = await this.getDatabase();
    
    try {
      let query = `
        SELECT run_id, agent_id, session_id, start_time, end_time, status, result, error_message, user_id
        FROM agent_runs
      `;
      let params: any[] = [];
      
      if (agentId) {
        query += ' WHERE agent_id = ?';
        params.push(agentId);
      }
      
      query += ' ORDER BY start_time DESC LIMIT ?';
      params.push(limit);
      
      const runs = await db.all(query, params);
      return runs as AgentRun[];
    } finally {
      await db.close();
    }
  }

  async createAgent(manifest: AgentManifest): Promise<string> {
    const agentId = manifest.config.name.toLowerCase().replace(/\s+/g, '-');
    const manifestPath = join(this.configPath, 'agents', `${agentId}.yaml`);
    
    try {
      // Save manifest to file
      const yamlContent = ManifestParser.toYaml(manifest);
      require('fs').writeFileSync(manifestPath, yamlContent, 'utf8');
      
      // Add to SmallTalk
      const agent = new Agent(manifest.config);
      this.smalltalk.addAgent(agent, manifest.capabilities as AgentCapabilities);
      
      // Add to database
      const db = await this.getDatabase();
      await db.run(`
        INSERT INTO agents (agent_id, name, description, manifest_path, status, agent_type)
        VALUES (?, ?, ?, ?, 'idle', ?)
      `, [
        agentId,
        manifest.config.name,
        manifest.metadata?.description || '',
        manifestPath,
        manifest.metadata?.tags?.[0] || 'assistant'
      ]);
      await db.close();
      
      return agentId;
    } catch (error) {
      console.error('[AgentService] Failed to create agent:', error);
      throw error;
    }
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      // Remove from SmallTalk
      this.smalltalk.removeAgent(agentId);
      
      // Remove from database
      const db = await this.getDatabase();
      await db.run('DELETE FROM agents WHERE agent_id = ?', [agentId]);
      await db.close();
      
      // Remove manifest file
      const manifestPath = join(this.configPath, 'agents', `${agentId}.yaml`);
      if (existsSync(manifestPath)) {
        require('fs').unlinkSync(manifestPath);
      }
    } catch (error) {
      console.error('[AgentService] Failed to delete agent:', error);
      throw error;
    }
  }

  private async logAgentActivity(event: any): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      await db.run(`
        INSERT INTO agent_logs (agent_id, level, message, context)
        VALUES (?, 'INFO', ?, ?)
      `, [
        event.agentId || 'unknown',
        `Agent response: ${event.response?.substring(0, 100)}...`,
        JSON.stringify(event)
      ]);
    } catch (error) {
      console.error('[AgentService] Failed to log agent activity:', error);
    } finally {
      await db.close();
    }
  }

  private async getDatabase() {
    return await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });
  }

  // Orchestration methods
  async forceAgentSwitch(userId: string, agentName: string): Promise<boolean> {
    return this.smalltalk.forceAgentSwitch(userId, agentName);
  }

  async getCurrentAgent(userId: string): Promise<string | undefined> {
    return this.smalltalk.getCurrentAgent(userId);
  }

  async getOrchestrationStats(): Promise<any> {
    return this.smalltalk.getOrchestrationStats();
  }

  async getAvailableAgents(): Promise<string[]> {
    return this.smalltalk.listAgents();
  }

  async enableOrchestration(enabled: boolean): Promise<void> {
    this.smalltalk.enableOrchestration(enabled);
  }

  async getStats(): Promise<any> {
    return this.smalltalk.getStats();
  }

  // Agent Group Management
  async getAgentGroups(): Promise<any[]> {
    const db = await this.getDatabase();
    
    try {
      const groups = await db.all(`
        SELECT at.team_id as id, at.name, at.description, at.created_at, at.updated_at,
               GROUP_CONCAT(atm.agent_id) as agent_ids
        FROM agent_teams at
        LEFT JOIN agent_team_members atm ON at.team_id = atm.team_id
        GROUP BY at.team_id, at.name, at.description, at.created_at, at.updated_at
        ORDER BY at.created_at DESC
      `);
      
      return groups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        agents: group.agent_ids ? group.agent_ids.split(',') : [],
        active: true, // TODO: Add active status to database
        created_at: group.created_at,
        updated_at: group.updated_at
      }));
    } finally {
      await db.close();
    }
  }

  async createAgentGroup(group: { name: string; description?: string; agents: string[] }): Promise<string> {
    const db = await this.getDatabase();
    
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Create the team
      const result = await db.run(`
        INSERT INTO agent_teams (name, description)
        VALUES (?, ?)
      `, [group.name, group.description || null]);
      
      const teamId = result.lastID!.toString();
      
      // Add team members
      for (const agentId of group.agents) {
        await db.run(`
          INSERT INTO agent_team_members (team_id, agent_id)
          VALUES (?, ?)
        `, [teamId, agentId]);
      }
      
      await db.run('COMMIT');
      return teamId;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    } finally {
      await db.close();
    }
  }

  async updateAgentGroup(groupId: string, updates: { name?: string; description?: string; agents?: string[] }): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Update team details if provided
      if (updates.name || updates.description !== undefined) {
        await db.run(`
          UPDATE agent_teams 
          SET name = COALESCE(?, name), 
              description = COALESCE(?, description),
              updated_at = datetime('now')
          WHERE team_id = ?
        `, [updates.name || null, updates.description || null, groupId]);
      }
      
      // Update team members if provided
      if (updates.agents) {
        // Remove existing members
        await db.run('DELETE FROM agent_team_members WHERE team_id = ?', [groupId]);
        
        // Add new members
        for (const agentId of updates.agents) {
          await db.run(`
            INSERT INTO agent_team_members (team_id, agent_id)
            VALUES (?, ?)
          `, [groupId, agentId]);
        }
      }
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    } finally {
      await db.close();
    }
  }

  async deleteAgentGroup(groupId: string): Promise<void> {
    const db = await this.getDatabase();
    
    try {
      await db.run('BEGIN TRANSACTION');
      
      // Delete team members first (foreign key constraint)
      await db.run('DELETE FROM agent_team_members WHERE team_id = ?', [groupId]);
      
      // Delete the team
      await db.run('DELETE FROM agent_teams WHERE team_id = ?', [groupId]);
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    } finally {
      await db.close();
    }
  }

  async chatWithAgentGroup(groupId: string, message: string, sessionId?: string, userId?: string): Promise<string> {
    // Get group agents
    const groups = await this.getAgentGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error(`Agent group ${groupId} not found`);
    }
    
    // For now, use SmallTalk's orchestration with the group's agents as context
    // In a more advanced implementation, we could create a specific team orchestration
    const context = `This request should be handled by the "${group.name}" team consisting of agents: ${group.agents.join(', ')}. ${group.description || ''}`;
    
    return this.smalltalk.chat(message, userId || 'default', { context, teamId: groupId });
  }
}

// Singleton instance
let agentService: CrawlplexityAgentService | null = null;

export function getAgentService(): CrawlplexityAgentService {
  if (!agentService) {
    agentService = new CrawlplexityAgentService();
  }
  return agentService;
}