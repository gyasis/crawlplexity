-- Create workflow tables without foreign key constraints for SQLite compatibility

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    execution_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    triggered_by TEXT,
    trigger_context TEXT,
    status TEXT DEFAULT 'pending',
    input_data TEXT,
    output_data TEXT,
    execution_log TEXT,
    orchestration_trace TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    error_details TEXT,
    user_id TEXT,
    session_id TEXT
);

-- Workflow templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
    template_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subcategory TEXT,
    definition TEXT NOT NULL,
    visual_layout TEXT,
    preview_image TEXT,
    tags TEXT DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    complexity_level TEXT DEFAULT 'beginner',
    estimated_nodes INTEGER DEFAULT 3,
    orchestration_type TEXT DEFAULT 'agent'
);

-- Workflow nodes table
CREATE TABLE IF NOT EXISTS workflow_nodes (
    node_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    agent_id TEXT,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    configuration TEXT DEFAULT '{}',
    connections_in TEXT DEFAULT '[]',
    connections_out TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow connections table
CREATE TABLE IF NOT EXISTS workflow_connections (
    connection_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    source_handle TEXT DEFAULT 'output',
    target_handle TEXT DEFAULT 'input',
    condition_expression TEXT,
    data_mapping TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orchestration rules table
CREATE TABLE IF NOT EXISTS orchestration_rules (
    rule_id TEXT PRIMARY KEY,
    workflow_id TEXT,
    team_id TEXT,
    rule_name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    condition_expression TEXT,
    action_config TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow sharing table
CREATE TABLE IF NOT EXISTS workflow_sharing (
    share_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    shared_with TEXT,
    permission_level TEXT DEFAULT 'read',
    shared_by TEXT,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
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