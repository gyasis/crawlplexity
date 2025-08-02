/**
 * Deep Research Engine - Sessions List API
 * GET /api/deep-research/sessions - List user's research sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemporalMemoryManager } from '@/lib/deep-research/temporal-storage';

// Global instances with lazy initialization
let memoryManager: TemporalMemoryManager | null = null;

async function getMemoryManager(): Promise<TemporalMemoryManager> {
  if (!memoryManager) {
    memoryManager = new TemporalMemoryManager({
      sqlite_path: './data/research_memory.db',
      tier_durations: {
        hot_days: 3,
        warm_days: 7,
        cold_days: 30,
        trash_days: 7
      }
    });
    await memoryManager.initialize();
  }
  return memoryManager;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const userId = searchParams.get('user_id') || 'anonymous';
    const status = searchParams.get('status'); // 'completed', 'in_progress', 'failed', etc.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const query = searchParams.get('query'); // Search within queries
    const sortBy = searchParams.get('sort_by') || 'last_accessed'; // 'created_at', 'last_accessed', 'query'
    const sortOrder = searchParams.get('sort_order') || 'desc'; // 'asc', 'desc'
    const includeSummary = searchParams.get('include_summary') === 'true';

    // Search sessions across all tiers
    const mm = await getMemoryManager();
    const allSessions = await mm.searchSessions(userId, query || undefined, limit * 3); // Get more to account for filtering

    // Filter by status if specified
    let filteredSessions = allSessions;
    if (status) {
      filteredSessions = allSessions.filter(session => session.data.status === status);
    }

    // Sort sessions
    filteredSessions.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.data.created_at || a.created_at);
          bValue = new Date(b.data.created_at || b.created_at);
          break;
        case 'query':
          aValue = a.data.query.toLowerCase();
          bValue = b.data.query.toLowerCase();
          break;
        case 'last_accessed':
        default:
          aValue = a.last_accessed;
          bValue = b.last_accessed;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

    // Format sessions for response
    const formattedSessions = paginatedSessions.map(session => formatSessionSummary(session, includeSummary));

    // Calculate pagination metadata
    const totalSessions = filteredSessions.length;
    const totalPages = Math.ceil(totalSessions / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Get memory statistics for additional context
    const memoryStats = await mm.getMemoryStats();

    const response = {
      sessions: formattedSessions,
      pagination: {
        current_page: page,
        per_page: limit,
        total_sessions: totalSessions,
        total_pages: totalPages,
        has_next_page: hasNext,
        has_prev_page: hasPrev,
        next_page: hasNext ? page + 1 : null,
        prev_page: hasPrev ? page - 1 : null
      },
      filters: {
        user_id: userId,
        status: status || 'all',
        query_search: query || null,
        sort_by: sortBy,
        sort_order: sortOrder
      },
      memory_stats: {
        ...memoryStats,
        user_sessions_by_tier: calculateUserSessionsByTier(allSessions)
      },
      metadata: {
        request_time: new Date().toISOString(),
        api_version: '1.0',
        total_unique_queries: countUniqueQueries(allSessions),
        avg_research_duration: calculateAverageResearchDuration(allSessions.filter(s => s.data.status === 'completed'))
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error listing research sessions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list research sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Format session data for summary display
 */
function formatSessionSummary(sessionData: any, includeSummary: boolean): any {
  const data = sessionData.data;
  
  const summary: any = {
    session_id: data.session_id,
    query: data.query,
    status: data.status,
    research_type: data.research_type || 'comprehensive',
    created_at: data.created_at || sessionData.created_at,
    last_accessed: sessionData.last_accessed,
    access_count: sessionData.access_count,
    tier: sessionData.tier,
    promoted_from: sessionData.promoted_from,
    
    // Duration information
    duration: calculateSessionDuration(data),
    
    // Results summary
    results_summary: {
      total_sources: data.analysis?.total_sources || 0,
      phases_completed: data.analysis?.phases_completed || [],
      confidence_level: data.analysis?.confidence_level || 0,
      key_findings_count: data.analysis?.key_findings?.length || 0,
      recommendations_count: data.analysis?.recommendations?.length || 0
    },
    
    // Status information
    progress: getSessionProgressSummary(data),
    
    // Memory tier information
    tier_info: {
      current_tier: sessionData.tier,
      tier_entered_at: data.tier_entered_at,
      days_in_tier: calculateDaysInTier(data.tier_entered_at),
      promoted_from: sessionData.promoted_from
    }
  };

  // Add detailed summary if requested
  if (includeSummary && data.analysis?.executive_summary) {
    summary.executive_summary = truncateText(data.analysis.executive_summary, 500);
    summary.key_insights = data.analysis.key_findings?.slice(0, 3) || [];
    summary.top_recommendations = data.analysis.recommendations?.slice(0, 2)?.map((rec: any) => ({
      title: rec.title,
      priority: rec.priority
    })) || [];
  }

  return summary;
}

/**
 * Calculate session duration
 */
function calculateSessionDuration(data: any): any {
  if (!data.start_time || !data.end_time) {
    return {
      duration_ms: 0,
      duration_human: 'Unknown',
      status: data.status === 'in_progress' ? 'ongoing' : 'unknown'
    };
  }

  const startTime = new Date(data.start_time).getTime();
  const endTime = new Date(data.end_time).getTime();
  const durationMs = endTime - startTime;

  return {
    duration_ms: durationMs,
    duration_human: formatDuration(durationMs),
    status: 'completed'
  };
}

/**
 * Get session progress summary
 */
function getSessionProgressSummary(data: any): any {
  switch (data.status) {
    case 'completed':
      return {
        percentage: 100,
        current_phase: 'synthesis',
        description: 'Research completed successfully'
      };
    case 'in_progress':
      return {
        percentage: data.total_progress || 50,
        current_phase: data.current_phase || 'unknown',
        description: data.current_activity || 'Research in progress...'
      };
    case 'failed':
      return {
        percentage: data.total_progress || 0,
        current_phase: data.current_phase || 'unknown',
        description: 'Research failed: ' + (data.error || 'Unknown error')
      };
    case 'pending':
      return {
        percentage: 0,
        current_phase: 'foundation',
        description: 'Waiting to start research'
      };
    default:
      return {
        percentage: 0,
        current_phase: 'unknown',
        description: 'Unknown status'
      };
  }
}

/**
 * Calculate days in current tier
 */
function calculateDaysInTier(tierEnteredAt?: string): number {
  if (!tierEnteredAt) return 0;
  
  const entered = new Date(tierEnteredAt).getTime();
  const now = Date.now();
  const daysDiff = (now - entered) / (1000 * 60 * 60 * 24);
  
  return Math.floor(daysDiff);
}

/**
 * Format duration in human-readable format
 */
function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Calculate user sessions by tier
 */
function calculateUserSessionsByTier(sessions: any[]): Record<string, number> {
  const tierCounts: Record<string, number> = {
    redis: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    trash: 0
  };

  sessions.forEach(session => {
    tierCounts[session.tier] = (tierCounts[session.tier] || 0) + 1;
  });

  return tierCounts;
}

/**
 * Count unique queries
 */
function countUniqueQueries(sessions: any[]): number {
  const uniqueQueries = new Set();
  sessions.forEach(session => {
    uniqueQueries.add(session.data.query.toLowerCase().trim());
  });
  return uniqueQueries.size;
}

/**
 * Calculate average research duration for completed sessions
 */
function calculateAverageResearchDuration(completedSessions: any[]): any {
  if (completedSessions.length === 0) {
    return {
      average_ms: 0,
      average_human: 'No completed sessions',
      sample_size: 0
    };
  }

  const durations = completedSessions
    .map(session => calculateSessionDuration(session.data))
    .filter(duration => duration.duration_ms > 0);

  if (durations.length === 0) {
    return {
      average_ms: 0,
      average_human: 'No duration data',
      sample_size: 0
    };
  }

  const totalMs = durations.reduce((sum, duration) => sum + duration.duration_ms, 0);
  const averageMs = totalMs / durations.length;

  return {
    average_ms: averageMs,
    average_human: formatDuration(averageMs),
    sample_size: durations.length
  };
}