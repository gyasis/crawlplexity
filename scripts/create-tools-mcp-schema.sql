-- Tools & MCP Server Integration Database Schema
-- This script creates the necessary tables for managing tools and MCP servers

-- Tools table: Store all available tools
CREATE TABLE IF NOT EXISTS tools (
    tool_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('data_access', 'computation', 'communication', 'search', 'utility')),
    description TEXT,
    file_path TEXT NOT NULL,
    parameters JSON NOT NULL DEFAULT '{}',
    handler_code TEXT, -- Python code for the tool handler
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCP Servers table: Store MCP server configurations
CREATE TABLE IF NOT EXISTS mcp_servers (
    server_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('stdio', 'http')),
    command TEXT, -- For stdio type
    args JSON, -- For stdio type arguments
    url TEXT, -- For http type
    env JSON DEFAULT '{}', -- Environment variables
    capabilities JSON DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_health_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent tool assignments: Link tools to agents
CREATE TABLE IF NOT EXISTS agent_tools (
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    configuration JSON DEFAULT '{}',
    permissions JSON DEFAULT '{"read": true, "write": false, "execute": true}',
    rate_limit INTEGER DEFAULT 100, -- Calls per minute
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_id, tool_id),
    FOREIGN KEY (tool_id) REFERENCES tools(tool_id) ON DELETE CASCADE
);

-- Agent MCP server assignments: Link MCP servers to agents
CREATE TABLE IF NOT EXISTS agent_mcp_servers (
    agent_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    configuration JSON DEFAULT '{}',
    permissions JSON DEFAULT '{"read": true, "write": false}',
    priority INTEGER DEFAULT 1, -- Server priority for the agent
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (agent_id, server_id),
    FOREIGN KEY (server_id) REFERENCES mcp_servers(server_id) ON DELETE CASCADE
);

-- Tool execution logs: Track tool usage
CREATE TABLE IF NOT EXISTS tool_execution_logs (
    log_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tool_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    conversation_id TEXT,
    input_params JSON,
    output_result JSON,
    execution_time_ms INTEGER,
    status TEXT CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tool_id) REFERENCES tools(tool_id) ON DELETE CASCADE
);

-- MCP server call logs: Track MCP server usage
CREATE TABLE IF NOT EXISTS mcp_server_logs (
    log_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    server_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    conversation_id TEXT,
    tool_name TEXT,
    request JSON,
    response JSON,
    response_time_ms INTEGER,
    status TEXT CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    called_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES mcp_servers(server_id) ON DELETE CASCADE
);

-- Tool versions: Track tool version history
CREATE TABLE IF NOT EXISTS tool_versions (
    version_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tool_id TEXT NOT NULL,
    version_number TEXT NOT NULL,
    handler_code TEXT,
    parameters JSON,
    change_notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tool_id) REFERENCES tools(tool_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_active ON tools(is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_mcp_agent ON agent_mcp_servers(agent_id);
CREATE INDEX IF NOT EXISTS idx_tool_logs_tool ON tool_execution_logs(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_logs_agent ON tool_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_server ON mcp_server_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_logs_agent ON mcp_server_logs(agent_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_tools_timestamp 
AFTER UPDATE ON tools
BEGIN
    UPDATE tools SET updated_at = CURRENT_TIMESTAMP WHERE tool_id = NEW.tool_id;
END;

CREATE TRIGGER IF NOT EXISTS update_mcp_servers_timestamp 
AFTER UPDATE ON mcp_servers
BEGIN
    UPDATE mcp_servers SET updated_at = CURRENT_TIMESTAMP WHERE server_id = NEW.server_id;
END;

-- Insert some default tools
INSERT OR IGNORE INTO tools (name, category, description, file_path, parameters) VALUES
    ('calculator', 'computation', 'Perform mathematical calculations', '/lib/tools/computation/calculator.ts', '{"expression": {"type": "string", "required": true}}'),
    ('web_search', 'search', 'Search the web for information', '/lib/tools/search/web_search.ts', '{"query": {"type": "string", "required": true}, "maxResults": {"type": "number", "default": 5}}'),
    ('file_operations', 'utility', 'Read, write, and manage files', '/lib/tools/utility/file_operations.ts', '{"operation": {"type": "string", "enum": ["read", "write", "list"]}, "path": {"type": "string", "required": true}}');

-- Insert default MCP servers
INSERT OR IGNORE INTO mcp_servers (name, type, command, args, capabilities) VALUES
    ('context7', 'stdio', 'npx', '["@upstash/context7-mcp@latest"]', '["documentation", "code_examples"]'),
    ('filesystem', 'stdio', 'npx', '["@modelcontextprotocol/server-filesystem", "."]', '["file_read", "file_write", "directory_list"]'),
    ('github', 'stdio', 'npx', '["@modelcontextprotocol/server-github"]', '["repository_access", "issues", "pull_requests"]');