#!/usr/bin/env python3
"""
Test LiteLLM's drop_params functionality with problematic parameters
"""

import asyncio
import os
import litellm
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Test the problematic parameters identified earlier
PROBLEMATIC_PARAMS = {
    "top_k": 40,
    "repetition_penalty": 1.1,
    "min_p": 0.05,
    "typical_p": 0.9,
    "task_type": "general",
    "strategy": "balanced"
}

async def test_drop_params():
    """Test drop_params functionality"""
    
    logger.info("🧪 Testing LiteLLM drop_params functionality")
    logger.info("=" * 60)
    
    # Test messages
    messages = [{"role": "user", "content": "Say hello"}]
    
    # Test 1: Without drop_params (should fail)
    logger.info("\n1️⃣ TEST WITHOUT drop_params:")
    try:
        kwargs = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 50,
            **PROBLEMATIC_PARAMS  # Add all problematic params
        }
        response = await litellm.acompletion(**kwargs)
        logger.info("❌ UNEXPECTED: Call succeeded without drop_params!")
    except Exception as e:
        logger.info(f"✅ Expected failure: {type(e).__name__}: {str(e)[:100]}...")
    
    # Test 2: With drop_params=True (should succeed)
    logger.info("\n2️⃣ TEST WITH drop_params=True:")
    try:
        kwargs = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 50,
            "drop_params": True,  # Enable graceful parameter dropping
            **PROBLEMATIC_PARAMS
        }
        response = await litellm.acompletion(**kwargs)
        logger.info("✅ Success! drop_params worked - call completed")
        logger.info(f"   Response: {response.choices[0].message.content}")
    except Exception as e:
        logger.info(f"❌ FAILED with drop_params: {type(e).__name__}: {str(e)}")
    
    # Test 3: Global drop_params setting
    logger.info("\n3️⃣ TEST WITH GLOBAL litellm.drop_params=True:")
    litellm.drop_params = True
    try:
        kwargs = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "max_tokens": 50,
            **PROBLEMATIC_PARAMS
        }
        response = await litellm.acompletion(**kwargs)
        logger.info("✅ Success! Global drop_params worked")
        logger.info(f"   Response: {response.choices[0].message.content}")
    except Exception as e:
        logger.info(f"❌ FAILED with global drop_params: {type(e).__name__}: {str(e)}")
    
    # Test 4: Test with Anthropic (different parameter support)
    if os.getenv("ANTHROPIC_API_KEY"):
        logger.info("\n4️⃣ TEST WITH ANTHROPIC (Claude):")
        try:
            kwargs = {
                "model": "anthropic/claude-3-haiku-20240307",
                "messages": messages,
                "max_tokens": 50,
                "drop_params": True,
                **PROBLEMATIC_PARAMS
            }
            response = await litellm.acompletion(**kwargs)
            logger.info("✅ Success! Anthropic call completed with drop_params")
            logger.info(f"   Response: {response.choices[0].message.content}")
        except Exception as e:
            logger.info(f"❌ Anthropic failed: {type(e).__name__}: {str(e)[:100]}...")
    
    # Test 5: Test which params are actually dropped
    logger.info("\n5️⃣ TESTING INDIVIDUAL PARAM DROPPING:")
    for param, value in PROBLEMATIC_PARAMS.items():
        try:
            kwargs = {
                "model": "gpt-4o-mini",
                "messages": messages,
                "max_tokens": 10,
                "drop_params": True,
                param: value  # Test one param at a time
            }
            response = await litellm.acompletion(**kwargs)
            logger.info(f"✅ {param}: dropped successfully")
        except Exception as e:
            logger.info(f"❌ {param}: NOT dropped - {type(e).__name__}")
    
    logger.info("\n" + "=" * 60)
    logger.info("💡 CONCLUSION:")
    logger.info("With drop_params=True, LiteLLM should gracefully handle")
    logger.info("unsupported parameters by dropping them before API calls.")

if __name__ == "__main__":
    asyncio.run(test_drop_params())