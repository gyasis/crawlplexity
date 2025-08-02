#!/usr/bin/env python3
"""
Test the fixed LiteLLM service to ensure it works with universal parameters
"""

import asyncio
import aiohttp
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

async def test_fixed_service():
    """Test the fixed LiteLLM service"""
    
    logger.info("🧪 Testing Fixed LiteLLM Service")
    logger.info("=" * 50)
    
    # Test with universal parameters only
    test_payload = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "Say hello"}],
        "temperature": 0.7,
        "max_tokens": 50,
        "stream": False
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            logger.info("📡 Making request to fixed service...")
            async with session.post(
                "http://localhost:14782/v1/chat/completions",
                json=test_payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    logger.info("✅ SUCCESS! Service is working correctly")
                    logger.info(f"📝 Response: {result['choices'][0]['message']['content']}")
                    logger.info(f"🤖 Model used: {result.get('model', 'unknown')}")
                    
                    # Test streaming
                    logger.info("\n🌊 Testing streaming...")
                    test_payload["stream"] = True
                    
                    async with session.post(
                        "http://localhost:14782/v1/chat/completions",
                        json=test_payload,
                        headers={"Content-Type": "application/json"}
                    ) as stream_response:
                        
                        if stream_response.status == 200:
                            logger.info("✅ Streaming works!")
                            chunk_count = 0
                            async for line in stream_response.content:
                                if line.startswith(b"data: "):
                                    chunk_count += 1
                                    if chunk_count > 3:  # Show first few chunks
                                        break
                            logger.info(f"📊 Received {chunk_count} streaming chunks")
                        else:
                            logger.error(f"❌ Streaming failed: {stream_response.status}")
                
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Request failed: {response.status}")
                    logger.error(f"Error: {error_text}")
                    
        except Exception as e:
            logger.error(f"❌ Connection error: {e}")
    
    logger.info("\n🎯 Test completed!")

if __name__ == "__main__":
    asyncio.run(test_fixed_service())