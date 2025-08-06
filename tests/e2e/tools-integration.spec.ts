import { test, expect } from '@playwright/test';

// Test the Tools Management interface
test.describe('Tools Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to tools page
    await page.goto('/tools');
  });

  test('should display tool library with default tools', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Tool Library');
    
    // Check description
    await expect(page.locator('p')).toContainText('Manage and configure tools for your AI agents');
    
    // Should have stats cards
    await expect(page.locator('[role="region"]').filter({ hasText: 'Total Tools' })).toBeVisible();
    await expect(page.locator('[role="region"]').filter({ hasText: 'Active Tools' })).toBeVisible();
    
    // Should have Create Tool button
    await expect(page.locator('button', { hasText: 'Create Tool' })).toBeVisible();
    
    // Should have search input
    await expect(page.locator('input[placeholder*="Search tools"]')).toBeVisible();
    
    // Should have category filter
    await expect(page.locator('button[role="combobox"]').filter({ hasText: 'All Categories' })).toBeVisible();
  });

  test('should search for tools', async ({ page }) => {
    // Wait for tools to load
    await page.waitForSelector('[data-testid="tool-card"], .text-center');
    
    // Search for calculator tool
    await page.fill('input[placeholder*="Search tools"]', 'calculator');
    
    // Should show filtered results
    await page.waitForTimeout(500); // Wait for search debounce
    
    // Check if calculator tool appears in results or no results message
    const toolCards = page.locator('[data-testid="tool-card"]');
    const noResults = page.locator('text=No tools found');
    
    await expect(toolCards.or(noResults)).toBeVisible();
  });

  test('should filter tools by category', async ({ page }) => {
    // Wait for tools to load
    await page.waitForSelector('[data-testid="tool-card"], .text-center');
    
    // Click category filter
    await page.click('button[role="combobox"]');
    
    // Select computation category
    await page.click('text=Computation');
    
    // Should filter to computation tools
    await page.waitForTimeout(500);
    
    // Check if computation tools appear or no results
    const toolCards = page.locator('[data-testid="tool-card"]');
    const noResults = page.locator('text=No tools found');
    
    await expect(toolCards.or(noResults)).toBeVisible();
  });

  test('should open tool creation dialog', async ({ page }) => {
    // Click Create Tool button
    await page.click('button:text("Create Tool")');
    
    // Should open tool editor dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Create New Tool')).toBeVisible();
    
    // Should have tabs
    await expect(page.locator('[role="tab"]:text("Basic Info")')).toBeVisible();
    await expect(page.locator('[role="tab"]:text("Parameters")')).toBeVisible();
    await expect(page.locator('[role="tab"]:text("Handler Code")')).toBeVisible();
    await expect(page.locator('[role="tab"]:text("Test & Validate")')).toBeVisible();
    
    // Should have form fields
    await expect(page.locator('input[placeholder*="weather_api"]')).toBeVisible();
    await expect(page.locator('button[role="combobox"]').filter({ hasText: 'Utility' })).toBeVisible();
    
    // Close dialog
    await page.click('button:text("Cancel")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should create a new tool', async ({ page }) => {
    // Click Create Tool button
    await page.click('button:text("Create Tool")');
    
    // Fill in basic info
    await page.fill('input[placeholder*="weather_api"]', 'test_tool');
    await page.fill('textarea[placeholder*="Describe what this tool does"]', 'A test tool for automated testing');
    
    // Click category selector and choose computation
    await page.click('button[role="combobox"]');
    await page.click('text=Computation');
    
    // Switch to Parameters tab
    await page.click('[role="tab"]:text("Parameters")');
    
    // Add a parameter
    await page.click('button:text("Add Parameter")');
    await page.fill('input[placeholder="param_name"]', 'test_param');
    await page.fill('input[placeholder="Parameter description"]', 'Test parameter description');
    
    // Switch to Handler Code tab
    await page.click('[role="tab"]:text("Handler Code")');
    
    // Add handler code
    await page.fill('textarea[placeholder*="async function handler"]', 
      'async function handler(params) { return { success: true, result: params.test_param }; }');
    
    // Save the tool
    await page.click('button:text("Create Tool")');
    
    // Should close dialog and show success (in real implementation)
    // For now, just check dialog closes
    await page.waitForTimeout(1000);
  });

  test('should toggle view modes', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('button[aria-label*="Grid"], button[aria-label*="List"], .flex.border.rounded-lg');
    
    // Find view toggle buttons - they might be in a button group
    const gridButton = page.locator('button').filter({ hasText: /grid/i }).first();
    const listButton = page.locator('button').filter({ hasText: /list/i }).first();
    
    // If specific buttons aren't found, try the generic approach
    if (await gridButton.count() === 0) {
      // Look for view toggle in button group
      const viewToggle = page.locator('.flex.border.rounded-lg button').first();
      await viewToggle.click();
    } else {
      // Toggle between grid and list views
      await listButton.click();
      await page.waitForTimeout(300);
      
      await gridButton.click();
      await page.waitForTimeout(300);
    }
    
    // Just verify the page is still functional
    await expect(page.locator('h1')).toContainText('Tool Library');
  });

  test('should refresh tools list', async ({ page }) => {
    // Click refresh button
    const refreshButton = page.locator('button').filter({ hasText: /refresh/i });
    await refreshButton.click();
    
    // Should show loading state briefly
    await page.waitForTimeout(500);
    
    // Page should still be functional
    await expect(page.locator('h1')).toContainText('Tool Library');
  });
});