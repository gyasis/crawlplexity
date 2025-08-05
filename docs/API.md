# Fireplexity API Documentation

## Overview

Fireplexity provides a comprehensive REST API for managing workflows, agents, teams, and system configuration. All endpoints follow RESTful conventions and return JSON responses.

## Base URL
```
Development: http://localhost:18563/api
Production: https://your-domain.com/api
```

## Authentication

### API Keys
Most endpoints require authentication via API keys generated in the Settings interface.

```http
Authorization: Bearer sk-your-api-key-here
```

### Session-based Authentication
Some endpoints use session-based authentication for web interface access.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Workflow Management

### List Workflows
```http
GET /api/workflows
```

**Parameters:**
- `status` (optional): Filter by workflow status (`active`, `paused`, `draft`, `archived`)
- `category` (optional): Filter by category
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "workflow_id": "wf_123456789",
      "name": "Content Research Pipeline",
      "description": "Automated content research and analysis",
      "status": "active",
      "workflow_type": "hybrid",
      "orchestration_mode": "auto",
      "category": "research",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T14:20:00Z",
      "definition": {
        "nodes": [...],
        "connections": [...],
        "settings": {...}
      },
      "execution_stats": {
        "total_runs": 45,
        "success_rate": 0.93,
        "avg_execution_time": 23.5,
        "last_executed": "2024-01-15T16:45:00Z"
      }
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### Create Workflow
```http
POST /api/workflows
```

**Request Body:**
```json
{
  "name": "New Workflow",
  "description": "Workflow description",
  "workflow_type": "hybrid",
  "orchestration_mode": "auto",
  "category": "general",
  "definition": {
    "nodes": [
      {
        "id": "trigger-1",
        "type": "trigger",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Start Trigger",
          "config": {}
        }
      }
    ],
    "connections": [],
    "settings": {
      "timeout": 300000,
      "retryPolicy": {
        "maxAttempts": 3,
        "backoffStrategy": "exponential",
        "retryDelay": 1000
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflow_id": "wf_987654321",
    "name": "New Workflow",
    "status": "draft",
    "created_at": "2024-01-15T18:30:00Z"
  }
}
```

### Execute Workflow
```http
POST /api/workflows/{workflow_id}/execute
```

**Request Body:**
```json
{
  "inputData": {
    "query": "Research topic",
    "parameters": {}
  },
  "sessionId": "session_123",
  "userId": "user_456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_789",
    "status": "running",
    "started_at": "2024-01-15T18:35:00Z",
    "stream_url": "/api/workflows/exec_789/stream"
  }
}
```

### Get Workflow Execution Stream
```http
GET /api/workflows/{execution_id}/stream
```

Returns Server-Sent Events (SSE) stream:
```
event: status
data: {"status": "running", "step": "processing_input"}

event: progress  
data: {"completed_steps": 2, "total_steps": 5, "percentage": 40}

event: result
data: {"step_id": "agent-1", "output": "Step result data"}

event: complete
data: {"status": "completed", "final_output": {...}}
```

## Workflow Templates

### List Templates
```http
GET /api/workflows/templates
```

**Parameters:**
- `category` (optional): Filter by category
- `complexity_level` (optional): `beginner`, `intermediate`, `advanced`
- `orchestration_type` (optional): `agent`, `agentic`, `hybrid`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "template_id": "tpl_research_001",
      "name": "Research & Analysis Pipeline",
      "description": "Comprehensive research workflow with analysis",
      "category": "research",
      "complexity_level": "intermediate",
      "estimated_nodes": 8,
      "orchestration_type": "hybrid",
      "usage_count": 156,
      "rating": 4.8,
      "is_featured": true,
      "created_at": "2024-01-10T09:00:00Z",
      "definition": {...}
    }
  ]
}
```

### Instantiate Template
```http
POST /api/workflows/templates/{template_id}/instantiate
```

**Request Body:**
```json
{
  "name": "My Research Workflow",
  "description": "Custom research workflow from template",
  "customizations": {
    "agent_selections": {
      "research_agent": "agent_custom_123"
    },
    "parameter_overrides": {
      "timeout": 600000
    }
  }
}
```

## Agent Management

### List Agents
```http
GET /api/agents
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "agent_id": "agent_123456789",
      "name": "Research Assistant",
      "description": "Specialized in research and analysis",
      "agent_type": "researcher",
      "status": "idle",
      "created_at": "2024-01-12T11:15:00Z",
      "updated_at": "2024-01-15T16:30:00Z",
      "config": {
        "model": "gpt-4o",
        "temperature": 0.7,
        "maxTokens": 4096,
        "personality": "Professional and analytical",
        "tools": ["web_search", "file_reader"],
        "timeout": 30000,
        "retryAttempts": 3
      },
      "capabilities": {
        "expertise": ["research", "analysis", "data processing"],
        "taskTypes": ["information gathering", "report generation"],
        "complexity": "advanced",
        "contextAwareness": 9
      },
      "usage_stats": {
        "total_runs": 234,
        "success_rate": 0.96,
        "avg_response_time": 2.3,
        "last_used": "2024-01-15T15:45:00Z"
      }
    }
  ]
}
```

### Create Agent
```http
POST /api/agents
```

**Request Body:**
```json
{
  "name": "Content Creator",
  "description": "Specialized in content creation and writing",
  "agent_type": "creative",
  "config": {
    "model": "claude-3-5-sonnet",
    "temperature": 0.8,
    "maxTokens": 4096,
    "personality": "Creative and engaging",
    "systemPrompt": "You are a creative writing assistant...",
    "tools": ["web_search", "image_generator"],
    "timeout": 45000,
    "retryAttempts": 2,
    "memoryEnabled": true,
    "loggingLevel": "standard"
  },
  "capabilities": {
    "expertise": ["writing", "content creation", "storytelling"],
    "taskTypes": ["blog posts", "social media", "marketing copy"],
    "complexity": "intermediate",
    "contextAwareness": 7
  },
  "metadata": {
    "version": "1.0.0",
    "author": "Team",
    "tags": ["creative", "writing", "marketing"]
  }
}
```

### Run Agent
```http
POST /api/agents/{agent_id}/run
```

**Request Body:**
```json
{
  "input": "Create a blog post about AI trends",
  "sessionId": "session_789",
  "userId": "user_123",
  "context": {
    "previous_outputs": [],
    "workflow_context": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "execution_id": "exec_agent_456",
    "status": "running",
    "started_at": "2024-01-15T19:00:00Z"
  }
}
```

## Team Management

### List Teams
```http
GET /api/agent-groups
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "team_research_001",
      "name": "Research Team Alpha",
      "description": "Specialized research and analysis team",
      "agents": ["agent_123", "agent_456", "agent_789"],
      "collaboration_type": "hierarchical",
      "leader": "agent_123",
      "category": "research",
      "active": true,
      "created_at": "2024-01-14T10:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z",
      "performance_metrics": {
        "total_runs": 78,
        "success_rate": 0.94,
        "avg_response_time": 15.6,
        "last_used": "2024-01-15T17:20:00Z"
      },
      "settings": {
        "auto_assign_tasks": true,
        "load_balancing": true,
        "fault_tolerance": true,
        "communication_protocol": "hub"
      }
    }
  ]
}
```

### Create Team
```http
POST /api/agent-groups
```

**Request Body:**
```json
{
  "name": "Content Creation Team",
  "description": "Team for content creation and marketing",
  "agents": ["agent_writer", "agent_researcher", "agent_editor"],
  "collaboration_type": "sequential",
  "leader": "agent_editor",
  "category": "creative",
  "settings": {
    "auto_assign_tasks": false,
    "load_balancing": true,
    "fault_tolerance": true,
    "communication_protocol": "direct"
  }
}
```

### Execute Team Task
```http
POST /api/agent-groups/{team_id}/run
```

**Request Body:**
```json
{
  "task": "Create comprehensive marketing campaign",
  "sessionId": "session_marketing_001",
  "userId": "user_marketing_manager",
  "task_distribution": {
    "mode": "automatic",
    "priority": "high",
    "deadline": "2024-01-20T18:00:00Z"
  }
}
```

## Search & Chat

### Search Query
```http
POST /api/crawlplexity/search
```

**Request Body:**
```json
{
  "query": "What are the latest AI trends in 2024?",
  "mode": "comprehensive",
  "options": {
    "max_results": 10,
    "include_images": true,
    "follow_up_questions": true,
    "source_diversity": true
  }
}
```

**Response (Streaming):**
```
event: search_started
data: {"query": "What are the latest AI trends in 2024?", "timestamp": "2024-01-15T20:00:00Z"}

event: search_results
data: {"results": [...], "total_results": 127}

event: scraping_started  
data: {"urls": ["url1", "url2", "url3"]}

event: scraping_complete
data: {"scraped_content": [...]}

event: ai_response_started
data: {"model": "gpt-4o", "provider": "openai"}

event: ai_response_chunk
data: {"chunk": "AI trends in 2024 show significant..."}

event: follow_up_questions
data: {"questions": ["What about AI in healthcare?", "How about regulatory changes?"]}

event: search_complete
data: {"total_time": 8.5, "sources_used": 5}
```

## System Configuration

### Get System Status
```http
GET /api/system/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "crawl4ai": {
        "status": "healthy",
        "url": "http://localhost:11235",
        "response_time": 23
      },
      "litellm": {
        "status": "healthy", 
        "url": "http://localhost:14782",
        "response_time": 15
      },
      "redis": {
        "status": "healthy",
        "url": "redis://localhost:29674",
        "response_time": 2
      }
    },
    "performance": {
      "memory_usage": 0.65,
      "cpu_usage": 0.23,
      "disk_usage": 0.45
    }
  }
}
```

### Update Settings
```http
PUT /api/system/settings
```

**Request Body:**
```json
{
  "profile": {
    "name": "John Doe",
    "email": "john@example.com",
    "timezone": "America/New_York"
  },
  "notifications": {
    "emailNotifications": true,
    "workflowAlerts": true,
    "frequency": "immediate"
  },
  "system": {
    "autoSave": true,
    "backupFrequency": "daily",
    "logLevel": "standard"
  }
}
```

## Rate Limiting

All API endpoints are subject to rate limiting:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Workflow executions**: 50 per hour
- **Agent runs**: 200 per hour

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642291200
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_API_KEY` | API key is invalid or expired |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `WORKFLOW_NOT_FOUND` | Workflow ID not found |
| `AGENT_NOT_FOUND` | Agent ID not found |
| `INVALID_WORKFLOW_DEFINITION` | Workflow definition is malformed |
| `EXECUTION_FAILED` | Workflow/agent execution failed |
| `SERVICE_UNAVAILABLE` | External service is down |
| `VALIDATION_ERROR` | Request validation failed |
| `INSUFFICIENT_PERMISSIONS` | Lack required permissions |
| `RESOURCE_CONFLICT` | Resource already exists |

## Webhooks

### Workflow Completion
```http
POST https://your-webhook-url.com/workflow-complete
```

**Payload:**
```json
{
  "event": "workflow.completed",
  "workflow_id": "wf_123456789",
  "execution_id": "exec_789",
  "status": "completed",
  "result": {...},
  "execution_time": 45.6,
  "timestamp": "2024-01-15T20:30:00Z"
}
```

### Agent Status Change
```http
POST https://your-webhook-url.com/agent-status
```

**Payload:**
```json
{
  "event": "agent.status_changed",
  "agent_id": "agent_123456789",
  "old_status": "idle",
  "new_status": "running",
  "timestamp": "2024-01-15T20:35:00Z"
}
```

## SDK Examples

### JavaScript/TypeScript
```typescript
import { FireplexityClient } from '@fireplexity/sdk';

const client = new FireplexityClient({
  apiKey: 'sk-your-api-key',
  baseUrl: 'http://localhost:18563/api'
});

// Execute workflow
const execution = await client.workflows.execute('wf_123', {
  inputData: { query: 'AI trends 2024' }
});

// Stream results
for await (const event of execution.stream()) {
  console.log(event.type, event.data);
}
```

### Python
```python
from fireplexity import FireplexityClient

client = FireplexityClient(
    api_key='sk-your-api-key',
    base_url='http://localhost:18563/api'
)

# List workflows
workflows = client.workflows.list(status='active')

# Create agent
agent = client.agents.create({
    'name': 'Research Assistant',
    'agent_type': 'researcher',
    'config': {
        'model': 'gpt-4o',
        'temperature': 0.7
    }
})
```

### curl Examples
```bash
# List workflows
curl -H "Authorization: Bearer sk-your-api-key" \
     http://localhost:18563/api/workflows

# Execute workflow
curl -X POST \
     -H "Authorization: Bearer sk-your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"inputData": {"query": "AI trends 2024"}}' \
     http://localhost:18563/api/workflows/wf_123/execute

# Create agent
curl -X POST \
     -H "Authorization: Bearer sk-your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"name": "Assistant", "agent_type": "general"}' \
     http://localhost:18563/api/agents
```

---

*This API documentation is automatically updated with each release. For the latest version, visit the development server at `/api/docs`.*