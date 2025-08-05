# Fireplexity Architecture Documentation

## System Overview

Fireplexity is a sophisticated AI-powered search engine with comprehensive agent and workflow management capabilities. The system follows a **dual-interface architecture** that provides both quick sidebar access and detailed full-page management interfaces.

## Core Architecture Principles

### 1. Dual-Interface System
```
┌─────────────────┬──────────────────────────────────────┐
│   Sidebar       │        Full-Page Interfaces          │
│   ========      │        ====================          │
│                 │                                      │
│ Quick Actions   │  Comprehensive Management            │
│ - Agent Status  │  - Detailed Forms                    │
│ - Workflow Run  │  - Advanced Filtering                │
│ - Templates     │  - Bulk Operations                   │
│ - Monitoring    │  - Analytics & Reporting             │
│                 │                                      │
│ Always Visible  │  Deep-dive Functionality             │
└─────────────────┴──────────────────────────────────────┘
```

**Benefits:**
- **Quick Access** - Essential functions always available
- **Progressive Enhancement** - Simple to complex workflows
- **Context Preservation** - State maintained across interfaces
- **Scalability** - Can add features without cluttering UI

### 2. Service-Oriented Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                │
├──────────────────────────────────────────────────────────┤
│  React Components  │  Context Providers  │  Custom Hooks │
├────────────────────┼────────────────────┼─────────────────┤
│  /app/workflows/   │  SidebarContext    │  useCrawlplexity │
│  /app/agents/      │  ModeContext       │  useWorkflow     │
│  /app/teams/       │  ThemeContext      │  useAgent        │
│  /app/settings/    │                    │                  │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                  Service Layer (/lib/)                   │
├──────────────────────────────────────────────────────────┤
│  serper-client.ts     │  Google Search Integration       │
│  crawl4ai-client.ts   │  Web Scraping Service           │
│  litellm-client.ts    │  Multi-provider LLM Interface   │
│  cache-manager.ts     │  Redis Caching Layer            │
│  search-orchestrator.ts │ Service Coordination          │
└──────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────┐
│                   External Services                      │
├──────────────────────────────────────────────────────────┤
│  Serper API (Port: N/A)     │  Google Search Results     │
│  Crawl4AI (Port: 11235)     │  Web Scraping + JS        │
│  LiteLLM (Port: 14782)      │  OpenAI/Anthropic/Groq    │
│  Redis (Port: 29674)        │  Caching & Sessions       │
└──────────────────────────────────────────────────────────┘
```

### 3. Component Architecture

```
components/
├── sidebar/                    # Sidebar-specific components
│   ├── Sidebar.tsx            # Main sidebar container
│   ├── AgentManagement.tsx    # Agent quick actions
│   ├── QuickWorkflowBuilder.tsx # Workflow creation
│   ├── WorkflowTemplateGallery.tsx # Template browser
│   ├── ModelSelector.tsx      # Model selection
│   └── VisualWorkflowCanvas.tsx # React Flow integration
│
├── ui/                        # Shared UI components (Radix-based)
│   ├── button.tsx            # Button component
│   ├── dropdown-menu.tsx     # Dropdown menus
│   └── [other-ui-components]
│
└── chat/                      # Chat-specific components
    ├── UnifiedChatInput.tsx   # Main chat input
    └── MessageComponents.tsx  # Message rendering
```

## Data Flow Architecture

### 1. Request Flow
```
User Action → Component → Context → Service Client → External API → Response Processing → UI Update
```

### 2. State Management Flow
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Action   │───▶│  React Context   │───▶│  Local State    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ External APIs   │◀───│ Service Clients  │◀───│  Custom Hooks   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 3. Streaming Architecture
```
User Query ──┐
            │
            ▼
Search Orchestrator ──┬─▶ Serper API (Google Search)
                     │
                     ├─▶ Crawl4AI (Web Scraping)
                     │
                     └─▶ LiteLLM (AI Response)
                          │
                          ▼
                    Server-Sent Events (SSE)
                          │
                          ▼
                    Real-time UI Updates
```

## Interface Specifications

### 1. Full-Page Interfaces

#### Workflows Management (`/workflows`)
- **Purpose**: Comprehensive workflow dashboard
- **Features**: Grid/List views, filtering, execution, statistics
- **Integration**: Links to builder and templates
- **API Endpoints**: `/api/workflows`, `/api/workflows/execute`

#### Workflow Builder (`/workflows/create`)  
- **Purpose**: Advanced workflow creation
- **Features**: Visual canvas, 4 view modes, 50+ nodes
- **Technology**: React Flow, drag-and-drop
- **API Endpoints**: `/api/workflows`, `/api/agents`

#### Template Gallery (`/workflows/templates`)
- **Purpose**: Browse and execute workflow templates
- **Features**: Advanced filtering, template preview, instant execution
- **API Endpoints**: `/api/workflows/templates`

#### Agent Management (`/agents`)
- **Purpose**: Comprehensive agent management
- **Features**: 3 view modes, bulk operations, team integration
- **API Endpoints**: `/api/agents`, `/api/agent-groups`

#### Agent Creation (`/agents/create`)
- **Purpose**: Multi-step agent creation wizard
- **Features**: 4-step process, comprehensive configuration
- **API Endpoints**: `/api/agents`

#### Team Management (`/teams`)
- **Purpose**: Team management with analytics
- **Features**: 4 collaboration types, performance metrics
- **API Endpoints**: `/api/agent-groups`

#### Settings (`/settings`)
- **Purpose**: Comprehensive system configuration
- **Features**: 6 sections, API key management, theme customization
- **Storage**: Local storage + server-side persistence

### 2. Sidebar Components

#### AgentManagement
- **Compact View**: Status indicators, quick actions
- **Expanded View**: Full agent list with controls
- **Integration**: Links to full agent management

#### QuickWorkflowBuilder
- **Purpose**: Rapid workflow creation (5 nodes max)
- **Features**: Visual + list modes, template integration
- **Integration**: Links to advanced builder

#### WorkflowTemplateGallery
- **Purpose**: Quick template browsing
- **Features**: Category filtering, instant execution
- **Integration**: Links to full template gallery

## Security Architecture

### 1. Authentication & Authorization
```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  User Session    │───▶│   API Keys       │───▶│  Rate Limiting   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Session Timeout  │    │ Domain Whitelist │    │ 2FA Integration  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 2. Data Protection
- **API Key Security**: Show/hide functionality with secure storage
- **Domain Whitelisting**: Restrict API access to approved domains
- **Session Management**: Configurable timeout and refresh
- **Secure Communication**: HTTPS enforcement and CORS configuration

## Performance Architecture

### 1. Caching Strategy
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Browser Cache  │    │   Redis Cache    │    │ Service Cache   │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Static Assets │    │ • Search Results │    │ • API Responses │
│ • UI Components │    │ • User Sessions  │    │ • Model Outputs │
│ • Route Data    │    │ • Agent States   │    │ • Template Data │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2. Optimization Techniques
- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Next.js automatic optimization
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Tree Shaking**: Unused code elimination
- **Preloading**: Critical resource preloading

## Deployment Architecture

### 1. Development Environment
```bash
├── Next.js Dev Server (18563)
├── Crawl4AI Service (11235)  
├── LiteLLM Proxy (14782)
├── Redis Cache (29674)
└── External APIs (Serper, OpenAI, etc.)
```

### 2. Production Environment
```bash
├── Next.js Production Build
├── Docker Compose Orchestration
├── Service Health Monitoring
├── Load Balancing
└── SSL/TLS Termination
```

## Extension Points

### 1. New Page Integration
```typescript
// 1. Create page component in /app/[page-name]/page.tsx
// 2. Add navigation link in Sidebar.tsx
// 3. Create corresponding sidebar component if needed
// 4. Add API endpoints in /api/[endpoints]
// 5. Update documentation
```

### 2. New Service Integration
```typescript
// 1. Create service client in /lib/[service-name]-client.ts
// 2. Add to search orchestrator
// 3. Update environment configuration
// 4. Add health checks
// 5. Update Docker Compose if needed
```

### 3. New Component Integration
```typescript
// 1. Create component in appropriate directory
// 2. Add to UI library if reusable
// 3. Implement responsive design
// 4. Add to Storybook if applicable
// 5. Update component documentation
```

## Technology Stack Details

### Frontend
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS v4 with HSL-based colors
- **UI Components**: Custom library with Radix UI primitives
- **Icons**: Lucide React
- **Notifications**: Sonner toast library

### Backend Services
- **Search**: Serper API for Google search integration
- **Scraping**: Crawl4AI with JavaScript rendering
- **AI**: LiteLLM proxy for multi-provider access
- **Caching**: Redis for high-performance caching
- **Database**: SQLite for local data (configurable)

### Development Tools
- **TypeScript**: Strict mode with ES2017 target
- **ESLint**: Code quality and consistency
- **Tailwind CSS**: Utility-first styling
- **Docker**: Containerized services
- **Git**: Version control with conventional commits

## Monitoring & Observability

### 1. Health Checks
- Service endpoint health monitoring
- Database connection status
- Cache performance metrics
- API rate limit monitoring

### 2. Performance Metrics
- Page load times
- API response times  
- Cache hit rates
- Error rates and patterns

### 3. User Analytics
- Feature usage patterns
- User journey tracking
- Performance impact analysis
- Error boundary reporting

---

*This architecture documentation is maintained alongside the codebase and updated with each major release.*