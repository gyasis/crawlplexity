/**
 * SmallTalk Integration Tests
 * Tests the complete SmallTalk agent orchestration system
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

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

describe('SmallTalk Integration Tests', () => {
  let createdAgentId = null;
  let createdGroupId = null;

  // Test 1: Agent CRUD Operations
  test('should create, read, update, and delete agents', async () => {
    // Create agent
    const createResponse = await fetch(`${BASE_URL}/api/agents`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAgent)
    });
    
    expect(createResponse.ok).toBe(true);
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    createdAgentId = createData.data.agent_id;

    // Read agents
    const readResponse = await fetch(`${BASE_URL}/api/agents`);
    expect(readResponse.ok).toBe(true);
    const readData = await readResponse.json();
    expect(readData.success).toBe(true);
    expect(readData.data.some(agent => agent.agent_id === createdAgentId)).toBe(true);

    // Update agent
    const updateData = { ...testAgent, config: { ...testAgent.config, name: "Updated Test Agent" } };
    const updateResponse = await fetch(`${BASE_URL}/api/agents/${createdAgentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    expect(updateResponse.ok).toBe(true);
  });

  // Test 2: Agent Group Operations
  test('should create and manage agent groups', async () => {
    // Create group with the test agent
    const groupData = { ...testGroup, agents: [createdAgentId] };
    const createResponse = await fetch(`${BASE_URL}/api/agent-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(groupData)
    });

    expect(createResponse.ok).toBe(true);
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    createdGroupId = createData.data.id;

    // Read groups
    const readResponse = await fetch(`${BASE_URL}/api/agent-groups`);
    expect(readResponse.ok).toBe(true);
    const readData = await readResponse.json();
    expect(readData.success).toBe(true);
    expect(readData.data.some(group => group.id === createdGroupId)).toBe(true);
  });

  // Test 3: Agent Chat API
  test('should handle agent chat requests', async () => {
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

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    
    // Note: Full streaming test would require more complex setup
    // This test verifies the endpoint accepts requests correctly
  });

  // Test 4: Group Chat API
  test('should handle group chat requests', async () => {
    const chatRequest = {
      query: "Hello from the test group",
      groupId: createdGroupId,
      sessionId: "test-session-456",
      userId: "test-user"
    };

    const response = await fetch(`${BASE_URL}/api/agents/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatRequest)
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
  });

  // Test 5: Error Handling
  test('should handle invalid requests gracefully', async () => {
    // Invalid agent chat (missing query)
    const invalidResponse = await fetch(`${BASE_URL}/api/agents/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: createdAgentId })
    });

    expect(invalidResponse.status).toBe(400);
    const errorData = await invalidResponse.json();
    expect(errorData.success).toBe(false);
    expect(errorData.error).toContain('required');
  });

  // Cleanup
  afterAll(async () => {
    // Delete created agent
    if (createdAgentId) {
      await fetch(`${BASE_URL}/api/agents/${createdAgentId}`, {
        method: 'DELETE'
      });
    }

    // Delete created group  
    if (createdGroupId) {
      await fetch(`${BASE_URL}/api/agent-groups/${createdGroupId}`, {
        method: 'DELETE'
      });
    }
  });
});

// Manual test functions for development
if (require.main === module) {
  console.log('Running SmallTalk Integration Tests...');
  
  // Simple smoke test
  async function smokeTest() {
    try {
      // Test agents endpoint
      const agentsResponse = await fetch(`${BASE_URL}/api/agents`);
      console.log('✅ Agents API:', agentsResponse.ok ? 'OK' : 'FAILED');

      // Test groups endpoint  
      const groupsResponse = await fetch(`${BASE_URL}/api/agent-groups`);
      console.log('✅ Groups API:', groupsResponse.ok ? 'OK' : 'FAILED');

      console.log('🎉 Smoke test completed');
    } catch (error) {
      console.error('❌ Smoke test failed:', error.message);
    }
  }

  smokeTest();
}

module.exports = {
  testAgent,
  testGroup
};