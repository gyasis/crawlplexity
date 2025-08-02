#!/usr/bin/env python3
"""
Standalone test script for fuzzy model matching logic (no dependencies)
"""

from typing import List, Optional

def find_best_model_match(requested_model: str, available_models: List[str]) -> Optional[str]:
    """
    Find the best matching model from available models using intelligent fuzzy matching.
    
    Handles remote model IDs like: remote_edl9t5a53mdsu3ttw_mistral-nemo:12b
    Maps to available models like: mistral-nemo:12b
    
    Ensures accuracy for similar models like mistral:10b vs mistral:22b
    """
    if not requested_model or not available_models:
        return None
    
    print(f"🔍 Fuzzy matching '{requested_model}' against {len(available_models)} available models")
    
    # Clean the requested model name by removing remote prefixes
    clean_requested = requested_model
    
    # Remove remote ID prefixes (remote_<id>_)
    if clean_requested.startswith('remote_'):
        # Pattern: remote_<id>_<model_name>
        parts = clean_requested.split('_', 2)  # Split into max 3 parts
        if len(parts) >= 3:
            clean_requested = parts[2]  # Take everything after remote_<id>_
            print(f"  • Cleaned remote ID: '{requested_model}' → '{clean_requested}'")
    
    # Try exact match with cleaned name first
    if clean_requested in available_models:
        print(f"  • ✅ Exact match found: '{clean_requested}'")
        return clean_requested
    
    # For fuzzy matching, we'll use a scoring system
    best_match = None
    best_score = 0
    
    for available_model in available_models:
        score = calculate_model_similarity(clean_requested, available_model)
        print(f"  • '{available_model}': score={score:.3f}")
        
        if score > best_score and score >= 0.7:  # Minimum threshold of 70% similarity
            best_score = score
            best_match = available_model
    
    if best_match:
        print(f"  • ✅ Best fuzzy match: '{best_match}' (score={best_score:.3f})")
    else:
        print(f"  • ❌ No suitable fuzzy match found (best score: {best_score:.3f})")
    
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
    print(f"\n🎯 Overall test result: {'✅ SUCCESS' if success else '❌ FAILURE'}")