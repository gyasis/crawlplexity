#!/usr/bin/env node

// Backend test script for Tools and MCP Server integration
// Run with: node tests/backend/test-tools-integration.js

import { ToolRegistry } from '../../lib/tools/ToolRegistry.js';
import { calculatorTool } from '../../lib/tools/computation/calculator.js';
import { webSearchTool } from '../../lib/tools/search/web_search.js';
import { fileOperationsTool } from '../../lib/tools/utility/file_operations.js';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

const TEST_DB = 'test-fireplexity.db';

// Test utilities
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n📝 Testing: ${name}`, 'blue');
}

function logSuccess(message) {
  log(`  ✅ ${message}`, 'green');
}

function logError(message) {
  log(`  ❌ ${message}`, 'red');
}

// Setup test database
async function setupTestDatabase() {
  logTest('Database Setup');
  
  // Copy production database schema
  const schema = await fs.readFile('scripts/create-tools-mcp-schema.sql', 'utf8');
  
  // Create test database
  const db = new Database(TEST_DB);
  db.exec(schema);
  db.close();
  
  logSuccess('Test database created');
}

// Test Tool Registry
async function testToolRegistry() {
  logTest('Tool Registry');
  
  const registry = new ToolRegistry(TEST_DB);
  
  try {
    // Test tool registration
    const toolId = await registry.registerTool(calculatorTool, '/test/calculator.ts');
    logSuccess(`Registered calculator tool: ${toolId}`);
    
    // Test tool retrieval
    const tool = registry.getTool(toolId);
    if (tool && tool.tool.name === 'calculator') {
      logSuccess('Retrieved tool successfully');
    } else {
      throw new Error('Failed to retrieve tool');
    }
    
    // Test tool by name
    const toolByName = registry.getToolByName('calculator');
    if (toolByName) {
      logSuccess('Found tool by name');
    } else {
      throw new Error('Failed to find tool by name');
    }
    
    // Test listing tools
    const tools = registry.listTools();
    if (tools.length > 0) {
      logSuccess(`Listed ${tools.length} tools`);
    }
    
    registry.close();
  } catch (error) {
    logError(`Tool Registry test failed: ${error.message}`);
    registry.close();
    throw error;
  }
}

// Test Tool Execution
async function testToolExecution() {
  logTest('Tool Execution');
  
  const registry = new ToolRegistry(TEST_DB);
  
  try {
    // Register tools
    const calcId = await registry.registerTool(calculatorTool, '/test/calculator.ts');
    const searchId = await registry.registerTool(webSearchTool, '/test/web_search.ts');
    const fileId = await registry.registerTool(fileOperationsTool, '/test/file_ops.ts');
    
    // Test calculator execution
    const calcResult = await registry.executeTool(
      calcId,
      { expression: '2 + 3 * 4', precision: 2 },
      { agentId: 'test-agent', conversationId: 'test-conv' }
    );
    
    if (calcResult.success && calcResult.result.result === 14) {
      logSuccess('Calculator tool executed correctly: 2 + 3 * 4 = 14');
    } else {
      throw new Error('Calculator gave wrong result');
    }
    
    // Test web search execution
    const searchResult = await registry.executeTool(
      searchId,
      { query: 'test query', maxResults: 3 },
      { agentId: 'test-agent' }
    );
    
    if (searchResult.success && searchResult.result.results) {
      logSuccess(`Web search returned ${searchResult.result.results.length} results`);
    } else {
      throw new Error('Web search failed');
    }
    
    // Test file operations
    const testFilePath = 'test-file.txt';
    const writeResult = await registry.executeTool(
      fileId,
      { 
        operation: 'write', 
        filePath: testFilePath,
        content: 'Test content'
      },
      { agentId: 'test-agent' }
    );
    
    if (writeResult.success) {
      logSuccess('File write operation succeeded');
      
      // Clean up test file
      await fs.unlink(testFilePath).catch(() => {});
    }
    
    registry.close();
  } catch (error) {
    logError(`Tool execution test failed: ${error.message}`);
    registry.close();
    throw error;
  }
}

// Test Agent Tool Assignment
async function testAgentToolAssignment() {
  logTest('Agent Tool Assignment');
  
  const registry = new ToolRegistry(TEST_DB);
  const db = new Database(TEST_DB);
  
  try {
    // Register a tool
    const toolId = await registry.registerTool(calculatorTool, '/test/calculator.ts');
    
    // Assign to agent
    const agentId = 'research-assistant';
    registry.assignToolToAgent(toolId, agentId, { maxPrecision: 10 });
    logSuccess(`Assigned tool to agent ${agentId}`);
    
    // Get agent tools
    const agentTools = registry.getAgentTools(agentId);
    if (agentTools.length === 1 && agentTools[0].name === 'calculator') {
      logSuccess('Retrieved agent tools successfully');
    } else {
      throw new Error('Failed to retrieve agent tools');
    }
    
    // Check database record
    const stmt = db.prepare('SELECT * FROM agent_tools WHERE agent_id = ?');
    const assignment = stmt.get(agentId);
    if (assignment) {
      logSuccess('Tool assignment saved to database');
    }
    
    // Remove assignment
    registry.removeToolFromAgent(toolId, agentId);
    const updatedTools = registry.getAgentTools(agentId);
    if (updatedTools.length === 0) {
      logSuccess('Tool assignment removed successfully');
    }
    
    registry.close();
    db.close();
  } catch (error) {
    logError(`Agent tool assignment test failed: ${error.message}`);
    registry.close();
    db.close();
    throw error;
  }
}

// Test Rate Limiting
async function testRateLimiting() {
  logTest('Rate Limiting');
  
  const registry = new ToolRegistry(TEST_DB);
  const db = new Database(TEST_DB);
  
  try {
    // Register tool
    const toolId = await registry.registerTool(calculatorTool, '/test/calculator.ts');
    const agentId = 'rate-test-agent';
    
    // Set very low rate limit
    const stmt = db.prepare(`
      INSERT INTO agent_tools (agent_id, tool_id, rate_limit)
      VALUES (?, ?, ?)
    `);
    stmt.run(agentId, toolId, 2); // Only 2 calls per minute
    
    // Make allowed calls
    const result1 = await registry.executeTool(
      toolId,
      { expression: '1 + 1' },
      { agentId }
    );
    
    const result2 = await registry.executeTool(
      toolId,
      { expression: '2 + 2' },
      { agentId }
    );
    
    if (result1.success && result2.success) {
      logSuccess('First two calls succeeded');
    }
    
    // This should be rate limited
    const result3 = await registry.executeTool(
      toolId,
      { expression: '3 + 3' },
      { agentId }
    );
    
    if (!result3.success && result3.error === 'Rate limit exceeded') {
      logSuccess('Rate limiting working correctly');
    } else {
      throw new Error('Rate limiting not enforced');
    }
    
    registry.close();
    db.close();
  } catch (error) {
    logError(`Rate limiting test failed: ${error.message}`);
    registry.close();
    db.close();
    throw error;
  }
}

// Test Tool Execution Logging
async function testExecutionLogging() {
  logTest('Execution Logging');
  
  const registry = new ToolRegistry(TEST_DB);
  const db = new Database(TEST_DB);
  
  try {
    // Register and execute tool
    const toolId = await registry.registerTool(calculatorTool, '/test/calculator.ts');
    const agentId = 'logging-test-agent';
    const conversationId = 'test-conversation-123';
    
    await registry.executeTool(
      toolId,
      { expression: '10 / 2' },
      { agentId, conversationId }
    );
    
    // Check execution log
    const stmt = db.prepare(`
      SELECT * FROM tool_execution_logs 
      WHERE tool_id = ? AND agent_id = ? AND conversation_id = ?
    `);
    
    const log = stmt.get(toolId, agentId, conversationId);
    
    if (log) {
      logSuccess('Execution logged successfully');
      
      const inputParams = JSON.parse(log.input_params);
      const outputResult = JSON.parse(log.output_result);
      
      if (inputParams.expression === '10 / 2' && outputResult.result === 5) {
        logSuccess('Log contains correct input/output data');
      }
      
      if (log.status === 'success' && log.execution_time_ms > 0) {
        logSuccess(`Execution completed in ${log.execution_time_ms}ms`);
      }
    } else {
      throw new Error('Execution log not found');
    }
    
    registry.close();
    db.close();
  } catch (error) {
    logError(`Execution logging test failed: ${error.message}`);
    registry.close();
    db.close();
    throw error;
  }
}

// Main test runner
async function runTests() {
  log('\n🚀 Starting Tools Integration Backend Tests\n', 'yellow');
  
  let allTestsPassed = true;
  
  try {
    await setupTestDatabase();
    await testToolRegistry();
    await testToolExecution();
    await testAgentToolAssignment();
    await testRateLimiting();
    await testExecutionLogging();
    
    log('\n✨ All tests passed successfully!\n', 'green');
  } catch (error) {
    allTestsPassed = false;
    log(`\n💥 Test suite failed: ${error.message}\n`, 'red');
  } finally {
    // Cleanup test database
    try {
      await fs.unlink(TEST_DB);
      log('🧹 Cleaned up test database', 'yellow');
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
runTests();