import { test, expect } from '@playwright/test';

// Test the MCP Server Dashboard interface
test.describe('MCP Server Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to MCP servers page
    await page.goto('/mcp-servers');
  });

  test('should display MCP server dashboard', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('MCP Server Dashboard');
    
    // Check description
    await expect(page.locator('p')).toContainText('Manage Model Context Protocol servers');
    
    // Should have stats cards
    await expect(page.locator('text=Total Servers').first()).toBeVisible();
    await expect(page.locator('text=Connected').first()).toBeVisible();
    await expect(page.locator('text=Disconnected').first()).toBeVisible();
    
    // Should have Add Server button
    await expect(page.locator('button:text("Add Server")')).toBeVisible();
    
    // Should have search input
    await expect(page.locator('input[placeholder*="Search servers"]')).toBeVisible();
    
    // Should have refresh button
    await expect(page.locator('button').filter({ hasText: /refresh/i })).toBeVisible();
  });

  test('should search for MCP servers', async ({ page }) => {
    // Wait for servers to load
    await page.waitForSelector('[data-testid="server-card"], .text-center');
    
    // Search for context7 server
    await page.fill('input[placeholder*="Search servers"]', 'context7');
    
    // Should show filtered results
    await page.waitForTimeout(500); // Wait for search debounce
    
    // Check if server appears in results or no results message
    const serverCards = page.locator('[data-testid="server-card"]');
    const noResults = page.locator('text=No MCP servers found');
    
    await expect(serverCards.or(noResults)).toBeVisible();
  });

  test('should open server creation dialog', async ({ page }) => {
    // Click Add Server button
    await page.click('button:text("Add Server")');
    
    // Should open server editor dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Add New MCP Server')).toBeVisible();
    
    // Should have tabs
    await expect(page.locator('[role="tab"]:text("Basic Info")')).toBeVisible();
    await expect(page.locator('[role="tab"]:text("Configuration")')).toBeVisible();
    await expect(page.locator('[role="tab"]:text("Environment")')).toBeVisible();
    await expect(page.locator('[role="tab"]:text("Test Connection")')).toBeVisible();
    
    // Should have form fields
    await expect(page.locator('input[placeholder*="context7"]')).toBeVisible();
    await expect(page.locator('button[role="combobox"]').filter({ hasText: 'Stdio' })).toBeVisible();
    
    // Close dialog
    await page.click('button:text("Cancel")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should create a new MCP server', async ({ page }) => {
    // Click Add Server button
    await page.click('button:text("Add Server")');
    
    // Fill in basic info
    await page.fill('input[placeholder*="context7"]', 'test_server');
    
    // Select server type (already defaulted to stdio)
    await page.click('button[role="combobox"]');
    await page.click('text=Stdio');
    
    // Fill command
    await page.fill('input[placeholder*="npx"]', 'node');
    
    // Switch to Configuration tab
    await page.click('[role="tab"]:text("Configuration")');
    
    // Add an argument
    await page.click('button:text("Add Arg")');
    await page.fill('input[placeholder*="Argument 1"]', '--version');
    
    // Switch to Test Connection tab
    await page.click('[role="tab"]:text("Test Connection")');
    
    // Test connection
    await page.click('button:text("Test Connection")');
    
    // Wait for test to complete
    await page.waitForTimeout(3000);
    
    // Should show test result
    const testResult = page.locator('text=Connection Successful, text=Connection Failed');
    await expect(testResult.first()).toBeVisible();
    
    // Save the server
    await page.click('button:text("Add Server")');
    
    // Should close dialog
    await page.waitForTimeout(1000);
  });

  test('should use quick templates', async ({ page }) => {
    // Click Add Server button
    await page.click('button:text("Add Server")');
    
    // Should see quick templates
    await expect(page.locator('text=Quick Templates')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'context7' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'filesystem' })).toBeVisible();
    
    // Click on context7 template
    await page.click('button').filter({ hasText: 'context7' }).first();
    
    // Should populate form fields
    await expect(page.locator('input[value="context7"]')).toBeVisible();
    await expect(page.locator('input[value="npx"]')).toBeVisible();
    
    // Close dialog
    await page.click('button:text("Cancel")');
  });

  test('should manage environment variables', async ({ page }) => {
    // Click Add Server button
    await page.click('button:text("Add Server")');
    
    // Switch to Environment tab
    await page.click('[role="tab"]:text("Environment")');
    
    // Add environment variable
    await page.click('button:text("Add Variable")');
    
    // Fill in environment variable
    await page.fill('input[placeholder="VARIABLE_NAME"]', 'TEST_VAR');
    await page.fill('input[placeholder="Variable value"]', 'test_value');
    
    // Add another variable
    await page.click('button:text("Add Variable")');
    await page.fill('input[placeholder="VARIABLE_NAME"]').nth(1), 'API_KEY');
    await page.fill('input[placeholder="Variable value"]').nth(1), 'secret_key');
    
    // Should show security notice
    await expect(page.locator('text=Security Notice')).toBeVisible();
    
    // Close dialog
    await page.click('button:text("Cancel")');
  });

  test('should refresh servers list', async ({ page }) => {
    // Click refresh button
    const refreshButton = page.locator('button').filter({ hasText: /refresh/i });
    await refreshButton.click();
    
    // Should show loading state briefly
    await page.waitForTimeout(500);
    
    // Page should still be functional
    await expect(page.locator('h1')).toContainText('MCP Server Dashboard');
  });

  test('should display server stats correctly', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('text=Total Servers');
    
    // Check that stats are displayed as numbers
    const totalServers = page.locator('text=Total Servers').locator('..').locator('.text-2xl');
    const connected = page.locator('text=Connected').locator('..').locator('.text-2xl');
    const disconnected = page.locator('text=Disconnected').locator('..').locator('.text-2xl');
    const errors = page.locator('text=Errors').locator('..').locator('.text-2xl');
    
    await expect(totalServers).toBeVisible();
    await expect(connected).toBeVisible();
    await expect(disconnected).toBeVisible();
    await expect(errors).toBeVisible();
    
    // Verify they contain numbers
    const totalText = await totalServers.textContent();
    const connectedText = await connected.textContent();
    
    expect(totalText).toMatch(/^\d+$/);
    expect(connectedText).toMatch(/^\d+$/);
  });
});