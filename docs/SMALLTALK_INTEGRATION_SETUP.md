# SmallTalk Integration Setup Guide

This document tracks all setup steps required to integrate SmallTalk agent orchestration with Crawlplexity.

## Architecture Overview

- **SmallTalk Framework**: Agent orchestration with YAML manifests
- **Crawlplexity SQLite**: Extended `research_memory.db` with agent tables
- **Python Service Layer**: FastAPI service bridging SmallTalk and Next.js
- **Next.js UI**: Enhanced sidebar and agent management interface

## Setup Steps

### 1. Database Setup

#### Extend existing SQLite database with agent tables:
```bash
# Run from project root
sqlite3 data/research_memory.db < scripts/extend-database-for-agents.sql
```

#### Verify tables created:
```bash
sqlite3 data/research_memory.db ".tables"
# Should show: agents, agent_runs, agent_logs, agent_teams, agent_team_members, mcp_servers, agent_mcp_servers
```

### 2. Directory Structure

#### Create configuration directories:
```bash
mkdir -p configs/agents configs/teams configs/mcp configs/templates configs/backups
```

#### Directory purposes:
- `configs/agents/`: YAML agent manifest files
- `configs/teams/`: Team orchestration configurations
- `configs/mcp/`: MCP server configurations
- `configs/templates/`: Agent template files
- `configs/backups/`: Configuration backups

### 3. SmallTalk Submodule Setup

#### Add SmallTalk as git submodule:
```bash
git submodule add https://github.com/gyasis/smalltalk.git smalltalk-integration
```

#### Install SmallTalk dependencies:
```bash
cd smalltalk-integration
npm install
```

### 4. Next.js Service Layer

#### Install additional Node.js dependencies:
```bash
npm install sqlite sqlite3 yaml
```

#### Create service layer files:
- `lib/agent-service.ts` - Core SmallTalk integration service
- `lib/python-agent-client.ts` - Python service client (optional)
- `app/api/agents/` - Next.js API routes for agent management

### 5. Python Service Layer (Optional)

#### Install Python dependencies:
```bash
pip install -r python/requirements-agents.txt
```

#### Python service files:
- `python/services/agent_service.py` - Optional Python processing service
- `python/requirements-agents.txt` - Python dependencies

### 6. Environment Configuration

#### Environment variables needed:
```bash
# Add to .env.local
PYTHON_AGENT_SERVICE_URL=http://localhost:8001  # Optional Python service
SMALLTALK_CONFIG_PATH=./configs
DATABASE_PATH=./data/research_memory.db
```

## File Structure After Setup

```
fireplexity/
├── configs/
│   ├── agents/           # Agent YAML manifests
│   ├── teams/           # Team configurations
│   ├── mcp/             # MCP server configs
│   └── templates/       # Agent templates
├── data/
│   └── research_memory.db  # Extended with agent tables
├── docs/
│   └── SMALLTALK_INTEGRATION_SETUP.md  # This file
├── python/
│   ├── services/        # Python service layer
│   ├── api/            # FastAPI routes
│   └── main.py         # Service entry point
├── scripts/
│   ├── extend-database-for-agents.sql
│   └── install-smalltalk-integration.sh  # Full install script
├── smalltalk-integration/  # Git submodule
└── components/
    └── sidebar/        # Enhanced with agent management
```

## Installation Script

A complete installation script will be created at `scripts/install-smalltalk-integration.sh` that:

1. Checks prerequisites
2. Sets up directories
3. Extends database
4. Installs dependencies
5. Creates example configurations
6. Starts services
7. Verifies installation

## Service Startup

### Development Mode:
```bash
# Terminal 1: Start Python service layer
cd python && python main.py

# Terminal 2: Start Next.js development server
npm run dev
```

### Production Mode:
```bash
# Start services with PM2 or Docker
./scripts/start-production.sh
```

## Verification Steps

1. Check database tables exist
2. Verify SmallTalk submodule loaded
3. Test Python service API endpoints
4. Confirm Next.js can reach Python service
5. Load example agent configurations
6. Test agent creation via UI
7. Verify orchestration functionality

## Troubleshooting

### Common Issues:
- Database permission errors
- Python service port conflicts
- SmallTalk dependency issues
- MCP server connection failures

### Debug Commands:
```bash
# Check database structure
sqlite3 data/research_memory.db ".schema"

# Test Python service
curl http://localhost:8001/health

# Check SmallTalk installation
cd smalltalk-integration && npm test
```

## Next Steps

- [ ] Complete database setup
- [ ] Create example agent manifests
- [ ] Implement Python service layer
- [ ] Create Next.js API integration
- [ ] Build enhanced UI components
- [ ] Create comprehensive installation script
- [ ] Add integration tests
- [ ] Create production deployment guide

---

**Note**: This document will be continuously updated as implementation progresses. All setup steps should be tested and verified before finalizing the installation script.