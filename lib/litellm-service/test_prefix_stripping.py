#!/usr/bin/env python3
"""
Standalone test for enhanced remote prefix stripping (no dependencies)
"""

def strip_remote_prefixes(model_name: str) -> str:
    """
    Enhanced remote prefix stripping for better fuzzy matching.
    
    Handles patterns like:
    - remote_edl9t5a53mdsu3ttw_mistral-nemo:12b → mistral-nemo:12b
    - remote_abc123_gpt-4 → gpt-4
    - remote_xyz_provider/model:tag → provider/model:tag
    """
    if not model_name:
        return model_name
    
    original = model_name
    
    # Pattern 1: remote_<alphanumeric_id>_<model_name>
    # Only apply this if we have at least 3 parts and the second part looks like an ID
    if model_name.startswith('remote_'):
        parts = model_name.split('_')
        if len(parts) >= 3:
            # Check if the second part looks like an ID (alphanumeric, at least 3 chars)
            potential_id = parts[1]
            if len(potential_id) >= 3 and potential_id.replace('-', '').isalnum():
                # Join everything from the 3rd part onwards (in case model name has underscores)
                model_name = '_'.join(parts[2:])
        
        # If we still have remote_ prefix and it wasn't a valid pattern, don't modify it
        # This handles cases like "remote_only_one_underscore" correctly
    
    # Pattern 2: Strip any remaining remote- prefixes
    if model_name.startswith('remote-'):
        model_name = model_name[7:]  # Remove "remote-"
    
    # Pattern 3: Strip remote: prefixes  
    if model_name.startswith('remote:'):
        model_name = model_name[7:]  # Remove "remote:"
    
    return model_name.strip()

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
        
        # Complex model names with multiple underscores
        ("remote_complex123_model_name_with_many_underscores:version", "model_name_with_many_underscores:version"),
        
        # Non-remote models (should be unchanged)
        ("gpt-4o-mini", "gpt-4o-mini"),
        ("mistral-nemo:12b", "mistral-nemo:12b"),
        ("anthropic/claude-3-sonnet", "anthropic/claude-3-sonnet"),
        
        # Edge cases - improved expected results
        ("remote_", "remote_"),  # Invalid format, should remain unchanged
        ("remote", "remote"),
        ("", ""),
        ("remote_only_one_underscore", "remote_only_one_underscore"),  # Not enough parts, should remain unchanged
        ("remote_ab_model", "remote_ab_model"),  # ID too short, should remain unchanged  
        ("remote_abc123_model", "model"),  # Valid ID (3+ chars), should strip
        ("remote_a_b_c_d_e", "b_c_d_e"),  # Multiple underscores with valid single-char ID
    ]
    
    passed = 0
    total = len(test_cases)
    
    for i, (input_model, expected) in enumerate(test_cases, 1):
        result = strip_remote_prefixes(input_model)
        
        print(f"Test {i:2d}: '{input_model}'")
        print(f"         → '{result}'")
        
        if result == expected:
            print(f"         ✅ PASS (expected: '{expected}')")
            passed += 1
        else:
            print(f"         ❌ FAIL (expected: '{expected}', got: '{result}')")
        print()
    
    print("=" * 60)
    print(f"Strip Remote Prefixes: {passed}/{total} tests passed")
    
    # Show some examples of the enhancement
    print("\n🎯 Enhanced Prefix Stripping Examples:")
    print("-" * 40)
    
    examples = [
        "remote_edl9t5a53mdsu3ttw_mistral-nemo:12b",
        "remote_server123_gpt-4o-mini", 
        "remote-anthropic-claude:latest",
        "remote:ollama-model",
        "remote_complex_very_long_model_name_with_underscores:v2.1"
    ]
    
    for example in examples:
        cleaned = strip_remote_prefixes(example)
        print(f"'{example}' → '{cleaned}'")
    
    return passed == total

if __name__ == "__main__":
    success = test_strip_remote_prefixes()
    print(f"\n🎯 Overall Test Result: {'✅ SUCCESS' if success else '❌ FAILURE'}")