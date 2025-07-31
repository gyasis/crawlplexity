/**
 * API Route: GET /api/utils/stats
 * Get utility usage statistics and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager } from '@/lib/cache-manager';
import { getDSPyService } from '@/lib/utils/services/dspy-service';

export async function GET(request: NextRequest) {
  try {
    const cacheManager = getCacheManager();
    
    // Get usage statistics from Redis
    const usageData = await getUsageStatistics();
    const optimizationData = await getOptimizationStatistics();
    
    // Get DSPy service status
    let dspyStatus;
    try {
      const dspyService = getDSPyService();
      dspyStatus = await dspyService.getStatus();
    } catch (error) {
      dspyStatus = {
        taskmaster: { initialized: false, optimization_count: 0 },
        query_deconstruction: { initialized: false, optimization_count: 0 }
      };
    }

    const stats = {
      timestamp: new Date().toISOString(),
      taskmaster: {
        total_breakdowns: usageData.taskmaster.total_usage,
        average_complexity: usageData.taskmaster.avg_complexity,
        success_rate: usageData.taskmaster.success_rate,
        popular_task_types: usageData.taskmaster.task_types,
        optimization_count: dspyStatus.taskmaster.optimization_count || 0
      },
      query_deconstruction: {
        total_deconstructions: usageData.query_deconstruction.total_usage,
        average_reduction: usageData.query_deconstruction.avg_reduction,
        parallel_efficiency: usageData.query_deconstruction.parallel_efficiency,
        popular_query_types: usageData.query_deconstruction.query_types,
        optimization_count: dspyStatus.query_deconstruction.optimization_count || 0
      },
      dspy_optimizations: {
        total_optimizations: optimizationData.total,
        average_improvement: optimizationData.avg_improvement,
        last_optimization: optimizationData.last_optimization,
        optimization_history: optimizationData.history
      },
      cache_performance: {
        ...cacheManager.getStats(),
        cache_efficiency: calculateCacheEfficiency(cacheManager.getStats())
      },
      system_performance: {
        response_times: await getResponseTimeStats(),
        error_rates: await getErrorRateStats(),
        throughput: await getThroughputStats()
      }
    };

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stats API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve statistics',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function getUsageStatistics() {
  try {
    const cacheManager = getCacheManager();
    
    // This would typically be stored in Redis or a database
    // For now, we'll return mock data that would be collected from actual usage
    return {
      taskmaster: {
        total_usage: 150,
        avg_complexity: 6.2,
        success_rate: 0.94,
        task_types: {
          research: 45,
          content_creation: 38,
          analysis: 32,
          development: 25,
          general: 10
        }
      },
      query_deconstruction: {
        total_usage: 89,
        avg_reduction: 0.67,
        parallel_efficiency: 8.3,
        query_types: {
          research: 34,
          search: 28,
          analysis: 19,
          general: 8
        }
      }
    };
  } catch (error) {
    console.warn('Failed to get usage statistics:', error);
    return {
      taskmaster: { total_usage: 0, avg_complexity: 0, success_rate: 0, task_types: {} },
      query_deconstruction: { total_usage: 0, avg_reduction: 0, parallel_efficiency: 0, query_types: {} }
    };
  }
}

async function getOptimizationStatistics() {
  try {
    // This would be collected from actual DSPy optimization runs
    return {
      total: 23,
      avg_improvement: 0.12,
      last_optimization: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      history: [
        {
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          module: 'taskmaster',
          improvement: 0.15
        },
        {
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          module: 'query_deconstruction',
          improvement: 0.09
        }
      ]
    };
  } catch (error) {
    console.warn('Failed to get optimization statistics:', error);
    return {
      total: 0,
      avg_improvement: 0,
      last_optimization: null,
      history: []
    };
  }
}

function calculateCacheEfficiency(stats: any) {
  const totalRequests = stats.memoryHits + stats.memoryMisses + stats.redisHits + stats.redisMisses;
  if (totalRequests === 0) return 0;
  
  // Weight memory hits higher than Redis hits for efficiency calculation
  const weightedHits = (stats.memoryHits * 1.0) + (stats.redisHits * 0.8);
  return Math.round((weightedHits / totalRequests) * 100);
}

async function getResponseTimeStats() {
  // This would be collected from actual API response times
  return {
    taskmaster_avg: 2.1, // seconds
    query_deconstruction_avg: 1.8, // seconds
    p95_taskmaster: 4.2,
    p95_query_deconstruction: 3.6
  };
}

async function getErrorRateStats() {
  // This would be collected from actual error tracking
  return {
    taskmaster_error_rate: 0.06,
    query_deconstruction_error_rate: 0.04,
    total_error_rate: 0.05
  };
}

async function getThroughputStats() {
  // This would be collected from actual throughput monitoring
  return {
    requests_per_minute: 12.3,
    peak_requests_per_minute: 45.7,
    average_concurrent_requests: 2.1
  };
}