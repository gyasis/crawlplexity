"""
LiteLLM Proxy Service for Crawlplexity
Provides unified OpenAI-compatible API for multiple LLM providers
"""

import os
import time
import json
import asyncio
import logging
from typing import List, Dict, Optional, Any
from contextlib import asynccontextmanager

import litellm
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure LiteLLM
litellm.drop_params = True  # Drop unsupported params instead of failing
litellm.set_verbose = False  # Reduce noise

app = FastAPI(
    title="Crawlplexity LiteLLM Proxy",
    description="Unified LLM API supporting multiple providers",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model configurations with fallback priorities
MODEL_CONFIGS = [
    {
        "model": "gpt-4o-mini",
        "provider": "openai",
        "api_key_env": "OPENAI_API_KEY",
        "priority": 1,
        "cost_per_1k_tokens": 0.15,
        "task_types": ["general", "search", "summary", "followup"],
        "max_tokens": 4096
    },
    {
        "model": "claude-3-haiku-20240307",
        "provider": "anthropic", 
        "api_key_env": "ANTHROPIC_API_KEY",
        "priority": 2,
        "cost_per_1k_tokens": 0.25,
        "task_types": ["general", "summary", "followup"],
        "max_tokens": 4096
    },
    {
        "model": "gemini-pro",
        "provider": "google",
        "api_key_env": "GOOGLE_API_KEY", 
        "priority": 3,
        "cost_per_1k_tokens": 0.50,
        "task_types": ["general", "search", "followup"],
        "max_tokens": 2048
    },
    {
        "model": "mixtral-8x7b-32768",
        "provider": "groq",
        "api_key_env": "GROQ_API_KEY",
        "priority": 4,
        "cost_per_1k_tokens": 0.27,
        "task_types": ["general", "search"],
        "max_tokens": 32768
    },
    {
        "model": "llama3.1:8b",
        "provider": "ollama",
        "api_base": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "priority": 5,
        "cost_per_1k_tokens": 0.0,  # Free local hosting
        "task_types": ["general", "summary"],
        "max_tokens": 2048
    }
]

# Filter available models based on environment variables
AVAILABLE_MODELS = []
for config in MODEL_CONFIGS:
    if config.get("api_key_env"):
        if os.getenv(config["api_key_env"]):
            AVAILABLE_MODELS.append(config)
            logger.info(f"✅ {config['model']} ({config['provider']}) - Available")
        else:
            logger.info(f"❌ {config['model']} ({config['provider']}) - Missing API key: {config['api_key_env']}")
    else:
        # Models without API key requirement (like Ollama)
        AVAILABLE_MODELS.append(config)
        logger.info(f"✅ {config['model']} ({config['provider']}) - Available (no API key required)")

if not AVAILABLE_MODELS:
    logger.error("❌ No LLM providers configured! Please set at least one API key.")

# Pydantic models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False
    task_type: Optional[str] = "general"  # Custom field for model selection
    strategy: Optional[str] = "balanced"  # performance, cost, balanced, local

class ModelInfo(BaseModel):
    model: str
    provider: str
    available: bool
    priority: int
    cost_per_1k_tokens: float
    task_types: List[str]
    max_tokens: int

# Model selection logic
def select_optimal_model(task_type: str = "general", strategy: str = "balanced", requested_model: str = None) -> Dict:
    """Select the best model based on task type and strategy"""
    
    if requested_model:
        # Use specific model if requested
        for config in AVAILABLE_MODELS:
            if config["model"] == requested_model:
                return config
        logger.warning(f"Requested model {requested_model} not available, falling back to auto-selection")
    
    # Filter models suitable for task type
    suitable_models = [
        config for config in AVAILABLE_MODELS 
        if task_type in config.get("task_types", ["general"])
    ]
    
    if not suitable_models:
        suitable_models = AVAILABLE_MODELS  # Fallback to all available
    
    # Apply strategy
    if strategy == "cost":
        return min(suitable_models, key=lambda x: x["cost_per_1k_tokens"])
    elif strategy == "performance":
        return min(suitable_models, key=lambda x: x["priority"])
    elif strategy == "local":
        local_models = [m for m in suitable_models if m["provider"] == "ollama"]
        return local_models[0] if local_models else suitable_models[0]
    else:  # balanced
        return min(suitable_models, key=lambda x: x["priority"])

async def call_litellm(request: ChatRequest, selected_model: Dict) -> Any:
    """Call LiteLLM with the selected model"""
    
    # Prepare LiteLLM arguments
    kwargs = {
        "model": selected_model["model"],
        "messages": [{"role": msg.role, "content": msg.content} for msg in request.messages],
        "temperature": request.temperature,
        "stream": request.stream,
    }
    
    # Set max_tokens appropriately
    max_tokens = request.max_tokens or min(selected_model["max_tokens"], 2000)
    kwargs["max_tokens"] = max_tokens
    
    # Add provider-specific configurations
    if selected_model["provider"] == "anthropic":
        kwargs["api_key"] = os.getenv(selected_model["api_key_env"])
    elif selected_model["provider"] == "google":
        kwargs["api_key"] = os.getenv(selected_model["api_key_env"])
    elif selected_model["provider"] == "groq":
        kwargs["api_key"] = os.getenv(selected_model["api_key_env"])
    elif selected_model["provider"] == "ollama":
        kwargs["api_base"] = selected_model["api_base"]
        kwargs["api_key"] = "ollama"  # Dummy key for Ollama
    elif selected_model["provider"] == "openai":
        kwargs["api_key"] = os.getenv(selected_model["api_key_env"])
    
    try:
        if request.stream:
            return await litellm.acompletion(**kwargs)
        else:
            return await litellm.acompletion(**kwargs)
    except Exception as e:
        logger.error(f"LiteLLM call failed for {selected_model['model']}: {str(e)}")
        raise

async def try_with_fallback(request: ChatRequest, max_retries: int = 2) -> Any:
    """Try multiple models with fallback on failure"""
    
    selected_model = select_optimal_model(
        task_type=request.task_type,
        strategy=request.strategy,
        requested_model=request.model
    )
    
    for attempt in range(max_retries + 1):
        try:
            logger.info(f"Attempt {attempt + 1}: Using {selected_model['model']} ({selected_model['provider']})")
            return await call_litellm(request, selected_model), selected_model
            
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed with {selected_model['model']}: {str(e)}")
            
            if attempt < max_retries:
                # Try next available model
                remaining_models = [
                    m for m in AVAILABLE_MODELS 
                    if m["model"] != selected_model["model"] and 
                    request.task_type in m.get("task_types", ["general"])
                ]
                
                if remaining_models:
                    selected_model = min(remaining_models, key=lambda x: x["priority"])
                    logger.info(f"Falling back to {selected_model['model']}")
                    continue
            
            # If all retries failed
            raise HTTPException(
                status_code=500,
                detail=f"All LLM providers failed. Last error: {str(e)}"
            )

@app.get("/")
async def root():
    return {
        "service": "Crawlplexity LiteLLM Proxy",
        "version": "1.0.0",
        "available_models": len(AVAILABLE_MODELS),
        "status": "healthy"
    }

@app.get("/v1/models")
async def list_models():
    """OpenAI-compatible models endpoint"""
    models = []
    for config in AVAILABLE_MODELS:
        models.append({
            "id": config["model"],
            "object": "model",
            "created": int(time.time()),
            "owned_by": config["provider"],
            "permission": [],
            "root": config["model"],
            "parent": None,
        })
    
    return {"object": "list", "data": models}

@app.get("/models")
async def get_model_info():
    """Get detailed model information"""
    return {
        "available_models": [
            ModelInfo(
                model=config["model"],
                provider=config["provider"],
                available=True,
                priority=config["priority"],
                cost_per_1k_tokens=config["cost_per_1k_tokens"],
                task_types=config["task_types"],
                max_tokens=config["max_tokens"]
            )
            for config in AVAILABLE_MODELS
        ],
        "total_available": len(AVAILABLE_MODELS)
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """OpenAI-compatible chat completions endpoint"""
    
    if not AVAILABLE_MODELS:
        raise HTTPException(
            status_code=503,
            detail="No LLM providers available. Please configure API keys."
        )
    
    try:
        start_time = time.time()
        response, selected_model = await try_with_fallback(request)
        latency = time.time() - start_time
        
        if request.stream:
            # Handle streaming response
            async def generate_stream():
                try:
                    async for chunk in response:
                        yield f"data: {json.dumps(chunk.dict())}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as e:
                    error_chunk = {
                        "error": {
                            "message": str(e),
                            "type": "stream_error"
                        }
                    }
                    yield f"data: {json.dumps(error_chunk)}\n\n"
            
            return StreamingResponse(
                generate_stream(),
                media_type="text/plain",
                headers={
                    "X-Selected-Model": selected_model["model"],
                    "X-Selected-Provider": selected_model["provider"],
                    "X-Latency-Ms": str(int(latency * 1000))
                }
            )
        else:
            # Handle non-streaming response
            response_dict = response.dict() if hasattr(response, 'dict') else response
            
            # Add metadata
            response_dict["x_metadata"] = {
                "selected_model": selected_model["model"],
                "selected_provider": selected_model["provider"],
                "latency_ms": int(latency * 1000),
                "cost_per_1k_tokens": selected_model["cost_per_1k_tokens"]
            }
            
            return response_dict
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat_completions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    healthy_models = []
    unhealthy_models = []
    
    for config in AVAILABLE_MODELS:
        try:
            # Simple test call to check if model is accessible
            test_response = await litellm.acompletion(
                model=config["model"],
                messages=[{"role": "user", "content": "test"}],
                max_tokens=1,
                api_key=os.getenv(config.get("api_key_env", ""), "test")
            )
            healthy_models.append(config["model"])
        except:
            unhealthy_models.append(config["model"])
    
    return {
        "status": "healthy" if healthy_models else "unhealthy",
        "timestamp": time.time(),
        "healthy_models": healthy_models,
        "unhealthy_models": unhealthy_models,
        "total_configured": len(AVAILABLE_MODELS)
    }

if __name__ == "__main__":
    port = int(os.getenv("LITELLM_PORT", 14782))
    host = os.getenv("LITELLM_HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting Crawlplexity LiteLLM Proxy on {host}:{port}")
    logger.info(f"📊 Available models: {len(AVAILABLE_MODELS)}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )