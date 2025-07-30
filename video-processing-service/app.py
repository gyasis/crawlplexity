from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import asyncio
import re
from contextlib import asynccontextmanager

from core.config import settings
from services.url_classifier import URLClassifier
from services.video_processor import VideoProcessor
from services.gemini_service import GeminiService
from utils.cache import CacheManager

# Initialize cache manager
cache_manager = CacheManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await cache_manager.initialize()
    print(f"Video Processing Service started on port 11236")
    print(f"Gemini API Key configured: {bool(settings.GOOGLE_AI_API_KEY)}")
    yield
    # Shutdown
    await cache_manager.close()

app = FastAPI(
    title="Video Processing Service",
    description="Comprehensive video and image processing service using Gemini",
    version="1.0.0",
    lifespan=lifespan
)

class ProcessRequest(BaseModel):
    url: str
    search_query: str
    processing_mode: Optional[str] = "comprehensive"
    custom_prompt: Optional[str] = None
    use_cache: Optional[bool] = True

class ProcessResponse(BaseModel):
    type: str
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    cached: bool = False
    error: Optional[str] = None

class ClassifyRequest(BaseModel):
    url: str

class ClassifyResponse(BaseModel):
    type: str
    platform: Optional[str] = None
    extension: Optional[str] = None

@app.get("/")
async def root():
    return {
        "service": "Video Processing Service",
        "status": "running",
        "endpoints": ["/process", "/classify", "/health", "/cache/stats"]
    }

@app.post("/classify")
async def classify_url(request: ClassifyRequest) -> ClassifyResponse:
    """Quick URL classification endpoint"""
    try:
        classification = URLClassifier.classify(request.url)
        return ClassifyResponse(
            type=classification["type"],
            platform=classification.get("platform"),
            extension=classification.get("extension")
        )
    except Exception as e:
        # Default to webpage on any error
        return ClassifyResponse(type="webpage")

@app.post("/process")
async def process_content(request: ProcessRequest):
    """Main endpoint that intelligently routes to appropriate processor"""
    
    # Check if Gemini API key is configured
    if not settings.GOOGLE_AI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Video and image processing requires GOOGLE_AI_API_KEY."
        )
    
    # Classify URL
    url_info = URLClassifier.classify(request.url)
    
    # Check cache if enabled
    if request.use_cache:
        cache_key = cache_manager.generate_key(request.url, request.search_query)
        cached_result = await cache_manager.get(cache_key)
        if cached_result:
            return ProcessResponse(
                type=cached_result.get("type", "unknown"),
                content=cached_result.get("content"),
                metadata=cached_result.get("metadata"),
                cached=True
            )
    
    try:
        if url_info["type"] == "video":
            # Use comprehensive video processing
            processor = VideoProcessor(gemini_api_key=settings.GOOGLE_AI_API_KEY)
            
            # Stream results as they're generated
            async def stream_video_processing():
                try:
                    full_content = []
                    metadata = {}
                    
                    async for chunk in processor.process_video_comprehensive(
                        url=request.url,
                        search_query=request.search_query,
                        custom_prompt=request.custom_prompt
                    ):
                        # Accumulate content for caching
                        if chunk.get("status") == "content":
                            full_content.append(chunk.get("content", ""))
                        elif chunk.get("status") == "metadata":
                            metadata.update(chunk.get("data", {}))
                        
                        # Stream to client
                        yield f"data: {json.dumps(chunk)}\n\n"
                    
                    # Cache the complete result
                    if request.use_cache and full_content:
                        await cache_manager.set(
                            cache_key,
                            {
                                "type": "video",
                                "content": "\n\n".join(full_content),
                                "metadata": metadata
                            },
                            ttl=settings.CACHE_TTL_SECONDS
                        )
                    
                except Exception as e:
                    error_chunk = {
                        "status": "error",
                        "message": str(e)
                    }
                    yield f"data: {json.dumps(error_chunk)}\n\n"
            
            return StreamingResponse(
                stream_video_processing(),
                media_type="text/event-stream"
            )
        
        elif url_info["type"] == "image":
            # Process image with Gemini
            gemini = GeminiService(api_key=settings.GOOGLE_AI_API_KEY)
            
            prompt = request.custom_prompt or f"""
            Analyze this image in the context of the search query: "{request.search_query}"
            
            Extract:
            1. Visual elements and their relevance to the query
            2. Any text or code visible in the image
            3. Diagrams, charts, or technical illustrations
            4. Key insights related to the search context
            
            Format as detailed markdown.
            """
            
            result = await gemini.process_image(
                image_url=request.url,
                prompt=prompt
            )
            
            # Cache the result
            if request.use_cache:
                await cache_manager.set(
                    cache_key,
                    {
                        "type": "image",
                        "content": result,
                        "metadata": {"url": request.url}
                    },
                    ttl=settings.CACHE_TTL_SECONDS
                )
            
            return ProcessResponse(
                type="image",
                content=result,
                metadata={"url": request.url}
            )
        
        else:
            # Regular webpage - return indication to use Crawl4AI
            return ProcessResponse(
                type="webpage",
                metadata={"redirect": "crawl4ai", "url": request.url}
            )
    
    except Exception as e:
        return ProcessResponse(
            type="error",
            error=str(e)
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "service": "video-processing",
        "version": "1.0.0",
        "gemini_configured": bool(settings.GOOGLE_AI_API_KEY)
    }
    
    # Check Redis connection
    try:
        await cache_manager.ping()
        health_status["redis"] = "connected"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check if critical dependencies are missing
    if not settings.GOOGLE_AI_API_KEY:
        health_status["status"] = "degraded"
        health_status["warnings"] = ["Gemini API key not configured"]
    
    return health_status

@app.get("/cache/stats")
async def cache_stats():
    """Get cache statistics"""
    return await cache_manager.get_stats()

@app.delete("/cache/clear")
async def clear_cache(pattern: Optional[str] = Query(None, description="Pattern to match keys")):
    """Clear cache entries"""
    if pattern:
        count = await cache_manager.clear_pattern(pattern)
        return {"cleared": count, "pattern": pattern}
    else:
        count = await cache_manager.clear_all()
        return {"cleared": count, "pattern": "*"}

@app.get("/supported-formats")
async def supported_formats():
    """Get list of supported video and image formats"""
    return {
        "video": URLClassifier.VIDEO_EXTENSIONS,
        "image": URLClassifier.IMAGE_EXTENSIONS,
        "platforms": list(URLClassifier.VIDEO_PLATFORMS.keys())
    }