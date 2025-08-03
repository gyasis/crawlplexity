-- Extend research_memory.db with workflow management tables
-- Run this script to add workflow and orchestration tables to the existing database

-- Workflows table - stores visual workflow definitions
CREATE TABLE IF NOT EXISTS workflows (
    workflow_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT NOT NULL,        -- JSON workflow definition (nodes, connections, etc.)
    visual_layout TEXT,              -- JSON: node positions and canvas state
    workflow_type TEXT DEFAULT 'agent', -- 'agent', 'agentic', 'hybrid'
    orchestration_mode TEXT DEFAULT 'auto', -- 'auto', 'manual'
    orchestration_config TEXT,       -- JSON: custom orchestration rules for manual mode
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_template BOOLEAN DEFAULT FALSE,
    category TEXT DEFAULT 'custom',  -- 'development', 'research', 'content', 'analysis', 'custom'
    version TEXT DEFAULT '1.0.0',
    status TEXT DEFAULT 'draft',     -- 'draft', 'active', 'archived'
    team_id TEXT,                    -- Optional: associate with agent team
    performance_metrics TEXT DEFAULT '{}', -- JSON: execution stats
    FOREIGN KEY (team_id) REFERENCES agent_teams(team_id) ON DELETE SET NULL
);

-- Workflow executions table - tracks workflow runs
CREATE TABLE IF NOT EXISTS workflow_executions (
    execution_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    triggered_by TEXT,               -- 'user', 'api', 'schedule', 'agent'
    trigger_context TEXT,            -- JSON: trigger information
    status TEXT DEFAULT 'pending',   -- 'pending', 'running', 'completed', 'failed', 'cancelled'
    input_data TEXT,                 -- JSON: execution input
    output_data TEXT,                -- JSON: execution results
    execution_log TEXT,              -- JSON: detailed execution steps
    orchestration_trace TEXT,        -- JSON: how orchestration decisions were made
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,             -- Execution duration in milliseconds
    error_message TEXT,
    error_details TEXT,              -- JSON: detailed error information
    user_id TEXT,
    session_id TEXT,                 -- Link to chat sessions
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE CASCADE
);

-- Workflow templates table - predefined workflow patterns
CREATE TABLE IF NOT EXISTS workflow_templates (
    template_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,          -- 'development', 'research', 'content', 'analysis'
    subcategory TEXT,                -- More specific categorization
    definition TEXT NOT NULL,        -- JSON workflow definition
    visual_layout TEXT,
    preview_image TEXT,              -- Base64 or file path for template preview
    tags TEXT DEFAULT '[]',          -- JSON array of tags
    usage_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    complexity_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    estimated_nodes INTEGER DEFAULT 3,        -- Expected number of nodes
    orchestration_type TEXT DEFAULT 'agent'   -- 'agent', 'agentic', 'hybrid'
);

-- Workflow nodes table - individual workflow components
CREATE TABLE IF NOT EXISTS workflow_nodes (
    node_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    node_type TEXT NOT NULL,         -- 'agent', 'trigger', 'condition', 'merger', 'output'
    agent_id TEXT,                   -- If node_type is 'agent'
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    configuration TEXT DEFAULT '{}', -- JSON node configuration
    connections_in TEXT DEFAULT '[]', -- JSON array of input connection IDs
    connections_out TEXT DEFAULT '[]', -- JSON array of output connection IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE SET NULL
);

-- Workflow connections table - links between nodes
CREATE TABLE IF NOT EXISTS workflow_connections (
    connection_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    source_handle TEXT DEFAULT 'output', -- Handle/port on source node
    target_handle TEXT DEFAULT 'input',  -- Handle/port on target node
    condition_expression TEXT,           -- Optional: conditional connection
    data_mapping TEXT DEFAULT '{}',      -- JSON: how data flows between nodes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    FOREIGN KEY (source_node_id) REFERENCES workflow_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (target_node_id) REFERENCES workflow_nodes(node_id) ON DELETE CASCADE
);

-- Orchestration rules table - custom orchestration configurations
CREATE TABLE IF NOT EXISTS orchestration_rules (
    rule_id TEXT PRIMARY KEY,
    workflow_id TEXT,                -- Can be workflow-specific or global
    team_id TEXT,                    -- Can be team-specific or global  
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL,         -- 'routing', 'condition', 'escalation', 'retry'
    condition_expression TEXT,       -- When this rule applies
    action_config TEXT NOT NULL,     -- JSON: what action to take
    priority INTEGER DEFAULT 0,      -- Higher priority rules execute first
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES agent_teams(team_id) ON DELETE CASCADE
);

-- Workflow sharing table - collaboration and permissions
CREATE TABLE IF NOT EXISTS workflow_sharing (
    share_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    shared_with TEXT,                -- User ID or 'public'
    permission_level TEXT DEFAULT 'read', -- 'read', 'write', 'admin'
    shared_by TEXT,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,            -- Optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflows_mode ON workflows(orchestration_mode);
CREATE INDEX IF NOT EXISTS idx_workflows_team ON workflows(team_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_type ON workflow_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_workflow_connections_workflow_id ON workflow_connections(workflow_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_rules_workflow_id ON orchestration_rules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_rules_team_id ON orchestration_rules(team_id);

-- Insert initial workflow templates
INSERT OR IGNORE INTO workflow_templates (
    template_id, name, description, category, definition, complexity_level, estimated_nodes, orchestration_type
) VALUES 
(
    'research-respond-template',
    'Research & Respond',
    'Basic workflow that researches a topic and generates a response',
    'research',
    '{"nodes":[{"id":"trigger-1","type":"trigger","data":{"event":"user_query"}},{"id":"research-1","type":"agent","data":{"agentId":"research-assistant"}},{"id":"respond-1","type":"agent","data":{"agentId":"conversation-manager"}}],"connections":[{"source":"trigger-1","target":"research-1"},{"source":"research-1","target":"respond-1"}]}',
    'beginner',
    3,
    'agent'
),
(
    'filter-process-template', 
    'Filter & Process',
    'Conditional workflow that filters input and processes based on criteria',
    'development',
    '{"nodes":[{"id":"trigger-1","type":"trigger","data":{"event":"user_input"}},{"id":"condition-1","type":"condition","data":{"expression":"input.type === \'code\'"}},{"id":"process-1","type":"agent","data":{"agentId":"coding-assistant"}}],"connections":[{"source":"trigger-1","target":"condition-1"},{"source":"condition-1","target":"process-1","condition":"true"}]}',
    'intermediate',
    3,
    'agent'
),
(
    'adaptive-assistant-template',
    'Adaptive Assistant',
    'Agentic workflow that adapts responses based on user context and history',
    'analysis',
    '{"nodes":[{"id":"trigger-1","type":"trigger","data":{"event":"user_query"}},{"id":"context-1","type":"agent","data":{"agentId":"conversation-manager","mode":"agentic"}},{"id":"decision-1","type":"condition","data":{"expression":"context.complexity > 0.7"}},{"id":"research-1","type":"agent","data":{"agentId":"research-assistant","mode":"agentic"}},{"id":"respond-1","type":"agent","data":{"agentId":"conversation-manager","mode":"agentic"}}],"connections":[{"source":"trigger-1","target":"context-1"},{"source":"context-1","target":"decision-1"},{"source":"decision-1","target":"research-1","condition":"true"},{"source":"decision-1","target":"respond-1","condition":"false"},{"source":"research-1","target":"respond-1"}]}',
    'advanced',
    5,
    'agentic'
);

-- Add workflow-related columns to existing agent_teams table if they don't exist
-- This safely extends the existing table structure
ALTER TABLE agent_teams ADD COLUMN default_workflow_id TEXT;
ALTER TABLE agent_teams ADD COLUMN workflow_templates TEXT DEFAULT '[]'; -- JSON array of template IDs
ALTER TABLE agent_teams ADD COLUMN orchestration_mode TEXT DEFAULT 'auto'; -- 'auto', 'manual'

-- Add foreign key constraint for default workflow (done as separate statement for SQLite compatibility)
-- Note: SQLite doesn't support adding foreign key constraints to existing tables easily
-- This will be handled in the application layer for validation