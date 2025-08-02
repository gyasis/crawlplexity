"""
LiteLLM Proxy Service for Crawlplexity
Provides unified OpenAI-compatible API for multiple LLM providers
"""

import os
import time
import json
import asyncio
import logging
import threading
from typing import List, Dict, Optional, Any, Union
from contextlib import asynccontextmanager

import litellm
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, validator
import uvicorn
from dotenv import load_dotenv
import redis
import httpx

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure LiteLLM
litellm.drop_params = True  # Drop unsupported params instead of failing
litellm.set_verbose = False  # Reduce noise

def find_best_model_match(requested_model: str, available_models: List[str]) -> Optional[str]:
    """
    Find the best matching model from available models using intelligent fuzzy matching.
    
    Handles remote model IDs like: remote_edl9t5a53mdsu3ttw_mistral-nemo:12b
    Maps to available models like: mistral-nemo:12b
    
    Ensures accuracy for similar models like mistral:10b vs mistral:22b
    """
    if not requested_model or not available_models:
        return None
    
    logger.info(f"🔍 Fuzzy matching '{requested_model}' against {len(available_models)} available models")
    
    # Clean the requested model name by removing remote prefixes
    clean_requested = requested_model
    
    # Remove remote ID prefixes (remote_<id>_)
    if clean_requested.startswith('remote_'):
        # Pattern: remote_<id>_<model_name>
        parts = clean_requested.split('_', 2)  # Split into max 3 parts
        if len(parts) >= 3:
            clean_requested = parts[2]  # Take everything after remote_<id>_
            logger.info(f"  • Cleaned remote ID: '{requested_model}' → '{clean_requested}'")
    
    # Try exact match with cleaned name first
    if clean_requested in available_models:
        logger.info(f"  • ✅ Exact match found: '{clean_requested}'")
        return clean_requested
    
    # For fuzzy matching, we'll use a scoring system
    best_match = None
    best_score = 0
    
    for available_model in available_models:
        score = calculate_model_similarity(clean_requested, available_model)
        logger.info(f"  • '{available_model}': score={score:.3f}")
        
        if score > best_score and score >= 0.7:  # Minimum threshold of 70% similarity
            best_score = score
            best_match = available_model
    
    if best_match:
        logger.info(f"  • ✅ Best fuzzy match: '{best_match}' (score={best_score:.3f})")
    else:
        logger.info(f"  • ❌ No suitable fuzzy match found (best score: {best_score:.3f})")
    
    return best_match

def calculate_model_similarity(requested: str, available: str) -> float:
    """
    Calculate similarity score between two model names.
    Returns a score between 0.0 and 1.0 where 1.0 is perfect match.
    
    Takes into account:
    - Exact model name match
    - Version/size parameter match (e.g., :12b, :10b)
    - Provider prefix handling (e.g., anthropic/, ollama/)
    """
    # Normalize both strings
    req_lower = requested.lower()
    avail_lower = available.lower()
    
    # Exact match gets perfect score
    if req_lower == avail_lower:
        return 1.0
    
    # Extract model base name and parameters
    req_base, req_params = extract_model_parts(req_lower)
    avail_base, avail_params = extract_model_parts(avail_lower)
    
    # Base name similarity (most important)
    base_similarity = calculate_string_similarity(req_base, avail_base)
    
    # Parameter similarity (very important for distinguishing models)
    param_similarity = 1.0 if req_params == avail_params else 0.3
    
    # If parameters are different but bases are very similar, reduce score significantly
    if base_similarity > 0.8 and req_params != avail_params and req_params and avail_params:
        # This handles cases like mistral:10b vs mistral:22b
        return base_similarity * 0.5  # Heavily penalize parameter mismatch
    
    # Weight the scores: base name is most important, parameters are crucial for accuracy
    final_score = (base_similarity * 0.7) + (param_similarity * 0.3)
    
    return final_score

def extract_model_parts(model_name: str) -> tuple[str, str]:
    """
    Extract base model name and parameters from a model string.
    
    Examples:
    - 'mistral-nemo:12b' → ('mistral-nemo', '12b')
    - 'anthropic/claude-3-haiku' → ('claude-3-haiku', '')
    - 'gpt-4o-mini' → ('gpt-4o-mini', '')
    """
    # Remove provider prefixes
    if '/' in model_name:
        model_name = model_name.split('/', 1)[1]
    
    # Split on colon for version/size parameters
    if ':' in model_name:
        base, params = model_name.split(':', 1)
        return base.strip(), params.strip()
    
    return model_name.strip(), ''

def calculate_string_similarity(str1: str, str2: str) -> float:
    """
    Calculate string similarity using a combination of metrics.
    """
    if str1 == str2:
        return 1.0
    
    if not str1 or not str2:
        return 0.0
    
    # Check if one string contains the other (common for model variants)
    if str1 in str2 or str2 in str1:
        shorter = min(len(str1), len(str2))
        longer = max(len(str1), len(str2))
        return shorter / longer
    
    # Calculate character overlap
    set1 = set(str1)
    set2 = set(str2)
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    
    if union == 0:
        return 0.0
    
    return intersection / union

# Redis connection for dynamic configuration
redis_client = None
try:
    redis_client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 29674)),
        decode_responses=True
    )
    redis_client.ping()
    logger.info("✅ Connected to Redis for dynamic configuration")
except Exception as e:
    logger.warning(f"⚠️ Redis not available for dynamic configuration: {e}")
    redis_client = None

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
        "max_tokens": 128000  # GPT-4o-mini supports 128K context
    },
    {
        "model": "claude-3-haiku-20240307",
        "provider": "anthropic", 
        "api_key_env": "ANTHROPIC_API_KEY",
        "priority": 2,
        "cost_per_1k_tokens": 0.25,
        "task_types": ["general", "summary", "followup"],
        "max_tokens": 200000  # Claude-3 Haiku supports 200K context
    },
    {
        "model": "gemini-pro",
        "provider": "google",
        "api_key_env": "GOOGLE_API_KEY", 
        "priority": 3,
        "cost_per_1k_tokens": 0.50,
        "task_types": ["general", "search", "followup"],
        "max_tokens": 32768  # Gemini Pro supports 32K context
    },
    {
        "model": "mixtral-8x7b-32768",
        "provider": "groq",
        "api_key_env": "GROQ_API_KEY",
        "priority": 4,
        "cost_per_1k_tokens": 0.27,
        "task_types": ["general", "search"],
        "max_tokens": 32768  # Mixtral supports 32K context (unchanged)
    },
    {
        "model": "llama3.1:8b",
        "provider": "ollama",
        "api_base": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "priority": 5,
        "cost_per_1k_tokens": 0.0,  # Free local hosting
        "task_types": ["general", "summary"],
        "max_tokens": 128000  # Llama 3.1 supports 128K context
    }
]

# Global model registry - can be updated dynamically
AVAILABLE_MODELS = []
PARAMETER_SCHEMA = {}
model_registry_lock = threading.RLock()

# Load parameter schema
def load_parameter_schema():
    global PARAMETER_SCHEMA
    try:
        schema_path = os.path.join(os.path.dirname(__file__), 'parameters.json')
        with open(schema_path, 'r') as f:
            PARAMETER_SCHEMA = json.load(f)
        logger.info(f"✅ Loaded parameter schema with {len(PARAMETER_SCHEMA)} parameters")
        return PARAMETER_SCHEMA
    except Exception as e:
        logger.error(f"❌ Failed to load parameter schema: {e}")
        return {}

# Parameter validation functions
def validate_parameter_value(param_name: str, value: Any, schema: Dict) -> Optional[str]:
    """Validate a single parameter value against its schema"""
    param_schema = schema.get(param_name, {})
    
    # Type validation
    expected_type = param_schema.get('type')
    if expected_type == 'integer' and not isinstance(value, int):
        return f"{param_name} must be an integer, got {type(value).__name__}"
    elif expected_type == 'number' and not isinstance(value, (int, float)):
        return f"{param_name} must be a number, got {type(value).__name__}"
    elif expected_type == 'string' and not isinstance(value, str):
        return f"{param_name} must be a string, got {type(value).__name__}"
    elif expected_type == 'boolean' and not isinstance(value, bool):
        return f"{param_name} must be a boolean, got {type(value).__name__}"
    elif expected_type == 'array' and not isinstance(value, list):
        return f"{param_name} must be an array, got {type(value).__name__}"
    elif expected_type == 'object' and not isinstance(value, dict):
        return f"{param_name} must be an object, got {type(value).__name__}"
    
    # Range validation for numbers
    if expected_type in ['integer', 'number'] and isinstance(value, (int, float)):
        min_val = param_schema.get('minimum')
        max_val = param_schema.get('maximum')
        if min_val is not None and value < min_val:
            return f"{param_name} must be at least {min_val}, got {value}"
        if max_val is not None and value > max_val:
            return f"{param_name} must be at most {max_val}, got {value}"
    
    # Enum validation
    enum_values = param_schema.get('enum')
    if enum_values and value not in enum_values:
        return f"{param_name} must be one of {enum_values}, got {value}"
    
    # Alert threshold check
    alert_threshold = param_schema.get('alert_threshold')
    if alert_threshold and isinstance(value, (int, float)) and value > alert_threshold:
        logger.warning(f"⚠️ PARAMETER ALERT: {param_name}={value} exceeds recommended threshold of {alert_threshold}")
    
    return None

def validate_parameters(request_data: Dict, schema: Dict) -> Optional[str]:
    """Validate all parameters in a request against the schema"""
    errors = []
    
    # Check required parameters
    for param_name, param_schema in schema.items():
        if param_schema.get('required', False) and param_name not in request_data:
            errors.append(f"Missing required parameter: {param_name}")
    
    # Validate provided parameters
    for param_name, value in request_data.items():
        if param_name in schema:
            error = validate_parameter_value(param_name, value, schema)
            if error:
                errors.append(error)
        else:
            # Log unknown parameters but don't fail
            logger.warning(f"⚠️ Unknown parameter: {param_name}={value}")
    
    return "; ".join(errors) if errors else None

def apply_parameter_defaults(request_data: Dict, schema: Dict) -> Dict:
    """Apply default values for missing parameters"""
    result = request_data.copy()
    
    # Parameters that should NEVER have defaults applied (core chat fields)
    protected_fields = {'messages', 'model'}
    
    for param_name, param_schema in schema.items():
        if param_name in protected_fields:
            continue  # Skip protected fields
            
        if param_name not in result and 'default' in param_schema:
            default_value = param_schema['default']
            if default_value is not None:
                result[param_name] = default_value
    
    return result

# Load initial static models
def load_static_models():
    global AVAILABLE_MODELS
    static_models = []
    for config in MODEL_CONFIGS:
        if config.get("api_key_env"):
            if os.getenv(config["api_key_env"]):
                static_models.append(config)
                logger.info(f"✅ {config['model']} ({config['provider']}) - Available")
            else:
                logger.info(f"❌ {config['model']} ({config['provider']}) - Missing API key: {config['api_key_env']}")
        else:
            # Models without API key requirement (like Ollama)
            static_models.append(config)
            logger.info(f"✅ {config['model']} ({config['provider']}) - Available (no API key required)")
    
    with model_registry_lock:
        AVAILABLE_MODELS = static_models.copy()
    
    return static_models

# Load dynamic models from Redis
def load_dynamic_models():
    if not redis_client:
        return []
    
    try:
        dynamic_models = []
        model_keys = redis_client.keys('litellm:model:*')
        
        for key in model_keys:
            model_data = redis_client.hgetall(key)
            if model_data:
                # Convert Redis hash to model config format
                config = {
                    'model': model_data.get('model'),
                    'provider': model_data.get('provider'),
                    'api_key': model_data.get('api_key'),
                    'api_base': model_data.get('api_base'),
                    'priority': int(model_data.get('priority', 999)),
                    'cost_per_1k_tokens': float(model_data.get('cost_per_1k_tokens', 0)),
                    'task_types': json.loads(model_data.get('task_types', '["general"]')),
                    'max_tokens': int(model_data.get('max_tokens', 2048)),
                    'dynamic': True  # Mark as dynamic model
                }
                dynamic_models.append(config)
                logger.info(f"🔄 Loaded dynamic model: {config['model']} ({config['provider']})")
        
        return dynamic_models
    except Exception as e:
        logger.error(f"❌ Error loading dynamic models from Redis: {e}")
        return []

# Initialize models
# Load parameter schema
PARAMETER_SCHEMA = load_parameter_schema()

static_models = load_static_models()
dynamic_models = load_dynamic_models()

with model_registry_lock:
    AVAILABLE_MODELS = static_models + dynamic_models

# Start background model refresh (optional - for periodic sync)
def background_model_refresh():
    """Background task to periodically refresh models from Redis"""
    while True:
        try:
            time.sleep(30)  # Check every 30 seconds
            if redis_client:
                old_count = len(AVAILABLE_MODELS)
                refresh_models_from_redis()
                new_count = len(AVAILABLE_MODELS)
                if old_count != new_count:
                    logger.info(f"🔄 Background refresh: {old_count} -> {new_count} models")
        except Exception as e:
            logger.error(f"❌ Background model refresh error: {e}")
            time.sleep(60)  # Wait longer on error

def log_available_models():
    with model_registry_lock:
        if not AVAILABLE_MODELS:
            logger.error("❌ No LLM providers configured! Please set at least one API key.")
        else:
            logger.info(f"🎯 AVAILABLE MODELS SUMMARY:")
            static_count = len([m for m in AVAILABLE_MODELS if not m.get('dynamic', False)])
            dynamic_count = len([m for m in AVAILABLE_MODELS if m.get('dynamic', False)])
            logger.info(f"  📊 Total: {len(AVAILABLE_MODELS)} models ({static_count} static, {dynamic_count} dynamic)")
            for i, model in enumerate(AVAILABLE_MODELS, 1):
                model_type = "🔄" if model.get('dynamic', False) else "🔧"
                logger.info(f"  {i}. {model_type} '{model['model']}' (provider: {model['provider']}, priority: {model['priority']}, cost: ${model['cost_per_1k_tokens']}/1k)")

log_available_models()

# Start background refresh thread
if redis_client:
    refresh_thread = threading.Thread(target=background_model_refresh, daemon=True)
    refresh_thread.start()
    logger.info("🔄 Started background model refresh thread")

# Pydantic models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    # Core required fields
    messages: List[ChatMessage]
    model: Optional[str] = None
    
    # All other parameters are optional and will be validated against schema
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: Optional[bool] = None
    top_p: Optional[float] = None
    n: Optional[int] = None
    presence_penalty: Optional[float] = None
    frequency_penalty: Optional[float] = None
    logit_bias: Optional[Dict] = None
    stop: Optional[Union[str, List[str]]] = None
    user: Optional[str] = None
    top_k: Optional[int] = None
    repetition_penalty: Optional[float] = None
    min_p: Optional[float] = None
    typical_p: Optional[float] = None
    seed: Optional[int] = None
    response_format: Optional[Dict] = None
    timeout: Optional[float] = None
    task_type: Optional[str] = None  # Custom field for model selection
    strategy: Optional[str] = None   # Custom field for model selection
    
    class Config:
        extra = "allow"  # Allow additional parameters not explicitly defined

class ModelInfo(BaseModel):
    model: str
    provider: str
    available: bool
    priority: int
    cost_per_1k_tokens: float
    task_types: List[str]
    max_tokens: int

class DynamicModelConfig(BaseModel):
    model: str
    provider: str
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    priority: Optional[int] = 999
    cost_per_1k_tokens: Optional[float] = 0.0
    task_types: Optional[List[str]] = ["general"]
    max_tokens: Optional[int] = 2048
    temperature: Optional[float] = 0.7
    health_check_endpoint: Optional[str] = None
    health_check_interval: Optional[int] = 60
    health_check_timeout: Optional[int] = 10
    
    @validator('provider')
    def validate_provider(cls, v):
        allowed_providers = ['openai', 'anthropic', 'google', 'groq', 'ollama', 'custom']
        if v not in allowed_providers:
            raise ValueError(f'Provider must be one of: {allowed_providers}')
        return v

class ModelValidationResult(BaseModel):
    model: str
    available: bool
    error: Optional[str] = None
    latency_ms: Optional[int] = None

# Load dynamic models from Redis
def load_dynamic_models() -> List[Dict]:
    """Load dynamic models from Redis"""
    if not redis_client:
        return []
    
    try:
        # Get all dynamic model keys
        model_keys = redis_client.keys("dynamic_model:*")
        
        dynamic_models = []
        for key in model_keys:
            try:
                model_data = redis_client.get(key)
                if model_data:
                    model_config = json.loads(model_data)
                    dynamic_models.append(model_config)
            except Exception as e:
                logger.error(f"Error loading model from key {key}: {e}")
        
        return dynamic_models
        
    except Exception as e:
        logger.error(f"Error loading dynamic models from Redis: {e}")
        return []

# Model validation
async def validate_model_config(config: Dict) -> ModelValidationResult:
    """Validate if a model configuration is working"""
    start_time = time.time()
    
    try:
        # Build the model identifier for LiteLLM
        # LiteLLM expects the format "provider/model-name" for all providers
        model_id = f"{config['provider']}/{config['model']}"
        
        # Test the model with a simple completion
        test_response = await litellm.acompletion(
            model=model_id,
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5,
            api_key=config.get("api_key"),
            api_base=config.get("api_base"),
            timeout=10
        )
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return ModelValidationResult(
            model=config["model"],
            available=True,
            latency_ms=latency_ms
        )
        
    except Exception as e:
        logger.error(f"Model validation failed for {config['model']}: {str(e)}")
        return ModelValidationResult(
            model=config["model"],
            available=False,
            error=str(e),
            latency_ms=int((time.time() - start_time) * 1000)
        )

# Model selection logic
def refresh_models_from_redis():
    """Refresh the model registry from Redis"""
    global AVAILABLE_MODELS
    if not redis_client:
        return
    
    try:
        dynamic_models = load_dynamic_models()
        static_models = [m for m in AVAILABLE_MODELS if not m.get('dynamic', False)]
        
        with model_registry_lock:
            AVAILABLE_MODELS = static_models + dynamic_models
        
        logger.info(f"🔄 Refreshed models: {len(static_models)} static + {len(dynamic_models)} dynamic = {len(AVAILABLE_MODELS)} total")
        
    except Exception as e:
        logger.error(f"❌ Error refreshing models from Redis: {e}")

def select_optimal_model(task_type: str = "general", strategy: str = "balanced", requested_model: str = None) -> Dict:
    """Select the best model based on task type and strategy"""
    
    # Refresh models in case of dynamic updates
    refresh_models_from_redis()
    
    # 🔥 Enhanced logging for model selection debugging
    with model_registry_lock:
        available_model_names = [m['model'] for m in AVAILABLE_MODELS]
    
    logger.info(f"🎯 MODEL SELECTION REQUEST:")
    logger.info(f"  • requested_model: '{requested_model}'")
    logger.info(f"  • task_type: '{task_type}'")
    logger.info(f"  • strategy: '{strategy}'")
    logger.info(f"  • available_models: {available_model_names}")
    
    if requested_model:
        # Use specific model if requested
        with model_registry_lock:
            for config in AVAILABLE_MODELS:
                if config["model"] == requested_model:
                    model_type = "🔄 Dynamic" if config.get('dynamic', False) else "🔧 Static"
                    logger.info(f"✅ FOUND EXACT MATCH: Using '{requested_model}' ({model_type})")
                    return config
        
        # Try fuzzy matching for remote model IDs
        logger.info(f"🔍 ATTEMPTING FUZZY MATCH for '{requested_model}'")
        fuzzy_match = find_best_model_match(requested_model, available_model_names)
        if fuzzy_match:
            with model_registry_lock:
                for config in AVAILABLE_MODELS:
                    if config["model"] == fuzzy_match:
                        model_type = "🔄 Dynamic" if config.get('dynamic', False) else "🔧 Static"
                        logger.info(f"✅ FOUND FUZZY MATCH: '{requested_model}' → '{fuzzy_match}' ({model_type})")
                        return config
        
        logger.warning(f"❌ REQUESTED MODEL NOT FOUND: '{requested_model}' not in available models, falling back to auto-selection")
        logger.warning(f"Available models: {available_model_names}")
    
    # Filter models suitable for task type
    with model_registry_lock:
        suitable_models = [
            config for config in AVAILABLE_MODELS 
            if task_type in config.get("task_types", ["general"])
        ]
        
        if not suitable_models:
            suitable_models = AVAILABLE_MODELS.copy()  # Fallback to all available
    
    # Apply strategy
    selected_model = None
    if strategy == "cost":
        selected_model = min(suitable_models, key=lambda x: x["cost_per_1k_tokens"])
        logger.info(f"🔍 COST STRATEGY: Selected '{selected_model['model']}'")
    elif strategy == "performance":
        selected_model = min(suitable_models, key=lambda x: x["priority"])
        logger.info(f"⚡ PERFORMANCE STRATEGY: Selected '{selected_model['model']}'")
    elif strategy == "local":
        local_models = [m for m in suitable_models if m["provider"] == "ollama"]
        selected_model = local_models[0] if local_models else suitable_models[0]
        logger.info(f"🏠 LOCAL STRATEGY: Selected '{selected_model['model']}' (local: {selected_model['provider'] == 'ollama'})")
    else:  # balanced
        selected_model = min(suitable_models, key=lambda x: x["priority"])
        logger.info(f"⚖️ BALANCED STRATEGY: Selected '{selected_model['model']}'")
    
    return selected_model

async def validate_model(config: DynamicModelConfig) -> ModelValidationResult:
    """Validate that a model configuration is working"""
    start_time = time.time()
    
    try:
        # Prepare test arguments
        test_kwargs = {
            "model": config.model,
            "messages": [{"role": "user", "content": "test"}],
            "max_tokens": 1,
            "temperature": 0.1
        }
        
        # Add provider-specific configurations
        if config.provider == "openai" and config.api_key:
            test_kwargs["api_key"] = config.api_key
        elif config.provider == "anthropic" and config.api_key:
            test_kwargs["api_key"] = config.api_key
        elif config.provider == "google" and config.api_key:
            test_kwargs["api_key"] = config.api_key
        elif config.provider == "groq" and config.api_key:
            test_kwargs["api_key"] = config.api_key
        elif config.provider == "ollama":
            test_kwargs["api_base"] = config.api_base or "http://localhost:11434"
            test_kwargs["api_key"] = "ollama"  # Dummy key
        elif config.provider == "custom":
            if config.api_base:
                test_kwargs["api_base"] = config.api_base
            if config.api_key:
                test_kwargs["api_key"] = config.api_key
        
        # Test the model
        response = await litellm.acompletion(**test_kwargs)
        latency_ms = int((time.time() - start_time) * 1000)
        
        return ModelValidationResult(
            model=config.model,
            available=True,
            latency_ms=latency_ms
        )
        
    except Exception as e:
        return ModelValidationResult(
            model=config.model,
            available=False,
            error=str(e)
        )

async def call_litellm(request: ChatRequest, selected_model: Dict) -> Any:
    """Call LiteLLM with the selected model"""
    
    # 🔥 Log the EXACT model being called
    logger.info(f"🤖 LITELLM CALL:")
    logger.info(f"  • model: '{selected_model['model']}'")
    logger.info(f"  • provider: '{selected_model['provider']}'")
    logger.info(f"  • temperature: {request.temperature}")
    logger.info(f"  • max_tokens: {request.max_tokens}")
    logger.info(f"  • stream: {request.stream}")
    logger.info(f"  • task_type: '{request.task_type}'")
    
    # Prepare LiteLLM arguments
    # LiteLLM expects the format "provider/model-name" for all providers
    litellm_model = f"{selected_model['provider']}/{selected_model['model']}"
    
    # 🔥 CRITICAL: Log the EXACT model identifier being sent to LiteLLM
    logger.info(f"📡 ACTUAL LITELLM CALL:")
    logger.info(f"  • litellm_model_id: '{litellm_model}' (this is what LiteLLM receives)")
    logger.info(f"  • original_model: '{selected_model['model']}'")
    logger.info(f"  • provider: '{selected_model['provider']}'")
    
    # Safely convert messages to dictionary format for LiteLLM
    messages_for_litellm = []
    for msg in request.messages:
        if hasattr(msg, 'role') and hasattr(msg, 'content'):
            # It's a ChatMessage object
            messages_for_litellm.append({"role": msg.role, "content": msg.content})
        elif isinstance(msg, dict) and 'role' in msg and 'content' in msg:
            # It's already a dictionary
            messages_for_litellm.append({"role": msg['role'], "content": msg['content']})
        else:
            # Fallback - log and try to handle
            logger.warning(f"⚠️ Unexpected message format: {type(msg)} - {msg}")
            if isinstance(msg, dict):
                messages_for_litellm.append({"role": msg.get('role', 'user'), "content": str(msg.get('content', ''))})
            else:
                messages_for_litellm.append({"role": 'user', "content": str(msg)})
    
    # 🔧 Universal parameters that work across all providers
    kwargs = {
        "model": litellm_model,
        "messages": messages_for_litellm,
        "drop_params": True,  # Enable graceful parameter dropping
    }
    
    # Core generation parameters (universal)
    if request.temperature is not None:
        kwargs["temperature"] = request.temperature
    if request.stream is not None:
        kwargs["stream"] = request.stream
    
    # Set max_tokens appropriately - respect model's actual limits
    if request.max_tokens:
        # User explicitly set max_tokens, respect it but cap at model's limit
        max_tokens = min(request.max_tokens, selected_model["max_tokens"])
    else:
        # No explicit limit, use a reasonable default but don't artificially cap
        max_tokens = min(4096, selected_model["max_tokens"])  # Remove the artificial 2000 limit
    
    kwargs["max_tokens"] = max_tokens
    
    # Additional universal parameters (only if set)
    if request.top_p is not None:
        kwargs["top_p"] = request.top_p
    if request.n is not None:
        kwargs["n"] = request.n
    if request.stop is not None:
        kwargs["stop"] = request.stop
    if request.seed is not None:
        kwargs["seed"] = request.seed
    if request.presence_penalty is not None:
        kwargs["presence_penalty"] = request.presence_penalty
    if request.frequency_penalty is not None:
        kwargs["frequency_penalty"] = request.frequency_penalty
    if request.timeout is not None:
        kwargs["timeout"] = request.timeout
    
    # System parameters
    if hasattr(request, 'num_retries') and request.num_retries is not None:
        kwargs["num_retries"] = request.num_retries
    
    # 🔥 CRITICAL: Log actual parameters being sent to LiteLLM
    logger.info(f"📋 ACTUAL PARAMETERS:")
    logger.info(f"  • temperature: {request.temperature} → {kwargs.get('temperature')}")
    logger.info(f"  • max_tokens: {request.max_tokens} → {max_tokens} (model_limit: {selected_model['max_tokens']})")
    logger.info(f"  • stream: {request.stream} → {kwargs.get('stream')}")
    logger.info(f"  • messages count: {len(messages_for_litellm)}")
    logger.info(f"  • first message type: {type(messages_for_litellm[0]) if messages_for_litellm else 'None'}")
    logger.info(f"  • first message content: {messages_for_litellm[0] if messages_for_litellm else 'None'}")
    
    # Add provider-specific configurations
    if selected_model["provider"] == "anthropic":
        # For dynamic models, use stored api_key; for static models, use env var
        kwargs["api_key"] = selected_model.get("api_key") or os.getenv(selected_model.get("api_key_env", "ANTHROPIC_API_KEY"))
    elif selected_model["provider"] == "google":
        kwargs["api_key"] = selected_model.get("api_key") or os.getenv(selected_model.get("api_key_env", "GOOGLE_API_KEY"))
    elif selected_model["provider"] == "groq":
        kwargs["api_key"] = selected_model.get("api_key") or os.getenv(selected_model.get("api_key_env", "GROQ_API_KEY"))
    elif selected_model["provider"] == "ollama":
        kwargs["api_base"] = selected_model.get("api_base") or selected_model.get("api_base", "http://localhost:11434")
        kwargs["api_key"] = "ollama"  # Dummy key for Ollama
    elif selected_model["provider"] == "openai":
        kwargs["api_key"] = selected_model.get("api_key") or os.getenv(selected_model.get("api_key_env", "OPENAI_API_KEY"))
    elif selected_model["provider"] == "custom" and selected_model.get("api_base"):
        kwargs["api_base"] = selected_model["api_base"]
        if selected_model.get("api_key"):
            kwargs["api_key"] = selected_model["api_key"]
    
    try:
        logger.info(f"📡 Making LiteLLM API call with kwargs: {dict((k, v if k != 'messages' else f'[{len(v)} messages]') for k, v in kwargs.items())}")
        logger.info(f"🔍 MESSAGES DEBUG: First message = {kwargs.get('messages', [])[0] if kwargs.get('messages') else 'NO MESSAGES'}")
        
        # Extra validation before calling LiteLLM
        messages_to_send = kwargs.get('messages', [])
        if messages_to_send:
            for i, msg in enumerate(messages_to_send):
                logger.info(f"  Message {i}: type={type(msg)}, content={msg}")
                if isinstance(msg, dict) and 'role' not in msg:
                    logger.error(f"  ❌ Message {i} is missing 'role' field!")
        
        if request.stream:
            result = await litellm.acompletion(**kwargs)
        else:
            result = await litellm.acompletion(**kwargs)
        
        # 🔥 CRITICAL: Log the actual model returned by LiteLLM
        actual_model_used = getattr(result, 'model', 'unknown')
        if hasattr(result, 'dict'):
            result_dict = result.dict()
            actual_model_used = result_dict.get('model', actual_model_used)
        elif hasattr(result, '__dict__'):
            actual_model_used = getattr(result, 'model', actual_model_used)
        
        logger.info(f"✅ LiteLLM call successful!")
        logger.info(f"  • requested_litellm_id: '{litellm_model}'")
        logger.info(f"  • actual_response_model: '{actual_model_used}'")
        logger.info(f"  • match_confirmed: {litellm_model.replace('/', '/') in str(actual_model_used)}")
        
        return result
    except Exception as e:
        logger.error(f"❌ LiteLLM call failed!")
        logger.error(f"  • requested_litellm_id: '{litellm_model}'")
        logger.error(f"  • error: {str(e)}")
        logger.error(f"  • error type: {type(e)}")
        logger.error(f"  • kwargs keys: {list(kwargs.keys())}")
        logger.error(f"  • messages count: {len(kwargs.get('messages', []))}")
        # Log the actual messages being sent
        for i, msg in enumerate(kwargs.get('messages', [])):
            logger.error(f"  • Message {i}: {msg}")
        import traceback
        logger.error(f"  • Traceback: {traceback.format_exc()}")
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
            logger.info(f"🚀 ATTEMPT {attempt + 1}: Using '{selected_model['model']}' (provider: {selected_model['provider']})")
            result = await call_litellm(request, selected_model)
            logger.info(f"✅ SUCCESS: '{selected_model['model']}' completed successfully")
            return result, selected_model
            
        except Exception as e:
            logger.warning(f"❌ ATTEMPT {attempt + 1} FAILED: '{selected_model['model']}' error: {str(e)}")
            
            if attempt < max_retries:
                # Try next available model
                remaining_models = [
                    m for m in AVAILABLE_MODELS 
                    if m["model"] != selected_model["model"] and 
                    request.task_type in m.get("task_types", ["general"])
                ]
                
                if remaining_models:
                    selected_model = min(remaining_models, key=lambda x: x["priority"])
                    logger.info(f"🔄 FALLBACK: Trying '{selected_model['model']}' next")
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
    refresh_models_from_redis()
    
    with model_registry_lock:
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
            "total_available": len(AVAILABLE_MODELS),
            "static_models": len([m for m in AVAILABLE_MODELS if not m.get('dynamic', False)]),
            "dynamic_models": len([m for m in AVAILABLE_MODELS if m.get('dynamic', False)])
        }

@app.get("/parameters/schema")
async def get_parameter_schema():
    """Get the complete parameter schema for frontend UI generation"""
    # Extract meta information if it exists, otherwise use defaults
    meta = PARAMETER_SCHEMA.get('meta', {
        "version": "1.0.0",
        "categories": {
            "core": "Essential parameters for model selection",
            "generation": "Text generation control parameters", 
            "penalties": "Parameters to control repetition and penalties",
            "advanced": "Advanced model behavior parameters",
            "output": "Output format and streaming parameters",
            "system": "System and metadata parameters"
        }
    })
    
    # Extract just the parameters (exclude 'meta' key)
    parameters = {k: v for k, v in PARAMETER_SCHEMA.items() if k != 'meta'}
    
    return {
        "schema": parameters,
        "meta": meta
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """OpenAI-compatible chat completions endpoint with comprehensive parameter validation"""
    
    if not AVAILABLE_MODELS:
        raise HTTPException(
            status_code=503,
            detail="No LLM providers available. Please configure API keys."
        )
    
    # Convert request to dict for parameter processing, but PRESERVE original messages
    # Use model_dump for Pydantic v2 compatibility
    request_dict = request.model_dump(exclude_unset=True) if hasattr(request, 'model_dump') else request.dict(exclude_unset=True)
    original_messages = request.messages  # 🔥 CRITICAL: Save original messages before processing
    
    # 🔥 CRITICAL: Apply parameter defaults and validate, but EXCLUDE messages from processing
    # Remove messages from validation processing to prevent corruption
    messages_backup = request_dict.pop('messages', None)
    
    request_dict = apply_parameter_defaults(request_dict, PARAMETER_SCHEMA)
    
    # Create validation schema excluding messages (already removed from request_dict)
    validation_schema = {k: v for k, v in PARAMETER_SCHEMA.items() if k != 'messages'}
    validation_error = validate_parameters(request_dict, validation_schema)
    
    if validation_error:
        logger.error(f"❌ Parameter validation failed: {validation_error}")
        raise HTTPException(
            status_code=400,
            detail=f"Parameter validation failed: {validation_error}"
        )
    
    # Log all parameters being used
    logger.info(f"🔧 VALIDATED PARAMETERS:")
    for param, value in request_dict.items():
        logger.info(f"  • {param}: {value}")
    
    # Update request object with validated parameters, but NEVER touch messages
    protected_fields = {'messages'}  # Messages are strictly protected
    for key, value in request_dict.items():
        if key not in protected_fields and hasattr(request, key):
            setattr(request, key, value)
    
    # 🔥 CRITICAL: Restore original messages - do NOT process or convert them
    request.messages = original_messages
    
    # Debug: Log the actual types in request.messages
    if request.messages:
        sample_msg = request.messages[0]
        logger.info(f"🔍 First message type: {type(sample_msg)} - has role attr: {hasattr(sample_msg, 'role')}")
        if hasattr(sample_msg, 'role'):
            logger.info(f"🔍 First message role: {sample_msg.role}")
        else:
            logger.info(f"🔍 First message as dict: {sample_msg}")
    
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
    
    refresh_models_from_redis()
    
    with model_registry_lock:
        total_models = len(AVAILABLE_MODELS)
    
    return {
        "status": "healthy" if healthy_models else "unhealthy",
        "timestamp": time.time(),
        "healthy_models": healthy_models,
        "unhealthy_models": unhealthy_models,
        "total_configured": total_models,
        "static_models": len([m for m in AVAILABLE_MODELS if not m.get('dynamic', False)]),
        "dynamic_models": len([m for m in AVAILABLE_MODELS if m.get('dynamic', False)])
    }

@app.post("/models/add")
async def add_dynamic_model(config: DynamicModelConfig):
    """Add a new dynamic model to the registry"""
    if not redis_client:
        raise HTTPException(
            status_code=503,
            detail="Redis not available for dynamic model configuration"
        )
    
    try:
        # Validate the model first
        logger.info(f"🔍 Validating new model: {config.model} ({config.provider})")
        
        validation_result = await validate_model_config(config.dict())
        
        if not validation_result.available:
            logger.warning(f"❌ Model validation failed: {config.model} - {validation_result.error}")
            raise HTTPException(
                status_code=400,
                detail=f"Model validation failed: {validation_result.error}"
            )
        
        # Save to Redis
        model_key = f"dynamic_model:{config.model}"
        model_data = config.dict()
        model_data['dynamic'] = True
        model_data['added_at'] = time.time()
        model_data['validation'] = {
            'latency_ms': validation_result.latency_ms,
            'last_validated': time.time()
        }
        
        redis_client.setex(
            model_key,
            86400,  # 24 hour TTL
            json.dumps(model_data)
        )
        
        # Refresh models immediately
        refresh_models_from_redis()
        
        logger.info(f"✅ Successfully added dynamic model: {config.model}")
        
        return {
            "success": True,
            "model": config.model,
            "provider": config.provider,
            "validation": {
                "available": validation_result.available,
                "latency_ms": validation_result.latency_ms
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding dynamic model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/validate")
async def validate_model(config: DynamicModelConfig):
    """Validate a model configuration"""
    try:
        result = await validate_model_config(config.dict())
        return result.dict()
    except Exception as e:
        logger.error(f"Error validating model: {e}")
        return ModelValidationResult(
            model=config.model,
            available=False,
            error=str(e)
        ).dict()

@app.delete("/models/{model_name}")
async def remove_dynamic_model(model_name: str):
    """Remove a dynamic model from the registry"""
    if not redis_client:
        raise HTTPException(
            status_code=503,
            detail="Redis not available for dynamic model configuration"
        )
    
    try:
        model_key = f"dynamic_model:{model_name}"
        
        # Check if model exists
        if not redis_client.exists(model_key):
            raise HTTPException(
                status_code=404,
                detail=f"Model '{model_name}' not found in dynamic registry"
            )
        
        # Remove from Redis
        redis_client.delete(model_key)
        
        # Refresh models immediately
        refresh_models_from_redis()
        
        logger.info(f"🗑️ Successfully removed dynamic model: {model_name}")
        
        return {
            "success": True,
            "model": model_name,
            "message": f"Model '{model_name}' removed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing dynamic model: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/dynamic")
async def list_dynamic_models():
    """List all dynamic models"""
    if not redis_client:
        return {
            "dynamic_models": [],
            "total": 0,
            "redis_available": False
        }
    
    try:
        dynamic_models = load_dynamic_models()
        
        return {
            "dynamic_models": [
                {
                    "model": m["model"],
                    "provider": m["provider"],
                    "priority": m["priority"],
                    "cost_per_1k_tokens": m["cost_per_1k_tokens"],
                    "added_at": m.get("added_at", 0),
                    "last_validated": m.get("validation", {}).get("last_validated", 0)
                }
                for m in dynamic_models
            ],
            "total": len(dynamic_models),
            "redis_available": True
        }
        
    except Exception as e:
        logger.error(f"Error listing dynamic models: {e}")
        return {
            "dynamic_models": [],
            "total": 0,
            "redis_available": True,
            "error": str(e)
        }

@app.post("/models/refresh")
async def refresh_models():
    """Force refresh of the model registry"""
    try:
        old_count = len(AVAILABLE_MODELS)
        refresh_models_from_redis()
        new_count = len(AVAILABLE_MODELS)
        
        return {
            "success": True,
            "old_count": old_count,
            "new_count": new_count,
            "message": f"Model registry refreshed: {old_count} -> {new_count} models"
        }
    except Exception as e:
        logger.error(f"Error refreshing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/discover-remote")
async def discover_remote_server(request: dict):
    """Discover and register all models from a remote server (Ollama or LiteLLM)"""
    if not redis_client:
        raise HTTPException(
            status_code=503,
            detail="Redis not available for dynamic model configuration"
        )
    
    try:
        server_url = request.get("server_url")
        server_type = request.get("server_type", "ollama")  # "ollama" or "litellm"
        
        if not server_url:
            raise HTTPException(status_code=400, detail="server_url is required")
        
        # Normalize server URL
        if not server_url.startswith("http"):
            server_url = f"http://{server_url}"
        
        logger.info(f"🔍 Discovering models from {server_type} server: {server_url}")
        
        discovered_models = []
        
        if server_type == "ollama":
            discovered_models = await discover_ollama_models(server_url)
        elif server_type == "litellm":
            discovered_models = await discover_litellm_models(server_url)
        else:
            raise HTTPException(status_code=400, detail="server_type must be 'ollama' or 'litellm'")
        
        # Register discovered models
        registered_count = 0
        failed_count = 0
        
        for model_config in discovered_models:
            try:
                # Save to Redis
                model_key = f"dynamic_model:{model_config['model']}"
                model_data = model_config
                model_data['dynamic'] = True
                model_data['added_at'] = time.time()
                model_data['discovered_from'] = server_url
                
                redis_client.setex(
                    model_key,
                    86400,  # 24 hour TTL
                    json.dumps(model_data)
                )
                
                registered_count += 1
                logger.info(f"✅ Registered model: {model_config['model']} from {server_url}")
                
            except Exception as e:
                logger.error(f"❌ Failed to register model {model_config['model']}: {e}")
                failed_count += 1
        
        # Refresh models immediately
        refresh_models_from_redis()
        
        logger.info(f"🎯 Discovery completed: {registered_count} registered, {failed_count} failed")
        
        return {
            "success": True,
            "server_url": server_url,
            "server_type": server_type,
            "discovered": len(discovered_models),
            "registered": registered_count,
            "failed": failed_count,
            "models": [m['model'] for m in discovered_models]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error discovering remote server: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def discover_ollama_models(server_url: str) -> List[Dict]:
    """Discover all models from an Ollama server"""
    import httpx
    
    models = []
    
    try:
        # Ollama API endpoint for listing models
        api_url = f"{server_url}/api/tags"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(api_url)
            response.raise_for_status()
            
            data = response.json()
            
            for model_info in data.get('models', []):
                model_name = model_info.get('name', '').split(':')[0]  # Remove tag if present
                if model_name:
                    models.append({
                        "model": model_info.get('name', model_name),  # Keep full name with tag
                        "provider": "ollama",
                        "api_base": server_url,
                        "priority": 999,  # Low priority for discovered models
                        "cost_per_1k_tokens": 0.0,
                        "task_types": ["general"],
                        "max_tokens": 32768,  # Most modern models support at least 32K
                        "temperature": 0.7,
                        "model_size": model_info.get('size', 0),
                        "model_family": model_info.get('details', {}).get('family', 'unknown')
                    })
        
        logger.info(f"📊 Discovered {len(models)} models from Ollama server")
        return models
        
    except Exception as e:
        logger.error(f"❌ Failed to discover Ollama models from {server_url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to connect to Ollama server: {str(e)}")

async def discover_litellm_models(server_url: str) -> List[Dict]:
    """Discover all models from a LiteLLM server"""
    import httpx
    
    models = []
    
    try:
        # LiteLLM API endpoint for listing models
        api_url = f"{server_url}/v1/models"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(api_url)
            response.raise_for_status()
            
            data = response.json()
            
            for model_info in data.get('data', []):
                model_id = model_info.get('id', '')
                if model_id and '/' in model_id:  # Skip malformed model IDs
                    provider, model_name = model_id.split('/', 1)
                    models.append({
                        "model": model_name,
                        "provider": provider,
                        "api_base": server_url,
                        "priority": 999,  # Low priority for discovered models
                        "cost_per_1k_tokens": 0.0,
                        "task_types": ["general"],
                        "max_tokens": 32768,  # Most modern models support at least 32K
                        "temperature": 0.7,
                        "litellm_model_id": model_id
                    })
        
        logger.info(f"📊 Discovered {len(models)} models from LiteLLM server")
        return models
        
    except Exception as e:
        logger.error(f"❌ Failed to discover LiteLLM models from {server_url}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to connect to LiteLLM server: {str(e)}")

if __name__ == "__main__":
    port = int(os.getenv("LITELLM_PORT", 14782))
    host = os.getenv("LITELLM_HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting Crawlplexity LiteLLM Proxy on {host}:{port}")
    logger.info(f"📊 Available models: {len(AVAILABLE_MODELS)}")
    logger.info(f"🔧 Environment variables check:")
    for config in MODEL_CONFIGS:
        if config.get("api_key_env"):
            key_status = "✅ SET" if os.getenv(config["api_key_env"]) else "❌ MISSING"
            logger.info(f"  • {config['api_key_env']}: {key_status}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )