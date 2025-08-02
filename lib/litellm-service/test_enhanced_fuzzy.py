#!/usr/bin/env python3
"""
Test the enhanced fuzzy matching with improved remote prefix stripping
"""

import asyncio
import aiohttp
import json
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def test_strip_remote_prefixes():
    """Test the enhanced remote prefix stripping logic"""
    
    print("🧪 Testing Enhanced Remote Prefix Stripping")
    print("=" * 60)
    
    test_cases = [
        # Original pattern
        ("remote_edl9t5a53mdsu3ttw_mistral-nemo:12b", "mistral-nemo:12b"),
        
        # Different remote ID patterns
        ("remote_abc123_gpt-4o-mini", "gpt-4o-mini"),
        ("remote_xyz789_claude-3-haiku:latest", "claude-3-haiku:latest"),
        ("remote_server01_llama3.1:8b", "llama3.1:8b"),
        
        # Model names with underscores
        ("remote_id123_some_model_with_underscores:tag", "some_model_with_underscores:tag"),
        
        # Alternative remote patterns
        ("remote-mistral-nemo:12b", "mistral-nemo:12b"),
        ("remote:gpt-4", "gpt-4"),
        
        # Provider/model patterns
        ("remote_srv_anthropic/claude-3-haiku", "anthropic/claude-3-haiku"),
        ("remote_ollama_mistral:latest", "mistral:latest"),
        
        # Non-remote models (should be unchanged)
        ("gpt-4o-mini", "gpt-4o-mini"),
        ("mistral-nemo:12b", "mistral-nemo:12b"),
        ("anthropic/claude-3-sonnet", "anthropic/claude-3-sonnet"),
        
        # Edge cases
        ("remote_", ""),
        ("remote", "remote"),
        ("", ""),
    ]
    
    # Import the function from app.py
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from app import strip_remote_prefixes
    
    passed = 0
    total = len(test_cases)
    
    for i, (input_model, expected) in enumerate(test_cases, 1):
        result = strip_remote_prefixes(input_model)
        
        print(f"Test {i:2d}: '{input_model}' → '{result}'")
        
        if result == expected:
            print(f"         ✅ PASS (expected: '{expected}')")
            passed += 1
        else:
            print(f"         ❌ FAIL (expected: '{expected}', got: '{result}')")
    
    print()
    print("=" * 60)
    print(f"Strip Remote Prefixes: {passed}/{total} tests passed")
    
    return passed == total

async def test_enhanced_fuzzy_matching():
    """Test the enhanced fuzzy matching with real API calls"""
    
    print("\n🧪 Testing Enhanced Fuzzy Matching with API Calls")
    print("=" * 60)
    
    test_cases = [
        # Remote model patterns - should now match better
        {
            "name": "Enhanced Remote Model Matching",
            "model": "remote_edl9t5a53mdsu3ttw_mistral-nemo:12b",
            "expected_match": "mistral-nemo:12b",
            "description": "Original remote pattern"
        },
        {
            "name": "Alternative Remote Pattern",
            "model": "remote_server123_gpt-4o-mini",
            "expected_match": "gpt-4o-mini", 
            "description": "Different remote ID pattern"
        },
        {
            "name": "Remote with Dashes",
            "model": "remote-mistral-nemo:12b",
            "expected_match": "mistral-nemo:12b",
            "description": "Remote with dash separator"
        },
        {
            "name": "Remote with Colon",
            "model": "remote:gpt-4o-mini",
            "expected_match": "gpt-4o-mini",
            "description": "Remote with colon separator"
        }
    ]
    
    async with aiohttp.ClientSession() as session:
        passed = 0
        total = len(test_cases)
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📋 Test {i}: {test_case['name']}")
            print(f"  Model: {test_case['model']}")
            print(f"  Expected Match: {test_case['expected_match']}")
            
            test_payload = {
                "model": test_case["model"],
                "messages": [{"role": "user", "content": "Hello fuzzy matching test"}],
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
                        
                        if 'x_metadata' in result:
                            actual_model = result['x_metadata']['selected_model']
                            verification = result['x_metadata'].get('verification', {})
                            
                            print(f"  ✅ Matched to: {actual_model}")
                            print(f"  🔍 Verification: {verification.get('model_match_confirmed', 'N/A')}")
                            print(f"  🎯 Confidence: {verification.get('confidence_score', 'N/A')}")
                            
                            if actual_model == test_case['expected_match']:
                                print(f"  ✅ PASS - Correct model matched")
                                passed += 1
                            else:
                                print(f"  ❌ FAIL - Expected '{test_case['expected_match']}', got '{actual_model}'")
                        else:
                            print(f"  ❌ FAIL - No metadata in response")
                            
                    else:
                        error_text = await response.text()
                        print(f"  ❌ Request failed: {response.status}")
                        print(f"  Error: {error_text}")
                        
            except Exception as e:
                print(f"  ❌ Connection error: {e}")
        
        print("\n" + "=" * 60)
        print(f"Enhanced Fuzzy Matching: {passed}/{total} tests passed")
        
        return passed == total

async def test_top_result_selection():
    """Test that we always pick the top scoring result"""
    
    print("\n🧪 Testing Top Result Selection")
    print("=" * 60)
    
    # Use a model that should have multiple partial matches to test ranking
    test_model = "remote_test_mistral"  # Should match multiple mistral models
    
    test_payload = {
        "model": test_model,
        "messages": [{"role": "user", "content": "Test top result selection"}],
        "temperature": 0.7,
        "max_tokens": 50,
        "stream": False
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "http://localhost:14782/v1/chat/completions",
                json=test_payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    result = await response.json()
                    
                    if 'x_metadata' in result:
                        actual_model = result['x_metadata']['selected_model']
                        verification = result['x_metadata'].get('verification', {})
                        
                        print(f"  📝 Requested: {test_model}")
                        print(f"  🎯 Selected: {actual_model}")
                        print(f"  🔍 Method: {verification.get('verification_method', 'N/A')}")
                        print(f"  🎯 Confidence: {verification.get('confidence_score', 'N/A')}")
                        
                        # Check if a reasonable model was selected
                        if actual_model and actual_model != "unknown":
                            print(f"  ✅ PASS - Top result selected: {actual_model}")
                            return True
                        else:
                            print(f"  ❌ FAIL - No model selected")
                            return False
                    else:
                        print(f"  ❌ FAIL - No metadata in response")
                        return False
                        
                else:
                    print(f"  ❌ Request failed: {response.status}")
                    return False
                    
        except Exception as e:
            print(f"  ❌ Connection error: {e}")
            return False

if __name__ == "__main__":
    # Test 1: Strip remote prefixes
    prefix_success = test_strip_remote_prefixes()
    
    # Test 2: Enhanced fuzzy matching with API
    api_success = asyncio.run(test_enhanced_fuzzy_matching())
    
    # Test 3: Top result selection  
    top_result_success = asyncio.run(test_top_result_selection())
    
    print("\n" + "🎯" + "=" * 58)
    print("OVERALL TEST RESULTS:")
    print(f"  • Strip Remote Prefixes: {'✅ PASS' if prefix_success else '❌ FAIL'}")
    print(f"  • Enhanced Fuzzy Matching: {'✅ PASS' if api_success else '❌ FAIL'}")
    print(f"  • Top Result Selection: {'✅ PASS' if top_result_success else '❌ FAIL'}")
    
    overall_success = prefix_success and api_success and top_result_success
    print(f"\n🎯 Overall Result: {'✅ SUCCESS' if overall_success else '❌ FAILURE'}")