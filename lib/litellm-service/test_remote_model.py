#!/usr/bin/env python3
"""
Test the remote model fuzzy matching by making an actual call to LiteLLM service
"""

import asyncio
import aiohttp
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

async def test_remote_model_call():
    """Test calling LiteLLM with a remote model ID"""
    
    logger.info("🧪 Testing Remote Model Fuzzy Matching")
    logger.info("=" * 50)
    
    # This is the exact model ID from the frontend logs
    remote_model_id = "remote_edl9t5a53mdsu3ttw_mistral-nemo:12b"
    
    test_payload = {
        "model": remote_model_id,
        "messages": [{"role": "user", "content": "Can you explain the differences between amethyst and other types of quartz?"}],
        "temperature": 0.7,
        "max_tokens": 100,
        "stream": False,
        "task_type": "search"
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            logger.info(f"📡 Making request with remote model ID: '{remote_model_id}'")
            async with session.post(
                "http://localhost:14782/v1/chat/completions",
                json=test_payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    logger.info("✅ SUCCESS! Fuzzy matching worked!")
                    logger.info(f"📝 Response: {result['choices'][0]['message']['content']}")
                    
                    # Check metadata to see which model was actually used
                    if 'x_metadata' in result:
                        actual_model = result['x_metadata']['selected_model']
                        actual_provider = result['x_metadata']['selected_provider']
                        logger.info(f"🤖 Actual model used: {actual_model} (provider: {actual_provider})")
                        
                        if actual_model == "mistral-nemo:12b":
                            logger.info("🎯 PERFECT! Remote model ID was correctly mapped to mistral-nemo:12b")
                            return True
                        else:
                            logger.warning(f"❌ Expected 'mistral-nemo:12b' but got '{actual_model}'")
                            return False
                    else:
                        logger.warning("⚠️ No metadata in response")
                        return False
                        
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Request failed: {response.status}")
                    logger.error(f"Error: {error_text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_remote_model_call())
    print(f"\n🎯 Test result: {'✅ SUCCESS' if success else '❌ FAILURE'}")