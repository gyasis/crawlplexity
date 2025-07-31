/**
 * API Route: POST /api/utils/query-deconstruction/deconstruct
 * Deconstruct a complex query into parallel components using DSPy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDSPyService } from '@/lib/utils/services/dspy-service';
import { QueryOptions, UtilsError } from '@/lib/utils/types';

interface DeconstructRequest {
  query: string;
  query_type?: 'research' | 'search' | 'analysis' | 'general';
  max_queries?: number;
  min_complexity_reduction?: number;
  include_semantic_groups?: boolean;
  context?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: DeconstructRequest = await request.json();

    // Validate required fields
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required and must be a non-empty string',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate query length
    if (body.query.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query must be less than 1000 characters',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate max_queries
    if (body.max_queries && (body.max_queries < 2 || body.max_queries > 10)) {
      return NextResponse.json(
        {
          success: false,
          error: 'max_queries must be between 2 and 10',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Validate min_complexity_reduction
    if (body.min_complexity_reduction && (body.min_complexity_reduction < 0 || body.min_complexity_reduction > 1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'min_complexity_reduction must be between 0 and 1',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Prepare options
    const options: QueryOptions = {
      query_type: body.query_type || 'general',
      max_queries: body.max_queries || 5,
      min_complexity_reduction: body.min_complexity_reduction || 0.1,
      include_semantic_groups: body.include_semantic_groups !== false,
      context: body.context || {}
    };

    // Get DSPy service and deconstruct query
    const dspyService = getDSPyService();
    const result = await dspyService.deconstructQuery(body.query, options);

    // Add execution recommendations
    const enhancedResult = {
      ...result,
      execution_recommendations: generateExecutionRecommendations(result)
    };

    return NextResponse.json({
      success: true,
      data: enhancedResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Query deconstruction API error:', error);

    if (error instanceof UtilsError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          module: error.module,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error occurred while deconstructing query',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to generate execution recommendations
function generateExecutionRecommendations(result: any) {
  const recommendations = {
    execution_strategy: 'parallel',
    estimated_execution_time: 0,
    parallel_groups: [] as any[],
    optimization_tips: [] as string[]
  };

  // Group queries by semantic groups for parallel execution
  const semanticGroups = result.deconstruction.semantic_groups || [];
  const queries = result.deconstruction.queries || [];

  // Create parallel execution groups
  semanticGroups.forEach((group: any, index: number) => {
    const groupQueries = queries.filter((q: any) => 
      group.queries.includes(q.id)
    );

    if (groupQueries.length > 0) {
      recommendations.parallel_groups.push({
        group_id: `group_${index + 1}`,
        group_name: group.name,
        queries: groupQueries.map((q: any) => ({
          id: q.id,
          query: q.query,
          priority: q.search_priority,
          estimated_results: q.estimated_results
        })),
        execution_order: group.search_strategy === 'sequential' ? 'sequential' : 'parallel',
        estimated_time: Math.max(...groupQueries.map((q: any) => q.estimated_results / 10)) // Simple heuristic
      });
    }
  });

  // Calculate total estimated execution time
  const parallelTime = Math.max(...recommendations.parallel_groups.map(g => g.estimated_time));
  const sequentialTime = recommendations.parallel_groups.reduce((sum, g) => sum + g.estimated_time, 0);
  recommendations.estimated_execution_time = Math.min(parallelTime, sequentialTime * 0.7); // Assume some parallelization benefit

  // Generate optimization tips
  if (result.deconstruction.complexity_reduction > 0.5) {
    recommendations.optimization_tips.push('High complexity reduction achieved - queries are well optimized for parallel execution');
  }

  if (result.deconstruction.parallel_score > 7) {
    recommendations.optimization_tips.push('Excellent parallel execution potential - consider running all queries simultaneously');
  } else if (result.deconstruction.parallel_score > 4) {
    recommendations.optimization_tips.push('Good parallel execution potential - consider grouping related queries');
  } else {
    recommendations.optimization_tips.push('Limited parallel execution potential - consider sequential execution for better results');
  }

  if (queries.length > 6) {
    recommendations.optimization_tips.push('Large number of queries detected - consider implementing result deduplication');
  }

  // Check for high-priority queries
  const highPriorityQueries = queries.filter((q: any) => q.search_priority >= 4);
  if (highPriorityQueries.length > 0) {
    recommendations.optimization_tips.push(`Execute ${highPriorityQueries.length} high-priority queries first for faster initial results`);
  }

  return recommendations;
}