/**
 * Research Orchestrator - Manages the 4-phase Deep Research methodology
 * Foundation → Perspective → Trend → Synthesis
 */

import { TemporalMemoryManager } from './temporal-storage';
import { 
  ResearchPhase, 
  ResearchType, 
  SearchPass, 
  ResearchAnalysis,
  ResearchSession,
  ResearchResult,
  GeneratedQuery,
  ResearchStreamEvent
} from './types';
import { getDeepResearchIntegration } from '@/lib/utils/integrations/deep-research-integration';
import { SearchOrchestrator } from '@/lib/search-orchestrator';
import { LiteLLMClient } from '@/lib/litellm-client';

export class ResearchOrchestrator {
  private memoryManager: TemporalMemoryManager;
  private searchOrchestrator: SearchOrchestrator;
  private llmClient: LiteLLMClient;
  private utilsIntegration: any;

  constructor(memoryManager: TemporalMemoryManager) {
    this.memoryManager = memoryManager;
    this.searchOrchestrator = new SearchOrchestrator();
    this.llmClient = new LiteLLMClient();
    
    // Try to load Utils integration with graceful fallback
    try {
      this.utilsIntegration = getDeepResearchIntegration();
      console.log('✅ Utils/DSPy integration loaded successfully');
    } catch (error) {
      console.warn('⚠️ Utils/DSPy service unavailable - using fallback query generation:', error.message);
      this.utilsIntegration = null;
    }
  }

  /**
   * Execute complete research session with 4-phase methodology
   */
  async executeResearch(
    sessionId: string,
    userId: string,
    query: string,
    options: any,
    emitEvent?: (event: string, data: any) => void
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update session status to in_progress
      await this.updateSessionStatus(sessionId, 'in_progress', emitEvent);

      // Determine which phases to execute based on research type
      const phasesToExecute = this.getPhasesToExecute(options.research_type);
      
      // Execute research phases
      const searchPasses: SearchPass[] = [];
      let allResults: ResearchResult[] = [];

      for (let i = 0; i < phasesToExecute.length; i++) {
        const phase = phasesToExecute[i];
        
        emitEvent?.('phase_started', {
          phase,
          phase_number: i + 1,
          total_phases: phasesToExecute.length,
          description: this.getPhaseDescription(phase)
        });

        const searchPass = await this.executePhase(
          sessionId,
          query,
          phase,
          options,
          allResults, // Pass previous results for context
          emitEvent
        );

        searchPasses.push(searchPass);
        allResults = [...allResults, ...searchPass.results.flatMap(r => r.results)];

        emitEvent?.('phase_completed', {
          phase,
          phase_number: i + 1,
          total_phases: phasesToExecute.length,
          results_count: searchPass.results.length,
          unique_sources: new Set(searchPass.results.flatMap(r => r.results.map(res => res.source_url))).size
        });
      }

      // Generate comprehensive analysis
      emitEvent?.('analysis_started', {
        total_results: allResults.length,
        unique_sources: new Set(allResults.map(r => r.source_url)).size
      });

      const analysis = await this.synthesizeResults(
        sessionId,
        query,
        searchPasses,
        allResults,
        options,
        emitEvent
      );

      // Complete research session
      const completedSession: ResearchSession & { analysis: ResearchAnalysis } = {
        session_id: sessionId,
        user_id: userId,
        query,
        status: 'completed',
        research_type: options.research_type,
        start_time: new Date(startTime),
        end_time: new Date(),
        created_at: new Date(startTime),
        updated_at: new Date(),
        analysis
      };

      // Archive session: Redis → SQLite for long-term storage
      await this.memoryManager.archiveCompletedSession(sessionId, completedSession);

      emitEvent?.('analysis_completed', {
        analysis_summary: analysis.executive_summary.substring(0, 200) + '...',
        key_findings_count: analysis.key_findings.length,
        recommendations_count: analysis.recommendations.length,
        total_duration: Date.now() - startTime
      });

    } catch (error) {
      console.error(`Research orchestration failed for session ${sessionId}:`, error);
      await this.updateSessionStatus(sessionId, 'failed', emitEvent);
      throw error;
    }
  }

  /**
   * Execute individual research phase
   */
  private async executePhase(
    sessionId: string,
    originalQuery: string,
    phase: ResearchPhase,
    options: any,
    previousResults: ResearchResult[],
    emitEvent?: (event: string, data: any) => void
  ): Promise<SearchPass> {
    const phaseStartTime = Date.now();

    try {
      // Step 1: Generate queries for this phase
      emitEvent?.('query_generation_started', { phase });
      
      const generatedQueries = await this.generatePhaseQueries(
        originalQuery,
        phase,
        previousResults,
        options
      );

      emitEvent?.('query_generation_completed', { 
        phase,
        queries_count: generatedQueries.length,
        queries: generatedQueries.map(q => q.query)
      });

      // Step 2: Execute searches for generated queries
      const searchResults: any[] = [];
      
      for (let i = 0; i < generatedQueries.length; i++) {
        const generatedQuery = generatedQueries[i];
        
        emitEvent?.('query_execution_started', {
          phase,
          query: generatedQuery.query,
          query_number: i + 1,
          total_queries: generatedQueries.length
        });

        try {
          const searchResponse = await this.searchOrchestrator.search(generatedQuery.query, {
            maxResults: 6, // Same as regular search - get 6 sources per query
            includeMetadata: true,
            filterDuplicates: true
          });

          const processedResults = await this.processSearchResults(
            sessionId,
            phase,
            generatedQuery.query,
            searchResponse.results || [],
            emitEvent
          );

          searchResults.push({
            query: generatedQuery.query,
            results: processedResults,
            search_time: 0, // Will be calculated
            total_results: searchResponse.results?.length || 0,
            relevance_threshold: 0.7
          });

          emitEvent?.('query_execution_completed', {
            phase,
            query: generatedQuery.query,
            results_count: processedResults.length,
            query_number: i + 1
          });

        } catch (searchError) {
          console.error(`Search failed for query "${generatedQuery.query}":`, searchError);
          
          emitEvent?.('query_execution_failed', {
            phase,
            query: generatedQuery.query,
            error: searchError instanceof Error ? searchError.message : 'Unknown error',
            query_number: i + 1
          });

          // Continue with other queries even if one fails
          continue;
        }
      }

      // Step 3: Create search pass summary
      const searchPass: SearchPass = {
        phase,
        queries: generatedQueries.map(q => q.query),
        results: searchResults,
        completed: true,
        start_time: new Date(phaseStartTime),
        end_time: new Date(),
        metrics: {
          total_queries: generatedQueries.length,
          total_results: searchResults.reduce((sum, r) => sum + r.results.length, 0),
          average_relevance: this.calculateAverageRelevance(searchResults),
          unique_domains: this.countUniqueDomains(searchResults),
          processing_time: Date.now() - phaseStartTime,
          success_rate: searchResults.length / generatedQueries.length
        }
      };

      return searchPass;

    } catch (error) {
      console.error(`Phase ${phase} execution failed:`, error);
      throw error;
    }
  }

  /**
   * Generate queries for specific research phase using Utils integration
   */
  private async generatePhaseQueries(
    originalQuery: string,
    phase: ResearchPhase,
    previousResults: ResearchResult[],
    options: any
  ): Promise<GeneratedQuery[]> {
    try {
      // Use Utils Feature integration for enhanced query generation
      if (this.utilsIntegration) {
        // Create phase-specific query for Utils integration
        const phaseQuery = this.createPhaseSpecificQuery(originalQuery, phase);
        
        const deconstruction = await this.utilsIntegration.optimizeResearchQueries(phaseQuery);

        if (deconstruction && deconstruction.deconstruction && deconstruction.deconstruction.queries) {
          return deconstruction.deconstruction.queries.map((deconQuery: any, index: number) => ({
            query: deconQuery.query,
            rationale: `Enhanced ${phase} query - complexity score: ${deconQuery.complexity_score}`,
            expected_sources: this.getExpectedSourceTypes(phase),
            priority: deconQuery.search_priority || (index + 1)
          }));
        }
      }

      // Fallback to direct LLM query generation
      return await this.generateQueriesWithLLM(originalQuery, phase, previousResults);

    } catch (error) {
      console.error(`Query generation failed for phase ${phase}:`, error);
      
      // Ultimate fallback: use original query with phase-specific modifiers
      return this.getFallbackQueries(originalQuery, phase);
    }
  }

  /**
   * Create phase-specific query for Utils integration
   */
  private createPhaseSpecificQuery(originalQuery: string, phase: ResearchPhase): string {
    const phaseModifiers = {
      foundation: `${originalQuery} overview background fundamentals basics`,
      perspective: `${originalQuery} arguments pros cons opinions viewpoints debate`,
      trend: `${originalQuery} trends future developments recent emerging latest`,
      synthesis: `${originalQuery} analysis expert comprehensive comparison evaluation`
    };

    return phaseModifiers[phase] || originalQuery;
  }

  /**
   * Generate queries using LLM directly
   */
  private async generateQueriesWithLLM(
    originalQuery: string,
    phase: ResearchPhase,
    previousResults: ResearchResult[]
  ): Promise<GeneratedQuery[]> {
    const phasePrompts = {
      foundation: `Generate 4 diverse search queries for foundational research on "${originalQuery}". Focus on:
- Broad overview and basic facts
- Academic and scholarly sources  
- Industry reports and white papers
- Historical context and background
Return only the queries, one per line.`,

      perspective: `Generate 4 search queries for multi-perspective analysis on "${originalQuery}". Create queries for:
- Supporting arguments and evidence
- Counterarguments and criticisms
- Expert opinions and stakeholder views
- Neutral analysis and balanced viewpoints
Return only the queries, one per line.`,

      trend: `Generate 4 search queries for trend analysis on "${originalQuery}". Focus on:
- Recent developments (last 6 months)
- Future predictions and forecasts
- Market trends and industry shifts
- Emerging technologies or methodologies
Return only the queries, one per line.`,

      synthesis: `Generate 4 search queries for comprehensive synthesis on "${originalQuery}". Focus on:
- Expert analysis and comprehensive studies
- Comparative research and benchmarking
- Best practices and implementation guides
- Strategic recommendations and case studies
Return only the queries, one per line.`
    };

    const response = await this.llmClient.completion({
      messages: [
        {
          role: 'system',
          content: 'You are an expert search query generator. Generate precise, targeted search queries based on the given instructions.'
        },
        {
          role: 'user',
          content: phasePrompts[phase]
        }
      ],
      model: 'gpt-4.1-mini', // 2025 model: 83% cost reduction, faster than GPT-4o
      temperature: 0.7,
      max_tokens: 500,
      task_type: 'search',
      strategy: 'cost'
    });

    const responseContent = response.choices[0]?.message?.content || '';
    const queries = responseContent.split('\n')
      .filter(line => line.trim().length > 10)
      .slice(0, 4)
      .map((query, index) => ({
        query: query.trim().replace(/^\d+\.\s*/, ''),
        rationale: `${phase} phase query ${index + 1}`,
        expected_sources: this.getExpectedSourceTypes(phase),
        priority: index + 1
      }));

    return queries.length > 0 ? queries : this.getFallbackQueries(originalQuery, phase);
  }

  /**
   * Process search results for a specific phase
   */
  private async processSearchResults(
    sessionId: string,
    phase: ResearchPhase,
    query: string,
    searchResults: any[],
    emitEvent?: (event: string, data: any) => void
  ): Promise<ResearchResult[]> {
    const processedResults: ResearchResult[] = [];

    if (searchResults.length === 0) return processedResults;

    // Step 1: Check Redis cache for existing content (batch operation)
    emitEvent?.('cache_lookup_started', {
      phase,
      url_count: searchResults.length
    });

    const urls = searchResults.map(result => result.url);
    const cachedContents = await this.memoryManager.getMultipleCachedContents(urls);
    const cacheMap = new Map(cachedContents.map(item => [item.url, item.content]));

    let cacheHits = 0;
    let cacheMisses = 0;

    for (const result of searchResults) {
      try {
        let finalContent = result.content || result.markdown;
        let contentSource = 'crawled';

        // Check if we have cached content
        const cachedContent = cacheMap.get(result.url);
        if (cachedContent && cachedContent.success) {
          // Use cached content
          finalContent = cachedContent.content || cachedContent.markdown;
          contentSource = 'redis_cache';
          cacheHits++;
          
          emitEvent?.('content_cache_hit', {
            phase,
            url: result.url,
            title: result.title
          });
        } else {
          // Cache miss - use freshly crawled content and cache it
          cacheMisses++;
          
          if (result.success && finalContent) {
            // Cache the fresh content for future use
            await this.memoryManager.setCachedContent(result.url, {
              success: true,
              content: result.content,
              markdown: result.markdown,
              title: result.title,
              description: result.description,
              contentLength: finalContent.length,
              cached_at: new Date().toISOString()
            }, 24); // 24 hour TTL
          }

          emitEvent?.('content_extraction_completed', {
            phase,
            url: result.url,
            title: result.title,
            content_length: finalContent?.length || 0,
            source: contentSource
          });
        }

        // Create research result
        const researchResult: ResearchResult = {
          result_id: `${sessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          session_id: sessionId,
          source_url: result.url,
          title: result.title,
          snippet: result.description || finalContent?.substring(0, 300),
          content: finalContent,
          relevance_score: this.calculateRelevanceScore(query, result),
          phase_used: phase,
          crawl_timestamp: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        };

        processedResults.push(researchResult);

      } catch (error) {
        console.error(`Failed to process search result ${result.url}:`, error);
        emitEvent?.('content_extraction_failed', {
          phase,
          url: result.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Emit cache performance stats
    emitEvent?.('cache_performance', {
      phase,
      cache_hits: cacheHits,
      cache_misses: cacheMisses,
      hit_ratio: cacheHits / (cacheHits + cacheMisses),
      total_processed: processedResults.length
    });

    console.log(`🎯 Cache Performance - Phase ${phase}: ${cacheHits} hits, ${cacheMisses} misses (${Math.round(cacheHits / (cacheHits + cacheMisses) * 100)}% hit rate)`);

    return processedResults;
  }

  /**
   * Synthesize all results into comprehensive analysis
   */
  private async synthesizeResults(
    sessionId: string,
    originalQuery: string,
    searchPasses: SearchPass[],
    allResults: ResearchResult[],
    options: any,
    emitEvent?: (event: string, data: any) => void
  ): Promise<ResearchAnalysis> {
    try {
      // Prepare synthesis prompt with all collected data
      const synthesisPrompt = this.buildSynthesisPrompt(originalQuery, searchPasses, allResults);

      emitEvent?.('synthesis_llm_started', {
        total_results: allResults.length,
        total_passes: searchPasses.length
      });

      // Generate comprehensive analysis using LLM with modern models
      const response = await this.llmClient.completion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert research analyst tasked with synthesizing comprehensive research findings. Provide detailed, well-structured analysis.'
          },
          {
            role: 'user', 
            content: synthesisPrompt
          }
        ],
        model: 'o3',  // 2025: Most powerful reasoning model for complex analysis
        temperature: 0.3,
        max_tokens: 4000,
        task_type: 'general',
        strategy: 'performance'
      });

      // Extract content from LiteLLM response
      const analysisContent = response.choices[0]?.message?.content || '';
      
      emitEvent?.('synthesis_llm_completed', {
        response_length: analysisContent.length
      });

      // Parse and structure the analysis
      const analysis = await this.parseAnalysisResponse(
        sessionId,
        originalQuery,
        analysisContent,
        searchPasses,
        allResults
      );

      return analysis;

    } catch (error) {
      console.error(`Synthesis failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Build comprehensive synthesis prompt
   */
  private buildSynthesisPrompt(
    query: string,
    searchPasses: SearchPass[],
    results: ResearchResult[]
  ): string {
    const sourceSummaries = results
      .slice(0, 30) // Limit for prompt size
      .map((result, index) => {
        return `[${index + 1}] ${result.title}\nURL: ${result.source_url}\nPhase: ${result.phase_used}\nSummary: ${result.snippet}\n`;
      })
      .join('\n');

    return `You are conducting comprehensive deep research analysis on: "${query}"

RESEARCH METHODOLOGY COMPLETED:
${searchPasses.map(pass => `
${pass.phase.toUpperCase()} PHASE:
- Queries executed: ${pass.queries.length}
- Results found: ${pass.results.reduce((sum, r) => sum + r.results.length, 0)}
- Success rate: ${Math.round(pass.metrics.success_rate * 100)}%
`).join('')}

SOURCE MATERIAL:
${sourceSummaries}

ANALYSIS REQUIREMENTS:
Please provide a comprehensive research analysis with the following structure:

# Executive Summary
[2-3 paragraph overview of key findings and conclusions]

# Detailed Analysis

## Background & Context
[Historical development, current state, key definitions]

## Current State Analysis
[Comprehensive overview, key players, metrics, recent developments]

## Multi-Perspective Analysis
[Pro arguments, counterarguments, expert consensus/disagreements]

## Trend Analysis & Future Outlook
[Recent trends, predictions, opportunities, challenges]

## Comparative Analysis
[Alternatives, benchmarking, case studies, success/failure factors]

# Strategic Insights

## Key Findings
[5-7 most important discoveries, surprising insights, knowledge gaps]

## Recommendations
[Strategic recommendations for different stakeholders with implementation notes]

## Future Directions
[Emerging opportunities, research gaps, predictions, long-term implications]

# Methodology & Limitations
[Data sources, limitations, assumptions, confidence level]

CITATION REQUIREMENTS:
- Use [1], [2], [3] format for inline citations referring to the numbered sources above
- Include citations for all factual claims
- Distinguish between primary and secondary sources
- Focus on evidence-based conclusions`;
  }

  /**
   * Parse LLM analysis response into structured format
   */
  private async parseAnalysisResponse(
    sessionId: string,
    query: string,
    response: string,
    searchPasses: SearchPass[],
    results: ResearchResult[]
  ): Promise<ResearchAnalysis> {
    // Basic parsing - in production, you might want more sophisticated parsing
    const sections = response.split('#').filter(s => s.trim().length > 0);
    
    return {
      session_id: sessionId,
      executive_summary: this.extractSection(response, 'Executive Summary') || 'Analysis completed successfully.',
      detailed_analysis: [
        {
          title: 'Background & Context',
          content: this.extractSection(response, 'Background & Context') || '',
          key_points: [],
          sources: []
        },
        {
          title: 'Current State Analysis', 
          content: this.extractSection(response, 'Current State Analysis') || '',
          key_points: [],
          sources: []
        },
        {
          title: 'Multi-Perspective Analysis',
          content: this.extractSection(response, 'Multi-Perspective Analysis') || '',
          key_points: [],
          sources: []
        }
      ],
      key_findings: this.extractBulletPoints(response, 'Key Findings'),
      recommendations: this.extractRecommendations(response),
      future_directions: this.extractBulletPoints(response, 'Future Directions'),
      methodology: `4-phase research methodology: ${searchPasses.map(p => p.phase).join(' → ')}`,
      limitations: ['Analysis based on available web sources', 'Time-bounded research scope'],
      confidence_level: 0.85,
      total_sources: results.length,
      research_duration: searchPasses.reduce((sum, p) => sum + p.metrics.processing_time, 0),
      phases_completed: searchPasses.map(p => p.phase)
    };
  }

  // Helper methods for parsing
  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|\\n#|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractBulletPoints(text: string, sectionName: string): string[] {
    const section = this.extractSection(text, sectionName);
    return section.split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.trim().replace(/^[-•]\s*/, ''))
      .filter(point => point.length > 0);
  }

  private extractRecommendations(text: string): any[] {
    const recommendations = this.extractBulletPoints(text, 'Recommendations');
    return recommendations.map((rec, index) => ({
      title: `Recommendation ${index + 1}`,
      description: rec,
      priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
      implementation_notes: '',
      stakeholders: []
    }));
  }

  // Utility methods
  private getPhasesToExecute(researchType: ResearchType): ResearchPhase[] {
    switch (researchType) {
      case 'comprehensive':
        return ['foundation', 'perspective', 'trend', 'synthesis'];
      case 'foundation':
        return ['foundation'];
      case 'perspective':
        return ['foundation', 'perspective'];
      case 'trend':
        return ['foundation', 'trend'];
      case 'synthesis':
        return ['foundation', 'perspective', 'trend', 'synthesis'];
      default:
        return ['foundation', 'perspective'];
    }
  }

  private getPhaseDescription(phase: ResearchPhase): string {
    const descriptions = {
      foundation: 'Gathering foundational knowledge and background information',
      perspective: 'Analyzing multiple perspectives and viewpoints',
      trend: 'Identifying trends and future developments',
      synthesis: 'Synthesizing insights and generating recommendations'
    };
    return descriptions[phase];
  }

  private getExpectedSourceTypes(phase: ResearchPhase): any[] {
    const sourceTypes = {
      foundation: ['academic', 'industry', 'government'],
      perspective: ['expert', 'news', 'industry'],
      trend: ['news', 'industry', 'expert'],
      synthesis: ['academic', 'expert', 'industry']
    };
    return sourceTypes[phase] || ['general'];
  }

  private getFallbackQueries(originalQuery: string, phase: ResearchPhase): GeneratedQuery[] {
    const modifiers = {
      foundation: ['overview', 'introduction', 'basics', 'definition'],
      perspective: ['pros and cons', 'arguments', 'debate', 'opinions'],
      trend: ['trends', 'future', 'latest', 'emerging'],
      synthesis: ['analysis', 'expert view', 'comprehensive', 'comparison']
    };

    return modifiers[phase].map((modifier, index) => ({
      query: `${originalQuery} ${modifier}`,
      rationale: `Fallback query for ${phase} phase`,
      expected_sources: this.getExpectedSourceTypes(phase),
      priority: index + 1
    }));
  }

  private calculateRelevanceScore(query: string, result: any): number {
    // Simple relevance calculation - can be enhanced
    const queryWords = query.toLowerCase().split(' ');
    const resultText = `${result.title} ${result.description || ''}`.toLowerCase();
    
    const matches = queryWords.filter(word => resultText.includes(word)).length;
    return Math.min(matches / queryWords.length, 1.0);
  }

  private calculateAverageRelevance(searchResults: any[]): number {
    if (searchResults.length === 0) return 0;
    
    const totalRelevance = searchResults.reduce((sum, result) => {
      return sum + result.results.reduce((subSum: number, res: any) => subSum + (res.relevance_score || 0), 0);
    }, 0);
    
    const totalResults = searchResults.reduce((sum, result) => sum + result.results.length, 0);
    return totalResults > 0 ? totalRelevance / totalResults : 0;
  }

  private countUniqueDomains(searchResults: any[]): number {
    const domains = new Set();
    searchResults.forEach(result => {
      result.results.forEach((res: any) => {
        try {
          const domain = new URL(res.source_url).hostname;
          domains.add(domain);
        } catch (e) {
          // Invalid URL, skip
        }
      });
    });
    return domains.size;
  }

  private async updateSessionStatus(
    sessionId: string,
    status: string,
    emitEvent?: (event: string, data: any) => void
  ): Promise<void> {
    emitEvent?.('session_status_updated', {
      session_id: sessionId,
      status,
      timestamp: new Date().toISOString()
    });
  }
}