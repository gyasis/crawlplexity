#!/usr/bin/env npx tsx

// Basic backend test for Tools and MCP integration
// Run with: npx tsx tests/backend/test-tools-basic.ts

import Database from 'better-sqlite3';
import { promises as fs } from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testDatabaseSchema() {
  log('\n📝 Testing Database Schema', 'blue');
  
  const db = new Database('fireplexity.db');
  
  try {
    // Test tools table
    const toolsInfo = db.prepare("SELECT * FROM tools LIMIT 1").get();
    if (toolsInfo !== undefined) {
      log('  ✅ Tools table exists', 'green');
    }
    
    // Test MCP servers table
    const mcpInfo = db.prepare("SELECT * FROM mcp_servers LIMIT 1").get();
    if (mcpInfo !== undefined) {
      log('  ✅ MCP servers table exists', 'green');
    }
    
    // Test agent_tools table
    const agentToolsInfo = db.prepare("SELECT * FROM agent_tools LIMIT 1").get();
    if (agentToolsInfo !== undefined) {
      log('  ✅ Agent tools table exists', 'green');
    }
    
    // Count default tools
    const toolCount = db.prepare("SELECT COUNT(*) as count FROM tools").get() as any;
    log(`  ✅ Found ${toolCount.count} tools in database`, 'green');
    
    // Count MCP servers
    const mcpCount = db.prepare("SELECT COUNT(*) as count FROM mcp_servers").get() as any;
    log(`  ✅ Found ${mcpCount.count} MCP servers configured`, 'green');
    
    db.close();
    return true;
  } catch (error: any) {
    log(`  ❌ Database test failed: ${error.message}`, 'red');
    db.close();
    return false;
  }
}

async function testToolQueries() {
  log('\n📝 Testing Tool Queries', 'blue');
  
  const db = new Database('fireplexity.db');
  
  try {
    // List all tools
    const tools = db.prepare("SELECT * FROM tools WHERE is_active = 1").all();
    log(`  ✅ Retrieved ${tools.length} active tools`, 'green');
    
    // Show tool details
    for (const tool of tools as any[]) {
      log(`     - ${tool.name} (${tool.category}): ${tool.description}`, 'blue');
    }
    
    // Test tool assignment query
    const agentId = 'test-agent-' + Date.now();
    const toolId = (tools[0] as any).tool_id;
    
    const stmt = db.prepare(`
      INSERT INTO agent_tools (agent_id, tool_id, configuration, rate_limit)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(agentId, toolId, '{}', 100);
    log(`  ✅ Successfully assigned tool to agent`, 'green');
    
    // Retrieve assignment
    const assignment = db.prepare(`
      SELECT * FROM agent_tools WHERE agent_id = ?
    `).get(agentId);
    
    if (assignment) {
      log(`  ✅ Retrieved tool assignment`, 'green');
    }
    
    // Clean up test data
    db.prepare("DELETE FROM agent_tools WHERE agent_id = ?").run(agentId);
    
    db.close();
    return true;
  } catch (error: any) {
    log(`  ❌ Tool query test failed: ${error.message}`, 'red');
    db.close();
    return false;
  }
}

async function testMCPServerQueries() {
  log('\n📝 Testing MCP Server Queries', 'blue');
  
  const db = new Database('fireplexity.db');
  
  try {
    // List all MCP servers
    const servers = db.prepare("SELECT * FROM mcp_servers").all();
    log(`  ✅ Retrieved ${servers.length} MCP servers`, 'green');
    
    // Show server details
    for (const server of servers as any[]) {
      log(`     - ${server.name} (${server.type}): ${server.status}`, 'blue');
      if (server.capabilities) {
        const caps = JSON.parse(server.capabilities);
        if (caps.length > 0) {
          log(`       Capabilities: ${caps.join(', ')}`, 'yellow');
        }
      }
    }
    
    // Test server assignment
    const agentId = 'test-agent-' + Date.now();
    const serverId = (servers[0] as any).server_id;
    
    const stmt = db.prepare(`
      INSERT INTO agent_mcp_servers (agent_id, server_id, configuration)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(agentId, serverId, '{}');
    log(`  ✅ Successfully assigned MCP server to agent`, 'green');
    
    // Clean up
    db.prepare("DELETE FROM agent_mcp_servers WHERE agent_id = ?").run(agentId);
    
    db.close();
    return true;
  } catch (error: any) {
    log(`  ❌ MCP server query test failed: ${error.message}`, 'red');
    db.close();
    return false;
  }
}

async function testExecutionLogging() {
  log('\n📝 Testing Execution Logging', 'blue');
  
  const db = new Database('fireplexity.db');
  
  try {
    // Get a tool ID
    const tool = db.prepare("SELECT tool_id FROM tools LIMIT 1").get() as any;
    if (!tool) {
      throw new Error('No tools found');
    }
    
    // Create test execution log
    const logStmt = db.prepare(`
      INSERT INTO tool_execution_logs 
      (tool_id, agent_id, conversation_id, input_params, output_result, execution_time_ms, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testLog = {
      toolId: tool.tool_id,
      agentId: 'test-agent',
      conversationId: 'test-conv-123',
      input: JSON.stringify({ test: 'input' }),
      output: JSON.stringify({ test: 'output' }),
      time: 150,
      status: 'success'
    };
    
    logStmt.run(
      testLog.toolId,
      testLog.agentId,
      testLog.conversationId,
      testLog.input,
      testLog.output,
      testLog.time,
      testLog.status
    );
    
    log(`  ✅ Created execution log entry`, 'green');
    
    // Retrieve log
    const logEntry = db.prepare(`
      SELECT * FROM tool_execution_logs 
      WHERE agent_id = ? AND conversation_id = ?
    `).get(testLog.agentId, testLog.conversationId);
    
    if (logEntry) {
      log(`  ✅ Retrieved execution log successfully`, 'green');
    }
    
    // Clean up
    db.prepare(`
      DELETE FROM tool_execution_logs 
      WHERE agent_id = ? AND conversation_id = ?
    `).run(testLog.agentId, testLog.conversationId);
    
    db.close();
    return true;
  } catch (error: any) {
    log(`  ❌ Execution logging test failed: ${error.message}`, 'red');
    db.close();
    return false;
  }
}

async function main() {
  log('\n🚀 Starting Tools & MCP Integration Tests\n', 'yellow');
  
  const results = [];
  
  results.push(await testDatabaseSchema());
  results.push(await testToolQueries());
  results.push(await testMCPServerQueries());
  results.push(await testExecutionLogging());
  
  const allPassed = results.every(r => r === true);
  
  if (allPassed) {
    log('\n✨ All tests passed successfully!\n', 'green');
  } else {
    log('\n💥 Some tests failed. Please check the output above.\n', 'red');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}\n`, 'red');
  process.exit(1);
});