/**
 * Integration between Utils Feature and Document Builder
 */

import { getDSPyService } from '@/lib/utils/services/dspy-service';
import { TaskBreakdown, QueryDeconstruction } from '@/lib/utils/types';

export class DocumentBuilderIntegration {
  private dspyService = getDSPyService();

  /**
   * Use Taskmaster to plan document creation workflow
   */
  async planDocumentCreation(
    documentType: string, 
    topic: string, 
    requirements?: {
      length?: string;
      audience?: string;
      format?: string;
      deadline?: string;
    }
  ): Promise<TaskBreakdown> {
    const task = `Create a ${documentType} about ${topic}${
      requirements ? ` with the following requirements: ${JSON.stringify(requirements)}` : ''
    }`;
    
    const breakdown = await this.dspyService.breakdownTask(task, {
      task_type: 'content_creation',
      max_steps: 10,
      include_estimates: true,
      context: {
        document_type: documentType,
        topic: topic,
        requirements: requirements || {},
        workflow_type: 'document_creation'
      }
    });

    return breakdown;
  }

  /**
   * Use Query Deconstruction to plan content research queries
   */
  async planContentResearch(
    topic: string, 
    documentType: string,
    researchDepth: 'basic' | 'comprehensive' | 'expert' = 'comprehensive'
  ): Promise<QueryDeconstruction> {
    const researchQuery = `Research content for ${documentType} about ${topic} with ${researchDepth} depth`;
    
    const deconstruction = await this.dspyService.deconstructQuery(researchQuery, {
      query_type: 'research',
      max_queries: researchDepth === 'basic' ? 3 : researchDepth === 'comprehensive' ? 6 : 8,
      min_complexity_reduction: 0.2,
      include_semantic_groups: true,
      context: {
        document_type: documentType,
        research_depth: researchDepth,
        content_focus: 'document_creation'
      }
    });

    return deconstruction;
  }

  /**
   * Convert task breakdown to document creation plan
   */
  convertToDocumentPlan(breakdown: TaskBreakdown) {
    return {
      plan_id: breakdown.task_id,
      document_title: breakdown.original_task,
      creation_phases: breakdown.breakdown.steps.map((step, index) => ({
        phase_number: index + 1,
        phase_id: step.id,
        phase_name: step.title,
        description: step.description,
        estimated_duration: step.estimated_time,
        dependencies: step.dependencies,
        deliverables: step.success_criteria,
        required_resources: step.resources_needed,
        action_items: step.commands || [],
        phase_type: this.categorizeDocumentPhase(step.title, step.description)
      })),
      timeline: {
        total_estimated_time: breakdown.breakdown.total_estimated_time,
        complexity_level: this.mapComplexityToLevel(breakdown.breakdown.complexity_score),
        phase_count: breakdown.breakdown.steps.length
      },
      metadata: {
        task_type: breakdown.metadata.task_type,
        created_at: breakdown.metadata.created_at,
        optimization_version: breakdown.metadata.optimization_version
      }
    };
  }

  /**
   * Convert query deconstruction to content research plan  
   */
  convertToContentResearchPlan(deconstruction: QueryDeconstruction) {
    return {
      research_id: deconstruction.query_id,
      research_objective: deconstruction.original_query,
      research_queries: deconstruction.deconstruction.queries.map(query => ({
        query_id: query.id,
        search_query: query.query,
        research_priority: query.search_priority,
        complexity_level: query.complexity_score,
        content_category: query.semantic_group,
        expected_sources: query.estimated_results,
        key_terms: query.keywords,
        search_strategy: this.determineSearchStrategy(query)
      })),
      content_sections: deconstruction.deconstruction.semantic_groups.map(group => ({
        section_id: group.name.toLowerCase().replace(/\s+/g, '_'),
        section_title: group.name,
        content_theme: group.common_theme,
        research_approach: group.search_strategy,
        related_queries: group.queries,
        content_type: this.inferContentType(group.common_theme)
      })),
      research_metrics: {
        query_optimization: deconstruction.deconstruction.complexity_reduction,
        research_efficiency: deconstruction.deconstruction.parallel_score,
        total_research_areas: deconstruction.deconstruction.queries.length
      }
    };
  }

  /**
   * Generate document structure recommendations
   */
  generateDocumentStructure(breakdown: TaskBreakdown, researchPlan?: any) {
    const structure = {
      document_sections: [] as any[],
      writing_guidelines: [] as any[],
      quality_checkpoints: [] as any[]
    };

    // Analyze task breakdown to suggest document structure
    const contentSteps = breakdown.breakdown.steps.filter(step => 
      step.title.toLowerCase().includes('write') || 
      step.title.toLowerCase().includes('draft') ||
      step.title.toLowerCase().includes('content')
    );

    const researchSteps = breakdown.breakdown.steps.filter(step =>
      step.title.toLowerCase().includes('research') ||
      step.title.toLowerCase().includes('gather') ||
      step.title.toLowerCase().includes('collect')
    );

    // Generate sections based on research plan if available
    if (researchPlan) {
      structure.document_sections = researchPlan.content_sections.map((section: any, index: number) => ({
        section_number: index + 1,
        section_title: section.section_title,
        content_focus: section.content_theme,
        research_sources: section.related_queries,
        estimated_length: this.estimateSectionLength(section.content_type),
        writing_priority: section.research_approach === 'parallel' ? 'high' : 'medium'
      }));
    } else {
      // Generate sections based on task breakdown
      structure.document_sections = contentSteps.map((step, index) => ({
        section_number: index + 1,
        section_title: step.title,
        content_focus: step.description,
        estimated_length: Math.round(step.estimated_time * 50), // ~50 words per minute
        writing_priority: step.dependencies.length === 0 ? 'high' : 'medium'
      }));
    }

    // Generate writing guidelines
    structure.writing_guidelines = [
      {
        guideline: 'Research Thoroughness',
        description: `Complete ${researchSteps.length} research phases before writing`,
        importance: 'high'
      },
      {
        guideline: 'Structured Approach',
        description: `Follow ${breakdown.breakdown.steps.length}-phase creation process`,
        importance: 'medium'
      },
      {
        guideline: 'Quality Assurance',
        description: 'Implement success criteria checks at each phase',
        importance: 'high'
      }
    ];

    // Generate quality checkpoints
    structure.quality_checkpoints = breakdown.breakdown.steps
      .filter(step => step.success_criteria.length > 0)
      .map(step => ({
        checkpoint_name: step.title,
        quality_criteria: step.success_criteria,
        validation_method: this.suggestValidationMethod(step.title)
      }));

    return structure;
  }

  /**
   * Generate content optimization recommendations
   */
  generateContentOptimizations(breakdown: TaskBreakdown, researchPlan?: any) {
    const optimizations = [];

    // Time optimization
    if (breakdown.breakdown.total_estimated_time > 300) { // 5 hours
      optimizations.push({
        type: 'time_management',
        recommendation: 'Consider breaking document creation into multiple sessions',
        impact: 'Prevents fatigue and maintains quality',
        priority: 'medium'
      });
    }

    // Research optimization
    if (researchPlan && researchPlan.research_metrics.research_efficiency > 7) {
      optimizations.push({
        type: 'research_efficiency',
        recommendation: 'Excellent research plan - execute queries in parallel',
        impact: 'Reduces research time by 60-70%',
        priority: 'high'
      });
    }

    // Complexity optimization
    if (breakdown.breakdown.complexity_score > 8) {
      optimizations.push({
        type: 'complexity_management',
        recommendation: 'High complexity document - consider expert review at key milestones',
        impact: 'Ensures accuracy and completeness',
        priority: 'high'
      });
    }

    // Workflow optimization
    const parallelSteps = breakdown.breakdown.steps.filter(step => step.dependencies.length === 0);
    if (parallelSteps.length > 1) {
      optimizations.push({
        type: 'workflow_parallelization',
        recommendation: `${parallelSteps.length} steps can be executed in parallel`,
        impact: 'Reduces overall creation time',
        priority: 'medium'
      });
    }

    return optimizations;
  }

  // Helper methods
  private categorizeDocumentPhase(title: string, description: string): string {
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();

    if (titleLower.includes('research') || titleLower.includes('gather')) return 'research';
    if (titleLower.includes('plan') || titleLower.includes('outline')) return 'planning';
    if (titleLower.includes('write') || titleLower.includes('draft')) return 'writing';
    if (titleLower.includes('review') || titleLower.includes('edit')) return 'revision';
    if (titleLower.includes('format') || titleLower.includes('design')) return 'formatting';
    if (titleLower.includes('final') || titleLower.includes('publish')) return 'finalization';
    
    return 'general';
  }

  private mapComplexityToLevel(score: number): string {
    if (score <= 3) return 'Simple';
    if (score <= 6) return 'Moderate';
    if (score <= 8) return 'Complex';
    return 'Expert';
  }

  private determineSearchStrategy(query: any): string {
    if (query.complexity_score > 7) return 'comprehensive';
    if (query.search_priority >= 4) return 'priority';
    return 'standard';
  }

  private inferContentType(theme: string): string {
    const themeLower = theme.toLowerCase();
    if (themeLower.includes('technical') || themeLower.includes('specification')) return 'technical';
    if (themeLower.includes('overview') || themeLower.includes('introduction')) return 'overview';
    if (themeLower.includes('analysis') || themeLower.includes('evaluation')) return 'analytical';
    if (themeLower.includes('example') || themeLower.includes('case')) return 'practical';
    return 'informational';
  }

  private estimateSectionLength(contentType: string): string {
    const estimates = {
      'technical': '800-1200 words',
      'overview': '400-600 words', 
      'analytical': '600-1000 words',
      'practical': '500-800 words',
      'informational': '400-700 words'
    };
    return estimates[contentType as keyof typeof estimates] || '500-800 words';
  }

  private suggestValidationMethod(stepTitle: string): string {
    const titleLower = stepTitle.toLowerCase();
    if (titleLower.includes('research')) return 'source_verification';
    if (titleLower.includes('write') || titleLower.includes('draft')) return 'content_review';
    if (titleLower.includes('format')) return 'formatting_check';
    if (titleLower.includes('final')) return 'comprehensive_review';
    return 'peer_review';
  }
}

// Singleton instance
let documentBuilderIntegration: DocumentBuilderIntegration | null = null;

export function getDocumentBuilderIntegration(): DocumentBuilderIntegration {
  if (!documentBuilderIntegration) {
    documentBuilderIntegration = new DocumentBuilderIntegration();
  }
  return documentBuilderIntegration;
}

// Usage example function
export async function enhanceDocumentCreationWithUtils(
  documentType: string,
  topic: string,
  requirements?: any
) {
  const integration = getDocumentBuilderIntegration();
  
  // Step 1: Plan document creation workflow
  const creationPlan = await integration.planDocumentCreation(documentType, topic, requirements);
  
  // Step 2: Plan content research
  const researchPlan = await integration.planContentResearch(topic, documentType);
  
  // Step 3: Generate structure and optimizations
  const documentStructure = integration.generateDocumentStructure(creationPlan, 
    integration.convertToContentResearchPlan(researchPlan));
  const optimizations = integration.generateContentOptimizations(creationPlan, 
    integration.convertToContentResearchPlan(researchPlan));
  
  return {
    creation_plan: integration.convertToDocumentPlan(creationPlan),
    research_plan: integration.convertToContentResearchPlan(researchPlan),
    document_structure: documentStructure,
    optimizations: optimizations,
    execution_summary: {
      total_phases: creationPlan.breakdown.steps.length,
      research_queries: researchPlan.deconstruction.queries.length,
      estimated_time: creationPlan.breakdown.total_estimated_time,
      complexity_assessment: creationPlan.breakdown.complexity_score,
      research_efficiency: researchPlan.deconstruction.parallel_score
    }
  };
}