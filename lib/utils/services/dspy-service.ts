/**
 * DSPy Service - PyBridge integration for Taskmaster and Query Deconstruction
 */

import { PyBridge } from 'pybridge';
import * as msgpack from '@msgpack/msgpack';
import { getCacheManager } from '@/lib/cache-manager';
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
  private pyBridge: PyBridge | null = null;
  private taskmasterController: any = null;
  private queryDeconController: any = null;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private cacheManager = getCacheManager();

  constructor(private config?: Partial<PyBridgeConfig>) {
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize PyBridge and Python modules
   */
  private async initialize(): Promise<void> {
    try {
      // Create PyBridge instance
      this.pyBridge = new PyBridge({
        pythonPath: this.config?.pythonPath || 'python3',
        modules: ['msgpack', 'dspy', 'litellm', 'numpy', 'pydantic'],
        cwd: this.config?.cwd || process.cwd(),
        env: {
          ...process.env,
          ...this.config?.env,
          PYTHONPATH: `${process.cwd()}/python:${process.env.PYTHONPATH || ''}`
        }
      });

      // Load Python modules
      this.taskmasterController = this.pyBridge.controller<TaskmasterModule>(
        'python/utils/taskmaster_module.py'
      );
      this.queryDeconController = this.pyBridge.controller<QueryDeconstructionModule>(
        'python/utils/query_decon_module.py'
      );

      // Initialize both modules
      await Promise.all([
        this.taskmasterController.initialize(),
        this.queryDeconController.initialize()
      ]);

      this.initialized = true;
      console.log('DSPy Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DSPy Service:', error);
      throw new UtilsError(
        'Failed to initialize DSPy Service',
        'INIT_ERROR',
        'pybridge',
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
          'pybridge'
        );
      }
    }
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

      // Call Python module
      const result = await this.taskmasterController.breakdown_task(
        task,
        task_type,
        max_steps
      );

      // Decode msgpack result
      const decoded = msgpack.decode(result) as TaskBreakdown;

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

      // Call Python module
      const result = await this.queryDeconController.deconstruct_query(
        query,
        query_type,
        max_queries
      );

      // Decode msgpack result
      const decoded = msgpack.decode(result) as QueryDeconstruction;

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
      const controller = feedback.module === 'taskmaster' 
        ? this.taskmasterController 
        : this.queryDeconController;

      const result = await controller.optimize_module(feedback);

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
      const [taskmasterStatus, queryDeconStatus] = await Promise.all([
        this.taskmasterController.get_status(),
        this.queryDeconController.get_status()
      ]);

      return {
        taskmaster: taskmasterStatus,
        query_deconstruction: queryDeconStatus,
        pybridge: {
          connected: this.pyBridge !== null,
          python_version: process.env.PYTHON_VERSION || '3.x',
          last_ping: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to get module status:', error);
      throw new UtilsError(
        'Failed to get module status',
        'STATUS_ERROR',
        'pybridge',
        error
      );
    }
  }

  /**
   * Close PyBridge connection
   */
  async close(): Promise<void> {
    if (this.pyBridge) {
      this.pyBridge.close();
      this.pyBridge = null;
      this.initialized = false;
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
      
      // Store in Redis for analytics
      await redis.lpush('utils:usage', JSON.stringify(usage));
      await redis.ltrim('utils:usage', 0, 999); // Keep last 1000 entries
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
      
      await redis.lpush('utils:optimizations', JSON.stringify(optimization));
      await redis.ltrim('utils:optimizations', 0, 99); // Keep last 100 optimizations
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