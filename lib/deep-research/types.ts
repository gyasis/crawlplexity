/**
 * Type definitions for the Deep Research Engine
 */

// Core Research Types
export interface ResearchSession {
  session_id: string;
  user_id: string;
  query: string;
  start_time: Date;
  end_time?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  model_used?: string;
  research_type: ResearchType;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ResearchResult {
  result_id: string;
  session_id: string;
  source_url: string;
  title?: string;
  snippet?: string;
  content?: string;
  relevance_score?: number;
  phase_used: ResearchPhase;
  crawl_timestamp?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Citation {
  citation_id: string;
  session_id: string;
  source_url: string;
  source_title?: string;
  citation_text: string;
  citation_context?: string;
  relevance_score?: number;
  phase_used: ResearchPhase;
  created_at: Date;
  updated_at: Date;
}

// Research Configuration Types
export type ResearchType = 'comprehensive' | 'foundation' | 'perspective' | 'trend' | 'synthesis';
export type ResearchPhase = 'foundation' | 'perspective' | 'trend' | 'synthesis';

export interface ResearchOptions {
  research_type?: ResearchType;
  max_sources_per_phase?: number;
  include_citations?: boolean;
  max_depth?: number;
  time_range?: string;
  source_types?: SourceType[];
}

export type SourceType = 'academic' | 'industry' | 'news' | 'expert' | 'government' | 'general';

// Research Analysis Types
export interface AnalysisSection {
  title: string;
  content: string;
  key_points: string[];
  sources: string[];
  confidence_score?: number;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  implementation_notes: string;
  stakeholders: string[];
  timeline?: string;
  risks?: string[];
}

export interface ResearchAnalysis {
  session_id: string;
  executive_summary: string;
  detailed_analysis: AnalysisSection[];
  key_findings: string[];
  recommendations: Recommendation[];
  future_directions: string[];
  methodology: string;
  limitations: string[];
  confidence_level: number;
  total_sources: number;
  research_duration: number;
  phases_completed: ResearchPhase[];
}

// Search Pass Types
export interface SearchPass {
  phase: ResearchPhase;
  queries: string[];
  results: SearchPassResult[];
  completed: boolean;
  start_time: Date;
  end_time?: Date;
  metrics: SearchPassMetrics;
}

export interface SearchPassResult {
  query: string;
  results: ResearchResult[];
  search_time: number;
  total_results: number;
  relevance_threshold: number;
}

export interface SearchPassMetrics {
  total_queries: number;
  total_results: number;
  average_relevance: number;
  unique_domains: number;
  processing_time: number;
  success_rate: number;
}

// Progress Tracking Types
export interface ResearchProgress {
  session_id: string;
  current_phase: ResearchPhase;
  phase_progress: number; // 0-100
  total_progress: number; // 0-100
  current_activity: string;
  estimated_time_remaining: number; // in seconds
  phases_completed: ResearchPhase[];
  errors: ResearchError[];
  warnings: ResearchWarning[];
}

export interface ResearchError {
  error_id: string;
  phase: ResearchPhase;
  error_type: string;
  message: string;
  details?: any;
  timestamp: Date;
  resolved: boolean;
}

export interface ResearchWarning {
  warning_id: string;
  phase: ResearchPhase;
  warning_type: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// API Types
export interface StartResearchRequest {
  query: string;
  research_type?: ResearchType;
  max_sources_per_phase?: number;
  include_citations?: boolean;
  user_id?: string;
}

export interface StartResearchResponse {
  session_id: string;
  status: ResearchSession['status'];
  estimated_completion_time: number;
  research_type: ResearchType;
}

export interface GetProgressResponse {
  session_id: string;
  status: ResearchSession['status'];
  progress: ResearchProgress;
}

export interface GetResultsResponse {
  session_id: string;
  query: string;
  status: ResearchSession['status'];
  analysis: ResearchAnalysis;
  sources: ResearchResult[];
  citations: Citation[];
  metadata: {
    total_sources: number;
    research_duration: number;
    phases_completed: ResearchPhase[];
    model_used?: string;
  };
}

// Export Types
export interface ExportRequest {
  session_id: string;
  format: 'pdf' | 'markdown' | 'json' | 'html';
  include_sources?: boolean;
  include_citations?: boolean;
  include_metadata?: boolean;
}

export interface ExportResponse {
  export_id: string;
  download_url: string;
  format: string;
  expires_at: Date;
}

// Stream Event Types for Real-time Updates
export interface ResearchStreamEvent {
  type: 'session_started' | 'phase_started' | 'phase_completed' | 'query_executed' | 
        'content_extracted' | 'analysis_generated' | 'session_completed' | 
        'session_error' | 'progress_update';
  session_id: string;
  phase?: ResearchPhase;
  data: any;
  timestamp: Date;
}

// Integration Types with Utils Feature
export interface UtilsIntegration {
  use_taskmaster: boolean;
  use_query_deconstruction: boolean;
  taskmaster_options?: {
    max_steps?: number;
    include_estimates?: boolean;
  };
  query_deconstruction_options?: {
    max_queries?: number;
    min_complexity_reduction?: number;
  };
}

// Cache Types
export interface ResearchCache {
  cache_key: string;
  session_id?: string;
  query_hash: string;
  results: any;
  analysis?: string;
  created_at: Date;
  last_accessed: Date;
  access_count: number;
  expires_at: Date;
}

// Database Schema Interfaces
export interface CreateResearchSessionParams {
  user_id: string;
  query: string;
  research_type: ResearchType;
  options: ResearchOptions;
}

export interface UpdateResearchSessionParams {
  session_id: string;
  status?: ResearchSession['status'];
  end_time?: Date;
  notes?: string;
}

export interface SaveResearchResultParams {
  session_id: string;
  source_url: string;
  title?: string;
  snippet?: string;
  content?: string;
  relevance_score?: number;
  phase_used: ResearchPhase;
}

export interface SaveCitationParams {
  session_id: string;
  source_url: string;
  source_title?: string;
  citation_text: string;
  citation_context?: string;
  relevance_score?: number;
  phase_used: ResearchPhase;
}

// Error Types
export class DeepResearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public phase?: ResearchPhase,
    public session_id?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DeepResearchError';
  }
}

// Query Generation Types
export interface QueryGenerationRequest {
  original_query: string;
  phase: ResearchPhase;
  context?: any;
  max_queries?: number;
}

export interface GeneratedQuery {
  query: string;
  rationale: string;
  expected_sources: SourceType[];
  priority: number;
}

export interface QueryGenerationResponse {
  phase: ResearchPhase;
  queries: GeneratedQuery[];
  total_queries: number;
  generation_time: number;
}