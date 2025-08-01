# Enhanced Debug Sidebar - LLM Call Visibility - Product Requirements Document

## 1. Executive Summary

### 1.1 Problem Statement
Currently, when LLM calls are made (especially during cache misses with "Generating new LLM response"), developers have limited visibility into:
- What prompts are being sent to the LLM
- Which models/providers are being used
- Request parameters (temperature, max_tokens, etc.)
- Response streaming details
- Performance metrics
- Error conditions and retry logic

This lack of transparency makes debugging difficult and prevents optimization of LLM interactions for future search sessions.

### 1.2 Solution Overview
**TOP PRIORITY**: Enhance the existing debug sidebar to capture and display detailed information about all LLM calls in real-time, providing developers with complete visibility into the LLM interaction pipeline directly within the current debug interface.

### 1.3 Success Metrics
- 90% reduction in time to debug LLM-related issues
- Ability to identify performance bottlenecks in LLM calls
- Improved understanding of cache hit/miss patterns
- Enhanced ability to optimize prompts and model selection
- **Developer productivity**: Immediate visibility into model/parameter usage for each call
- **Search optimization**: Better understanding of what works for future sessions

## 2. Current State Analysis

### 2.1 Existing Infrastructure
- **Debug Toggle**: Basic debug mode toggle in sidebar (`/components/sidebar/DebugToggle.tsx`)
- **Debug Logger**: Server-side logging system (`lib/debug-logger.ts`)
- **Debug Events**: SSE-based debug event streaming
- **Debug Callback**: LiteLLM integration for debug callbacks
- **Sidebar Context**: State management for debug mode and logs (`/contexts/SidebarContext.tsx`)

### 2.2 Current Limitations
- Limited visibility into LLM call details (model, parameters, prompts)
- No real-time display of request/response metadata
- Missing comprehensive LLM interaction tracking
- No easy way to see what parameters were used for each call
- Limited ability to optimize future search sessions based on call history

## 3. Requirements

### 3.1 Functional Requirements

#### 3.1.1 Enhanced LLM Call Capture
- **FR-1**: Capture all LLM requests with complete metadata
  - Model and provider information (e.g., "gpt-4", "OpenAI")
  - Request parameters (temperature, max_tokens, top_p, frequency_penalty)
  - Message history and prompt preview
  - Context length and token estimates
  - Cache status (hit/miss)
  
- **FR-2**: Capture LLM response details
  - Response completion status
  - Finish reasons and metadata
  - Performance timing data
  - Content length and streaming chunks
  - Error details if any

- **FR-3**: Enhanced debug log display
  - Real-time LLM call information in existing log viewer
  - Expandable LLM call details
  - Model and parameter highlighting
  - Cache hit/miss indicators

#### 3.1.2 Debug Sidebar Enhancements
- **FR-4**: Enhanced log viewer for LLM calls
  - Replace "No debug logs yet" with real LLM call entries
  - Live updating LLM call information in existing black log area
  - LLM-specific log entry formatting with model/parameter info
  - Expandable call details within existing interface
  - Quick parameter visibility (temp, max_tokens, etc.)

- **FR-5**: LLM call summary in sidebar header
  - Add LLM call count next to existing "0 logs" text
  - Model usage breakdown (e.g., "gpt-4(2), claude-3(1)")
  - Cache performance metrics (e.g., "Cache: 1/3")
  - Average response times

- **FR-6**: Quick LLM call inspection
  - Click to expand full call details in existing log area
  - Parameter analysis display (temperature, max_tokens, top_p, frequency_penalty)
  - Prompt content preview
  - Performance breakdown (response time, chunks, cache status)

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance
- **NFR-1**: Enhanced debug sidebar must not impact main application performance
- **NFR-2**: Real-time updates with <100ms latency
- **NFR-3**: Support for 100+ LLM calls without performance degradation

#### 3.2.2 Usability
- **NFR-4**: Enhanced debug sidebar must be accessible and intuitive
- **NFR-5**: Keyboard shortcuts for common operations
- **NFR-6**: Responsive design that works with existing sidebar states

#### 3.2.3 Reliability
- **NFR-7**: Debug data must persist across page refreshes
- **NFR-8**: Graceful handling of connection failures
- **NFR-9**: Automatic cleanup of old debug data

## 4. Technical Specifications

### 4.1 Data Models

#### 4.1.1 Enhanced Debug Event
```typescript
interface EnhancedDebugEvent {
  id: string
  timestamp: string
  type: 'llm_request' | 'llm_response' | 'llm_stream_chunk' | 'cache_hit' | 'cache_miss' | 'error'
  requestId: string
  sessionId: string
  data: {
    // LLM Request specific
    model?: string
    provider?: string
    parameters?: LLMParameters
    messages?: Message[]
    prompt_preview?: string
    context_length?: number
    estimated_tokens?: number
    
    // LLM Response specific
    source?: 'cache' | 'stream' | 'direct'
    content_length?: number
    finish_reason?: string
    streaming_chunks?: number
    response_time_ms?: number
    
    // Cache specific
    cache_key?: string
    cache_hit?: boolean
    cache_size_bytes?: number
    
    // Error specific
    error?: string
    stack_trace?: string
    retry_count?: number
  }
  metadata?: {
    user_agent?: string
    ip_address?: string
    request_headers?: Record<string, string>
  }
}
```

#### 4.1.2 LLM Call Session
```typescript
interface LLMCallSession {
  sessionId: string
  requestId: string
  startTime: string
  endTime?: string
  status: 'active' | 'completed' | 'error'
  events: EnhancedDebugEvent[]
  summary: {
    total_requests: number
    cache_hits: number
    cache_misses: number
    total_response_time_ms: number
    average_response_time_ms: number
    errors: number
    models_used: string[]
    providers_used: string[]
  }
}
```

### 4.2 API Enhancements

#### 4.2.1 Enhanced Debug Callback
```typescript
function createEnhancedDebugCallback(
  sendEvent: Function, 
  debugMode: boolean, 
  requestId: string,
  sessionId: string
) {
  if (!debugMode) return undefined;
  
  return (event: any) => {
    const enhancedEvent: EnhancedDebugEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type: mapEventType(event.type),
      requestId,
      sessionId,
      data: {
        ...event.data,
        response_time_ms: event.response_time_ms,
        streaming_chunks: event.streaming_chunks,
        estimated_tokens: event.estimated_tokens
      }
    }
    
    sendEvent('enhanced_debug_event', enhancedEvent)
  }
}
```

#### 4.2.2 Cache Debug Integration
```typescript
// In cache-manager.ts
async getCachedLLMResponse(messages: any[], metadata: any) {
  const cacheKey = this.generateCacheKey(messages, metadata)
  const cached = await this.cache.get(cacheKey)
  
  // Send cache debug event
  this.sendCacheDebugEvent({
    cache_key: cacheKey,
    cache_hit: !!cached,
    cache_size_bytes: cached ? JSON.stringify(cached).length : 0
  })
  
  return cached
}
```

### 4.3 Frontend Components

#### 4.3.1 Enhanced Debug Toggle
```typescript
// Enhanced components/sidebar/DebugToggle.tsx
interface EnhancedDebugToggleProps {
  debugMode: boolean
  setDebugMode: (value: boolean) => void
  debugLogs: EnhancedDebugLog[]
  clearDebugLogs: () => void
  llmCallSummary: LLMCallSummary
  // New props for LLM call visibility
  llmCallCount: number
  modelUsage: Record<string, number>
  cacheStats: { hits: number; misses: number }
  averageResponseTime: number
}
```

#### 4.3.2 LLM Call Log Entry
```typescript
// components/sidebar/LLMCallLogEntry.tsx
interface LLMCallLogEntryProps {
  log: EnhancedDebugLog
  onExpand: (log: EnhancedDebugLog) => void
  isExpanded: boolean
  // Enhanced for LLM calls
  model: string
  parameters: {
    temperature: number
    max_tokens: number
    top_p: number
    frequency_penalty: number
  }
  cacheStatus: 'hit' | 'miss'
  responseTime: number
}
```

#### 4.3.3 LLM Call Details Panel
```typescript
// components/sidebar/LLMCallDetailsPanel.tsx
interface LLMCallDetailsPanelProps {
  call: LLMCall
  onClose: () => void
  onCopy: (call: LLMCall) => void
  // Enhanced for detailed view
  showPrompt: boolean
  showParameters: boolean
  showPerformance: boolean
}
```

## 5. User Experience

### 5.1 Enhanced Debug Sidebar Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Debug Mode: [ON] ✓                    [🗑️] [📋] [📊]        │
├─────────────────────────────────────────────────────────────┤
│ LLM Calls: 3 | Cache: 1/3 | Avg: 1.2s                      │
│ Models: gpt-4(2), claude-3(1)                               │
├─────────────────────────────────────────────────────────────┤
│ Logs [▼]                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [12:01:15] 🤖 LLM Request: gpt-4 (temp=0.7) [📋]       │ │
│ │ [12:01:16] ✅ Cache Miss                                │ │
│ │ [12:01:17] 📡 Response: 1.2s, 15 chunks [📋]           │ │
│ │ [12:01:20] 🤖 LLM Request: claude-3 (temp=0.3) [📋]    │ │
│ │ [12:01:21] ✅ Cache Hit                                 │ │
│ │ [12:01:22] 📡 Response: 0.8s, 8 chunks [📋]            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Current State (to be enhanced):**
- Debug Mode toggle (already exists)
- "Debug Active" status (already exists)  
- "Logs" section with "0 logs" (currently empty)
- Black log area with "No debug logs yet" (needs LLM call data)

### 5.2 Expanded LLM Call Details
```
┌─────────────────────────────────────────────────────────────┐
│ LLM Call Details                              [📋] [×]     │
├─────────────────────────────────────────────────────────────┤
│ Model: gpt-4 (OpenAI) | Provider: litellm                  │
│ Parameters: temp=0.7, max_tokens=1000, top_p=0.9           │
│ Context: 2,847 tokens | Cache: Miss                        │
│ Response: 1.2s | Chunks: 15 | Finish: stop                 │
├─────────────────────────────────────────────────────────────┤
│ Messages (3):                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ System: You are a helpful AI assistant...              │ │
│ │ User: What is the capital of France?                   │ │
│ │ Assistant: The capital of France is...                 │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Performance:                                                │
│ • Request Time: 1.2s                                       │
│ • Streaming Chunks: 15                                     │
│ • Finish Reason: stop                                      │
│ • Cache Status: Miss                                       │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Keyboard Shortcuts
- `Ctrl/Cmd + D`: Toggle debug mode
- `Ctrl/Cmd + E`: Expand/collapse log details
- `Ctrl/Cmd + F`: Focus on LLM call logs
- `Ctrl/Cmd + C`: Clear debug logs
- `Esc`: Close expanded call details

## 6. Implementation Plan

### 6.1 Phase 1: Enhanced Data Capture (Week 1)
1. **Extend Debug Logger**
   - Add LLM-specific event types
   - Implement LLM call tracking
   - Add performance metrics capture

2. **Update API Routes**
   - Enhance debug callbacks for LLM calls
   - Add cache debug events
   - Implement streaming chunk tracking

3. **Backend Testing**
   - Unit tests for new debug functionality
   - Integration tests for LLM event streaming
   - Performance impact assessment

### 6.2 Phase 2: Sidebar Integration (Week 2)
1. **Enhanced Debug Toggle Component**
   - Modify existing `DebugToggle.tsx` to show LLM call count
   - Add model usage breakdown next to "0 logs" text
   - Add cache performance metrics (e.g., "Cache: 1/3")
   - Add average response time display

2. **LLM Call Log Entries**
   - Replace "No debug logs yet" with actual LLM call entries
   - Format each log entry to show: `[time] 🤖 LLM: model (temp=X) [📋]`
   - Add click-to-expand functionality for call details
   - Show cache hit/miss status with ✅/❌ icons

3. **Enhanced Log Viewer**
   - Modify existing black log area to display LLM calls
   - Add expandable details showing parameters, prompts, performance
   - Maintain existing copy and clear functionality
   - Add LLM-specific icons and formatting

### 6.3 Phase 3: Advanced Features (Week 3)
1. **Enhanced Logging**
   - Model usage statistics
   - Cache performance metrics
   - Response time analysis

2. **Developer Tools**
   - Copy call details to clipboard
   - Quick parameter visibility
   - Session summary export

3. **Documentation and Testing**
   - User documentation
   - End-to-end testing
   - Performance optimization

## 7. Success Criteria

### 7.1 Technical Success
- [ ] All LLM calls are captured with complete metadata
- [ ] Real-time updates work without performance impact
- [ ] Enhanced debug sidebar handles 100+ LLM calls without degradation
- [ ] LLM call details are easily accessible and copyable

### 7.2 User Success
- [ ] Developers can see model and parameters for each LLM call instantly
- [ ] Cache performance is clearly visible and actionable
- [ ] Performance bottlenecks are easily identifiable
- [ ] LLM call history helps optimize future search sessions

### 7.3 Business Success
- [ ] 90% reduction in LLM debugging time
- [ ] Improved cache hit rates through visibility
- [ ] Better model selection based on performance data
- [ ] Reduced support tickets related to LLM issues

## 8. Risk Assessment

### 8.1 Technical Risks
- **Performance Impact**: Debug overhead affecting main application
  - *Mitigation*: Implement performance monitoring and throttling
- **Memory Usage**: Large debug sessions consuming excessive memory
  - *Mitigation*: Implement automatic cleanup and size limits
- **Data Privacy**: Sensitive information in debug logs
  - *Mitigation*: Implement data sanitization and access controls

### 8.2 User Experience Risks
- **Complexity**: Debug window being too complex for casual users
  - *Mitigation*: Implement progressive disclosure and help system
- **Information Overload**: Too much data overwhelming users
  - *Mitigation*: Implement smart filtering and summarization

## 9. Future Enhancements

### 9.1 Advanced Analytics
- Machine learning-based performance prediction
- Automatic optimization suggestions
- Anomaly detection in LLM calls

### 9.2 Integration Features
- Integration with external monitoring tools
- Webhook notifications for critical events
- API for third-party debug tools

### 9.3 Collaboration Features
- Shared debug sessions
- Team performance dashboards
- Debug session templates

## 10. Conclusion

**TOP PRIORITY**: This enhanced debug sidebar will provide unprecedented visibility into LLM calls, enabling developers to see exactly what models, parameters, and prompts are being used for each call. This immediate visibility will significantly improve developer productivity and help optimize future search sessions by understanding what works best.

The implementation builds on the existing debug infrastructure while adding comprehensive LLM call tracking that will make debugging much more transparent and actionable. The sidebar integration ensures this critical information is always accessible without disrupting the main application workflow.

The phased approach ensures minimal disruption to existing functionality while delivering immediate value through enhanced LLM call debugging capabilities. 