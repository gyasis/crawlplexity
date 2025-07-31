# Deep Research Engine

## Overview

The Deep Research Engine is an advanced search capability that amplifies regular search with a comprehensive 4-phase research methodology. It provides deeper insights by collecting more sources, analyzing multiple perspectives, and generating comprehensive synthesized responses.

## Features

### 🧠 4-Phase Research Methodology
- **Foundation Phase**: Gathering foundational knowledge and background information
- **Perspective Phase**: Analyzing multiple viewpoints, pros/cons, and expert opinions  
- **Trend Phase**: Identifying recent developments, future predictions, and emerging patterns
- **Synthesis Phase**: Comprehensive analysis, expert insights, and strategic recommendations

### ⚡ Hybrid Caching System
- **Redis Cache**: Fast content caching for active sessions (24-hour TTL)
- **SQLite Storage**: Long-term persistence for completed research sessions
- **URL Deduplication**: Prevents reprocessing same content across sessions
- **Cache Performance**: Excellent hit rates reduce processing time and costs

### 🎯 Enhanced Source Collection
- **6 sources per query** (same as regular search) across all research phases
- **Up to 15 total sources** from comprehensive multi-phase analysis
- **Smart source filtering** removes duplicates and low-quality results
- **Content-aware caching** prevents redundant crawling

### 🤖 2025 AI Models
- **gpt-4.1-mini**: Cost-effective model for standard research (83% cost reduction)
- **o3**: Most powerful reasoning model for comprehensive analysis
- **Intelligent model selection** based on research complexity

### 🔄 Real-Time Streaming
- **Progressive status updates** showing current research phase
- **Live source discovery** as they're found and processed
- **Streaming AI responses** with proper numbered citations [1], [2], [3]
- **Follow-up suggestions** generated after completion

## How to Use

### Toggle Method
1. Enable **Deep Research toggle** under the search input box
2. Every search query will automatically use Deep Research methodology
3. Disable toggle to return to regular search

### Slash Commands
Use these slash commands in any search query:
- `/deep` - Comprehensive 4-phase deep research
- `/foundation` - Foundation phase only (background knowledge)
- `/perspective` - Foundation + Perspective phases (multiple viewpoints)
- `/trend` - Foundation + Trend phases (recent developments)
- `/synthesis` - All phases (most comprehensive)

## Technical Architecture

### Service Integration
```
User Query → Deep Research API → 4-Phase Orchestrator
     ↓
Phase Generation → Search Orchestrator (6 sources/query)
     ↓  
Content Processing → Redis Cache Check → Crawl4AI (if needed)
     ↓
AI Synthesis → LiteLLM (gpt-4.1-mini/o3) → Streaming Response
```

### Memory Management
- **Hot Tier** (1-3 days): Recently accessed research sessions
- **Warm Tier** (3-7 days): Moderately accessed sessions  
- **Cold Tier** (1 month): Rarely accessed historical data
- **Trash Tier** (7 days): Scheduled for deletion
- **Redis Layer**: Active sessions and content cache

### Performance Optimizations
- **Batch cache lookups** for multiple URLs simultaneously
- **Pipeline Redis operations** for efficiency
- **Automatic cache warming** from frequently accessed content
- **Graceful degradation** when services unavailable

## Configuration

### Environment Variables
```bash
# Required
SERPER_API_KEY=your_serper_key

# Optional LLM Providers  
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROQ_API_KEY=your_groq_key
GOOGLE_AI_API_KEY=your_google_key

# Services (auto-configured)
REDIS_URL=redis://localhost:29674
CRAWL4AI_URL=http://localhost:11235
LITELLM_URL=http://localhost:14782
```

### Service Dependencies
- **Redis**: Content caching and session storage
- **Crawl4AI**: Web content extraction with JavaScript rendering
- **LiteLLM**: Multi-provider AI proxy for OpenAI, Anthropic, Groq, Google AI
- **Serper API**: Google search results
- **DSPy Bridge**: Enhanced query generation (optional)

## API Endpoints

### Deep Research Search
```
POST /api/deep-research/search
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "your research query"}],
  "research_type": "comprehensive" // or "foundation", "perspective", "trend", "synthesis"
}
```

### Response Format (SSE)
```javascript
// Status updates
data: {"type": "status", "message": "Phase 1/4: gathering foundational knowledge..."}

// Sources discovered  
data: {"type": "sources", "sources": [...sourceArray]}

// Streaming content
data: {"type": "content", "content": "partial response text"}

// Follow-up suggestions
data: {"type": "suggestions", "suggestions": ["question 1", "question 2", "question 3"]}

// Completion
data: {"type": "completed", "message": "Deep Research analysis completed", "sources_analyzed": 15}
```

## Cache Performance

Example cache statistics from production use:
```
🎯 Cache Performance - Phase foundation: 4 hits, 2 misses (67% hit rate)
🎯 Cache Performance - Phase perspective: 6 hits, 0 misses (100% hit rate)  
🎯 Cache Performance - Phase trend: 5 hits, 1 miss (83% hit rate)
🎯 Cache Performance - Phase synthesis: 6 hits, 0 misses (100% hit rate)
```

## Benefits

### For Users
- **Comprehensive answers** with multiple perspectives and expert insights
- **Proper citations** with numbered references [1], [2], [3]
- **Follow-up suggestions** for deeper exploration
- **Real-time progress** tracking during research phases

### For Performance  
- **Reduced costs** through intelligent caching and model selection
- **Faster responses** via Redis content caching
- **Scalable architecture** with hybrid storage tiers
- **Efficient resource usage** with URL deduplication

### For Quality
- **Enhanced accuracy** through multi-phase methodology
- **Broader perspective** with systematic viewpoint analysis
- **Recent insights** via trend analysis phase
- **Expert-level synthesis** using advanced AI models

## Monitoring

The system provides comprehensive logging and performance metrics:
- Cache hit/miss ratios per research phase
- Processing time per phase and overall duration
- Source collection success rates
- Memory tier utilization statistics
- LLM model usage and cost tracking

## Future Enhancements

- **Custom research templates** for specific domains
- **Research session collaboration** and sharing
- **Advanced citation management** with source verification
- **Research methodology customization** per user preferences
- **Integration with academic databases** and specialized sources

---

*The Deep Research Engine represents a significant advancement in AI-powered research capabilities, providing users with comprehensive, well-sourced, and intelligently synthesized information on any topic.*