<div align="center">

# Crawlplexity

A self-hosted AI-powered search engine that combines Google search with intelligent web scraping and multi-provider LLM responses. Get accurate answers with real-time citations from across the web.

<img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjBxbWFxamZycWRkMmVhMGFiZnNuZjMxc3lpNHpuamR4OWlwa3F4NSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QbfaTCB1OmkRmIQwzJ/giphy.gif" width="100%" alt="Crawlplexity Demo" />

</div>

## Features

- **Intelligent Search** - Google search via Serper API with smart result filtering
- **Advanced Web Scraping** - Self-hosted Crawl4AI with JavaScript rendering and parallel processing
- **Multi-Provider AI** - Support for OpenAI, Anthropic, Claude, Groq, Google, and local Ollama models
- **Real-time Citations** - Every response backed by scraped source content
- **Streaming Responses** - Live AI answers with progressive content loading
- **Smart Caching** - Redis-powered caching for search results and AI responses
- **Follow-up Questions** - AI-generated related queries for deeper exploration
- **Self-Hosted** - Complete control over your search infrastructure

## Architecture

Crawlplexity combines multiple services for optimal performance:

```
User Query → Serper API (Google Search) → Crawl4AI (Web Scraping) → LiteLLM (AI Response) → Cached Results
```

**Core Services:**
- **Serper API**: Cost-effective Google search results
- **Crawl4AI**: Self-hosted web scraping with JavaScript support
- **LiteLLM**: Unified interface for multiple AI providers
- **Redis**: High-performance caching layer

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- API keys (see setup below)

### 1. Clone & Install

```bash
git clone https://github.com/mendableai/fireplexity.git
cd fireplexity
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env.local
```

Add required API keys to `.env.local`:

```env
# Required: Serper API for Google search
SERPER_API_KEY=your-serper-api-key

# Optional LLM providers (add any combination you want to use):
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key  
GROQ_API_KEY=gsk_your-groq-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-key

# Optional: Local LLM support (no API key needed)
OLLAMA_BASE_URL=http://localhost:11434

# Optional: LLM Strategy (performance, cost, balanced, local)
LLM_STRATEGY=balanced
```

### 3. Start Services

Start the required Docker services:

```bash
# Start Crawl4AI scraping service
docker run -d -p 11235:11235 unclecode/crawl4ai:latest

# Start LiteLLM proxy
docker run -d -p 14782:4000 ghcr.io/berriai/litellm:main-latest

# Start Redis cache
docker run -d -p 29674:6379 redis:alpine
```

### 4. Run Development Server

```bash
npm run dev
```

Visit http://localhost:18563

## API Keys Setup

### Required APIs

1. **Serper API** (Google Search)
   - Get key at: https://serper.dev
   - Free tier: 2,500 searches/month
   - Cost: ~$5 per 1,000 searches

### Optional LLM Providers

Choose any combination of these providers (or use only Ollama for a completely free setup):

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys
- **Groq**: https://console.groq.com/keys
- **Google AI**: https://aistudio.google.com/app/apikey
- **Ollama**: For local LLM inference (free, no API key needed)

## Docker Compose Setup (Recommended)

For easier service management, create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  crawl4ai:
    image: unclecode/crawl4ai:latest
    ports:
      - "11235:11235"
    restart: unless-stopped

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    ports:
      - "14782:4000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "29674:6379"
    restart: unless-stopped
```

Then run: `docker-compose up -d`

## Configuration

### Service Ports

- **Frontend**: http://localhost:18563
- **Crawl4AI**: http://localhost:11235
- **LiteLLM**: http://localhost:14782
- **Redis**: localhost:29674

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SERPER_API_KEY` | Google search API key | Required |
| `CRAWL4AI_BASE_URL` | Crawl4AI service URL | `http://localhost:11235` |
| `LITELLM_BASE_URL` | LiteLLM proxy URL | `http://localhost:14782` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:29674` |

## Tech Stack

### Backend Services
- **Serper API** - Google search results
- **Crawl4AI** - Self-hosted web scraping
- **LiteLLM** - Multi-provider LLM proxy
- **Redis** - Caching and session storage

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vercel AI SDK** - Streaming AI responses
- **Sonner** - Toast notifications

### Key Features
- **Streaming Responses** - Real-time AI answer generation
- **Source Citations** - Automatic reference linking
- **Parallel Processing** - Concurrent web scraping
- **Smart Caching** - Optimized performance
- **Error Recovery** - Fallback strategies for failed requests

## Deployment

### Vercel (Recommended)

1. Deploy to Vercel:
   ```bash
   npx vercel
   ```

2. Set environment variables in Vercel dashboard

3. Ensure your Docker services are accessible (use cloud hosting for production)

### Self-Hosted

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Use a reverse proxy (nginx/Apache) for SSL and domain routing

## Advanced Usage

### Custom LLM Models

Configure specific models in LiteLLM:

```env
LITELLM_MODEL=gpt-4o-mini  # OpenAI
LITELLM_MODEL=claude-3-sonnet-20240229  # Anthropic
LITELLM_MODEL=mixtral-8x7b-32768  # Groq
```

### Search Optimization

Adjust search parameters in the API route:
- Result count
- Content filtering
- Crawling strategies
- Cache TTL

### Local LLM Setup

Use Ollama for completely local AI:

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama2`
3. Set `OLLAMA_BASE_URL=http://localhost:11434`

## Troubleshooting

### Service Health Checks

The app includes health checks for all services:
- Crawl4AI: `GET /health`
- LiteLLM: `GET /health`
- Redis: Connection test

### Common Issues

1. **Services not starting**: Check Docker containers are running
2. **Search failing**: Verify Serper API key is valid
3. **No AI responses**: Ensure at least one LLM provider is configured
4. **Slow responses**: Check Redis cache and increase parallel crawling

### Debug Mode

Enable detailed logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

## Acknowledgments

- [Crawl4AI](https://crawl4ai.com) - Advanced web scraping
- [Serper](https://serper.dev) - Google search API
- [LiteLLM](https://litellm.ai) - Multi-provider LLM proxy
- [Next.js](https://nextjs.org) - React framework

---

**Crawlplexity** - Self-hosted AI search that puts you in control