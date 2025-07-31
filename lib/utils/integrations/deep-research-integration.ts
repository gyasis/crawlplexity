/**
 * Integration between Utils Feature and Deep Research Engine
 */

import { getDSPyService } from '@/lib/utils/services/dspy-service';
import { TaskBreakdown, QueryDeconstruction } from '@/lib/utils/types';

export class DeepResearchIntegration {
  private dspyService = getDSPyService();

  /**
   * Use Taskmaster to plan a research workflow
   */
  async planResearchWorkflow(researchQuery: string): Promise<TaskBreakdown> {
    const task = `Conduct comprehensive research on: ${researchQuery}`;
    
    const breakdown = await this.dspyService.breakdownTask(task, {
      task_type: 'research',
      max_steps: 8,
      include_estimates: true,
      context: {
        research_type: 'comprehensive',
        depth: 'detailed',
        sources_required: ['academic', 'news', 'reports']
      }
    });

    return breakdown;
  }

  /**
   * Use Query Deconstruction to optimize search queries for research
   */
  async optimizeResearchQueries(complexQuery: string): Promise<QueryDeconstruction> {
    const deconstruction = await this.dspyService.deconstructQuery(complexQuery, {
      query_type: 'research',
      max_queries: 6,
      min_complexity_reduction: 0.3,
      include_semantic_groups: true,
      context: {
        search_context: 'research',
        prioritize_academic: true,
        enable_parallel_search: true
      }
    });

    return deconstruction;
  }

  /**
   * Convert task breakdown to research plan format
   */
  convertToResearchPlan(breakdown: TaskBreakdown) {
    return {
      research_id: breakdown.task_id,
      title: breakdown.original_task,
      phases: breakdown.breakdown.steps.map(step => ({
        phase_id: step.id,
        name: step.title,
        description: step.description,
        estimated_duration: step.estimated_time,
        prerequisites: step.dependencies,
        deliverables: step.success_criteria,
        resources: step.resources_needed,
        actions: step.commands || []
      })),
      total_estimated_time: breakdown.breakdown.total_estimated_time,
      complexity_assessment: breakdown.breakdown.complexity_score,
      research_methodology: breakdown.metadata.task_type,
      created_at: breakdown.metadata.created_at
    };
  }

  /**
   * Convert query deconstruction to search strategy
   */
  convertToSearchStrategy(deconstruction: QueryDeconstruction) {
    return {
      strategy_id: deconstruction.query_id,
      original_intent: deconstruction.original_query,
      search_components: deconstruction.deconstruction.queries.map(query => ({
        component_id: query.id,
        search_query: query.query,
        priority: query.search_priority,
        expected_result_count: query.estimated_results,
        complexity: query.complexity_score,
        semantic_category: query.semantic_group,
        keywords: query.keywords
      })),
      execution_groups: deconstruction.deconstruction.semantic_groups.map(group => ({
        group_id: group.name.toLowerCase().replace(/\s+/g, '_'),
        group_name: group.name,
        theme: group.common_theme,
        strategy: group.search_strategy,
        queries: group.queries
      })),
      optimization_metrics: {
        complexity_reduction: deconstruction.deconstruction.complexity_reduction,
        parallelization_score: deconstruction.deconstruction.parallel_score,
        total_queries: deconstruction.deconstruction.queries.length
      },
      metadata: {
        query_type: deconstruction.metadata.query_type,
        created_at: deconstruction.metadata.created_at,
        optimization_version: deconstruction.metadata.optimization_version
      }
    };
  }

  /**
   * Generate research recommendations based on task breakdown
   */
  generateResearchRecommendations(breakdown: TaskBreakdown) {
    const recommendations = [];

    // Analyze complexity and suggest approaches
    if (breakdown.breakdown.complexity_score > 7) {
      recommendations.push({
        type: 'complexity_warning',
        message: 'High complexity research detected. Consider breaking into smaller focused studies.',
        priority: 'high'
      });
    }

    // Analyze time estimates
    const totalTime = breakdown.breakdown.total_estimated_time;
    if (totalTime > 480) { // 8 hours
      recommendations.push({
        type: 'time_management',
        message: 'Extended research timeframe. Consider scheduling across multiple sessions.',
        priority: 'medium'
      });
    }

    // Analyze resource requirements
    const allResources = breakdown.breakdown.steps.flatMap(step => step.resources_needed);
    const uniqueResources = [...new Set(allResources)];
    
    if (uniqueResources.length > 10) {
      recommendations.push({
        type: 'resource_planning',
        message: 'Multiple resource types required. Ensure access before starting research.',
        priority: 'medium'
      });
    }

    // Analyze dependencies
    const stepsWithDependencies = breakdown.breakdown.steps.filter(step => step.dependencies.length > 0);
    if (stepsWithDependencies.length > breakdown.breakdown.steps.length * 0.6) {
      recommendations.push({
        type: 'workflow_optimization',
        message: 'High interdependency detected. Consider parallel execution where possible.',
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Generate search optimization recommendations
   */
  generateSearchOptimizations(deconstruction: QueryDeconstruction) {
    const optimizations = [];

    // Parallel execution optimization
    if (deconstruction.deconstruction.parallel_score > 7) {
      optimizations.push({
        type: 'parallel_execution',
        message: 'Excellent parallel potential. Execute all queries simultaneously for faster results.',
        estimated_time_savings: '60-70%'
      });
    }

    // Complexity reduction analysis
    if (deconstruction.deconstruction.complexity_reduction > 0.6) {
      optimizations.push({
        type: 'query_simplification',
        message: 'Significant complexity reduction achieved. Queries are well-optimized for search engines.',
        quality_improvement: 'high'
      });
    }

    // Semantic grouping recommendations
    const groups = deconstruction.deconstruction.semantic_groups;
    if (groups.length > 1) {
      optimizations.push({
        type: 'semantic_grouping',
        message: `Queries organized into ${groups.length} semantic groups for targeted search strategies.`,
        strategy_recommendation: 'Execute groups sequentially, queries within groups in parallel'
      });
    }

    return optimizations;
  }
}

// Singleton instance
let deepResearchIntegration: DeepResearchIntegration | null = null;

export function getDeepResearchIntegration(): DeepResearchIntegration {
  if (!deepResearchIntegration) {
    deepResearchIntegration = new DeepResearchIntegration();
  }
  return deepResearchIntegration;
}

// Usage example functions
export async function enhanceResearchWithUtils(researchQuery: string) {
  const integration = getDeepResearchIntegration();
  
  // Step 1: Plan the research workflow
  const researchPlan = await integration.planResearchWorkflow(researchQuery);
  
  // Step 2: Optimize search queries
  const searchStrategy = await integration.optimizeResearchQueries(researchQuery);
  
  // Step 3: Generate recommendations
  const researchRecommendations = integration.generateResearchRecommendations(researchPlan);
  const searchOptimizations = integration.generateSearchOptimizations(searchStrategy);
  
  return {
    research_plan: integration.convertToResearchPlan(researchPlan),
    search_strategy: integration.convertToSearchStrategy(searchStrategy),
    recommendations: {
      research: researchRecommendations,
      search: searchOptimizations
    },
    execution_summary: {
      total_phases: researchPlan.breakdown.steps.length,
      total_queries: searchStrategy.deconstruction.queries.length,
      estimated_time: researchPlan.breakdown.total_estimated_time,
      complexity_score: researchPlan.breakdown.complexity_score,
      optimization_potential: searchStrategy.deconstruction.parallel_score
    }
  };
}