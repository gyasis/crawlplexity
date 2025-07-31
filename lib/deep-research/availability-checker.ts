/**
 * Deep Research Engine Availability Checker
 * Validates all required services and provides fallback handling
 */

export interface DeepResearchStatus {
  available: boolean;
  services: {
    database: boolean;
    redis: boolean;
    litellm: boolean;
    utils: boolean;
    crawl4ai: boolean;
    serper: boolean;
  };
  errors: string[];
  fallbackMode: boolean;
}

export class DeepResearchAvailabilityChecker {
  private static instance: DeepResearchAvailabilityChecker | null = null;
  private lastCheck: DeepResearchStatus | null = null;
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30 seconds

  static getInstance(): DeepResearchAvailabilityChecker {
    if (!this.instance) {
      this.instance = new DeepResearchAvailabilityChecker();
    }
    return this.instance;
  }

  /**
   * Check if Deep Research Engine is available
   */
  async checkAvailability(forceCheck: boolean = false): Promise<DeepResearchStatus> {
    const now = Date.now();
    
    // Return cached result if recent and not forced
    if (!forceCheck && this.lastCheck && (now - this.lastCheckTime) < this.checkInterval) {
      return this.lastCheck;
    }

    const status: DeepResearchStatus = {
      available: false,
      services: {
        database: false,
        redis: false,
        litellm: false,
        utils: false,
        crawl4ai: false,
        serper: false
      },
      errors: [],
      fallbackMode: false
    };

    // Check core services in parallel
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkLiteLLM(),
      this.checkUtils(),
      this.checkCrawl4AI(),
      this.checkSerper()
    ]);

    // Process results
    status.services.database = checks[0].status === 'fulfilled' && checks[0].value;
    status.services.redis = checks[1].status === 'fulfilled' && checks[1].value;
    status.services.litellm = checks[2].status === 'fulfilled' && checks[2].value;
    status.services.utils = checks[3].status === 'fulfilled' && checks[3].value;
    status.services.crawl4ai = checks[4].status === 'fulfilled' && checks[4].value;
    status.services.serper = checks[5].status === 'fulfilled' && checks[5].value;

    // Collect errors
    checks.forEach((result, index) => {
      if (result.status === 'rejected') {
        const serviceNames = ['database', 'redis', 'litellm', 'utils', 'crawl4ai', 'serper'];
        status.errors.push(`${serviceNames[index]}: ${result.reason}`);
      }
    });

    // Determine availability
    const coreServices = status.services.database && status.services.redis;
    const searchServices = status.services.serper && status.services.crawl4ai;
    const aiServices = status.services.litellm;

    if (coreServices && searchServices && aiServices) {
      status.available = true;
    } else if (coreServices && searchServices) {
      // Can work without Utils and even without LiteLLM (using fallback models)
      status.available = true;
    } else if (searchServices) {
      // Fallback mode: can do basic search but not full deep research
      status.fallbackMode = true;
      status.available = false;
    }

    this.lastCheck = status;
    this.lastCheckTime = now;

    return status;
  }

  /**
   * Check SQLite database availability
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // Try to create a test database connection
      const Database = (await import('better-sqlite3')).default;
      const path = require('path');
      const fs = require('fs');
      
      const testDbPath = './data/test_connection.db';
      const dbDir = path.dirname(testDbPath);
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const testDb = new Database(testDbPath);
      testDb.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER)');
      testDb.close();
      
      // Clean up test database
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      
      return true;
    } catch (error) {
      console.error('Database check failed:', error);
      return false;
    }
  }

  /**
   * Check Redis availability
   */
  private async checkRedis(): Promise<boolean> {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ 
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: { connectTimeout: 5000 }
      });
      
      await client.connect();
      await client.ping();
      await client.quit();
      
      return true;
    } catch (error) {
      console.error('Redis check failed:', error);
      return false;
    }
  }

  /**
   * Check LiteLLM service availability
   */
  private async checkLiteLLM(): Promise<boolean> {
    try {
      const litellmUrl = process.env.LITELLM_URL || 'http://localhost:14782';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${litellmUrl}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('LiteLLM check failed:', error);
      return false;
    }
  }

  /**
   * Check Utils service (PyBridge) availability
   */
  private async checkUtils(): Promise<boolean> {
    try {
      // In server-side context, we need to construct the full URL
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:18563';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/utils/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Utils service check failed:', error);
      // Utils service is not critical for basic Deep Research functionality
      // Return true to avoid blocking when Utils is not available
      return true;
    }
  }

  /**
   * Check Crawl4AI service availability
   */
  private async checkCrawl4AI(): Promise<boolean> {
    try {
      const crawl4aiUrl = process.env.CRAWL4AI_URL || 'http://localhost:11235';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${crawl4aiUrl}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Crawl4AI check failed:', error);
      return false;
    }
  }

  /**
   * Check Serper API availability
   */
  private async checkSerper(): Promise<boolean> {
    try {
      const serperApiKey = process.env.SERPER_API_KEY;
      if (!serperApiKey) {
        return false;
      }

      // We don't actually call Serper to avoid unnecessary API usage
      // Just check if the API key exists
      return serperApiKey.length > 0;
    } catch (error) {
      console.error('Serper check failed:', error);
      return false;
    }
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(status: DeepResearchStatus): string {
    if (status.available) {
      return 'Deep Research Engine is fully operational';
    }

    if (status.fallbackMode) {
      return 'Deep Research unavailable - using regular search mode';
    }

    const missingServices = Object.entries(status.services)
      .filter(([_, available]) => !available)
      .map(([service, _]) => service);

    return `Deep Research unavailable. Missing: ${missingServices.join(', ')}`;
  }

  /**
   * Get setup instructions for missing services
   */
  getSetupInstructions(status: DeepResearchStatus): string[] {
    const instructions: string[] = [];

    if (!status.services.database) {
      instructions.push('Database: Install better-sqlite3 and ensure write permissions');
    }

    if (!status.services.redis) {
      instructions.push('Redis: Start Redis server or check REDIS_URL environment variable');
    }

    if (!status.services.litellm) {
      instructions.push('LiteLLM: Start LiteLLM service on port 14782 or set LITELLM_URL');
    }

    if (!status.services.utils) {
      instructions.push('Utils: Ensure PyBridge service is running and /api/utils/health responds');
    }

    if (!status.services.crawl4ai) {
      instructions.push('Crawl4AI: Start Crawl4AI service on port 11235 or set CRAWL4AI_URL');
    }

    if (!status.services.serper) {
      instructions.push('Serper: Set SERPER_API_KEY environment variable');
    }

    return instructions;
  }
}

// Export singleton instance
export const deepResearchChecker = DeepResearchAvailabilityChecker.getInstance();