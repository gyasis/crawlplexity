/**
 * Type definitions for the Utils Feature - Taskmaster and Query Deconstruction
 */

// Taskmaster Types
export interface TaskStep {
  id: string;
  order: number;
  title: string;
  description: string;
  estimated_time: number; // in minutes
  dependencies: string[];
  resources_needed: string[];
  success_criteria: string[];
  commands?: string[];
}

export interface TaskBreakdown {
  task_id: string;
  original_task: string;
  breakdown: {
    steps: TaskStep[];
    total_estimated_time: number;
    complexity_score: number;
    dependencies: string[];
  };
  metadata: {
    task_type: TaskType;
    created_at: string;
    optimization_version: string;
  };
}

export type TaskType = 'research' | 'content_creation' | 'analysis' | 'development' | 'general';

export interface TaskOptions {
  task_type?: TaskType;
  max_steps?: number;
  include_estimates?: boolean;
  context?: Record<string, any>;
}

// Query Deconstruction Types
export interface DeconstructedQuery {
  id: string;
  query: string;
  complexity_score: number;
  semantic_group: string;
  search_priority: number;
  estimated_results: number;
  keywords: string[];
}

export interface SemanticGroup {
  name: string;
  queries: string[];
  common_theme: string;
  search_strategy: 'parallel' | 'sequential' | 'independent';
}

export interface QueryDeconstruction {
  query_id: string;
  original_query: string;
  deconstruction: {
    queries: DeconstructedQuery[];
    semantic_groups: SemanticGroup[];
    parallel_score: number;
    complexity_reduction: number;
  };
  metadata: {
    query_type: QueryType;
    created_at: string;
    optimization_version: string;
  };
}

export type QueryType = 'research' | 'search' | 'analysis' | 'general';

export interface QueryOptions {
  query_type?: QueryType;
  max_queries?: number;
  min_complexity_reduction?: number;
  include_semantic_groups?: boolean;
  context?: Record<string, any>;
}

// Optimization Types
export interface OptimizationFeedback {
  module: 'taskmaster' | 'query_deconstruction';
  task_id?: string;
  query_id?: string;
  user_rating: number; // 1-5
  feedback_text?: string;
  performance_metrics?: {
    execution_time?: number;
    accuracy_score?: number;
    usefulness_score?: number;
  };
  search_results?: any[]; // For query deconstruction feedback
}

export interface OptimizationResult {
  optimization_id: string;
  timestamp: string;
  improvements: string[];
  metrics: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
}

// Module Status Types
export interface ModuleStatus {
  initialized: boolean;
  model_version: string;
  optimization_count: number;
  weights_loaded: boolean;
  backend: 'dspy' | 'mock';
}

export interface UtilsStatus {
  taskmaster: ModuleStatus;
  query_deconstruction: ModuleStatus;
  pybridge: {
    connected: boolean;
    python_version: string;
    last_ping: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface BatchOperation {
  type: 'taskmaster' | 'query_deconstruction';
  input: {
    task?: string;
    query?: string;
  };
  options?: TaskOptions | QueryOptions;
}

export interface BatchResponse {
  operations: Array<{
    type: string;
    success: boolean;
    data?: TaskBreakdown | QueryDeconstruction;
    error?: string;
  }>;
  timestamp: string;
}

// Utils Statistics
export interface UtilsStatistics {
  taskmaster: {
    total_breakdowns: number;
    average_complexity: number;
    success_rate: number;
    popular_task_types: Record<TaskType, number>;
  };
  query_deconstruction: {
    total_deconstructions: number;
    average_reduction: number;
    parallel_efficiency: number;
    popular_query_types: Record<QueryType, number>;
  };
  dspy_optimizations: {
    total_optimizations: number;
    average_improvement: number;
    last_optimization: string;
  };
}

// Error Types
export class UtilsError extends Error {
  constructor(
    message: string,
    public code: string,
    public module: 'taskmaster' | 'query_deconstruction' | 'pybridge',
    public details?: any
  ) {
    super(message);
    this.name = 'UtilsError';
  }
}

// PyBridge Types
export interface PyBridgeConfig {
  pythonPath: string;
  modules: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface PyBridgeController<T> {
  call<K extends keyof T>(
    method: K,
    args?: any[]
  ): Promise<T[K] extends (...args: any[]) => any ? ReturnType<T[K]> : never>;
  close(): void;
}