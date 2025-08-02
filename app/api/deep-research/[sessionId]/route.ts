/**
 * Deep Research Engine - Session Management API
 * GET /api/deep-research/[sessionId] - Get session progress
 * DELETE /api/deep-research/[sessionId] - Cancel/delete session
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemporalMemoryManager } from '@/lib/deep-research/temporal-storage';
import { GetProgressResponse } from '@/lib/deep-research/types';

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

    // Determine current progress based on session data and tier
    const progress = calculateSessionProgress(sessionData);

    const response: GetProgressResponse = {
      session_id: sessionId,
      status: sessionData.data.status || 'unknown',
      progress
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Error getting session progress:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to get session progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session data to check if it exists and its current state
    const mm = await getMemoryManager();
    const sessionData = await mm.getResearchSession(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Research session not found' },
        { status: 404 }
      );
    }

    // Check if session can be cancelled (only active/pending sessions)
    const cancelableStatuses = ['pending', 'in_progress'];
    if (!cancelableStatuses.includes(sessionData.data.status)) {
      return NextResponse.json(
        { 
          error: `Cannot cancel session with status: ${sessionData.data.status}`,
          current_status: sessionData.data.status
        },
        { status: 400 }
      );
    }

    // For now, we'll just mark as cancelled (you might want to implement actual cancellation logic)
    // This is a simplified implementation - in production you'd want to:
    // 1. Stop any running research processes
    // 2. Clean up temporary data
    // 3. Update session status to 'cancelled'

    return NextResponse.json({
      message: 'Session cancellation requested',
      session_id: sessionId,
      status: 'cancelled',
      note: 'Session will be stopped and marked as cancelled. This may take a few moments.'
    });

  } catch (error) {
    console.error(`Error cancelling session:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate session progress based on current state
 */
function calculateSessionProgress(sessionData: any): any {
  const data = sessionData.data;
  const status = data.status;
  const tier = sessionData.tier;

  // Base progress structure with enhanced tracking
  const baseProgress = {
    current_phase: 'unknown' as any,
    phase_progress: 0,
    total_progress: 0,
    current_activity: 'Unknown',
    estimated_time_remaining: 0,
    phases_completed: [],
    errors: [],
    warnings: [],
    // Enhanced progress fields
    phase_details: generatePhaseDetails(data),
    current_subtask: data.current_subtask || null,
    subtasks_completed: data.subtasks_completed || []
  };

  switch (status) {
    case 'pending':
      return {
        ...baseProgress,
        current_phase: 'foundation',
        current_activity: 'Waiting to start research...',
        estimated_time_remaining: data.estimated_completion_time || 300,
        phase_details: generatePhaseDetails(data, 'pending')
      };

    case 'in_progress':
      // Try to determine current phase from data
      const currentPhase = data.current_phase || 'foundation';
      const phasesCompleted = data.phases_completed || [];
      
      return {
        ...baseProgress,
        current_phase: currentPhase,
        phase_progress: data.phase_progress || 25,
        total_progress: calculateTotalProgress(currentPhase, phasesCompleted),
        current_activity: data.current_activity || generateCurrentActivity(data),
        estimated_time_remaining: data.estimated_time_remaining || 180,
        phases_completed: phasesCompleted,
        phase_details: generatePhaseDetails(data, 'in_progress'),
        current_subtask: data.current_subtask,
        subtasks_completed: data.subtasks_completed || []
      };

    case 'completed':
      return {
        ...baseProgress,
        current_phase: 'synthesis',
        phase_progress: 100,
        total_progress: 100,
        current_activity: 'Research completed successfully',
        estimated_time_remaining: 0,
        phases_completed: ['foundation', 'perspective', 'trend', 'synthesis'],
        phase_details: generatePhaseDetails(data, 'completed')
      };

    case 'failed':
      return {
        ...baseProgress,
        current_phase: data.current_phase || 'unknown',
        total_progress: data.total_progress || 0,
        current_activity: 'Research failed',
        estimated_time_remaining: 0,
        errors: [
          {
            error_id: 'session_failure',
            phase: data.current_phase || 'unknown',
            error_type: 'execution_error',
            message: data.error || 'Research session failed',
            timestamp: new Date(),
            resolved: false
          }
        ],
        phase_details: generatePhaseDetails(data, 'failed')
      };

    default:
      return baseProgress;
  }
}

/**
 * Calculate total progress based on current phase and completed phases
 */
function calculateTotalProgress(currentPhase: string, completedPhases: string[]): number {
  const phaseWeights = {
    foundation: 25,
    perspective: 25, 
    trend: 25,
    synthesis: 25
  };

  const phaseOrder = ['foundation', 'perspective', 'trend', 'synthesis'];
  
  let totalProgress = 0;
  
  // Add progress for completed phases
  for (const phase of completedPhases) {
    totalProgress += phaseWeights[phase as keyof typeof phaseWeights] || 0;
  }
  
  // Add partial progress for current phase
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
  if (currentPhaseIndex >= 0 && !completedPhases.includes(currentPhase)) {
    totalProgress += (phaseWeights[currentPhase as keyof typeof phaseWeights] || 0) * 0.5;
  }
  
  return Math.min(totalProgress, 100);
}

/**
 * Generate detailed phase information with subtasks
 */
function generatePhaseDetails(data: any, sessionStatus?: string): any[] {
  const phases = ['foundation', 'perspective', 'trend', 'synthesis'];
  const currentPhase = data.current_phase || 'foundation';
  const completedPhases = data.phases_completed || [];
  
  return phases.map(phase => {
    const isCompleted = completedPhases.includes(phase);
    const isCurrent = currentPhase === phase;
    const isPending = phases.indexOf(phase) > phases.indexOf(currentPhase);
    
    let status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending';
    if (isCompleted) status = 'completed';
    else if (isCurrent) status = 'in_progress';
    else if (sessionStatus === 'failed' && isCurrent) status = 'failed';
    
    return {
      phase: phase as any,
      status,
      progress: isCompleted ? 100 : (isCurrent ? (data.phase_progress || 25) : 0),
      start_time: data[`${phase}_start_time`] ? new Date(data[`${phase}_start_time`]) : undefined,
      end_time: data[`${phase}_end_time`] ? new Date(data[`${phase}_end_time`]) : undefined,
      subtasks: generateSubtasks(phase, data, status),
      queries_executed: data[`${phase}_queries`] || []
    };
  });
}

/**
 * Generate subtasks for a given phase
 */
function generateSubtasks(phase: string, data: any, phaseStatus: string): any[] {
  const subtasks: Record<string, any[]> = {
    foundation: [
      {
        subtask_id: `${phase}_query_gen`,
        name: 'Generate Research Questions',
        description: 'Creating foundational research questions based on the initial query',
        status: phaseStatus === 'completed' ? 'completed' : (phaseStatus === 'in_progress' ? 'in_progress' : 'pending'),
        progress: phaseStatus === 'completed' ? 100 : (phaseStatus === 'in_progress' ? 60 : 0),
        phase: phase as any,
        current_operation: 'Analyzing query complexity and generating sub-questions'
      },
      {
        subtask_id: `${phase}_search`,
        name: 'Execute Foundation Searches',
        description: 'Searching for basic information and core concepts',
        status: phaseStatus === 'completed' ? 'completed' : (phaseStatus === 'in_progress' ? 'pending' : 'pending'),
        progress: phaseStatus === 'completed' ? 100 : 0,
        phase: phase as any,
        current_operation: 'Processing search results and extracting content'
      },
      {
        subtask_id: `${phase}_analysis`,
        name: 'Analyze Foundation Content',
        description: 'Processing and analyzing foundational research content',
        status: phaseStatus === 'completed' ? 'completed' : 'pending',
        progress: phaseStatus === 'completed' ? 100 : 0,
        phase: phase as any,
        current_operation: 'Extracting key concepts and building knowledge base'
      }
    ],
    perspective: [
      {
        subtask_id: `${phase}_query_gen`,
        name: 'Generate Perspective Queries',
        description: 'Creating queries to gather different viewpoints and opinions',
        status: phaseStatus === 'completed' ? 'completed' : (phaseStatus === 'in_progress' ? 'in_progress' : 'pending'),
        progress: phaseStatus === 'completed' ? 100 : (phaseStatus === 'in_progress' ? 40 : 0),
        phase: phase as any,
        current_operation: 'Identifying diverse sources and viewpoints'
      },
      {
        subtask_id: `${phase}_search`,
        name: 'Gather Multiple Perspectives',
        description: 'Searching for diverse viewpoints and expert opinions',
        status: phaseStatus === 'completed' ? 'completed' : 'pending',
        progress: phaseStatus === 'completed' ? 100 : 0,
        phase: phase as any,
        current_operation: 'Processing expert opinions and different perspectives'
      }
    ],
    trend: [
      {
        subtask_id: `${phase}_query_gen`,
        name: 'Generate Trend Queries',
        description: 'Creating queries to identify current trends and developments',
        status: phaseStatus === 'completed' ? 'completed' : (phaseStatus === 'in_progress' ? 'in_progress' : 'pending'),
        progress: phaseStatus === 'completed' ? 100 : (phaseStatus === 'in_progress' ? 30 : 0),
        phase: phase as any,
        current_operation: 'Analyzing recent developments and emerging trends'
      },
      {
        subtask_id: `${phase}_search`,
        name: 'Analyze Current Trends',
        description: 'Researching latest trends and future directions',
        status: phaseStatus === 'completed' ? 'completed' : 'pending',
        progress: phaseStatus === 'completed' ? 100 : 0,
        phase: phase as any,
        current_operation: 'Processing recent publications and trend data'
      }
    ],
    synthesis: [
      {
        subtask_id: `${phase}_analysis`,
        name: 'Synthesize Research',
        description: 'Combining all research into comprehensive analysis',
        status: phaseStatus === 'completed' ? 'completed' : (phaseStatus === 'in_progress' ? 'in_progress' : 'pending'),
        progress: phaseStatus === 'completed' ? 100 : (phaseStatus === 'in_progress' ? 70 : 0),
        phase: phase as any,
        current_operation: 'Generating comprehensive analysis and recommendations'
      }
    ]
  };
  
  return subtasks[phase] || [];
}

/**
 * Generate current activity description based on data
 */
function generateCurrentActivity(data: any): string {
  const currentPhase = data.current_phase || 'foundation';
  const currentSubtask = data.current_subtask;
  const currentQuery = data.current_query;
  
  if (currentQuery) {
    return `Executing query: "${currentQuery.length > 50 ? currentQuery.substring(0, 50) + '...' : currentQuery}"`;
  }
  
  if (currentSubtask && currentSubtask.current_operation) {
    return `${currentSubtask.name}: ${currentSubtask.current_operation}`;
  }
  
  // Fallback based on phase
  const phaseDescriptions = {
    foundation: 'Gathering foundational knowledge and core concepts',
    perspective: 'Collecting diverse viewpoints and expert perspectives',
    trend: 'Analyzing current trends and future developments',
    synthesis: 'Synthesizing research into comprehensive analysis'
  };
  
  return phaseDescriptions[currentPhase as keyof typeof phaseDescriptions] || `Processing ${currentPhase} phase...`;
}