#!/usr/bin/env python3
"""
LiteLLM Parameter Testing Script
Test different parameters one by one to identify which causes the 'role' error
"""

import os
import asyncio
import logging
from dotenv import load_dotenv
import litellm

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure LiteLLM
litellm.drop_params = True
litellm.set_verbose = True

async def test_minimal():
    """Test 1: Minimal parameters only"""
    logger.info("🧪 TEST 1: Minimal parameters (model + messages)")
    
    try:
        result = await litellm.acompletion(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            api_key=os.getenv("OPENAI_API_KEY")
        )
        logger.info("✅ TEST 1 PASSED: Minimal parameters work")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 1 FAILED: {str(e)}")
        return False

async def test_with_temperature():
    """Test 2: Add temperature parameter"""
    logger.info("🧪 TEST 2: Adding temperature parameter")
    
    try:
        result = await litellm.acompletion(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        logger.info("✅ TEST 2 PASSED: Temperature parameter works")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 2 FAILED: {str(e)}")
        return False

async def test_with_max_tokens():
    """Test 3: Add max_tokens parameter"""
    logger.info("🧪 TEST 3: Adding max_tokens parameter")
    
    try:
        result = await litellm.acompletion(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            temperature=0.7,
            max_tokens=50,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        logger.info("✅ TEST 3 PASSED: max_tokens parameter works")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 3 FAILED: {str(e)}")
        return False

async def test_with_stream_false():
    """Test 4: Add stream=False parameter"""
    logger.info("🧪 TEST 4: Adding stream=False parameter")
    
    try:
        result = await litellm.acompletion(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            temperature=0.7,
            max_tokens=50,
            stream=False,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        logger.info("✅ TEST 4 PASSED: stream=False parameter works")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 4 FAILED: {str(e)}")
        return False

async def test_with_stream_true():
    """Test 5: Add stream=True parameter (the suspected culprit)"""
    logger.info("🧪 TEST 5: Adding stream=True parameter")
    
    try:
        result = await litellm.acompletion(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            temperature=0.7,
            max_tokens=50,
            stream=True,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # For streaming, we need to consume the response
        chunks = []
        async for chunk in result:
            chunks.append(chunk)
            if len(chunks) >= 3:  # Just get a few chunks
                break
                
        logger.info(f"✅ TEST 5 PASSED: stream=True parameter works, got {len(chunks)} chunks")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 5 FAILED: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

async def test_with_additional_params():
    """Test 6: Add additional parameters that might be problematic"""
    logger.info("🧪 TEST 6: Adding additional parameters")
    
    # These are parameters that get added by the parameter validation system
    additional_params = {
        "top_p": 1.0,
        "n": 1,
        "presence_penalty": 0.0,
        "frequency_penalty": 0.0,
        "logit_bias": {},
        "top_k": -1,
        "repetition_penalty": 1.0,
        "min_p": 0.0,
        "typical_p": 1.0,
        "timeout": 600,
        "logprobs": False,
        "num_retries": 0,
        "drop_params": False,
    }
    
    try:
        result = await litellm.acompletion(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            temperature=0.7,
            max_tokens=50,
            stream=False,
            api_key=os.getenv("OPENAI_API_KEY"),
            **additional_params
        )
        logger.info("✅ TEST 6 PASSED: Additional parameters work")
        return True
    except Exception as e:
        logger.error(f"❌ TEST 6 FAILED: {str(e)}")
        return False

async def test_individual_params():
    """Test 7: Test individual problematic parameters one by one"""
    logger.info("🧪 TEST 7: Testing individual potentially problematic parameters")
    
    base_params = {
        "model": "openai/gpt-4o-mini",
        "messages": [{"role": "user", "content": "Hello"}],
        "temperature": 0.7,
        "max_tokens": 50,
        "api_key": os.getenv("OPENAI_API_KEY")
    }
    
    # Test these parameters individually
    problem_params = {
        "task_type": "general",
        "strategy": "balanced", 
        "debug": True,
        "logprobs": False,
        "num_retries": 0,
        "drop_params": False,
    }
    
    for param_name, param_value in problem_params.items():
        logger.info(f"🧪 TEST 7.{param_name}: Testing parameter {param_name}={param_value}")
        try:
            test_params = base_params.copy()
            test_params[param_name] = param_value
            
            result = await litellm.acompletion(**test_params)
            logger.info(f"✅ TEST 7.{param_name} PASSED: Parameter {param_name} works")
        except Exception as e:
            logger.error(f"❌ TEST 7.{param_name} FAILED: Parameter {param_name} caused error: {str(e)}")
            return param_name  # Return the problematic parameter
    
    return None

async def main():
    """Run all tests systematically"""
    logger.info("🚀 Starting systematic LiteLLM parameter testing")
    
    # Check API key
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("❌ OPENAI_API_KEY not set!")
        return
    
    tests = [
        test_minimal,
        test_with_temperature,
        test_with_max_tokens,
        test_with_stream_false,
        test_with_stream_true,
        test_with_additional_params,
    ]
    
    for i, test_func in enumerate(tests, 1):
        logger.info(f"\n{'='*50}")
        success = await test_func()
        if not success:
            logger.error(f"❌ TESTING STOPPED: Test {i} failed!")
            break
        logger.info(f"✅ Test {i} completed successfully")
    
    # Test individual problematic parameters
    logger.info(f"\n{'='*50}")
    problematic_param = await test_individual_params()
    if problematic_param:
        logger.error(f"❌ FOUND PROBLEMATIC PARAMETER: {problematic_param}")
    else:
        logger.info("✅ All individual parameters work fine")
    
    logger.info(f"\n{'='*50}")
    logger.info("🎯 Testing completed!")

if __name__ == "__main__":
    asyncio.run(main())