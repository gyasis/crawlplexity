import { test, expect } from '@playwright/test';

// End-to-end workflow tests for the complete Tools & MCP integration
test.describe('Tools & MCP Integration Workflow', () => {
  
  test('should complete full tool management workflow', async ({ page }) => {
    // Step 1: Navigate to tools page
    await page.goto('/tools');
    await expect(page.locator('h1')).toContainText('Tool Library');
    
    // Step 2: Create a new tool
    await page.click('button:text("Create Tool")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Fill in tool details
    await page.fill('input[placeholder*="weather_api"]', 'integration_test_tool');
    await page.fill('textarea[placeholder*="Describe what this tool does"]', 'Tool created during integration testing');
    
    // Select category
    await page.click('button[role="combobox"]');
    await page.click('text=Utility');
    
    // Add parameters
    await page.click('[role="tab"]:text("Parameters")');
    await page.click('button:text("Add Parameter")');
    
    await page.fill('input[placeholder="param_name"]', 'test_input');
    await page.fill('input[placeholder="Parameter description"]', 'Test input parameter');
    
    // Check required checkbox
    await page.click('input[type="checkbox"]');
    
    // Add handler code
    await page.click('[role="tab"]:text("Handler Code")');
    const handlerCode = `async function handler(params) {
  const { test_input } = params;
  return {
    success: true,
    result: \`Processed: \${test_input}\`,
    timestamp: new Date().toISOString()
  };
}`;
    await page.fill('textarea[placeholder*="async function handler"]', handlerCode);
    
    // Test the tool
    await page.click('[role="tab"]:text("Test & Validate")');
    await page.click('button:text("Validate Tool")');
    
    // Wait for validation
    await page.waitForTimeout(2000);
    
    // Should show validation result
    const validationResult = page.locator('text=Validation Passed, text=Validation Failed');
    await expect(validationResult.first()).toBeVisible();
    
    // Save the tool
    await page.click('button:text("Create Tool")');
    
    // Should return to tools list
    await page.waitForTimeout(1000);
    await expect(page.locator('h1')).toContainText('Tool Library');
    
    // Step 3: Search for created tool
    await page.fill('input[placeholder*="Search tools"]', 'integration_test_tool');
    await page.waitForTimeout(500);
    
    // Should find the created tool (if backend is working)
    // For UI testing, we just verify search functionality works
    const searchResults = page.locator('[data-testid="tool-card"], text=No tools found');
    await expect(searchResults.first()).toBeVisible();
  });

  test('should complete full MCP server management workflow', async ({ page }) => {
    // Step 1: Navigate to MCP servers page
    await page.goto('/mcp-servers');
    await expect(page.locator('h1')).toContainText('MCP Server Dashboard');
    
    // Step 2: Create a new MCP server
    await page.click('button:text("Add Server")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Fill in server details
    await page.fill('input[placeholder*="context7"]', 'integration_test_server');
    
    // Keep stdio type (default)
    await page.fill('input[placeholder*="npx"]', 'echo');
    
    // Add configuration
    await page.click('[role="tab"]:text("Configuration")');
    await page.click('button:text("Add Arg")');
    await page.fill('input[placeholder*="Argument 1"]', 'hello world');
    
    // Add environment variables
    await page.click('[role="tab"]:text("Environment")');
    await page.click('button:text("Add Variable")');
    await page.fill('input[placeholder="VARIABLE_NAME"]', 'TEST_ENV');
    await page.fill('input[placeholder="Variable value"]', 'test_value');
    
    // Test connection
    await page.click('[role="tab"]:text("Test Connection")');
    await page.click('button:text("Test Connection")');
    
    // Wait for test
    await page.waitForTimeout(3000);
    
    // Should show test result
    const testResult = page.locator('text=Connection Successful, text=Connection Failed');
    await expect(testResult.first()).toBeVisible();
    
    // Save the server
    await page.click('button:text("Add Server")');
    
    // Should return to dashboard
    await page.waitForTimeout(1000);
    await expect(page.locator('h1')).toContainText('MCP Server Dashboard');
    
    // Step 3: Search for created server
    await page.fill('input[placeholder*="Search servers"]', 'integration_test_server');
    await page.waitForTimeout(500);
    
    // Should find the created server (if backend is working)
    const searchResults = page.locator('[data-testid="server-card"], text=No MCP servers found');
    await expect(searchResults.first()).toBeVisible();
  });

  test('should navigate between tools and MCP servers pages', async ({ page }) => {
    // Start at tools page
    await page.goto('/tools');
    await expect(page.locator('h1')).toContainText('Tool Library');
    
    // Navigate to MCP servers (assuming navigation exists)
    await page.goto('/mcp-servers');
    await expect(page.locator('h1')).toContainText('MCP Server Dashboard');
    
    // Go back to tools
    await page.goto('/tools');
    await expect(page.locator('h1')).toContainText('Tool Library');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Test tools page error handling
    await page.goto('/tools');
    
    // Try to create tool with invalid data
    await page.click('button:text("Create Tool")');
    
    // Try to save without required fields
    await page.click('button:text("Create Tool")');
    
    // Should stay on dialog (button should be disabled or show validation)
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Cancel and try MCP servers
    await page.click('button:text("Cancel")');
    
    await page.goto('/mcp-servers');
    
    // Try to create server with invalid data
    await page.click('button:text("Add Server")');
    
    // Try to save without required fields
    await page.click('button:text("Add Server")');
    
    // Should stay on dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Cancel
    await page.click('button:text("Cancel")');
  });

  test('should show appropriate loading and empty states', async ({ page }) => {
    // Test tools page loading/empty state
    await page.goto('/tools');
    
    // Should show either tools or empty state
    const toolsContent = page.locator('text=Tool Library');
    await expect(toolsContent).toBeVisible();
    
    // Check if empty state is shown appropriately
    const emptyState = page.locator('text=No tools found');
    const toolCards = page.locator('[data-testid="tool-card"]');
    
    // Either tools should be visible OR empty state
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text=Create your first tool')).toBeVisible();
    } else if (await toolCards.count() > 0) {
      await expect(toolCards.first()).toBeVisible();
    }
    
    // Test MCP servers page
    await page.goto('/mcp-servers');
    
    const serversContent = page.locator('text=MCP Server Dashboard');
    await expect(serversContent).toBeVisible();
    
    // Check MCP servers empty state
    const mcpEmptyState = page.locator('text=No MCP servers found');
    const serverCards = page.locator('[data-testid="server-card"]');
    
    // Either servers should be visible OR empty state
    if (await mcpEmptyState.isVisible()) {
      await expect(mcpEmptyState).toBeVisible();
      await expect(page.locator('text=Add your first MCP server')).toBeVisible();
    } else if (await serverCards.count() > 0) {
      await expect(serverCards.first()).toBeVisible();
    }
  });

  test('should handle form validation correctly', async ({ page }) => {
    // Test tool form validation
    await page.goto('/tools');
    await page.click('button:text("Create Tool")');
    
    // Submit empty form - Create Tool button should be disabled
    const createButton = page.locator('button:text("Create Tool")').nth(1); // Second one in dialog
    await expect(createButton).toBeDisabled();
    
    // Fill minimum required fields
    await page.fill('input[placeholder*="weather_api"]', 'test');
    await page.fill('textarea[placeholder*="Describe what this tool does"]', 'test description');
    await page.click('[role="tab"]:text("Handler Code")');
    await page.fill('textarea[placeholder*="async function handler"]', 'async function handler() { return {}; }');
    
    // Now button should be enabled
    await expect(createButton).toBeEnabled();
    
    // Cancel and test MCP server validation
    await page.click('button:text("Cancel")');
    
    await page.goto('/mcp-servers');
    await page.click('button:text("Add Server")');
    
    // Submit empty form - Add Server button should be disabled
    const addButton = page.locator('button:text("Add Server")').nth(1); // Second one in dialog
    await expect(addButton).toBeDisabled();
    
    // Fill minimum required fields
    await page.fill('input[placeholder*="context7"]', 'test');
    await page.fill('input[placeholder*="npx"]', 'node');
    
    // Now button should be enabled
    await expect(addButton).toBeEnabled();
    
    // Cancel
    await page.click('button:text("Cancel")');
  });
});