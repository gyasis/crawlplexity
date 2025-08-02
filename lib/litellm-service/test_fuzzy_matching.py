#!/usr/bin/env python3
"""
Test script for fuzzy model matching logic
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the functions from app.py
from app import find_best_model_match, calculate_model_similarity, extract_model_parts

def test_fuzzy_matching():
    """Test the fuzzy matching logic with various scenarios"""
    
    print("🧪 Testing Fuzzy Model Matching Logic")
    print("=" * 60)
    
    # Available models (simulating what's in the backend)
    available_models = [
        "gpt-4o-mini",
        "claude-3-haiku-20240307", 
        "mixtral-8x7b-32768",
        "llama3.1:8b",
        "mistral-nemo:12b",
        "mistral:latest",
        "qwen2.5-coder:14b",
        "deepseek-r1:70b",
        "phi4:latest"
    ]
    
    # Test cases
    test_cases = [
        # Remote model ID scenario (the main issue)
        {
            "requested": "remote_edl9t5a53mdsu3ttw_mistral-nemo:12b",
            "expected": "mistral-nemo:12b",
            "description": "Remote model ID mapping"
        },
        
        # Exact matches
        {
            "requested": "gpt-4o-mini",
            "expected": "gpt-4o-mini", 
            "description": "Exact match"
        },
        
        # Similar model names with different parameters (should NOT match)
        {
            "requested": "mistral-nemo:10b",
            "expected": None,  # Should NOT match mistral-nemo:12b
            "description": "Similar model with different size parameters"
        },
        
        # Case variations
        {
            "requested": "MISTRAL-NEMO:12B",
            "expected": "mistral-nemo:12b",
            "description": "Case insensitive matching"
        },
        
        # Provider prefix handling
        {
            "requested": "anthropic/claude-3-haiku-20240307",
            "expected": "claude-3-haiku-20240307",
            "description": "Provider prefix removal"
        },
        
        # Non-existent model
        {
            "requested": "nonexistent-model:99b",
            "expected": None,
            "description": "Non-existent model"
        },
        
        # Partial matches
        {
            "requested": "llama3.1",
            "expected": "llama3.1:8b",
            "description": "Partial match without parameters"
        }
    ]
    
    print(f"Available models: {available_models}\n")
    
    # Run test cases
    passed = 0
    total = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['description']}")
        print(f"  Requested: '{test_case['requested']}'")
        print(f"  Expected:  '{test_case['expected']}'")
        
        result = find_best_model_match(test_case['requested'], available_models)
        print(f"  Got:       '{result}'")
        
        if result == test_case['expected']:
            print(f"  ✅ PASS")
            passed += 1
        else:
            print(f"  ❌ FAIL")
        
        print()
    
    print("=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    
    # Test individual similarity calculations
    print("\n🔍 Testing Similarity Calculations:")
    print("-" * 40)
    
    similarity_tests = [
        ("mistral-nemo:12b", "mistral-nemo:12b", "Exact match"),
        ("mistral-nemo:12b", "mistral-nemo:10b", "Different parameters"),
        ("mistral-nemo", "mistral-nemo:12b", "Missing parameters"),
        ("gpt-4o-mini", "gpt-4", "Partial match"),
        ("claude", "claude-3-haiku-20240307", "Base name match"),
    ]
    
    for req, avail, desc in similarity_tests:
        score = calculate_model_similarity(req, avail)
        print(f"{desc}: '{req}' vs '{avail}' = {score:.3f}")
    
    print("\n🔧 Testing Model Part Extraction:")
    print("-" * 40)
    
    extraction_tests = [
        "mistral-nemo:12b",
        "anthropic/claude-3-haiku", 
        "gpt-4o-mini",
        "remote_id_model:8b"
    ]
    
    for model in extraction_tests:
        base, params = extract_model_parts(model)
        print(f"'{model}' → base='{base}', params='{params}'")
    
    return passed == total

if __name__ == "__main__":
    success = test_fuzzy_matching()
    sys.exit(0 if success else 1)