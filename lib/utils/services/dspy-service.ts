/**
 * DSPy Service - PyBridge integration for Taskmaster and Query Deconstruction
 */

// Using direct Python subprocess instead of PyBridge/JSPyBridge due to Next.js/Turbopack compatibility issues
import { spawn, ChildProcess } from 'child_process';
import * as msgpack from '@msgpack/msgpack';
import { getCacheManager } from '@/lib/cache-manager';
import { createClient } from 'redis';
import path from 'path';
import { promisify } from 'util';
import {
  TaskBreakdown,
  TaskOptions,
  QueryDeconstruction,
  QueryOptions,
  OptimizationFeedback,
  OptimizationResult,
  ModuleStatus,
  UtilsStatus,
  UtilsError,
  PyBridgeConfig
} from '@/lib/utils/types';

// Python module interfaces for PyBridge
interface TaskmasterModule {
  initialize(): Promise<{ status: string }>;
  breakdown_task(task: string, task_type: string, max_steps: number): Promise<Uint8Array>;
  optimize_module(feedback: OptimizationFeedback): Promise<OptimizationResult>;
  get_status(): ModuleStatus;
}

interface QueryDeconstructionModule {
  initialize(): Promise<{ status: string }>;
  deconstruct_query(query: string, query_type: string, max_queries: number): Promise<Uint8Array>;
  optimize_module(feedback: OptimizationFeedback): Promise<OptimizationResult>;
  get_status(): ModuleStatus;
}

export class DSPyService {
  private pythonProcess: ChildProcess | null = null;
  private isProcessReady = false;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private cacheManager = getCacheManager();
  private redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  private messageQueue: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor(private config?: Partial<PyBridgeConfig>) {
    this.redis.connect().catch(console.error);
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize Python subprocess and modules
   */
  private async initialize(): Promise<void> {
    try {
      // Get project root and construct paths
      const projectRoot = process.cwd();
      const pythonDir = path.resolve(projectRoot, 'python');
      const pythonPath = this.config?.pythonPath || '/home/gyasis/miniconda3/envs/deeplake/bin/python3';
      const bridgeScript = path.resolve(projectRoot, 'python/utils/dspy_bridge_simple.py');
      
      // Set PYTHONPATH to include our python directory
      const env = {
        ...process.env,
        PYTHONPATH: `${pythonDir}:${process.env.PYTHONPATH || ''}`,
        ...this.config?.env
      };

      console.log(`🐍 Starting Python DSPy subprocess:`);
      console.log(`  - Python: ${pythonPath}`);
      console.log(`  - Bridge: ${bridgeScript}`);
      console.log(`  - Working Dir: ${projectRoot}`);

      // Spawn Python process
      this.pythonProcess = spawn(pythonPath, [bridgeScript], {
        cwd: projectRoot,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set up message handling
      this.setupMessageHandling();

      // Wait for process to be ready
      await this.waitForReady();

      // Test simple command first
      const testResult = await this.sendCommand('test', {});
      console.log('✅ Subprocess communication test successful:', testResult);

      this.initialized = true;
      console.log('✅ DSPy Service initialized successfully with subprocess');
    } catch (error) {
      console.error('❌ Failed to initialize DSPy Service:', error);
      this.cleanup();
      throw new UtilsError(
        'Failed to initialize DSPy Service',
        'INIT_ERROR',
        'subprocess',
        error
      );
    }
  }

  /**
   * Ensure the service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      } else {
        throw new UtilsError(
          'DSPy Service not initialized',
          'NOT_INITIALIZED',
          'subprocess'
        );
      }
    }
  }

  /**
   * Set up message handling for Python subprocess
   */
  private setupMessageHandling(): void {
    if (!this.pythonProcess) return;

    let buffer = '';

    this.pythonProcess.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            this.handleMessage(message);
          } catch (error) {
            console.log('Python output:', line);
          }
        }
      }
    });

    this.pythonProcess.stderr?.on('data', (data: Buffer) => {
      console.error('Python stderr:', data.toString());
    });

    this.pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      this.isProcessReady = false;
      this.initialized = false;
    });

    this.pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      this.isProcessReady = false;
      this.initialized = false;
    });
  }

  /**
   * Handle messages from Python subprocess
   */
  private handleMessage(message: any): void {
    if (message.type === 'ready') {
      this.isProcessReady = true;
      return;
    }

    if (message.id && this.messageQueue.has(message.id)) {
      const { resolve, reject } = this.messageQueue.get(message.id)!;
      this.messageQueue.delete(message.id);

      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.result);
      }
    }
  }

  /**
   * Wait for Python process to be ready
   */
  private async waitForReady(timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkReady = () => {
        if (this.isProcessReady) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Python process startup timeout'));
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  /**
   * Send command to Python subprocess
   */
  private async sendCommand(command: string, params: any): Promise<any> {
    if (!this.pythonProcess || !this.isProcessReady) {
      throw new Error('Python process not ready');
    }

    const id = Math.random().toString(36).substring(2, 15);
    const message = { id, command, params };

    return new Promise((resolve, reject) => {
      this.messageQueue.set(id, { resolve, reject });
      
      this.pythonProcess!.stdin?.write(JSON.stringify(message) + '\n');
      
      // Set timeout for command
      setTimeout(() => {
        if (this.messageQueue.has(id)) {
          this.messageQueue.delete(id);
          reject(new Error(`Command timeout: ${command}`));
        }
      }, 30000);
    });
  }

  /**
   * Cleanup subprocess
   */
  private cleanup(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    this.isProcessReady = false;
    this.initialized = false;
    this.messageQueue.clear();
  }

  /**
   * Break down a complex task into sequential steps
   */
  async breakdownTask(task: string, options: TaskOptions = {}): Promise<TaskBreakdown> {
    await this.ensureInitialized();

    const {
      task_type = 'general',
      max_steps = 10,
      include_estimates = true,
      context = {}
    } = options;

    try {
      // Check cache first
      const cacheKey = this.cacheManager.generateCacheKey('utils:taskmaster', task, options);
      const cached = await this.cacheManager.get<TaskBreakdown>(cacheKey);
      if (cached) {
        return cached;
      }

      // Call Python subprocess
      const result = await this.sendCommand('breakdown_task', {
        task,
        task_type,
        max_steps
      });

      // Result is already decoded by the Python bridge
      const decoded = result as TaskBreakdown;

      // Validate result
      if (!decoded.task_id || !decoded.breakdown) {
        throw new Error('Invalid task breakdown response');
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, decoded, 3600); // 1 hour TTL

      // Log usage analytics
      await this.logUsage('taskmaster', task, decoded);

      return decoded;
    } catch (error) {
      console.error('Task breakdown failed:', error);
      throw new UtilsError(
        'Failed to break down task',
        'BREAKDOWN_ERROR',
        'taskmaster',
        error
      );
    }
  }

  /**
   * Deconstruct a complex query into parallel components
   */
  async deconstructQuery(query: string, options: QueryOptions = {}): Promise<QueryDeconstruction> {
    await this.ensureInitialized();

    const {
      query_type = 'general',
      max_queries = 5,
      min_complexity_reduction = 0.2,
      include_semantic_groups = true,
      context = {}
    } = options;

    try {
      // Check cache first
      const cacheKey = this.cacheManager.generateCacheKey('utils:query_deconstruction', query, options);
      const cached = await this.cacheManager.get<QueryDeconstruction>(cacheKey);
      if (cached) {
        return cached;
      }

      // Call Python subprocess
      const result = await this.sendCommand('deconstruct_query', {
        query,
        query_type,
        max_queries
      });

      // Result is already decoded by the Python bridge
      const decoded = result as QueryDeconstruction;

      // Validate result
      if (!decoded.query_id || !decoded.deconstruction) {
        throw new Error('Invalid query deconstruction response');
      }

      // Filter by minimum complexity reduction if specified
      if (decoded.deconstruction.complexity_reduction < min_complexity_reduction) {
        console.warn('Query deconstruction did not meet minimum complexity reduction threshold');
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, decoded, 3600); // 1 hour TTL

      // Log usage analytics
      await this.logUsage('query_deconstruction', query, decoded);

      return decoded;
    } catch (error) {
      console.error('Query deconstruction failed:', error);
      throw new UtilsError(
        'Failed to deconstruct query',
        'DECONSTRUCTION_ERROR',
        'query_deconstruction',
        error
      );
    }
  }

  /**
   * Optimize a module based on user feedback
   */
  async optimizeModule(feedback: OptimizationFeedback): Promise<OptimizationResult> {
    await this.ensureInitialized();

    try {
      const result = await this.sendCommand('optimize_module', {
        module_name: feedback.module,
        feedback
      });

      // Log optimization
      await this.logOptimization(feedback.module, result);

      return result;
    } catch (error) {
      console.error('Module optimization failed:', error);
      throw new UtilsError(
        'Failed to optimize module',
        'OPTIMIZATION_ERROR',
        feedback.module,
        error
      );
    }
  }

  /**
   * Get the status of all modules
   */
  async getStatus(): Promise<UtilsStatus> {
    await this.ensureInitialized();

    try {
      const status = await this.sendCommand('get_status', {});

      return {
        taskmaster: status.taskmaster,
        query_deconstruction: status.query_deconstruction,
        subprocess: {
          connected: this.pythonProcess !== null && this.isProcessReady,
          python_version: process.env.PYTHON_VERSION || '3.x',
          last_ping: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to get module status:', error);
      throw new UtilsError(
        'Failed to get module status',
        'STATUS_ERROR',
        'subprocess',
        error
      );
    }
  }

  /**
   * Close Python subprocess
   */
  async close(): Promise<void> {
    if (this.pythonProcess) {
      try {
        // Try graceful shutdown first
        await this.sendCommand('shutdown', {});
        setTimeout(() => this.cleanup(), 1000);
      } catch (error) {
        // Force cleanup if graceful shutdown fails
        this.cleanup();
      }
    }
  }

  // Helper methods

  private async logUsage(module: string, input: string, result: any): Promise<void> {
    try {
      const usage = {
        module,
        input_length: input.length,
        timestamp: new Date().toISOString(),
        complexity: result.breakdown?.complexity_score || result.deconstruction?.complexity_reduction || 0
      };
      
      // Store in Redis for analytics (if connected)
      if (this.redis && this.redis.isReady) {
        await this.redis.lpush('utils:usage', JSON.stringify(usage));
        await this.redis.ltrim('utils:usage', 0, 999); // Keep last 1000 entries
      }
    } catch (error) {
      console.warn('Usage logging failed:', error);
    }
  }

  private async logOptimization(module: string, result: OptimizationResult): Promise<void> {
    try {
      const optimization = {
        module,
        optimization_id: result.optimization_id,
        timestamp: result.timestamp,
        improvement: result.metrics.after.accuracy - result.metrics.before.accuracy
      };
      
      if (this.redis && this.redis.isReady) {
        await this.redis.lpush('utils:optimizations', JSON.stringify(optimization));
        await this.redis.ltrim('utils:optimizations', 0, 99); // Keep last 100 optimizations
      }
    } catch (error) {
      console.warn('Optimization logging failed:', error);
    }
  }
}

// Singleton instance
let dspyServiceInstance: DSPyService | null = null;

/**
 * Get or create the DSPy service instance
 */
export function getDSPyService(config?: Partial<PyBridgeConfig>): DSPyService {
  if (!dspyServiceInstance) {
    dspyServiceInstance = new DSPyService(config);
  }
  return dspyServiceInstance;
}

/**
 * Close the DSPy service instance
 */
export async function closeDSPyService(): Promise<void> {
  if (dspyServiceInstance) {
    await dspyServiceInstance.close();
    dspyServiceInstance = null;
  }
}