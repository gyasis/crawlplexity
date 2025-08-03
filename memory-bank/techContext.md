# Technical Context

## Technology Stack

### Frontend Technologies

**Next.js 15**
- React framework with App Router
- Server-side rendering and static generation
- API routes for backend functionality
- TypeScript for type safety
- Tailwind CSS for styling

**Key Dependencies**:
```json
{
  "next": "^15.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "@vercel/ai": "^1.0.0",
  "sonner": "^1.0.0"
}
```

### Backend Services

**Serper API**
- Google search results via API
- Cost-effective alternative to direct Google API
- Rate limiting: 2,500 searches/month (free tier)
- Pricing: ~$5 per 1,000 searches

**Crawl4AI**
- Self-hosted web scraping service
- JavaScript rendering support
- Parallel processing capabilities
- Docker deployment: `unclecode/crawl4ai:latest`
- Port: 11235

**LiteLLM**
- Multi-provider LLM proxy
- Support for OpenAI, Anthropic, Groq, Google, Ollama
- Unified API interface
- Docker deployment: `ghcr.io/berriai/litellm:main-latest`
- Port: 14782

**Redis**
- Caching and session storage
- High-performance in-memory database
- Docker deployment: `redis:alpine`
- Port: 29674

### AI/ML Technologies

**Multi-Provider LLM Support**
```typescript
// Supported providers
const LLM_PROVIDERS = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  groq: ['mixtral-8x7b-32768', 'llama3-70b-8192'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: ['llama2', 'mistral', 'codellama'] // Local models
};
```

**Video Processing**
- Gemini multimedia analysis
- OCR for video content extraction
- URL classification and processing
- Python-based service with Docker deployment

### Development Environment

**Required Software**
- Node.js 18+
- Docker and Docker Compose
- Git for version control
- API keys for external services

**Development Ports**
- Frontend: http://localhost:18563
- Crawl4AI: http://localhost:11235
- LiteLLM: http://localhost:14782
- Redis: localhost:29674

**Environment Variables**
```env
# Required
SERPER_API_KEY=your-serper-api-key

# Optional LLM providers
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GROQ_API_KEY=gsk_your-groq-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key

# Optional local LLM
OLLAMA_BASE_URL=http://localhost:11434

# Service URLs
CRAWL4AI_BASE_URL=http://localhost:11235
LITELLM_BASE_URL=http://localhost:14782
REDIS_URL=redis://localhost:29674

# Configuration
LLM_STRATEGY=balanced  # performance, cost, balanced, local
DEBUG=false
LOG_LEVEL=info
```

## Architecture Components

### API Layer Structure

```typescript
// API route organization
app/api/
├── crawlplexity/          # Core search functionality
│   ├── search/           # Search API
│   ├── cache/            # Cache management
│   └── health/           # Health checks
├── deep-research/        # Deep research engine
│   ├── start/            # Start research session
│   ├── search/           # Research search
│   ├── sessions/         # Session management
│   └── [sessionId]/      # Session-specific operations
├── models/               # Model management
│   ├── route.ts          # Model listing and selection
│   ├── litellm/          # LiteLLM integration
│   ├── custom/           # Custom model configurations
│   └── remote-servers/   # Remote model servers
├── test-video/           # Video processing
└── utils/                # Utility services
    ├── health/           # System health
    ├── stats/            # Usage statistics
    ├── taskmaster/       # Task breakdown
    └── query-deconstruction/ # Query analysis
```

### Service Integration

**Serper Client**
```typescript
class SerperClient {
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev';
  
  async search(query: string, options: SearchOptions): Promise<SerperResult> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, ...options })
    });
    
    return response.json();
  }
}
```

**Crawl4AI Client**
```typescript
class Crawl4AIClient {
  private baseUrl: string;
  
  async scrape(urls: string[]): Promise<ScrapedContent[]> {
    const promises = urls.map(url => 
      fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options: { javascript: true } })
      }).then(res => res.json())
    );
    
    return Promise.all(promises);
  }
}
```

**LiteLLM Client**
```typescript
class LiteLLMClient {
  private baseUrl: string;
  
  async generate(prompt: string, options: GenerateOptions): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        stream: options.stream || false
      })
    });
    
    return response.json();
  }
}
```

## Data Management

### Caching Strategy

**Redis Cache Configuration**
```typescript
interface CacheConfig {
  // Search results cache
  searchResults: {
    ttl: 3600; // 1 hour
    prefix: 'search:';
  };
  
  // AI responses cache
  aiResponses: {
    ttl: 86400; // 24 hours
    prefix: 'ai:';
  };
  
  // Research sessions cache
  researchSessions: {
    ttl: 2592000; // 30 days
    prefix: 'research:';
  };
  
  // Model configurations cache
  modelConfigs: {
    ttl: 3600; // 1 hour
    prefix: 'models:';
  };
}
```

**Cache Manager Implementation**
```typescript
class CacheManager {
  private redis: Redis;
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Database Schema (Planned)

**Research Sessions**
```sql
CREATE TABLE research_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    research_type VARCHAR(50) NOT NULL,
    phases JSONB NOT NULL,
    results JSONB NOT NULL,
    analysis TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);
```

**Model Configurations**
```sql
CREATE TABLE model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Performance Considerations

### Optimization Strategies

**Parallel Processing**
```typescript
class ParallelProcessor {
  async processSearchResults(results: SearchResult[]): Promise<ProcessedResult[]> {
    // Process multiple URLs concurrently
    const chunks = this.chunkArray(results, 5);
    const processedChunks = await Promise.all(
      chunks.map(chunk => this.processChunk(chunk))
    );
    return processedChunks.flat();
  }
  
  async processResearchPhases(phases: ResearchPhase[]): Promise<PhaseResult[]> {
    // Execute research phases in parallel where possible
    const phasePromises = phases.map(phase => this.executePhase(phase));
    return Promise.all(phasePromises);
  }
}
```

**Streaming Responses**
```typescript
export async function* generateStreamingResponse(prompt: string) {
  const stream = await litellmClient.stream(prompt);
  
  for await (const chunk of stream) {
    yield {
      type: 'content',
      data: chunk.content,
      done: false
    };
  }
  
  yield {
    type: 'complete',
    data: null,
    done: true
  };
}
```

### Resource Management

**Connection Pooling**
```typescript
class ConnectionPool {
  private pools: Map<string, Pool> = new Map();
  
  async getConnection(service: string): Promise<Connection> {
    if (!this.pools.has(service)) {
      this.pools.set(service, this.createPool(service));
    }
    return this.pools.get(service)!.getConnection();
  }
  
  private createPool(service: string): Pool {
    const config = this.getPoolConfig(service);
    return new Pool(config);
  }
}
```

## Security Implementation

### API Security

**Rate Limiting**
```typescript
class RateLimiter {
  private redis: Redis;
  
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    return current <= limit;
  }
}
```

**Input Validation**
```typescript
class InputValidator {
  validateSearchQuery(query: string): boolean {
    return query.length > 0 && 
           query.length < 1000 && 
           !this.containsMaliciousContent(query);
  }
  
  validateResearchQuery(query: string): boolean {
    return this.validateSearchQuery(query) && 
           this.isResearchAppropriate(query);
  }
  
  private containsMaliciousContent(input: string): boolean {
    // Implement security checks
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(input));
  }
}
```

### Environment Security

**API Key Management**
```typescript
class APIKeyManager {
  private keys: Map<string, string> = new Map();
  
  constructor() {
    this.loadKeysFromEnvironment();
  }
  
  private loadKeysFromEnvironment() {
    const requiredKeys = ['SERPER_API_KEY'];
    const optionalKeys = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GROQ_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY'
    ];
    
    requiredKeys.forEach(key => {
      const value = process.env[key];
      if (!value) {
        throw new Error(`Required API key ${key} not found`);
      }
      this.keys.set(key, value);
    });
    
    optionalKeys.forEach(key => {
      const value = process.env[key];
      if (value) {
        this.keys.set(key, value);
      }
    });
  }
  
  getKey(name: string): string | undefined {
    return this.keys.get(name);
  }
}
```

## Monitoring and Observability

### Health Checks

**Service Health Monitoring**
```typescript
class HealthMonitor {
  async checkAllServices(): Promise<HealthStatus> {
    const checks = [
      this.checkSerperAPI(),
      this.checkCrawl4AI(),
      this.checkLiteLLM(),
      this.checkRedis()
    ];
    
    const results = await Promise.all(checks);
    return this.aggregateHealthStatus(results);
  }
  
  private async checkSerperAPI(): Promise<ServiceHealth> {
    try {
      const response = await fetch('https://google.serper.dev/health');
      return {
        service: 'serper',
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime: Date.now()
      };
    } catch (error) {
      return {
        service: 'serper',
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
```

### Logging Strategy

**Structured Logging**
```typescript
class Logger {
  private logLevel: string;
  
  constructor(level: string = 'info') {
    this.logLevel = level;
  }
  
  info(message: string, metadata?: any) {
    this.log('info', message, metadata);
  }
  
  error(message: string, error?: Error, metadata?: any) {
    this.log('error', message, { error: error?.message, stack: error?.stack, ...metadata });
  }
  
  private log(level: string, message: string, metadata?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };
    
    console.log(JSON.stringify(logEntry));
  }
}
```

## Deployment Configuration

### Docker Compose Setup

```yaml
version: '3.8'
services:
  crawl4ai:
    image: unclecode/crawl4ai:latest
    ports:
      - "11235:11235"
    restart: unless-stopped
    environment:
      - CRAWL4AI_LOG_LEVEL=info

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "14782:4000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "29674:6379"
    restart: unless-stopped
    volumes:
      - redis_data:/data

  video-processing:
    build: ./video-processing-service
    ports:
      - "8000:8000"
    restart: unless-stopped
    environment:
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}

volumes:
  redis_data:
```

### Production Considerations

**Scaling Strategy**
- Horizontal scaling for API services
- Load balancing for high availability
- Database clustering for data persistence
- CDN for static assets

**Security Measures**
- HTTPS enforcement
- API key rotation
- Rate limiting
- Input sanitization
- Regular security audits

**Monitoring Setup**
- Application performance monitoring
- Error tracking and alerting
- Usage analytics
- Resource utilization tracking

This technical context provides the foundation for understanding the current implementation and planning future development of the Crawlplexity platform. 