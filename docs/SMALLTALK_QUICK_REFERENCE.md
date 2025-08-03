# SmallTalk Integration - Quick Reference

## 🚀 Quick Start

1. **Enable agents** in sidebar → Create your first agent
2. **Start chatting** → Add agents via `+` button in chat
3. **Switch modes** seamlessly during conversation
4. **Create agent groups** for team workflows

## 🎯 Mode Switching Buttons

| Button | Mode | Use Case |
|--------|------|----------|
| 🔍 Search | Regular web search | Basic information gathering |
| 🔬 Deep Research | 4-phase analysis | Comprehensive research |
| 🤖 Agents | Individual specialists | Focused expertise |
| 👥 Groups | Agent teams | Collaborative workflows |

## ⚡ Slash Commands

```bash
/search                    # Switch to search mode
/research [query]         # Start deep research  
/agents [query]           # Use agent orchestration
/agent [id] [query]       # Direct agent chat
/group [id] [query]       # Use agent group
```

## 📋 Common Workflows

### Financial Analysis
```
1. Search: "Tesla stock performance" 
2. + Add "Financial Analyst" agent
3. Deep Research: comprehensive analysis
4. + Add "Trading Agent" for recommendations
```

### Content Creation  
```
1. Deep Research: topic research
2. + Add "Content Team" group
3. Switch to individual "SEO Specialist"
4. Search: fact verification
```

### Development Help
```
1. Search: basic troubleshooting
2. + Add "React Specialist" 
3. Deep Research: comprehensive solutions
4. + Add "Code Reviewer"
```

## 🔧 Agent Configuration

### Minimal Agent YAML
```yaml
config:
  name: "My Agent"
  model: "gpt-4o"
  personality: "Helpful specialist"
  
capabilities:
  expertise: ["my-domain"]
  complexity: "intermediate"
  
metadata:
  description: "What this agent does"
```

### Create Agent Group (API)
```javascript
POST /api/agent-groups
{
  "name": "My Team",
  "agents": ["agent1", "agent2"]
}
```

## 🎨 UI Elements

### ActiveAgentsBar (Top of Chat)
- **Current Mode**: Color-coded button
- **Active Agents**: Blue tags with X to remove
- **Active Groups**: Green tags with member count
- **+ Button**: Add more agents/groups
- **Mode Buttons**: Quick switching

### Sidebar Agent Management
- **Agent List**: Status indicators
- **New Agent**: Create/edit modal
- **Groups**: Team management

## 🐛 Quick Debugging

```bash
# Check agents
curl localhost:3000/api/agents

# Check groups  
curl localhost:3000/api/agent-groups

# Database check
sqlite3 data/research_memory.db ".tables"
```

## 💡 Pro Tips

1. **Context Flows**: Conversation history maintained across all mode switches
2. **Smart Defaults**: Adding agents auto-switches to agent mode  
3. **Multiple Agents**: Use orchestration for complex tasks
4. **Fallback**: System gracefully falls back to search if agents fail
5. **Session Aware**: All modes share the same conversation session

---

*Full documentation: [SMALLTALK_COMPLETE_GUIDE.md](./SMALLTALK_COMPLETE_GUIDE.md)*