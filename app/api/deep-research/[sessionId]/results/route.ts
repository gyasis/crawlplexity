/**
 * Deep Research Engine - Results API
 * GET /api/deep-research/[sessionId]/results - Get research results and analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemporalMemoryManager } from '@/lib/deep-research/temporal-storage';
import { GetResultsResponse } from '@/lib/deep-research/types';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);

    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session data from temporal memory
    const mm = await getMemoryManager();
    const sessionData = await mm.getResearchSession(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      );
    }

    // Check if session is completed
    if (sessionData.data.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Research session is not completed yet',
          current_status: sessionData.data.status,
          message: sessionData.data.status === 'in_progress' 
            ? 'Research is still in progress. Please check back later.'
            : sessionData.data.status === 'failed'
            ? 'Research session failed. Please start a new session.'
            : 'Research session is not ready yet.'
        },
        { status: 400 }
      );
    }

    // Parse query parameters for filtering/formatting
    const includeContent = searchParams.get('include_content') === 'true';
    const includeCitations = searchParams.get('include_citations') !== 'false'; // Default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const format = searchParams.get('format') || 'full'; // 'full', 'summary', 'citations_only'

    // Extract analysis and results from session data
    const analysis = sessionData.data.analysis;
    const searchPasses = sessionData.data.search_passes || [];
    
    // Aggregate all results from search passes
    const allResults = searchPasses
      .flatMap((pass: any) => pass.results || [])
      .flatMap((passResult: any) => passResult.results || [])
      .slice(0, limit);

    // Extract citations from results (simplified - in production you'd have a separate citations table)
    const citations = extractCitations(allResults, includeCitations);

    // Filter content based on request parameters
    const filteredResults = allResults.map((result: any) => ({
      ...result,
      content: includeContent ? result.content : undefined,
      snippet: result.snippet || (result.content ? result.content.substring(0, 300) + '...' : '')
    }));

    // Calculate metadata
    const metadata = {
      total_sources: allResults.length,
      research_duration: sessionData.data.end_time && sessionData.data.start_time 
        ? new Date(sessionData.data.end_time).getTime() - new Date(sessionData.data.start_time).getTime()
        : 0,
      phases_completed: analysis?.phases_completed || [],
      model_used: sessionData.data.model_used || 'gpt-4',
      research_type: sessionData.data.research_type || 'comprehensive',
      unique_domains: countUniqueDomains(allResults),
      avg_relevance_score: calculateAverageRelevance(allResults),
      tier_accessed: sessionData.tier,
      last_accessed: sessionData.last_accessed,
      access_count: sessionData.access_count
    };

    // Build response based on format
    let response: GetResultsResponse;

    switch (format) {
      case 'summary':
        response = {
          session_id: sessionId,
          query: sessionData.data.query,
          status: sessionData.data.status,
          analysis: {
            ...analysis,
            detailed_analysis: [] // Exclude detailed analysis for summary
          },
          sources: filteredResults.slice(0, 10), // Limit sources for summary
          citations: citations.slice(0, 20), // Limit citations for summary
          metadata
        };
        break;

      case 'citations_only':
        response = {
          session_id: sessionId,
          query: sessionData.data.query,
          status: sessionData.data.status,
          analysis: {
            session_id: analysis?.session_id || sessionId,
            executive_summary: analysis?.executive_summary || '',
            detailed_analysis: [],
            key_findings: analysis?.key_findings || [],
            recommendations: analysis?.recommendations || [],
            future_directions: analysis?.future_directions || [],
            methodology: analysis?.methodology || '',
            limitations: analysis?.limitations || [],
            confidence_level: analysis?.confidence_level || 0,
            total_sources: metadata.total_sources,
            research_duration: metadata.research_duration,
            phases_completed: metadata.phases_completed
          },
          sources: [], // No sources for citations-only
          citations,
          metadata
        };
        break;

      default: // 'full'
        response = {
          session_id: sessionId,
          query: sessionData.data.query,
          status: sessionData.data.status,
          analysis: analysis || createFallbackAnalysis(sessionId, sessionData.data.query, allResults),
          sources: filteredResults,
          citations,
          metadata
        };
    }

    // Set appropriate cache headers based on tier
    const cacheHeaders = getCacheHeaders(sessionData.tier);

    return NextResponse.json(response, {
      headers: cacheHeaders
    });

  } catch (error) {
    console.error(`Error getting results for session:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to get research results',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract citations from research results
 */
function extractCitations(results: any[], includeCitations: boolean): any[] {
  if (!includeCitations) return [];

  return results
    .filter(result => result.source_url && result.title)
    .map((result, index) => ({
      citation_id: `cite_${index + 1}`,
      session_id: result.session_id,
      source_url: result.source_url,
      source_title: result.title,
      citation_text: result.snippet || result.content?.substring(0, 200) || '',
      citation_context: `Referenced in ${result.phase_used} phase`,
      relevance_score: result.relevance_score || 0,
      phase_used: result.phase_used,
      created_at: result.created_at || new Date(),
      updated_at: result.updated_at || new Date()
    }))
    .slice(0, 50); // Limit citations
}

/**
 * Count unique domains in results
 */
function countUniqueDomains(results: any[]): number {
  const domains = new Set();
  results.forEach(result => {
    try {
      const domain = new URL(result.source_url).hostname;
      domains.add(domain);
    } catch (e) {
      // Invalid URL, skip
    }
  });
  return domains.size;
}

/**
 * Calculate average relevance score
 */
function calculateAverageRelevance(results: any[]): number {
  const scoresWithValues = results.filter(r => typeof r.relevance_score === 'number');
  if (scoresWithValues.length === 0) return 0;
  
  const sum = scoresWithValues.reduce((acc, r) => acc + r.relevance_score, 0);
  return Math.round((sum / scoresWithValues.length) * 100) / 100;
}

/**
 * Create fallback analysis if none exists
 */
function createFallbackAnalysis(sessionId: string, query: string, results: any[]): any {
  return {
    session_id: sessionId,
    executive_summary: `Research completed on "${query}" with ${results.length} sources analyzed.`,
    detailed_analysis: [
      {
        title: 'Research Overview',
        content: `This research session analyzed ${results.length} sources to provide insights on "${query}".`,
        key_points: [
          `Total sources analyzed: ${results.length}`,
          `Unique domains: ${countUniqueDomains(results)}`,
          `Average relevance: ${calculateAverageRelevance(results)}`
        ],
        sources: results.slice(0, 5).map(r => r.source_url)
      }
    ],
    key_findings: [
      `Research identified ${results.length} relevant sources`,
      `Analysis covers multiple perspectives and viewpoints`,
      `Sources span across ${countUniqueDomains(results)} different domains`
    ],
    recommendations: [
      {
        title: 'Further Research',
        description: 'Consider diving deeper into specific aspects identified in this research',
        priority: 'medium',
        implementation_notes: 'Focus on the highest-relevance sources for detailed analysis',
        stakeholders: ['researchers', 'analysts']
      }
    ],
    future_directions: [
      'Monitor developments in this area for new insights',
      'Consider conducting more targeted research on specific findings'
    ],
    methodology: 'Automated research using multi-phase analysis',
    limitations: ['Limited to web-available sources', 'Analysis based on automated processing'],
    confidence_level: 0.75,
    total_sources: results.length,
    research_duration: 0,
    phases_completed: ['foundation', 'perspective', 'trend', 'synthesis']
  };
}

/**
 * Get cache headers based on storage tier
 */
function getCacheHeaders(tier: string): Record<string, string> {
  switch (tier) {
    case 'redis':
      return {
        'Cache-Control': 'no-cache', // Active sessions change frequently
      };
    case 'hot':
      return {
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'ETag': `hot-${Date.now()}`
      };
    case 'warm':
      return {
        'Cache-Control': 'private, max-age=1800', // 30 minutes
        'ETag': `warm-${Date.now()}`
      };
    case 'cold':
      return {
        'Cache-Control': 'private, max-age=3600', // 1 hour
        'ETag': `cold-${Date.now()}`
      };
    default:
      return {
        'Cache-Control': 'private, max-age=600' // 10 minutes default
      };
  }
}