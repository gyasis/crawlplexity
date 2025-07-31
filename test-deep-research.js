#!/usr/bin/env node

/**
 * Quick Deep Research Engine Test Script
 * Usage: node test-deep-research.js
 */

const BASE_URL = 'http://localhost:18563';

async function testHealthCheck() {
  console.log('🔍 Testing Deep Research Engine health...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/deep-research/start`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ Deep Research Engine is healthy!');
      console.log(`   Active sessions: ${data.memory_stats.redis.active_sessions}`);
      console.log(`   Hot tier: ${data.memory_stats.hot.count} sessions`);
      console.log(`   Memory stats available ✓`);
      return true;
    } else {
      console.log('❌ Health check failed:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to Deep Research Engine');
    console.log(`   Make sure server is running on ${BASE_URL}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testBasicAPI() {
  console.log('\n🧪 Testing basic API functionality...');
  
  try {
    // Test sessions list (should work even with no sessions)
    const sessionsResponse = await fetch(`${BASE_URL}/api/deep-research/sessions?limit=5`);
    const sessionsData = await sessionsResponse.json();
    
    if (sessionsResponse.ok) {
      console.log('✅ Sessions list API working');
      console.log(`   Found ${sessionsData.pagination.total_sessions} total sessions`);
      console.log(`   Memory distribution: Hot=${sessionsData.memory_stats?.user_sessions_by_tier?.hot || 0}, Warm=${sessionsData.memory_stats?.user_sessions_by_tier?.warm || 0}`);
    } else {
      console.log('❌ Sessions list failed:', sessionsData);
      return false;
    }
    
    // Test invalid session ID (should return 404)
    const invalidResponse = await fetch(`${BASE_URL}/api/deep-research/invalid-session-id`);
    if (invalidResponse.status === 404) {
      console.log('✅ Error handling working (404 for invalid session)');
    } else {
      console.log('⚠️  Unexpected status for invalid session:', invalidResponse.status);
    }
    
    return true;
  } catch (error) {
    console.log('❌ API test failed:', error.message);
    return false;
  }
}

async function testQuickResearch() {
  console.log('\n🚀 Testing quick research session...');
  
  try {
    console.log('   Starting foundation research...');
    
    const startResponse = await fetch(`${BASE_URL}/api/deep-research/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is machine learning?',
        research_type: 'foundation',
        max_sources_per_phase: 3
      })
    });
    
    const startData = await startResponse.json();
    
    if (!startResponse.ok) {
      console.log('❌ Failed to start research:', startData);
      return false;
    }
    
    const sessionId = startData.session_id;
    console.log(`✅ Research started! Session: ${sessionId}`);
    console.log(`   Estimated time: ${startData.estimated_completion_time}s`);
    
    // Wait a moment and check progress
    console.log('   Checking progress in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const progressResponse = await fetch(`${BASE_URL}/api/deep-research/${sessionId}`);
    const progressData = await progressResponse.json();
    
    if (progressResponse.ok) {
      console.log(`✅ Progress check working`);
      console.log(`   Status: ${progressData.status}`);
      console.log(`   Progress: ${progressData.progress?.total_progress || 0}%`);
      console.log(`   Activity: ${progressData.progress?.current_activity || 'Unknown'}`);
    } else {
      console.log('❌ Progress check failed:', progressData);
    }
    
    return sessionId;
    
  } catch (error) {
    console.log('❌ Quick research test failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔬 Deep Research Engine - Quick Test\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Time: ${new Date().toLocaleString()}\n`);
  
  // Test 1: Health Check
  const healthy = await testHealthCheck();
  if (!healthy) {
    console.log('\n❌ Cannot proceed - service not healthy');
    console.log('\n🛠️  Troubleshooting:');
    console.log('   1. Make sure server is running: npm run dev');
    console.log('   2. Check Redis is available');
    console.log('   3. Check console for error messages');
    process.exit(1);
  }
  
  // Test 2: Basic API
  const apiWorking = await testBasicAPI();
  if (!apiWorking) {
    console.log('\n❌ Basic API tests failed');
    process.exit(1);
  }
  
  // Test 3: Quick Research
  const sessionId = await testQuickResearch();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Basic tests completed!');
  
  if (sessionId) {
    console.log('\n📋 Manual testing suggestions:');
    console.log('   1. Toggle "Deep Research" ON in the UI');
    console.log('   2. Try: "What are the benefits of meditation?"');
    console.log('   3. Try slash commands:');
    console.log('      /research What is blockchain?');
    console.log('      /research-quick Latest AI news');
    console.log('      /research-list');
    console.log(`      /research-status ${sessionId.substring(0, 8)}`);
    console.log('\n   Watch the browser console and network tab for detailed logs');
  }
  
  console.log('\n✅ Deep Research Engine is ready for testing!');
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Test script error:', error.message);
    process.exit(1);
  });
}