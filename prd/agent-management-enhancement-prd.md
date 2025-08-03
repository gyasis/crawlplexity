# Agent Management Enhancement PRD
## Product Requirements Document

### Executive Summary
This PRD outlines enhancements to the Fireplexity agent management system to address usability issues for both technical and non-technical users. The current implementation shows individual agents but lacks clear team management, auto-selection capabilities, and orchestration configuration options.

### Current State Analysis
Based on recent commits and codebase review:
- **Recent Focus**: SmallTalk integration with seamless mode switching
- **Current UI**: Collapsible sidebar with individual agent management
- **Agent Display**: Shows 4 agents with status indicators (idle/running/stopped/error)
- **Missing Features**: Team setups, auto-selection, orchestration configuration

### Problem Statement
The current agent management interface has several usability gaps:

1. **Unclear Agent Activation**: No clear indication of which agents are active vs. available
2. **No Team/Group Management**: Users must manually select individual agents instead of using predefined teams
3. **Missing Auto-Selection**: No way to automatically select appropriate agents for specific tasks
4. **Limited Orchestration Control**: Manual mode lacks configuration options for custom orchestration
5. **Complex for Non-Coders**: Current interface requires technical knowledge to manage agents effectively

### User Stories

#### Primary User Stories
1. **As a non-technical user**, I want to select from predefined agent teams so I can quickly get started without understanding individual agent configurations.

2. **As a technical user**, I want to create and save custom agent teams so I can reuse complex agent combinations for different workflows.

3. **As any user**, I want clear visual indicators showing which agents are active vs. available so I can understand the current system state.

4. **As a user**, I want auto-selection of appropriate agents based on my task so I don't have to manually choose agents for common scenarios.

5. **As a technical user**, I want to configure custom orchestration patterns for my teams so I can define how agents work together.

#### Secondary User Stories
6. **As a user**, I want to see agent team performance metrics so I can optimize my workflows.

7. **As a user**, I want to share agent teams with other users so we can collaborate effectively.

8. **As a user**, I want to import/export agent team configurations so I can backup and restore my setups.

### Solution Overview

#### 0. Interface Architecture Decision

**Agreed Architecture: Hybrid Sidebar + Full Editor Approach**

After comprehensive analysis and consultation, we've decided on a **three-state interface architecture**:

**State 1: Collapsed Agent Panel (Current)**
- Width: ~300px (existing sidebar width)
- Shows individual agents with status indicators
- "Create Workflow" button for quick access
- **Live workflow status indicators** with hover tooltips
- Visual cues: Green (running), Yellow (warnings), Red (failed), Gray (idle)

**State 2: Workflow Quick Builder (Expanded Sidebar)**
- Width: 400px (smooth animated expansion)
- **Node limit: 3-5 nodes maximum**
- Simplified drag-and-drop canvas with pre-defined templates
- Basic configuration panels for each node
- **"Edit in Full Editor" button** for complex workflows
- **Auto-save functionality** every 30 seconds
- Templates: "Notify → Research → Respond", "Filter → Process → Output"

**State 3: Full Workflow Editor (Separate Page)**
- Complete n8n-style interface with unlimited nodes
- Advanced features: conditional logic, loops, error handling
- **Seamless transition** from Quick Builder with preserved work
- Comprehensive debugging and analytics tools
- Advanced configuration options and custom node types

**Transition Flow:**
```
Collapsed Sidebar → [Create Workflow] → Quick Builder (400px)
Quick Builder → [Edit in Full Editor] → Full Editor Page
Quick Builder → [Collapse] → Collapsed Sidebar (status preserved)
```

**Technical Implementation:**
- **CSS Transitions**: Smooth 300ms animation for sidebar expansion
- **State Management**: React Context for workflow state preservation
- **Auto-save**: Background saving every 30s with visual confirmation
- **URL Parameters**: Seamless data transfer between Quick Builder and Full Editor
- **Responsive Design**: Graceful degradation on smaller screens (1366px+ optimized)

#### 1. Enhanced Agent Management Interface

**Current State**: Individual agent cards with status indicators
**Proposed Enhancement**: 
- Add "Teams" section alongside "Agents" section
- Implement collapsible team cards with member agents
- Add visual indicators for active vs. available agents
- Include team performance metrics

**UI Components**:
```typescript
interface AgentTeam {
  team_id: string
  name: string
  description: string
  agents: Agent[]
  orchestration_config: OrchestrationConfig
  is_active: boolean
  performance_metrics: TeamMetrics
  created_by: string
  is_shared: boolean
}
```

#### 2. Prebuilt Agent Teams

**Implementation**:
- Create predefined teams for common use cases:
  - **Research Team**: Research Assistant + Coding Assistant
  - **Development Team**: Coding Assistant + Conversation Manager
  - **Analysis Team**: Research Assistant + Data Analyst
  - **Full Stack**: All available agents

**Auto-Selection Logic**:
```typescript
interface AutoSelectionRule {
  trigger: string // e.g., "research", "coding", "analysis"
  team_id: string
  confidence_score: number
  fallback_agents: string[]
}
```

#### 3. No-Code Visual Pipeline Builder

**Visual Workflow Designer**:
- Drag-and-drop canvas interface inspired by n8n/Zapier patterns
- Node-based agent orchestration with visual connections
- Real-time workflow execution visualization
- Dual-mode interface: Visual builder + YAML code view

**Core Features**:
- **Canvas-Based Editor**: Grid background with zoom controls and pan functionality
- **Agent Node Library**: Sidebar with draggable agent types and configuration presets
- **Visual Connection System**: Drag connections between agents with validation
- **Configuration Panels**: Context-sensitive parameter editing for each agent node
- **Template System**: Pre-built workflow templates for common use cases
- **Export/Import**: JSON/YAML workflow definitions with version control

**Node Types**:
```typescript
interface AgentNode {
  id: string
  type: 'trigger' | 'agent' | 'condition' | 'merger' | 'output'
  position: { x: number, y: number }
  data: {
    agentId?: string
    parameters: Record<string, any>
    conditions?: ConditionalLogic[]
    retryConfig?: RetryConfiguration
  }
  connections: {
    input: string[]
    output: string[]
  }
}
```

**Advanced Orchestration Patterns**:
- **Sequential Flows**: Linear agent handoffs with data passing
- **Parallel Execution**: Multiple agents working simultaneously  
- **Conditional Branching**: If/Then/Else logic with visual paths
- **Loop Patterns**: Recursive agent execution with exit conditions
- **Error Handling**: Try/Catch blocks with fallback agent paths
- **Merge Points**: Combine results from multiple parallel agents

**Configuration Interface**:
```yaml
workflow:
  name: "Content Creation Pipeline"
  version: "1.0"
  
nodes:
  - id: "trigger_1"
    type: "trigger"
    config:
      event: "user_query"
      filters: ["content_request"]
      
  - id: "research_agent"
    type: "agent"
    config:
      agent_id: "research_assistant"
      parameters:
        max_depth: 3
        include_sources: true
      retry:
        max_attempts: 3
        backoff_strategy: "exponential"
        
  - id: "content_agent"
    type: "agent"
    config:
      agent_id: "content_creator"
      depends_on: ["research_agent"]
      parameters:
        tone: "professional"
        length: "long_form"
        
  - id: "review_condition"
    type: "condition"
    config:
      expression: "content_length > 1000"
      true_path: ["quality_reviewer"]
      false_path: ["output_formatter"]

connections:
  - from: "trigger_1"
    to: "research_agent"
    data_mapping:
      query: "$.user_input"
      
  - from: "research_agent"  
    to: "content_agent"
    data_mapping:
      research_data: "$.output.research_results"
      sources: "$.output.citations"
```

#### 4. Visual State Indicators

**Enhanced Status Display**:
- Clear "Active Agents" vs "Available Agents" sections
- Team status indicators with member agent statuses
- Performance metrics and health indicators
- Real-time activity feeds

### Technical Implementation

#### Frontend Changes

1. **Enhanced Sidebar Component** (`components/sidebar/Sidebar.tsx`)
   - Add Teams section alongside Agents section
   - Implement collapsible team management
   - Add quick access to workflow builder

2. **New Team Management Component** (`components/sidebar/TeamManagement.tsx`)
   - Team creation and editing interface
   - Member agent selection and configuration
   - Performance metrics display
   - Template gallery access

3. **Hybrid Workflow Interface** (`components/workflow/`)
   - `WorkflowQuickBuilder.tsx` - Expandable sidebar workflow builder (400px, 3-5 nodes)
   - `WorkflowFullEditor.tsx` - Complete separate page editor with React Flow
   - `WorkflowStatusIndicators.tsx` - Live status display in collapsed sidebar
   - `WorkflowTransition.tsx` - Seamless state management between modes
   - `NodeLibrary.tsx` - Draggable agent and logic nodes (both modes)
   - `ConfigurationPanel.tsx` - Context-sensitive node configuration
   - `TemplateGallery.tsx` - Pre-built workflow templates for Quick Builder
   - `CodeEditor.tsx` - YAML/JSON code view (Full Editor only)

4. **Node Type Components** (`components/workflow/nodes/`)
   - `AgentNode.tsx` - Individual agent execution nodes
   - `TriggerNode.tsx` - Workflow initiation nodes
   - `ConditionNode.tsx` - Conditional logic and branching
   - `MergerNode.tsx` - Result combination nodes
   - `OutputNode.tsx` - Final result formatting nodes

5. **Canvas Controls** (`components/workflow/controls/`)
   - `CanvasToolbar.tsx` - Zoom, pan, layout controls
   - `ExecutionControls.tsx` - Play, pause, stop, debug controls
   - `ValidationPanel.tsx` - Real-time workflow validation
   - `ExportImport.tsx` - Workflow save/load functionality

#### Backend Changes

1. **New API Endpoints**:
   ```
   # Team Management
   GET    /api/teams              # List all teams
   POST   /api/teams              # Create new team
   PUT    /api/teams/:teamId      # Update team
   DELETE /api/teams/:teamId      # Delete team
   POST   /api/teams/:teamId/activate    # Activate team
   POST   /api/teams/:teamId/deactivate  # Deactivate team
   
   # Workflow Management
   GET    /api/workflows          # List workflows
   POST   /api/workflows          # Create workflow
   PUT    /api/workflows/:id      # Update workflow
   DELETE /api/workflows/:id      # Delete workflow
   POST   /api/workflows/:id/execute     # Execute workflow
   GET    /api/workflows/:id/status      # Get execution status
   POST   /api/workflows/:id/stop        # Stop execution
   
   # Template Management
   GET    /api/templates          # List workflow templates
   POST   /api/templates          # Create template
   PUT    /api/templates/:id      # Update template
   DELETE /api/templates/:id      # Delete template
   POST   /api/templates/:id/instantiate # Create workflow from template
   
   # Validation & Export
   POST   /api/workflows/validate # Validate workflow definition
   GET    /api/workflows/:id/export      # Export workflow as JSON/YAML
   POST   /api/workflows/import   # Import workflow from file
   ```

2. **Database Schema Updates**:
   ```sql
   -- Enhanced Teams Table  
   CREATE TABLE agent_teams (
     team_id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     orchestration_config TEXT,
     created_by TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     is_shared BOOLEAN DEFAULT FALSE,
     is_template BOOLEAN DEFAULT FALSE,
     category TEXT DEFAULT 'custom',
     performance_metrics TEXT DEFAULT '{}'
   );

   CREATE TABLE team_members (
     team_id TEXT,
     agent_id TEXT,
     parameters TEXT,
     order_index INTEGER,
     FOREIGN KEY (team_id) REFERENCES agent_teams(team_id),
     FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
   );
   
   -- Visual Workflow Tables
   CREATE TABLE workflows (
     workflow_id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     definition TEXT NOT NULL,        -- JSON workflow definition
     visual_layout TEXT,              -- Node positions and connections
     created_by TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     is_template BOOLEAN DEFAULT FALSE,
     category TEXT DEFAULT 'custom',
     version TEXT DEFAULT '1.0.0',
     status TEXT DEFAULT 'draft'      -- draft, active, archived
   );
   
   CREATE TABLE workflow_executions (
     execution_id TEXT PRIMARY KEY,
     workflow_id TEXT,
     status TEXT DEFAULT 'pending',   -- pending, running, completed, failed
     input_data TEXT,
     output_data TEXT,
     execution_log TEXT,              -- Detailed execution steps
     started_at DATETIME,
     completed_at DATETIME,
     error_message TEXT,
     FOREIGN KEY (workflow_id) REFERENCES workflows(workflow_id)
   );
   
   CREATE TABLE workflow_templates (
     template_id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     category TEXT NOT NULL,          -- development, research, content, analysis
     definition TEXT NOT NULL,
     visual_layout TEXT,
     preview_image TEXT,              -- Base64 or file path for template preview
     tags TEXT DEFAULT '[]',          -- JSON array of tags
     usage_count INTEGER DEFAULT 0,
     rating REAL DEFAULT 0.0,
     created_by TEXT,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
     is_public BOOLEAN DEFAULT FALSE
   );
   ```

#### Integration with SmallTalk

**Seamless Mode Integration**:
- Extend current mode switching to include team-based modes
- Integrate team orchestration with SmallTalk session management
- Support team-based context sharing and handoffs

#### Detailed UX Architecture Specifications

**State Transition Specifications:**

1. **Collapsed → Quick Builder Transition**
   - Sidebar expands from ~300px to 400px over 300ms CSS transition
   - Main content area shrinks gracefully with responsive adjustments
   - "Create Workflow" button morphs into canvas initialization
   - Template selection appears with 3-4 pre-built workflow options

2. **Quick Builder → Full Editor Transition**
   - "Edit in Full Editor" button triggers auto-save of current work
   - Workflow data serialized to session storage or URL parameters
   - New browser tab/page opens with Full Editor pre-loaded with work
   - Visual confirmation message: "Workflow transferred to Full Editor"

3. **Status Indicator Specifications**
   - **Collapsed Sidebar Status Display:**
     - 16px colored circles next to agent names
     - Tooltip on hover: "Workflow: Content Pipeline | Status: Running | Last execution: 2 minutes ago"
     - Click status indicator → Quick Builder with relevant workflow
   
**Template Specifications for Quick Builder:**
- **"Research & Respond"**: Trigger → Research Agent → Content Agent (3 nodes)
- **"Filter & Process"**: Trigger → Condition Node → Processing Agent (3 nodes)  
- **"Alert & Escalate"**: Trigger → Alert Agent → Escalation Condition → Manager Agent (4 nodes)
- **"Data Pipeline"**: Trigger → Data Agent → Transform Node → Output Agent (4 nodes)

**Performance Requirements:**
- Sidebar expansion: <300ms animation duration
- Quick Builder canvas initialization: <500ms from button click
- Auto-save operation: <200ms background save
- Status indicator updates: <1000ms refresh interval
- Full Editor transition: <2000ms total time including data transfer

### Success Metrics

#### User Experience Metrics
- **Time to First Agent Setup**: Reduce from current manual setup to <30 seconds with teams
- **Agent Utilization Rate**: Increase from individual agent usage to 80% team-based usage
- **User Error Rate**: Reduce configuration errors by 70% through auto-selection

#### Technical Metrics
- **API Response Time**: Maintain <200ms for team operations
- **System Reliability**: 99.9% uptime for team management features
- **Performance**: Support up to 50 concurrent team activations

### Implementation Phases

#### Phase 1: Foundation (Week 1-2)
- [ ] Database schema updates with workflow tables
- [ ] Basic team management API endpoints
- [ ] Enhanced sidebar with Teams section
- [ ] Prebuilt team definitions
- [ ] React Flow integration setup
- [ ] Basic canvas component structure

#### Phase 2: Visual Builder Core (Week 3-4)
- [ ] Drag-and-drop workflow canvas
- [ ] Agent node library and node types
- [ ] Basic connection system with validation
- [ ] Configuration panels for nodes
- [ ] Simple workflow execution engine
- [ ] JSON/YAML export functionality

#### Phase 3: Advanced Workflow Features (Week 5-6)
- [ ] Conditional logic and branching nodes
- [ ] Loop and merger node types
- [ ] Error handling and retry mechanisms
- [ ] Real-time execution visualization
- [ ] Template system with gallery
- [ ] Advanced configuration options

#### Phase 4: Production Features (Week 7-8)
- [ ] Performance optimization for large workflows
- [ ] Team collaboration and sharing
- [ ] Import/export with version control
- [ ] Advanced debugging and monitoring
- [ ] SmallTalk integration testing
- [ ] User acceptance testing

#### Phase 5: Polish & Enhancement (Week 9-10)
- [ ] Advanced template marketplace
- [ ] Workflow analytics and metrics
- [ ] Auto-layout and workflow suggestions
- [ ] Mobile-responsive workflow viewer
- [ ] Comprehensive documentation
- [ ] Video tutorials and onboarding

### Risk Assessment

#### Technical Risks
- **Visual Builder Complexity**: Canvas-based interface may be overwhelming for non-technical users
- **Performance Impact**: Large workflows with many nodes could impact browser performance
- **React Flow Learning Curve**: Team may need time to master canvas library
- **Workflow Execution Scalability**: Multiple concurrent workflows could strain system resources
- **Integration Complexity**: SmallTalk integration with visual workflows requires careful architecture

#### Mitigation Strategies
- **Progressive Disclosure**: Start with simple templates, reveal advanced features gradually
- **Performance Optimization**: Implement virtualization for large workflows, lazy loading for nodes
- **Comprehensive Training**: React Flow workshops and documentation for development team
- **Resource Management**: Implement workflow queuing and resource limits
- **Incremental Integration**: Build visual layer on top of existing SmallTalk API, maintain backward compatibility
- **User Testing**: Regular UX testing with both technical and non-technical users

### Dependencies

#### External Dependencies
- **React Flow**: Canvas-based workflow builder library (v11+)
- **Monaco Editor**: Code editor for YAML/JSON configuration
- **YAML Parser**: js-yaml for robust YAML parsing and validation
- **D3.js**: Advanced visualizations for workflow analytics
- **WebSocket/SSE**: Real-time workflow execution updates
- **SmallTalk API**: Stable integration for agent orchestration

#### Internal Dependencies
- **Current Agent System**: Must maintain backward compatibility with existing agents
- **Sidebar Context**: Extend existing sidebar state management for workflow access
- **API Infrastructure**: Extend current patterns for workflow management
- **Database Layer**: Build on existing SQLite schema and service patterns
- **Authentication**: Leverage existing user management for workflow sharing
- **Caching System**: Utilize Redis for workflow execution state management

### Acceptance Criteria

#### Functional Requirements
- [ ] Users can create visual workflows using drag-and-drop interface
- [ ] Prebuilt workflow templates available for common use cases
- [ ] Auto-selection of appropriate agent teams based on query analysis
- [ ] Visual workflow execution with real-time status updates
- [ ] JSON/YAML export and import for workflow definitions
- [ ] Template gallery with categorized workflow patterns
- [ ] Configuration panels with context-sensitive parameter editing
- [ ] Conditional logic and branching support in workflows
- [ ] Error handling and retry mechanisms for failed nodes
- [ ] Teams and workflows integrate seamlessly with SmallTalk

#### Non-Functional Requirements
- [ ] Canvas interactions respond within 50ms for smooth drag-and-drop
- [ ] System supports workflows with up to 100 nodes without performance degradation
- [ ] Workflows auto-save every 30 seconds during editing
- [ ] Visual workflow builder works responsive on tablets (minimum 768px width)
- [ ] Workflow execution status updates in real-time (sub-second latency)
- [ ] Error messages include actionable suggestions for workflow fixes
- [ ] Comprehensive help system with interactive tutorials
- [ ] Workflows can be shared via URL with appropriate permissions

### Future Considerations

#### Long-term Enhancements
- **AI-Powered Workflow Suggestions**: Machine learning to suggest optimal workflow patterns based on query analysis
- **Advanced Visual Debugger**: Step-through debugging with variable inspection and breakpoints
- **Workflow Analytics Dashboard**: Detailed performance metrics, bottleneck analysis, and optimization suggestions
- **Community Marketplace**: User-generated workflow templates with ratings, reviews, and sharing
- **Version Control Integration**: Git-like branching and merging for collaborative workflow development
- **Advanced Node Types**: Custom JavaScript nodes, API integrations, and third-party service connectors
- **Mobile Workflow Builder**: Touch-optimized canvas for tablet and mobile workflow creation
- **Workflow Testing Framework**: Unit testing for individual nodes and integration testing for complete workflows

#### Scalability Considerations
- **Multi-tenant Workflow Isolation**: Secure workspace separation with resource quotas
- **Enterprise Workflow Governance**: Role-based access control, approval workflows, and compliance tracking
- **Horizontal Scaling**: Distributed workflow execution across multiple servers
- **API Rate Limiting**: Prevent abuse of workflow execution and template sharing features
- **Resource Management**: CPU and memory limits per workflow execution with queueing system
- **Audit Logging**: Comprehensive logging for workflow execution, modifications, and access patterns

---

**Document Version**: 2.0 - Enhanced with Visual Workflow Builder  
**Last Updated**: January 2025  
**Stakeholders**: Development Team, Product Team, UX Team  
**Approval Status**: Updated with No-Code Pipeline Requirements 