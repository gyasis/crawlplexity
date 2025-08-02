#!/usr/bin/env python3
"""
Comprehensive multi-provider parameter testing for LiteLLM service
Tests all 32 parameters across all providers to create a compatibility matrix
"""

import asyncio
import os
import sys
import json
import logging
from typing import Dict, List, Any, Tuple
from datetime import datetime
import litellm

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enable drop_params globally for graceful parameter handling
litellm.drop_params = True

# Test configuration
TEST_MESSAGES = [{"role": "user", "content": "Say hello"}]

# Provider configurations with test models
PROVIDERS = {
    "openai": {
        "models": ["gpt-4o-mini", "gpt-3.5-turbo"],
        "api_key_env": "OPENAI_API_KEY"
    },
    "anthropic": {
        "models": ["claude-3-haiku-20240307", "claude-3-sonnet-20240229"],
        "api_key_env": "ANTHROPIC_API_KEY"
    },
    "google": {
        "models": ["gemini-pro", "gemini-1.5-flash"],
        "api_key_env": "GOOGLE_API_KEY"
    },
    "groq": {
        "models": ["llama3-8b-8192", "mixtral-8x7b-32768"],
        "api_key_env": "GROQ_API_KEY"
    },
    "ollama": {
        "models": ["llama3.2", "mistral-nemo"],  # Will test both local and remote
        "api_base": ["http://localhost:11434", "http://192.168.0.159:11434"]
    }
}

# All parameters from parameters.json
ALL_PARAMETERS = {
    # Core parameters (should work everywhere)
    "temperature": 0.7,
    "max_tokens": 50,
    "stream": False,
    
    # Common parameters (work on most providers)
    "top_p": 0.9,
    "n": 1,
    "stop": ["\\n"],
    "seed": 12345,
    "timeout": 30,
    
    # OpenAI-specific but sometimes supported elsewhere
    "presence_penalty": 0.1,
    "frequency_penalty": 0.1,
    "logit_bias": {"123": 0.5},
    "user": "test_user",
    "logprobs": True,
    "top_logprobs": 5,
    "response_format": {"type": "text"},
    
    # Ollama/local model specific
    "top_k": 40,
    "repetition_penalty": 1.1,
    "min_p": 0.05,
    "typical_p": 0.9,
    
    # Function calling (provider-specific support)
    "tools": [{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather",
            "parameters": {
                "type": "object",
                "properties": {"location": {"type": "string"}},
                "required": ["location"]
            }
        }
    }],
    "tool_choice": "auto",
    
    # Deprecated parameters
    "functions": [{
        "name": "get_weather",
        "description": "Get weather",
        "parameters": {
            "type": "object",
            "properties": {"location": {"type": "string"}},
            "required": ["location"]
        }
    }],
    "function_call": {"name": "get_weather"},
    
    # LiteLLM-specific
    "num_retries": 2,
    "fallbacks": ["gpt-3.5-turbo"],
    "drop_params": True,
    
    # Custom Fireplexity parameters
    "task_type": "general",
    "strategy": "balanced",
    
    # Provider routing (usually not sent to actual LLM)
    "api_base": None,
    "api_version": None,
}

async def test_parameter_on_model(
    provider: str, 
    model: str, 
    param_name: str, 
    param_value: Any,
    api_base: str = None
) -> Dict[str, Any]:
    """Test a single parameter on a specific model"""
    
    # Skip if provider not configured
    if provider != "ollama":
        api_key_env = PROVIDERS[provider].get("api_key_env")
        if api_key_env and not os.getenv(api_key_env):
            return {
                "provider": provider,
                "model": model,
                "parameter": param_name,
                "status": "skipped",
                "reason": f"No {api_key_env} configured"
            }
    
    try:
        # Base parameters
        kwargs = {
            "model": f"{provider}/{model}" if provider != "openai" else model,
            "messages": TEST_MESSAGES,
            "drop_params": True,  # Enable graceful parameter dropping
        }
        
        # Add Ollama api_base if provided
        if provider == "ollama" and api_base:
            kwargs["api_base"] = api_base
        
        # Add the parameter being tested
        if param_value is not None:
            # Handle special parameter dependencies
            if param_name == "tool_choice" and "tools" not in kwargs:
                kwargs["tools"] = ALL_PARAMETERS["tools"]
            elif param_name == "function_call" and "functions" not in kwargs:
                kwargs["functions"] = ALL_PARAMETERS["functions"]
            elif param_name == "top_logprobs" and "logprobs" not in kwargs:
                kwargs["logprobs"] = True
            
            kwargs[param_name] = param_value
        
        # Make the API call
        response = await litellm.acompletion(**kwargs)
        
        # Handle streaming
        if param_name == "stream" and param_value:
            chunks = []
            async for chunk in response:
                chunks.append(chunk)
            return {
                "provider": provider,
                "model": model,
                "parameter": param_name,
                "value": param_value,
                "status": "success",
                "streaming_chunks": len(chunks)
            }
        
        return {
            "provider": provider,
            "model": model,
            "parameter": param_name,
            "value": param_value,
            "status": "success"
        }
        
    except Exception as e:
        error_msg = str(e)
        
        # Check if parameter was gracefully dropped
        if "drop_params" in error_msg or "dropped" in error_msg.lower():
            status = "dropped"
        elif "not supported" in error_msg.lower() or "unrecognized" in error_msg.lower():
            status = "unsupported"
        else:
            status = "failed"
        
        return {
            "provider": provider,
            "model": model,
            "parameter": param_name,
            "value": param_value,
            "status": status,
            "error": error_msg[:200]  # Truncate long errors
        }

async def test_all_providers_and_parameters():
    """Test all parameters across all providers"""
    
    logger.info("🚀 Starting comprehensive multi-provider parameter testing")
    logger.info(f"📋 Testing {len(ALL_PARAMETERS)} parameters across {len(PROVIDERS)} providers")
    logger.info("🔧 drop_params is enabled for graceful parameter handling")
    logger.info("=" * 80)
    
    results = []
    compatibility_matrix = {}
    
    # Test each provider
    for provider, config in PROVIDERS.items():
        logger.info(f"\n📦 Testing provider: {provider.upper()}")
        logger.info("-" * 40)
        
        models = config["models"]
        
        # Handle Ollama's multiple API bases
        if provider == "ollama":
            api_bases = config.get("api_base", ["http://localhost:11434"])
            
            for api_base in api_bases:
                logger.info(f"🌐 Testing Ollama at {api_base}")
                
                for model in models:
                    logger.info(f"  🤖 Testing model: {model}")
                    model_key = f"{provider}/{model}@{api_base}"
                    compatibility_matrix[model_key] = {}
                    
                    # Test baseline first
                    baseline = await test_parameter_on_model(provider, model, "baseline", None, api_base)
                    if baseline["status"] != "success":
                        logger.warning(f"    ⚠️  Baseline test failed for {model} at {api_base}, skipping")
                        continue
                    
                    # Test each parameter
                    for param_name, param_value in ALL_PARAMETERS.items():
                        result = await test_parameter_on_model(provider, model, param_name, param_value, api_base)
                        results.append(result)
                        compatibility_matrix[model_key][param_name] = result["status"]
                        
                        # Log inline status
                        status_emoji = {
                            "success": "✅",
                            "dropped": "🔽",
                            "unsupported": "❌",
                            "failed": "💥",
                            "skipped": "⏭️"
                        }.get(result["status"], "❓")
                        
                        if result["status"] != "success":
                            logger.info(f"    {status_emoji} {param_name}: {result['status']}")
        else:
            # Non-Ollama providers
            for model in models:
                logger.info(f"  🤖 Testing model: {model}")
                model_key = f"{provider}/{model}"
                compatibility_matrix[model_key] = {}
                
                # Test baseline first
                baseline = await test_parameter_on_model(provider, model, "baseline", None)
                if baseline["status"] == "skipped":
                    logger.warning(f"    ⏭️  Skipping {provider} - not configured")
                    break
                elif baseline["status"] != "success":
                    logger.warning(f"    ⚠️  Baseline test failed for {model}, skipping")
                    continue
                
                # Test each parameter
                for param_name, param_value in ALL_PARAMETERS.items():
                    result = await test_parameter_on_model(provider, model, param_name, param_value)
                    results.append(result)
                    compatibility_matrix[model_key][param_name] = result["status"]
                    
                    # Log inline status for non-success cases
                    if result["status"] != "success":
                        status_emoji = {
                            "dropped": "🔽",
                            "unsupported": "❌",
                            "failed": "💥",
                            "skipped": "⏭️"
                        }.get(result["status"], "❓")
                        logger.info(f"    {status_emoji} {param_name}: {result['status']}")
    
    # Generate summary report
    logger.info("\n" + "=" * 80)
    logger.info("🎯 TESTING COMPLETED - SUMMARY")
    logger.info("=" * 80)
    
    # Count statuses by parameter
    param_summary = {}
    for param in ALL_PARAMETERS.keys():
        param_summary[param] = {
            "success": 0,
            "dropped": 0,
            "unsupported": 0,
            "failed": 0,
            "skipped": 0
        }
    
    for result in results:
        if "parameter" in result and result["parameter"] in param_summary:
            param_summary[result["parameter"]][result["status"]] += 1
    
    # Display parameter compatibility
    logger.info("\n📊 PARAMETER COMPATIBILITY ACROSS PROVIDERS:")
    logger.info("-" * 80)
    
    for param, counts in param_summary.items():
        total_tested = sum(counts.values()) - counts["skipped"]
        if total_tested > 0:
            success_rate = (counts["success"] / total_tested) * 100
            dropped_rate = (counts["dropped"] / total_tested) * 100
            
            status = "✅ Universal" if success_rate == 100 else \
                    "🟡 Partial" if success_rate > 50 else \
                    "🟠 Limited" if success_rate > 0 else \
                    "❌ Unsupported"
            
            logger.info(f"{param:20} {status:12} Success: {counts['success']:2d}/{total_tested:2d} ({success_rate:.0f}%) " +
                       f"Dropped: {counts['dropped']:2d} ({dropped_rate:.0f}%)")
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save detailed results
    with open(f"parameter_test_results_{timestamp}.json", "w") as f:
        json.dump({
            "timestamp": timestamp,
            "results": results,
            "compatibility_matrix": compatibility_matrix,
            "parameter_summary": param_summary
        }, f, indent=2)
    
    # Save compatibility matrix as CSV for easy viewing
    with open(f"parameter_compatibility_matrix_{timestamp}.csv", "w") as f:
        # Header
        models = list(compatibility_matrix.keys())
        f.write("Parameter," + ",".join(models) + "\n")
        
        # Rows
        for param in ALL_PARAMETERS.keys():
            row = [param]
            for model in models:
                status = compatibility_matrix.get(model, {}).get(param, "N/A")
                row.append(status)
            f.write(",".join(row) + "\n")
    
    logger.info(f"\n📁 Results saved to:")
    logger.info(f"  • parameter_test_results_{timestamp}.json")
    logger.info(f"  • parameter_compatibility_matrix_{timestamp}.csv")
    
    # Recommendations
    logger.info("\n💡 RECOMMENDATIONS:")
    logger.info("-" * 40)
    
    universal_params = [p for p, c in param_summary.items() 
                       if c["success"] > 0 and c["success"] == (sum(c.values()) - c["skipped"])]
    partial_params = [p for p, c in param_summary.items() 
                     if c["success"] > 0 and c["dropped"] > 0]
    provider_specific = [p for p, c in param_summary.items() 
                        if c["success"] > 0 and (c["unsupported"] > 0 or c["failed"] > 0)]
    
    if universal_params:
        logger.info("✅ Universal parameters (safe for all providers):")
        for p in universal_params:
            logger.info(f"   • {p}")
    
    if partial_params:
        logger.info("\n🔽 Parameters that use drop_params (gracefully handled):")
        for p in partial_params:
            logger.info(f"   • {p}")
    
    if provider_specific:
        logger.info("\n⚠️  Provider-specific parameters (may cause errors):")
        for p in provider_specific:
            logger.info(f"   • {p}")
    
    return results, compatibility_matrix, param_summary

if __name__ == "__main__":
    asyncio.run(test_all_providers_and_parameters())