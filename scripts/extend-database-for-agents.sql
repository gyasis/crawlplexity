-- Extend research_memory.db with agent management tables
-- Run this script to add agent tables to the existing database

-- Agents table - tracks agent configurations and status
CREATE TABLE IF NOT EXISTS agents (
    agent_id TEXT PRIMARY KEY,  -- Unique ID, matches YAML filename
    name TEXT NOT NULL,
    description TEXT,
    manifest_path TEXT NOT NULL, -- Path to YAML manifest file
    status TEXT DEFAULT 'idle',  -- 'idle', 'running', 'stopped', 'error'
    agent_type TEXT,             -- From YAML manifest
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version TEXT DEFAULT '1.0.0',
    author TEXT,
    tags TEXT,                   -- JSON array
    metadata TEXT                -- JSON object
);

-- Agent runs table - tracks individual agent executions
CREATE TABLE IF NOT EXISTS agent_runs (
    run_id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    session_id TEXT,             -- Link to chat sessions
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'interrupted'
    result TEXT,                 -- JSON result data
    error_message TEXT,
    user_id TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

-- Agent logs table - tracks detailed agent execution logs
CREATE TABLE IF NOT EXISTS agent_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER,
    agent_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    level TEXT DEFAULT 'INFO',   -- 'DEBUG', 'INFO', 'WARNING', 'ERROR'
    message TEXT NOT NULL,
    context TEXT,                -- JSON context data
    FOREIGN KEY (run_id) REFERENCES agent_runs(run_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
);

-- Teams table - for agent team orchestration
CREATE TABLE IF NOT EXISTS agent_teams (
    team_id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL,
    description TEXT,
    orchestration_config TEXT,   -- JSON orchestration rules
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' -- 'active', 'inactive'
);

-- Agent-team membership table
CREATE TABLE IF NOT EXISTS agent_team_members (
    agent_id TEXT,
    team_id TEXT,
    role TEXT DEFAULT 'member',  -- 'leader', 'member', 'specialist'
    priority INTEGER DEFAULT 0,  -- For orchestration ordering
    PRIMARY KEY (agent_id, team_id),
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES agent_teams(team_id) ON DELETE CASCADE
);

-- MCP server configurations table
CREATE TABLE IF NOT EXISTS mcp_servers (
    server_id TEXT PRIMARY KEY,
    server_name TEXT NOT NULL,
    server_type TEXT NOT NULL,   -- 'stdio', 'http'
    config TEXT NOT NULL,        -- JSON server configuration
    status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'error'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent-MCP server associations
CREATE TABLE IF NOT EXISTS agent_mcp_servers (
    agent_id TEXT,
    server_id TEXT,
    PRIMARY KEY (agent_id, server_id),
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES mcp_servers(server_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_run_id ON agent_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON agent_logs(timestamp);

-- Insert initial test data (optional)
-- INSERT INTO agents (agent_id, name, description, manifest_path, agent_type) 
-- VALUES ('test-helper', 'Test Helper', 'A simple test agent', 'configs/agents/test-helper.yaml', 'helper');