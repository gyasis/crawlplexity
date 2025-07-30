# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Crawlplexity is a self-hosted AI-powered search engine that combines Google search with intelligent web scraping and multi-provider LLM responses. The application uses Next.js 15 with App Router and integrates multiple external services for comprehensive search functionality.

## Development Commands

```bash
# Start development server (runs on port 18563)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting (ESLint - ignored during builds)
npm run lint
```

## Architecture Overview

### Service-Oriented Architecture
The application follows a microservices pattern with these core services:
- **Serper API**: Google search results (primary data source)
- **Crawl4AI**: Self-hosted web scraping with JavaScript rendering (port 11235)
- **LiteLLM**: Multi-provider AI proxy for OpenAI, Anthropic, Groq, Google AI, Ollama (port 14782)
- **Redis**: High-performance caching and session storage (port 29674)

### Request Flow
```
User Query → Serper API (Google Search) → Crawl4AI (Web Scraping) → LiteLLM (AI Response) → Cached Results
```

### Key Service Clients
All service integrations are located in `/lib/`:
- `serper-client.ts` - Google search integration
- `crawl4ai-client.ts` - Web scraping service
- `litellm-client.ts` - Multi-provider LLM interface
- `cache-manager.ts` - Redis caching layer
- `search-orchestrator.ts` - Coordinates all services

### Streaming Architecture
The application uses Server-Sent Events (SSE) for real-time responses:
- Custom streaming implementation in `/app/api/crawlplexity/search/route.ts`
- Progressive loading of search results, AI responses, and follow-up questions
- Stream-based chat interface with `use-crawlplexity-chat.ts` hook

## Code Organization

### Directory Structure
- `/app/` - Next.js App Router with co-located components
- `/components/ui/` - Shared UI components (Radix UI based)
- `/components/sidebar/` - Sidebar navigation components
- `/contexts/` - React Context providers for global state
- `/lib/` - Service clients, utilities, and business logic
- `/app/types.ts` - Centralized TypeScript type definitions

### State Management
- React Context for sidebar state (`/contexts/`)
- Custom hooks for chat functionality (`use-crawlplexity-chat.ts`)
- Theme management via `next-themes`

## Environment Configuration

### Required Environment Variables
- `SERPER_API_KEY` - Google search via Serper API

### Optional LLM Provider Keys
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` 
- `GROQ_API_KEY`
- `GOOGLE_AI_API_KEY`

### Service Configuration
- Local Ollama support (no API key needed)
- Configurable service endpoints for all external services
- Docker Compose orchestration available

## Tech Stack Details

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS v4 with HSL-based color system
- **Theme**: Dark/light mode support
- **UI Components**: Custom library with Radix UI primitives
- **Notifications**: Sonner toast library

### Configuration Files
- `next.config.ts` - Image domains, rewrites, ESLint settings
- `tailwind.config.ts` - Custom design system with dark mode
- `tsconfig.json` - TypeScript with strict mode, ES2017 target

## Error Handling Patterns

### Service Resilience
- Graceful degradation for service failures
- Health check endpoints for service monitoring
- Automatic fallbacks for LLM providers
- Comprehensive error logging

### User Experience
- User-friendly error messages with actionable suggestions
- Progressive enhancement with loading states
- Citation tooltips and source verification

## Common Development Patterns

### API Route Structure
- RESTful endpoints in `/app/api/`
- Streaming responses for real-time updates
- Centralized error handling
- Environment variable validation

### Component Patterns
- Feature-based organization with TypeScript interfaces
- Custom hooks for complex state logic
- Context providers for shared state
- Responsive design with container-based layouts

### Caching Strategy
- Redis-based result caching with smart invalidation
- Service-level caching for external API calls
- Health monitoring for cache performance

## Extension Points

The architecture supports easy extension for:
- Additional search providers beyond Serper
- New LLM providers via LiteLLM proxy
- Custom content processing pipelines
- Enhanced caching strategies
- Additional UI themes and customizations