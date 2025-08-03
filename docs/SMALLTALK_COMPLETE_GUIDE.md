# SmallTalk Agent Integration - Complete Guide

## Overview

This guide covers the complete SmallTalk agent orchestration integration with Crawlplexity, enabling seamless switching between search modes, individual agents, and agent groups while maintaining conversation context.

## Architecture

### Core Components
- **SmallTalk Framework**: Agent orchestration with YAML manifests
- **Seamless Mode Switching**: Unified interface for all interaction modes
- **Agent Groups**: Team-based agent collaboration
- **Session Context**: Preserved conversation across mode switches
- **Real-time UI**: Active agents bar and sidebar management

### Integration Points
- **Chat Interface**: ActiveAgentsBar for mode switching
- **Sidebar**: Agent management and configuration
- **API Layer**: Streaming agent chat with orchestration
- **Database**: Extended SQLite with agent tables

## Installation & Setup

### 1. Database Extension
```bash
# Run from project root
sqlite3 data/research_memory.db < scripts/extend-database-for-agents.sql
```

### 2. Directory Structure
```bash
mkdir -p configs/agents configs/teams configs/mcp configs/templates configs/backups
```

### 3. SmallTalk Submodule
```bash
git submodule add https://github.com/gyasis/smalltalk.git smalltalk-integration
cd smalltalk-integration && npm install
```

### 4. Dependencies
```bash
npm install sqlite sqlite3 yaml
```

## Usage Examples

### Example 1: Stock Analysis Workflow

**Scenario**: Analyze a company, research market trends, then execute trades

1. **Start with Search**
   ```
   User: "Tell me about Tesla's recent performance"
   Mode: Regular Search → Gets basic information
   ```

2. **Add Stock Analysis Agents**
   - Click `+` button in ActiveAgentsBar
   - Select "Financial Analyst" and "Market Research" agents
   - Mode automatically switches to "Agents"
   ```
   User: "What are the key financial metrics and risk factors?"
   Mode: Agents → Uses selected financial analysts
   ```

3. **Switch to Deep Research**
   - Click "Deep Research" button in ActiveAgentsBar
   - Context preserved from previous conversation
   ```
   User: "Do a comprehensive analysis of Tesla's competitive position"
   Mode: Deep Research → 4-phase comprehensive analysis
   ```

4. **Add Trading Agent**
   - Click `+` button → Select "Stock Trader" agent
   - Mode switches to "Agents" (now with trading capabilities)
   ```
   User: "Based on this analysis, what's your trading recommendation?"
   Mode: Agents → Trading agent with full conversation context
   ```

### Example 2: Content Creation Team

**Scenario**: Research topic, create content strategy, write and review content

1. **Research Phase**
   ```
   User: "I need to create content about AI in healthcare"
   Mode: Deep Research → Comprehensive market research
   ```

2. **Add Content Team**
   - Click `+` → Select "Content Strategy Team" group
   - Includes: Content Strategist, SEO Specialist, Medical Writer
   ```
   User: "Create a content strategy based on this research"
   Mode: Agent Groups → Team collaboration
   ```

3. **Individual Specialist Work**
   - Remove group, add "SEO Specialist" individually
   ```
   User: "Optimize this content for search engines"
   Mode: Agents → Single specialist focus
   ```

4. **Final Review**
   - Switch back to regular search for fact-checking
   ```
   User: "Verify these medical claims and statistics"
   Mode: Search → Web verification
   ```

### Example 3: Development Workflow

**Scenario**: Debug issue, research solutions, implement fix, test

1. **Problem Analysis**
   ```devs
   User: "My React app has performance issues with large lists"
   Mode: Search → Basic troubleshooting info
   ```

2. **Add Development Team**
   - Add "React Specialist" and "Performance Expert" agents
   ```
   User: "Analyze this code and identify bottlenecks"
   Mode: Agents → Specialized code analysis
   ```

3. **Deep Technical Research**
   - Switch to Deep Research for comprehensive solutions
   ```
   User: "Research all available React virtualization solutions"
   Mode: Deep Research → Comprehensive technical analysis
   ```

4. **Implementation Guidance**
   - Add "Code Reviewer" agent
   ```
   User: "Review this implementation and suggest improvements"
   Mode: Agents → Code review with full context
   ```

## Features

### Seamless Mode Switching
- **Visual Indicators**: Color-coded mode buttons
- **Context Preservation**: Conversation flows between modes
- **Smart Defaults**: Auto-mode switching when adding agents
- **One-Click Switching**: Instant mode changes

### Agent Management
- **Individual Agents**: Single-purpose specialists
- **Agent Groups**: Pre-configured teams
- **Dynamic Selection**: Add/remove during conversation
- **Status Monitoring**: Real-time agent status

### Active Agents Bar
Located at the top of the chat interface:
- **Current Mode Display**: Shows active mode with icon
- **Active Agent Tags**: Visual tags for selected agents/groups
- **Mode Switch Buttons**: Quick toggle between modes
- **Add Dropdown**: Select from available agents/groups

## Configuration

### Agent Manifests
Create YAML files in `configs/agents/`:

```yaml
# configs/agents/financial-analyst.yaml
config:
  name: "Financial Analyst"
  model: "gpt-4o"
  personality: "Professional financial expert with deep market knowledge"
  temperature: 0.3
  maxTokens: 4096
  tools: ["calculator", "web_search", "data_analysis"]

capabilities:
  expertise: ["financial analysis", "market research", "risk assessment"]
  taskTypes: ["analysis", "reporting", "forecasting"]
  complexity: "expert"
  contextAwareness: 0.9

metadata:
  version: "1.0.0"
  author: "Crawlplexity Team"
  description: "Specialized agent for financial analysis and market research"
  tags: ["finance", "analysis", "markets"]
```

### Agent Groups
Create via API or UI:

```javascript
// Example: Create stock analysis team
{
  "name": "Stock Analysis Team",
  "description": "Comprehensive stock analysis and trading support",
  "agents": ["financial-analyst", "market-researcher", "risk-assessor"]
}
```

## API Reference

### Endpoints
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `GET /api/agent-groups` - List agent groups
- `POST /api/agent-groups` - Create agent group
- `POST /api/agents/chat` - Chat with agents (streaming)

### Chat API
```javascript
// Single agent
POST /api/agents/chat
{
  "query": "Analyze Tesla's financials",
  "agentId": "financial-analyst",
  "sessionId": "session-123"
}

// Agent group
POST /api/agents/chat
{
  "query": "Create content strategy for AI healthcare",
  "groupId": "content-team",
  "sessionId": "session-123"
}

// Orchestration (auto-selection)
POST /api/agents/chat
{
  "query": "Help me debug this React performance issue",
  "sessionId": "session-123"
}
```

## Slash Commands

Use slash commands for quick mode switching:

- `/search` - Switch to regular search mode
- `/research [query]` - Start deep research
- `/agents [query]` - Use agent orchestration
- `/agent [agent-id] [query]` - Direct agent communication
- `/group [group-id] [query]` - Use specific agent group

## Best Practices

### Agent Design
1. **Single Responsibility**: Each agent should have a clear, focused role
2. **Complementary Skills**: Design groups with complementary expertise
3. **Context Awareness**: Set appropriate context awareness levels
4. **Temperature Settings**: Lower for analytical tasks, higher for creative

### Workflow Design
1. **Start Broad**: Use search or research for initial context
2. **Add Specialists**: Bring in agents for specific expertise
3. **Maintain Context**: Let conversation flow between modes
4. **Iterate**: Switch modes as needed throughout the workflow

### Performance
1. **Agent Limits**: Don't activate too many agents simultaneously
2. **Context Management**: Be mindful of token limits in long conversations
3. **Status Monitoring**: Check agent status before critical tasks
4. **Graceful Degradation**: Have fallbacks for agent failures

## Troubleshooting

### Common Issues

**Agents not appearing in dropdown**
- Check agent status in sidebar
- Verify agent manifest syntax
- Restart agent service if needed

**Mode switching not working**
- Clear browser cache
- Check console for JavaScript errors
- Verify API connectivity

**Context lost between modes**
- Ensure session ID consistency
- Check for memory limits
- Monitor token usage

**Agent group failures**
- Verify all group members are active
- Check individual agent health
- Review group configuration

### Debug Commands
```bash
# Check database structure
sqlite3 data/research_memory.db ".schema"

# Test agent service
curl http://localhost:3000/api/agents

# Check SmallTalk installation
cd smalltalk-integration && npm test
```

## Advanced Usage

### Custom Agent Teams
Create specialized teams for recurring workflows:

```yaml
# Stock Trading Team
- Financial Analyst (market analysis)
- Risk Assessor (risk evaluation) 
- Technical Analyst (chart analysis)
- Portfolio Manager (position sizing)
- Trade Executor (order management)
```

### Multi-Phase Workflows
Design complex workflows spanning multiple modes:

1. **Research Phase**: Deep Research + Web Search
2. **Analysis Phase**: Specialist Agents
3. **Strategy Phase**: Agent Groups
4. **Execution Phase**: Individual Agents
5. **Review Phase**: Different Agent Groups

### Integration Patterns
- **Handoff Patterns**: Smooth transitions between agents
- **Collaboration Patterns**: Multiple agents working together  
- **Validation Patterns**: Cross-checking with different modes
- **Escalation Patterns**: Moving from simple to complex modes

## Future Enhancements

### Planned Features
- **Agent Learning**: Agents that improve from interactions
- **Workflow Templates**: Pre-built multi-step workflows
- **Advanced Orchestration**: More sophisticated agent coordination
- **Performance Analytics**: Detailed agent performance metrics
- **Custom Integrations**: Third-party tool integrations

### Roadmap
- **Phase 1**: Basic agent integration ✅
- **Phase 2**: Seamless mode switching ✅
- **Phase 3**: Advanced orchestration (in progress)
- **Phase 4**: Learning and adaptation (planned)
- **Phase 5**: Enterprise features (planned)

---

*For additional support or questions, refer to the main Crawlplexity documentation or create an issue in the repository.*