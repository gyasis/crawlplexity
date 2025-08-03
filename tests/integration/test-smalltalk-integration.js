/**
 * SmallTalk Integration Tests
 * Tests the complete SmallTalk agent orchestration system
 */

// Use native fetch (available in Node.js 18+)

const BASE_URL = 'http://localhost:18563';

// Test configuration
const testAgent = {
  config: {
    name: "Test Agent",
    model: "gpt-4o",
    personality: "Helpful test assistant",
    temperature: 0.7,
    maxTokens: 1000
  },
  capabilities: {
    expertise: ["testing"],
    complexity: "basic"
  },
  metadata: {
    version: "1.0.0",
    author: "Test Suite",
    description: "Agent for integration testing"
  }
};

const testGroup = {
  name: "Test Group",
  description: "Group for integration testing",
  agents: []
};

// Test runner
async function runTests() {
  let createdAgentId = null;
  let createdGroupId = null;
  let testsPassed = 0;
  let testsFailed = 0;

  console.log('🧪 Starting SmallTalk Integration Tests...\n');
  console.log(`📍 Testing against: ${BASE_URL}\n`);

  // Helper function for assertions
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      testsPassed++;
      return true;
    } else {
      console.error(`  ❌ ${message}`);
      testsFailed++;
      return false;
    }
  }

  // Test 1: Check API Health
  console.log('🔍 Test 1: API Health Check');
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/agents`);
    assert(healthResponse.ok, 'Agents API endpoint is accessible');
    
    const groupsResponse = await fetch(`${BASE_URL}/api/agent-groups`);
    assert(groupsResponse.ok, 'Agent Groups API endpoint is accessible');
  } catch (error) {
    console.error(`  ❌ API health check failed: ${error.message}`);
    console.log('\n⚠️  Make sure the development server is running: npm run dev');
    return;
  }
  console.log();

  // Test 2: Create Agent
  console.log('🤖 Test 2: Create Agent');
  try {
    const createResponse = await fetch(`${BASE_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAgent)
    });
    
    assert(createResponse.ok, 'Agent creation request successful');
    
    const createData = await createResponse.json();
    assert(createData.success === true, 'Agent creation response indicates success');
    
    if (createData.data && createData.data.agent_id) {
      createdAgentId = createData.data.agent_id;
      assert(true, `Agent created with ID: ${createdAgentId}`);
    } else {
      assert(false, 'Agent ID not returned in response');
    }
  } catch (error) {
    console.error(`  ❌ Agent creation failed: ${error.message}`);
  }
  console.log();

  // Test 3: Read Agents
  console.log('📖 Test 3: Read Agents');
  try {
    const readResponse = await fetch(`${BASE_URL}/api/agents`);
    assert(readResponse.ok, 'Agents list request successful');
    
    const readData = await readResponse.json();
    assert(readData.success === true, 'Agents list response indicates success');
    
    if (readData.data && Array.isArray(readData.data)) {
      assert(true, `Found ${readData.data.length} agent(s)`);
      
      if (createdAgentId) {
        const foundAgent = readData.data.find(agent => agent.agent_id === createdAgentId);
        assert(!!foundAgent, 'Created agent found in list');
      }
    }
  } catch (error) {
    console.error(`  ❌ Reading agents failed: ${error.message}`);
  }
  console.log();

  // Test 4: Update Agent
  if (createdAgentId) {
    console.log('✏️  Test 4: Update Agent');
    try {
      const updateData = { 
        ...testAgent, 
        config: { ...testAgent.config, name: "Updated Test Agent" } 
      };
      
      const updateResponse = await fetch(`${BASE_URL}/api/agents/${createdAgentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      assert(updateResponse.ok, 'Agent update request successful');
      
      const updateResponseData = await updateResponse.json();
      assert(updateResponseData.success === true, 'Agent update response indicates success');
    } catch (error) {
      console.error(`  ❌ Agent update failed: ${error.message}`);
    }
    console.log();
  }

  // Test 5: Create Agent Group
  if (createdAgentId) {
    console.log('👥 Test 5: Create Agent Group');
    try {
      const groupData = { ...testGroup, agents: [createdAgentId] };
      
      const createResponse = await fetch(`${BASE_URL}/api/agent-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });
      
      assert(createResponse.ok, 'Agent group creation request successful');
      
      const createData = await createResponse.json();
      assert(createData.success === true, 'Agent group creation response indicates success');
      
      if (createData.data && createData.data.id) {
        createdGroupId = createData.data.id;
        assert(true, `Agent group created with ID: ${createdGroupId}`);
      }
    } catch (error) {
      console.error(`  ❌ Agent group creation failed: ${error.message}`);
    }
    console.log();
  }

  // Test 6: Chat API
  if (createdAgentId) {
    console.log('💬 Test 6: Agent Chat API');
    try {
      const chatRequest = {
        query: "Hello, this is a test message",
        agentId: createdAgentId,
        sessionId: "test-session-123",
        userId: "test-user"
      };

      const response = await fetch(`${BASE_URL}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRequest)
      });

      assert(response.ok, 'Agent chat request successful');
      
      const contentType = response.headers.get('content-type');
      assert(
        contentType && contentType.includes('text/event-stream'),
        'Response is Server-Sent Events stream'
      );
    } catch (error) {
      console.error(`  ❌ Agent chat failed: ${error.message}`);
    }
    console.log();
  }

  // Test 7: Error Handling
  console.log('⚠️  Test 7: Error Handling');
  try {
    const invalidResponse = await fetch(`${BASE_URL}/api/agents/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: createdAgentId }) // Missing query
    });

    assert(invalidResponse.status === 400, 'Invalid request returns 400 status');
    
    const errorData = await invalidResponse.json();
    assert(errorData.success === false, 'Error response indicates failure');
    assert(errorData.error && errorData.error.includes('required'), 'Error message mentions required field');
  } catch (error) {
    console.error(`  ❌ Error handling test failed: ${error.message}`);
  }
  console.log();

  // Cleanup
  console.log('🧹 Cleanup');
  try {
    // Delete agent
    if (createdAgentId) {
      const deleteResponse = await fetch(`${BASE_URL}/api/agents/${createdAgentId}`, {
        method: 'DELETE'
      });
      assert(deleteResponse.ok, `Agent ${createdAgentId} deleted`);
    }

    // Note: Group deletion endpoint would go here if implemented
    // if (createdGroupId) {
    //   const deleteResponse = await fetch(`${BASE_URL}/api/agent-groups/${createdGroupId}`, {
    //     method: 'DELETE'
    //   });
    //   assert(deleteResponse.ok, `Group ${createdGroupId} deleted`);
    // }
  } catch (error) {
    console.error(`  ⚠️  Cleanup warning: ${error.message}`);
  }
  console.log();

  // Summary
  console.log('═'.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`  ✅ Passed: ${testsPassed}`);
  console.log(`  ❌ Failed: ${testsFailed}`);
  console.log(`  📈 Total: ${testsPassed + testsFailed}`);
  console.log(`  🎯 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('═'.repeat(50));

  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! SmallTalk integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testAgent, testGroup };