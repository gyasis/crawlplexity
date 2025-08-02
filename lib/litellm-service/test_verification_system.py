#!/usr/bin/env python3
"""
Test the new response verification system - SOURCE OF TRUTH
"""

import asyncio
import aiohttp
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

async def test_verification_system():
    """Test the verification system with both the remote model and fallback"""
    
    logger.info("🔍 Testing Response Verification System")
    logger.info("=" * 60)
    
    # Test 1: Remote model that should work (mistral-nemo)
    test_cases = [
        {
            "name": "Remote Model Verification",
            "model": "remote_edl9t5a53mdsu3ttw_mistral-nemo:12b",
            "expected_actual": "mistral-nemo:12b",
            "expected_provider": "ollama"
        },
        {
            "name": "Standard Model Verification", 
            "model": "gpt-4o-mini",
            "expected_actual": "gpt-4o-mini",
            "expected_provider": "openai"
        },
        {
            "name": "Non-existent Model (Should Fallback)",
            "model": "fake-model-12345",
            "expected_actual": "gpt-4o-mini",  # Should fallback to this
            "expected_provider": "openai"
        }
    ]
    
    async with aiohttp.ClientSession() as session:
        for i, test_case in enumerate(test_cases, 1):
            logger.info(f"\n📋 Test {i}: {test_case['name']}")
            logger.info(f"  Requesting model: {test_case['model']}")
            
            test_payload = {
                "model": test_case["model"],
                "messages": [{"role": "user", "content": "Say 'Hello verification test'"}],
                "temperature": 0.7,
                "max_tokens": 50,
                "stream": False
            }
            
            try:
                async with session.post(
                    "http://localhost:14782/v1/chat/completions",
                    json=test_payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        # Check if verification data exists
                        if 'x_metadata' in result and 'verification' in result['x_metadata']:
                            verification = result['x_metadata']['verification']
                            
                            logger.info("✅ VERIFICATION DATA FOUND:")
                            logger.info(f"  🎯 Selected Model: {result['x_metadata']['selected_model']}")
                            logger.info(f"  🎯 Selected Provider: {result['x_metadata']['selected_provider']}")
                            logger.info(f"  🔍 Intended LiteLLM ID: {verification['intended_litellm_id']}")
                            logger.info(f"  🔍 Actual Response Model: {verification['actual_response_model']}")
                            logger.info(f"  🔍 Model Match Confirmed: {verification['model_match_confirmed']}")
                            logger.info(f"  🔍 Confidence Score: {verification['confidence_score']:.2f}")
                            logger.info(f"  🔍 Verification Method: {verification['verification_method']}")
                            logger.info(f"  🔍 Flags: {verification['flags']}")
                            
                            # Check if it matches expectations
                            actual_model = result['x_metadata']['selected_model']
                            actual_provider = result['x_metadata']['selected_provider']
                            
                            if (actual_model == test_case['expected_actual'] and 
                                actual_provider == test_case['expected_provider']):
                                logger.info("  ✅ EXPECTED MODEL CONFIRMED")
                            else:
                                logger.warning(f"  ⚠️ MODEL MISMATCH:")
                                logger.warning(f"    Expected: {test_case['expected_provider']}/{test_case['expected_actual']}")
                                logger.warning(f"    Got: {actual_provider}/{actual_model}")
                            
                            # Check verification confidence
                            if verification['model_match_confirmed'] and verification['confidence_score'] > 0.8:
                                logger.info("  🎯 HIGH CONFIDENCE VERIFICATION")
                            elif verification['model_match_confirmed']:
                                logger.info("  🟡 MEDIUM CONFIDENCE VERIFICATION")
                            else:
                                logger.warning("  🚨 VERIFICATION FAILED - POTENTIAL MODEL MISMATCH!")
                                
                        else:
                            logger.error("  ❌ NO VERIFICATION DATA FOUND!")
                            
                        # Show response content for verification
                        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                        logger.info(f"  📝 Response: {content[:100]}{'...' if len(content) > 100 else ''}")
                        
                    else:
                        error_text = await response.text()
                        logger.error(f"  ❌ Request failed: {response.status}")
                        logger.error(f"  Error: {error_text}")
                        
            except Exception as e:
                logger.error(f"  ❌ Connection error: {e}")
    
    logger.info("\n" + "=" * 60)
    logger.info("🎯 Verification System Test Complete")

async def test_streaming_verification():
    """Test verification system with streaming responses"""
    
    logger.info("\n🌊 Testing Streaming Response Verification")
    logger.info("=" * 60)
    
    test_payload = {
        "model": "remote_edl9t5a53mdsu3ttw_mistral-nemo:12b",
        "messages": [{"role": "user", "content": "Count from 1 to 5"}],
        "temperature": 0.7,
        "max_tokens": 100,
        "stream": True
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "http://localhost:14782/v1/chat/completions",
                json=test_payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    # Check verification headers
                    headers = dict(response.headers)
                    logger.info("✅ STREAMING VERIFICATION HEADERS:")
                    
                    verification_headers = {k: v for k, v in headers.items() if k.startswith('X-')}
                    for header, value in verification_headers.items():
                        logger.info(f"  {header}: {value}")
                    
                    # Check specific verification headers
                    if 'X-Verification-Model-Match' in headers:
                        model_match = headers['X-Verification-Model-Match'] == 'True'
                        confidence = float(headers.get('X-Verification-Confidence', '0'))
                        method = headers.get('X-Verification-Method', 'unknown')
                        actual_model = headers.get('X-Actual-Response-Model', 'unknown')
                        
                        logger.info(f"\n🔍 STREAMING VERIFICATION SUMMARY:")
                        logger.info(f"  Model Match: {model_match}")
                        logger.info(f"  Confidence: {confidence:.2f}")
                        logger.info(f"  Method: {method}")
                        logger.info(f"  Actual Model: {actual_model}")
                        
                        if model_match and confidence > 0.8:
                            logger.info("  🎯 HIGH CONFIDENCE STREAMING VERIFICATION")
                        elif model_match:
                            logger.info("  🟡 MEDIUM CONFIDENCE STREAMING VERIFICATION")
                        else:
                            logger.warning("  🚨 STREAMING VERIFICATION FAILED!")
                    
                    # Read a few chunks to verify streaming works
                    chunk_count = 0
                    async for line in response.content:
                        if line.startswith(b"data: ") and chunk_count < 3:
                            chunk_count += 1
                            logger.info(f"  📦 Chunk {chunk_count}: {line.decode()[:100]}...")
                    
                else:
                    logger.error(f"❌ Streaming request failed: {response.status}")
                    
        except Exception as e:
            logger.error(f"❌ Streaming test error: {e}")

if __name__ == "__main__":
    asyncio.run(test_verification_system())
    asyncio.run(test_streaming_verification())