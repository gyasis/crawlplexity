#!/bin/bash

# Crawlplexity Development Setup Script

echo "🚀 Starting Crawlplexity Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Copying from .env.example..."
    cp .env.example .env.local
    echo "📝 Please edit .env.local with your API keys before continuing."
    echo "   Required: SERPER_API_KEY and at least one LLM provider key"
    exit 1
fi

# Pull latest Crawl4AI image
echo "📦 Pulling latest Crawl4AI Docker image..."
docker pull unclecode/crawl4ai:latest

# Start services with Docker Compose
echo "🔄 Starting Crawlplexity services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check Crawl4AI health
if curl -sf http://localhost:11235/health > /dev/null; then
    echo "✅ Crawl4AI service is healthy"
else
    echo "❌ Crawl4AI service is not responding"
    exit 1
fi

# Check Redis health
if docker exec crawlplexity-redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis service is healthy"
else
    echo "❌ Redis service is not responding"
    exit 1
fi

echo ""
# Check LiteLLM health
if curl -sf http://localhost:8001/health > /dev/null; then
    echo "✅ LiteLLM service is healthy"
else
    echo "❌ LiteLLM service is not responding"
    exit 1
fi

echo ""
echo "🎉 Crawlplexity services are ready!"
echo ""
echo "📊 Service URLs:"
echo "   Crawl4AI API: http://localhost:11235"
echo "   Crawl4AI Playground: http://localhost:11235/playground"
echo "   LiteLLM API: http://localhost:8001"
echo "   LiteLLM Models: http://localhost:8001/models"
echo "   Redis: localhost:6379"
echo ""
echo "🔧 Next steps:"
echo "   1. Run 'npm run dev' to start the Next.js development server"
echo "   2. Test the new /api/crawlplexity/search endpoint"
echo "   3. Check available LLM models: curl http://localhost:8001/models"
echo ""
echo "🛑 To stop services: docker-compose down"