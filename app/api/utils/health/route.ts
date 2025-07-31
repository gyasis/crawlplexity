/**
 * API Route: GET /api/utils/health
 * Health check endpoint for Utils services
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDSPyService } from '@/lib/utils/services/dspy-service';
import { getCacheManager } from '@/lib/cache-manager';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Get DSPy service status
    const dspyService = getDSPyService();
    let utilsStatus;
    let dspyError = null;
    
    try {
      utilsStatus = await dspyService.getStatus();
    } catch (error) {
      dspyError = error instanceof Error ? error.message : 'Unknown DSPy error';
      utilsStatus = {
        taskmaster: { initialized: false, error: dspyError },
        query_deconstruction: { initialized: false, error: dspyError },
        pybridge: { connected: false, error: dspyError }
      };
    }

    // Get cache manager status
    const cacheManager = getCacheManager();
    const cacheStats = cacheManager.getStats();

    // System health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      services: {
        dspy: {
          status: utilsStatus.taskmaster.initialized && utilsStatus.query_deconstruction.initialized ? 'healthy' : 'unhealthy',
          taskmaster: {
            initialized: utilsStatus.taskmaster.initialized,
            model_version: utilsStatus.taskmaster.model_version,
            optimization_count: utilsStatus.taskmaster.optimization_count,
            backend: utilsStatus.taskmaster.backend
          },
          query_deconstruction: {
            initialized: utilsStatus.query_deconstruction.initialized,
            model_version: utilsStatus.query_deconstruction.model_version,
            optimization_count: utilsStatus.query_deconstruction.optimization_count,
            backend: utilsStatus.query_deconstruction.backend
          },
          pybridge: {
            connected: utilsStatus.pybridge.connected,
            python_version: utilsStatus.pybridge.python_version,
            last_ping: utilsStatus.pybridge.last_ping
          },
          error: dspyError
        },
        cache: {
          status: 'healthy',
          stats: cacheStats,
          memory_entries: cacheStats.totalEntries,
          hit_ratio: cacheStats.hitRatio,
          memory_usage_kb: cacheStats.memoryUsage
        }
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    // Determine overall health status
    if (dspyError || !utilsStatus.taskmaster.initialized || !utilsStatus.query_deconstruction.initialized) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown health check error',
        services: {
          dspy: { status: 'unknown', error: 'Health check failed' },
          cache: { status: 'unknown', error: 'Health check failed' }
        }
      },
      { status: 503 }
    );
  }
}