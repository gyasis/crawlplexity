-- Fix workflow_executions table schema to match the service expectations

-- Drop the existing table and recreate with proper schema
DROP TABLE IF EXISTS workflow_executions;

CREATE TABLE workflow_executions (
    execution_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    triggered_by TEXT DEFAULT 'user',
    trigger_context TEXT DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    input_data TEXT DEFAULT '{}',
    output_data TEXT DEFAULT '{}',
    execution_log TEXT DEFAULT '{}',
    orchestration_trace TEXT DEFAULT '{}',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    error_message TEXT,
    error_details TEXT DEFAULT '{}',
    user_id TEXT,
    session_id TEXT
);