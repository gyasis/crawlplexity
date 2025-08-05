// SmallTalk API client integration
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import Database from 'better-sqlite3';
import { getSmallTalkServer } from './smalltalk-server';

export interface AgentManifest {
  config: {
    name: string;
    model?: string;
    personality?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
  };
  capabilities?: {
    expertise?: string[];
    taskTypes?: string[];
    complexity?: string;
    contextAwareness?: number;
  };
  metadata?: {
    version?: string;
    author?: string;
    description?: string;
    tags?: string[];
  };
}

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
  private dbPath: string;
  private configPath: string;
  private isInitialized = false;
  private agents: Map<string, AgentManifest> = new Map();
  private smalltalkApiUrl = 'http://localhost:3001'; // SmallTalk API server

  constructor() {
    this.dbPath = resolve(process.cwd(), 'data/research_memory.db');
    this.configPath = resolve(process.cwd(), 'configs');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure SmallTalk API server is running
      await this.ensureSmallTalkServer();
      
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

  private async ensureSmallTalkServer(): Promise<void> {
    try {
      // Check if SmallTalk API server is running
      const response = await fetch(`${this.smalltalkApiUrl}/api/status`);
      if (response.ok) {
        console.log('[AgentService] SmallTalk API server is running');
        return;
      }
    } catch (error) {
      // Server not running, start it
      console.log('[AgentService] Starting SmallTalk API server...');
      const server = getSmallTalkServer();
      await server.start();
    }
  }

  private async loadAgentsFromConfig(): Promise<void> {
    const agentsPath = join(this.configPath, 'agents');
    
    if (!existsSync(agentsPath)) {
      console.warn(`[AgentService] Agents directory not found: ${agentsPath}`);
      return;
    }

    try {
      const files = readdirSync(agentsPath).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
      
      for (const file of files) {
        const filePath = join(agentsPath, file);
        const yamlContent = readFileSync(filePath, 'utf8');
        
        // Simple YAML parsing for database storage
        const manifest = this.parseSimpleYaml(yamlContent);
        const agentId = file.replace(/\.(yaml|yml)$/, '');
        
        this.agents.set(agentId, manifest);
      }
      
      console.log(`[AgentService] Loaded ${files.length} agents from config`);
    } catch (error) {
      console.error('[AgentService] Failed to load agents from config:', error);
      throw error;
    }
  }

  private parseSimpleYaml(yamlContent: string): AgentManifest {
    const lines = yamlContent.split('\n');
    const manifest: AgentManifest = {
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
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        
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


  private async syncAgentsToDatabase(): Promise<void> {
    const db = this.getDatabase();

    for (const [agentId, manifest] of this.agents) {
      try {
        const manifestPath = join(this.configPath, 'agents', `${agentId}.yaml`);
        
        db.prepare(`
          INSERT OR REPLACE INTO agents (
            agent_id, name, description, manifest_path, status, agent_type, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run([
          agentId,
          manifest.config.name,
          manifest.metadata?.description || '',
          manifestPath,
          'idle',
          'assistant' // Default type
        ]);
      } catch (error) {
        console.error(`[AgentService] Failed to sync agent ${agentId} to database:`, error);
      }
    }

    db.close();
  }

  async chat(message: string, sessionId?: string, userId?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check if the message starts with an entity name (e.g., "analysis can you gather data...")
    const firstWord = message.split(' ')[0].toLowerCase();
    const entity = await this.resolveEntityName(firstWord);
    
    if (entity.type === 'team' && entity.id) {
      // Route to team, remove the team name from the message
      const messageWithoutTeamName = message.substring(firstWord.length).trim();
      console.log(`[AgentService] Routing to team: ${entity.id}`);
      return this.chatWithAgentGroup(entity.id, messageWithoutTeamName, sessionId, userId);
    } else if (entity.type === 'agent' && entity.id) {
      // Route to specific agent, remove the agent name from the message
      const messageWithoutAgentName = message.substring(firstWord.length).trim();
      console.log(`[AgentService] Routing to agent: ${entity.id}`);
      return this.chatWithAgent(entity.id, messageWithoutAgentName, sessionId, userId);
    }

    // No specific entity found, use orchestration
    try {
      const response = await fetch(`${this.smalltalkApiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: sessionId || 'default'
        })
      });

      if (!response.ok) {
        throw new Error(`SmallTalk API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from SmallTalk';
    } catch (error) {
      console.error('[AgentService] Chat processing failed:', error);
      throw error;
    }
  }

  async chatWithAgent(agentId: string, message: string, sessionId?: string, userId?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // For specific agent, we'll prefix the message to indicate agent preference
      const agentMessage = `/agent ${agentId} ${message}`;
      
      const response = await fetch(`${this.smalltalkApiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: agentMessage,
          sessionId: sessionId || 'default'
        })
      });

      if (!response.ok) {
        throw new Error(`SmallTalk API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from SmallTalk';
    } catch (error) {
      console.error(`[AgentService] Chat with agent ${agentId} failed:`, error);
      throw error;
    }
  }

  async getAgentList(): Promise<AgentStatus[]> {
    const db = this.getDatabase();
    
    try {
      const agents = db.prepare(`
        SELECT agent_id, name, description, status, agent_type, created_at, updated_at 
        FROM agents 
        ORDER BY created_at DESC
      `).all();
      
      return agents as AgentStatus[];
    } finally {
      db.close();
    }
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
    const db = this.getDatabase();
    
    try {
      const agent = db.prepare(`
        SELECT agent_id, name, description, status, agent_type, created_at, updated_at 
        FROM agents 
        WHERE agent_id = ?
      `).get(agentId);
      
      return agent as AgentStatus || null;
    } finally {
      db.close();
    }
  }

  async updateAgentStatus(agentId: string, status: AgentStatus['status']): Promise<void> {
    const db = this.getDatabase();
    
    try {
      db.prepare(`
        UPDATE agents 
        SET status = ?, updated_at = datetime('now') 
        WHERE agent_id = ?
      `).run([status, agentId]);
    } finally {
      db.close();
    }
  }

  async createAgentRun(agentId: string, sessionId?: string, userId?: string): Promise<number> {
    const db = this.getDatabase();
    
    try {
      const result = db.prepare(`
        INSERT INTO agent_runs (agent_id, session_id, user_id, status)
        VALUES (?, ?, ?, 'running')
      `).run([agentId, sessionId, userId]);
      
      return result.lastInsertRowid as number;
    } finally {
      db.close();
    }
  }

  async completeAgentRun(runId: number, result?: string, error?: string): Promise<void> {
    const db = this.getDatabase();
    
    try {
      db.prepare(`
        UPDATE agent_runs 
        SET end_time = datetime('now'), 
            status = ?, 
            result = ?,
            error_message = ?
        WHERE run_id = ?
      `).run([error ? 'failed' : 'completed', result, error, runId]);
    } finally {
      db.close();
    }
  }

  async getAgentRuns(agentId?: string, limit = 50): Promise<AgentRun[]> {
    const db = this.getDatabase();
    
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
      
      const runs = db.prepare(query).all(params);
      return runs as AgentRun[];
    } finally {
      db.close();
    }
  }

  async createAgent(manifest: AgentManifest): Promise<string> {
    const agentId = manifest.config.name.toLowerCase().replace(/\s+/g, '-');
    const manifestPath = join(this.configPath, 'agents', `${agentId}.yaml`);
    
    // Check for naming conflicts with existing agents and teams
    const nameConflict = await this.checkNameConflict(manifest.config.name, 'agent');
    if (nameConflict) {
      throw new Error(nameConflict);
    }
    
    try {
      // Save manifest to file as simple YAML
      const yamlContent = this.manifestToYaml(manifest);
      writeFileSync(manifestPath, yamlContent, 'utf8');
      
      // Add to database
      const db = this.getDatabase();
      db.prepare(`
        INSERT INTO agents (agent_id, name, description, manifest_path, status, agent_type)
        VALUES (?, ?, ?, ?, 'idle', ?)
      `).run([
        agentId,
        manifest.config.name,
        manifest.metadata?.description || '',
        manifestPath,
        manifest.metadata?.tags?.[0] || 'assistant'
      ]);
      db.close();
      
      // Add to local agents map
      this.agents.set(agentId, manifest);
      
      return agentId;
    } catch (error) {
      console.error('[AgentService] Failed to create agent:', error);
      throw error;
    }
  }

  private manifestToYaml(manifest: AgentManifest): string {
    let yaml = 'config:\n';
    yaml += `  name: "${manifest.config.name}"\n`;
    if (manifest.config.model) yaml += `  model: "${manifest.config.model}"\n`;
    if (manifest.config.personality) yaml += `  personality: "${manifest.config.personality}"\n`;
    if (manifest.config.temperature) yaml += `  temperature: ${manifest.config.temperature}\n`;
    if (manifest.config.maxTokens) yaml += `  maxTokens: ${manifest.config.maxTokens}\n`;
    
    if (manifest.capabilities) {
      yaml += '\ncapabilities:\n';
      for (const [key, value] of Object.entries(manifest.capabilities)) {
        yaml += `  ${key}: "${value}"\n`;
      }
    }
    
    if (manifest.metadata) {
      yaml += '\nmetadata:\n';
      for (const [key, value] of Object.entries(manifest.metadata)) {
        yaml += `  ${key}: "${value}"\n`;
      }
    }
    
    return yaml;
  }

  async deleteAgent(agentId: string): Promise<void> {
    try {
      // Remove from database
      const db = this.getDatabase();
      db.prepare('DELETE FROM agents WHERE agent_id = ?').run([agentId]);
      db.close();
      
      // Remove from local agents map
      this.agents.delete(agentId);
      
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
    const db = this.getDatabase();
    
    try {
      db.prepare(`
        INSERT INTO agent_logs (agent_id, level, message, context)
        VALUES (?, 'INFO', ?, ?)
      `).run([
        event.agentId || 'unknown',
        `Agent response: ${event.response?.substring(0, 100)}...`,
        JSON.stringify(event)
      ]);
    } catch (error) {
      console.error('[AgentService] Failed to log agent activity:', error);
    } finally {
      db.close();
    }
  }

  private getDatabase() {
    return new Database(this.dbPath);
  }

  // Orchestration methods - use SmallTalk API
  async forceAgentSwitch(userId: string, agentName: string): Promise<boolean> {
    // SmallTalk API doesn't expose this directly, return true for now
    return true;
  }

  async getCurrentAgent(userId: string): Promise<string | undefined> {
    // Could be implemented later with session tracking
    return undefined;
  }

  async getOrchestrationStats(): Promise<any> {
    try {
      const response = await fetch(`${this.smalltalkApiUrl}/api/status`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[AgentService] Failed to get orchestration stats:', error);
    }
    return { status: 'unknown' };
  }

  async getAvailableAgents(): Promise<string[]> {
    try {
      const response = await fetch(`${this.smalltalkApiUrl}/api/agents`);
      if (response.ok) {
        const data = await response.json();
        return data.agents?.map((agent: any) => agent.name) || [];
      }
    } catch (error) {
      console.error('[AgentService] Failed to get available agents:', error);
    }
    return [];
  }

  async enableOrchestration(enabled: boolean): Promise<void> {
    // SmallTalk orchestration is always enabled by default
    console.log(`[AgentService] Orchestration ${enabled ? 'enabled' : 'disabled'}`);
  }

  async getStats(): Promise<any> {
    return this.getOrchestrationStats();
  }

  // Check for naming conflicts across agents and teams
  async checkNameConflict(name: string, entityType: 'agent' | 'team'): Promise<string | null> {
    const db = this.getDatabase();
    
    try {
      const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
      
      // Check for existing agent with same name
      const existingAgent = db.prepare(`
        SELECT agent_id, name FROM agents 
        WHERE LOWER(REPLACE(name, ' ', '-')) = ? OR agent_id = ?
      `).get([normalizedName, normalizedName]);
      
      // Check for existing team with same name
      const existingTeam = db.prepare(`
        SELECT id, name FROM agent_teams 
        WHERE LOWER(REPLACE(name, ' ', '-')) = ?
      `).get([normalizedName]);
      
      if (entityType === 'agent' && existingAgent) {
        return `An agent with the name "${name}" already exists. Please choose a different name.`;
      }
      
      if (entityType === 'agent' && existingTeam) {
        return `A team with the name "${name}" already exists. Agent and team names must be unique to avoid routing conflicts.`;
      }
      
      if (entityType === 'team' && existingTeam) {
        return `A team with the name "${name}" already exists. Please choose a different name.`;
      }
      
      if (entityType === 'team' && existingAgent) {
        return `An agent with the name "${name}" already exists. Team and agent names must be unique to avoid routing conflicts.`;
      }
      
      return null; // No conflict
    } finally {
      db.close();
    }
  }

  // Resolve a name to either an agent or team
  async resolveEntityName(name: string): Promise<{ type: 'agent' | 'team' | 'none'; id: string | null }> {
    const db = this.getDatabase();
    
    try {
      const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
      
      // Try exact match first for agents
      const agent = db.prepare(`
        SELECT agent_id FROM agents 
        WHERE agent_id = ? OR LOWER(name) = LOWER(?)
      `).get([normalizedName, name]);
      
      if (agent) {
        return { type: 'agent', id: agent.agent_id };
      }
      
      // Try exact match for teams
      const team = db.prepare(`
        SELECT id FROM agent_teams 
        WHERE LOWER(REPLACE(name, ' ', '-')) = ? OR LOWER(name) = LOWER(?)
      `).get([normalizedName, name]);
      
      if (team) {
        return { type: 'team', id: team.id };
      }
      
      // Try fuzzy match for teams (e.g., "analysis" matches "Analysis Team")
      const fuzzyTeam = db.prepare(`
        SELECT id FROM agent_teams 
        WHERE LOWER(name) LIKE LOWER(?)
      `).get([`%${name}%`]);
      
      if (fuzzyTeam) {
        return { type: 'team', id: fuzzyTeam.id };
      }
      
      return { type: 'none', id: null };
    } finally {
      db.close();
    }
  }

  // Agent Group Management
  async getAgentGroups(): Promise<any[]> {
    const db = this.getDatabase();
    
    try {
      const groups = db.prepare(`
        SELECT at.team_id as id, at.name, at.description, at.created_at, at.updated_at,
               GROUP_CONCAT(atm.agent_id) as agent_ids
        FROM agent_teams at
        LEFT JOIN agent_team_members atm ON at.team_id = atm.team_id
        GROUP BY at.team_id, at.name, at.description, at.created_at, at.updated_at
        ORDER BY at.created_at DESC
      `).all();
      
      return groups.map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        agents: group.agent_ids ? group.agent_ids.split(',') : [],
        active: true, // TODO: Add active status to database
        created_at: group.created_at,
        updated_at: group.updated_at
      }));
    } finally {
      db.close();
    }
  }

  async createAgentGroup(group: { name: string; description?: string; agents: string[] }): Promise<string> {
    // Check for naming conflicts with existing agents and teams
    const nameConflict = await this.checkNameConflict(group.name, 'team');
    if (nameConflict) {
      throw new Error(nameConflict);
    }
    
    const db = this.getDatabase();
    
    const transaction = db.transaction(() => {
      // Create the team
      const result = db.prepare(`
        INSERT INTO agent_teams (name, description)
        VALUES (?, ?)
      `).run([group.name, group.description || null]);
      
      const teamId = result.lastInsertRowid.toString();
      
      // Add team members
      const insertMember = db.prepare(`
        INSERT INTO agent_team_members (team_id, agent_id)
        VALUES (?, ?)
      `);
      
      for (const agentId of group.agents) {
        insertMember.run([teamId, agentId]);
      }
      
      return teamId;
    });
    
    try {
      const teamId = transaction();
      db.close();
      return teamId;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  async updateAgentGroup(groupId: string, updates: { name?: string; description?: string; agents?: string[] }): Promise<void> {
    const db = this.getDatabase();
    
    const transaction = db.transaction(() => {
      // Update team details if provided
      if (updates.name || updates.description !== undefined) {
        db.prepare(`
          UPDATE agent_teams 
          SET name = COALESCE(?, name), 
              description = COALESCE(?, description),
              updated_at = datetime('now')
          WHERE team_id = ?
        `).run([updates.name || null, updates.description || null, groupId]);
      }
      
      // Update team members if provided
      if (updates.agents) {
        // Remove existing members
        db.prepare('DELETE FROM agent_team_members WHERE team_id = ?').run([groupId]);
        
        // Add new members
        const insertMember = db.prepare(`
          INSERT INTO agent_team_members (team_id, agent_id)
          VALUES (?, ?)
        `);
        
        for (const agentId of updates.agents) {
          insertMember.run([groupId, agentId]);
        }
      }
    });
    
    try {
      transaction();
      db.close();
    } catch (error) {
      db.close();
      throw error;
    }
  }

  async deleteAgentGroup(groupId: string): Promise<void> {
    const db = this.getDatabase();
    
    const transaction = db.transaction(() => {
      // Delete team members first (foreign key constraint)
      db.prepare('DELETE FROM agent_team_members WHERE team_id = ?').run([groupId]);
      
      // Delete the team
      db.prepare('DELETE FROM agent_teams WHERE team_id = ?').run([groupId]);
    });
    
    try {
      transaction();
      db.close();
    } catch (error) {
      db.close();
      throw error;
    }
  }

  async chatWithAgentGroup(groupId: string, message: string, sessionId?: string, userId?: string): Promise<string> {
    // Get group agents
    const groups = await this.getAgentGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error(`Agent group ${groupId} not found`);
    }
    
    try {
      // Use SmallTalk's orchestration with group context
      const contextMessage = `[Team: ${group.name} - ${group.description || 'Agent team'}] ${message}`;
      
      const response = await fetch(`${this.smalltalkApiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contextMessage,
          sessionId: sessionId || 'default'
        })
      });

      if (!response.ok) {
        throw new Error(`SmallTalk API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response from SmallTalk';
    } catch (error) {
      console.error(`[AgentService] Chat with agent group ${groupId} failed:`, error);
      throw error;
    }
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