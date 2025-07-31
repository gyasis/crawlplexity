# Deep Research Engine - Documentation & Testing Guide

## 🚀 Overview

The Deep Research Engine is a sophisticated AI-powered research system that conducts comprehensive multi-phase research with a human-like temporal memory system. It automatically manages research data across different storage tiers based on access patterns.

## 🏗️ Architecture

### Memory Tiers (Human-Like Memory System)
```
Active (Redis) → Hot (1-3 days) → Warm (3-7 days) → Cold (1 month) → Trash
```

- **Active**: Currently running research sessions (Redis)
- **Hot**: Recently completed/accessed sessions (SQLite)
- **Warm**: Moderately accessed sessions
- **Cold**: Rarely accessed sessions
- **Trash**: Scheduled for deletion

**Key Feature**: When you access old research, it automatically moves back to the "Hot" tier!

### 4-Phase Research Methodology
1. **Foundation**: Broad overview, academic sources, background
2. **Perspective**: Multiple viewpoints, pro/con arguments, expert opinions
3. **Trend**: Recent developments, future predictions, market dynamics
4. **Synthesis**: Comprehensive analysis with recommendations

## 📡 API Endpoints

### 1. Start Research Session

**POST** `/api/deep-research/start`

```bash
# Basic research request
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Impact of AI on healthcare diagnostics",
    "research_type": "comprehensive",
    "max_sources_per_phase": 10,
    "include_citations": true
  }'

# Streaming real-time updates (SSE)
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "query": "Latest quantum computing breakthroughs in cryptography"
  }'
```

**Request Body**:
```json
{
  "query": "Your research question",
  "research_type": "comprehensive", // Options: comprehensive, foundation, perspective, trend, synthesis
  "max_sources_per_phase": 10,      // Default: 10
  "include_citations": true,         // Default: true
  "user_id": "optional_user_id"      // Default: "anonymous"
}
```

**Response (Immediate)**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "estimated_completion_time": 300, // seconds
  "research_type": "comprehensive"
}
```

**Response (Streaming)**:
```
event: session_started
data: {"type":"session_started","session_id":"...","data":{...},"timestamp":"..."}

event: phase_started
data: {"type":"phase_started","phase":"foundation","data":{...}}

event: query_generation_completed
data: {"type":"query_generation_completed","data":{"queries":["...","..."]}}

event: content_extracted
data: {"type":"content_extracted","data":{"url":"...","title":"..."}}

event: phase_completed
data: {"type":"phase_completed","phase":"foundation","data":{...}}

event: session_completed
data: {"type":"session_completed","data":{"session_id":"..."}}
```

### 2. Get Research Progress

**GET** `/api/deep-research/{sessionId}`

```bash
curl http://localhost:18563/api/deep-research/550e8400-e29b-41d4-a716-446655440000
```

**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "progress": {
    "current_phase": "perspective",
    "phase_progress": 50,
    "total_progress": 37.5,
    "current_activity": "Processing perspective phase...",
    "estimated_time_remaining": 180,
    "phases_completed": ["foundation"],
    "errors": [],
    "warnings": []
  }
}
```

### 3. Get Research Results

**GET** `/api/deep-research/{sessionId}/results`

```bash
# Full results
curl http://localhost:18563/api/deep-research/550e8400-e29b-41d4-a716-446655440000/results

# Summary only
curl "http://localhost:18563/api/deep-research/{sessionId}/results?format=summary"

# With content included
curl "http://localhost:18563/api/deep-research/{sessionId}/results?include_content=true"

# Citations only
curl "http://localhost:18563/api/deep-research/{sessionId}/results?format=citations_only"
```

**Query Parameters**:
- `format`: `full` (default), `summary`, `citations_only`
- `include_content`: `true/false` - Include full content (default: false)
- `include_citations`: `true/false` - Include citations (default: true)
- `limit`: Max results to return (default: 50, max: 100)

**Response**:
```json
{
  "session_id": "...",
  "query": "Impact of AI on healthcare diagnostics",
  "status": "completed",
  "analysis": {
    "executive_summary": "Comprehensive research findings...",
    "detailed_analysis": [
      {
        "title": "Background & Context",
        "content": "...",
        "key_points": ["..."],
        "sources": ["..."]
      }
    ],
    "key_findings": ["Finding 1", "Finding 2"],
    "recommendations": [
      {
        "title": "Recommendation 1",
        "description": "...",
        "priority": "high",
        "implementation_notes": "...",
        "stakeholders": ["..."]
      }
    ],
    "future_directions": ["..."],
    "methodology": "4-phase research methodology...",
    "limitations": ["..."],
    "confidence_level": 0.85,
    "total_sources": 42,
    "research_duration": 285000,
    "phases_completed": ["foundation", "perspective", "trend", "synthesis"]
  },
  "sources": [...],
  "citations": [...],
  "metadata": {
    "total_sources": 42,
    "research_duration": 285000,
    "phases_completed": ["foundation", "perspective", "trend", "synthesis"],
    "model_used": "gpt-4",
    "unique_domains": 28,
    "avg_relevance_score": 0.82,
    "tier_accessed": "hot",
    "last_accessed": "2024-01-15T10:30:00Z",
    "access_count": 3
  }
}
```

### 4. List Research Sessions

**GET** `/api/deep-research/sessions`

```bash
# List all sessions
curl http://localhost:18563/api/deep-research/sessions

# Filter by status
curl "http://localhost:18563/api/deep-research/sessions?status=completed"

# Search within queries
curl "http://localhost:18563/api/deep-research/sessions?query=healthcare"

# Pagination and sorting
curl "http://localhost:18563/api/deep-research/sessions?page=2&limit=10&sort_by=created_at&sort_order=desc"

# Include executive summaries
curl "http://localhost:18563/api/deep-research/sessions?include_summary=true"
```

**Query Parameters**:
- `user_id`: Filter by user (default: "anonymous")
- `status`: `completed`, `in_progress`, `failed`, `pending`
- `query`: Search within research queries
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 50)
- `sort_by`: `last_accessed` (default), `created_at`, `query`
- `sort_order`: `desc` (default), `asc`
- `include_summary`: Include executive summaries

## 🧪 Testing Guide

### 1. Basic Health Check

```bash
# Check if the Deep Research Engine is healthy
curl http://localhost:18563/api/deep-research/start
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Deep Research Engine",
  "memory_stats": {
    "redis": {"active_sessions": 0},
    "hot": {"count": 0},
    "warm": {"count": 0},
    "cold": {"count": 0},
    "trash": {"count": 0}
  },
  "timestamp": "..."
}
```

### 2. Test Research Flow

#### Step 1: Start a simple research session
```bash
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Benefits of green tea for health",
    "research_type": "foundation",
    "max_sources_per_phase": 5
  }'
```

Save the `session_id` from the response.

#### Step 2: Monitor progress
```bash
# Replace {session_id} with actual ID
curl http://localhost:18563/api/deep-research/{session_id}
```

#### Step 3: Get results (once completed)
```bash
curl http://localhost:18563/api/deep-research/{session_id}/results
```

### 3. Test Streaming Updates

```bash
# This will show real-time progress
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "query": "Future of renewable energy in 2025"
  }' --no-buffer
```

### 4. Test Memory Tiers

```bash
# 1. Create a research session
# 2. Wait for completion
# 3. Access it multiple times to see access_count increase
curl http://localhost:18563/api/deep-research/{session_id}/results

# 4. List sessions to see tier information
curl "http://localhost:18563/api/deep-research/sessions?include_summary=true"
```

## 🐛 Common Issues & Debugging

### 1. SQLite Database Not Found
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**Fix**: Create the data directory
```bash
mkdir -p ./data
```

### 2. Redis Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Fix**: Ensure Redis is running
```bash
# Check if Redis is in your docker-compose
docker-compose ps

# Or check Redis directly
redis-cli ping
```

### 3. Utils Feature Not Available
```
Error: Cannot read properties of undefined (reading 'optimizeResearchQueries')
```

**Fix**: Ensure the PyBridge Python service is running
```bash
# Check Python utils status
curl http://localhost:18563/api/utils/health
```

### 4. LiteLLM Service Not Available
```
Error: Failed to generate response from LLM
```

**Fix**: Check LiteLLM service
```bash
# Check if LiteLLM is running on port 14782
curl http://localhost:14782/health
```

### 5. Slow Research Sessions

If research is taking too long:
1. Reduce `max_sources_per_phase` (try 3-5 for testing)
2. Use specific research types instead of "comprehensive"
3. Check if external services (Serper, Crawl4AI) are responding

## 🎯 Quick Test Scenarios

### Scenario 1: Quick Foundation Research
```bash
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is blockchain technology",
    "research_type": "foundation",
    "max_sources_per_phase": 3
  }'
```

### Scenario 2: Trending Topics Research
```bash
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Latest AI developments January 2025",
    "research_type": "trend",
    "max_sources_per_phase": 5
  }'
```

### Scenario 3: Comprehensive Analysis
```bash
curl -X POST http://localhost:18563/api/deep-research/start \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "query": "Impact of remote work on productivity",
    "research_type": "comprehensive",
    "max_sources_per_phase": 8
  }' --no-buffer
```

## 📊 Monitoring & Maintenance

### Check Memory Statistics
```bash
curl http://localhost:18563/api/deep-research/start
```

### View Temporal Memory Distribution
```bash
curl "http://localhost:18563/api/deep-research/sessions?limit=50" | jq '.memory_stats'
```

### Manual Cleanup (if needed)
The system automatically cleans up old data, but you can check the cleanup process in the logs.

## 🔧 Configuration

The temporal memory tiers are configured in the API endpoints:
- **Hot tier**: 3 days
- **Warm tier**: 7 days  
- **Cold tier**: 30 days
- **Trash**: 7 days before permanent deletion
- **Cleanup interval**: Every 6 hours

## Need Help?

1. Check the console logs for detailed error messages
2. Verify all services are running (Redis, SQLite, LiteLLM, Utils)
3. Start with simple queries and small `max_sources_per_phase` values
4. Use the streaming endpoint to see real-time progress

Ready to test? Start your server with `npm run dev` and try the health check first!