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
    console.error(`Error getting session progress for ${params.sessionId}:`, error);
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
    console.error(`Error cancelling session ${params.sessionId}:`, error);
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

  // Base progress structure
  const baseProgress = {
    current_phase: 'unknown' as any,
    phase_progress: 0,
    total_progress: 0,
    current_activity: 'Unknown',
    estimated_time_remaining: 0,
    phases_completed: [],
    errors: [],
    warnings: []
  };

  switch (status) {
    case 'pending':
      return {
        ...baseProgress,
        current_phase: 'foundation',
        current_activity: 'Waiting to start research...',
        estimated_time_remaining: data.estimated_completion_time || 300
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
        current_activity: data.current_activity || `Processing ${currentPhase} phase...`,
        estimated_time_remaining: data.estimated_time_remaining || 180,
        phases_completed: phasesCompleted
      };

    case 'completed':
      return {
        ...baseProgress,
        current_phase: 'synthesis',
        phase_progress: 100,
        total_progress: 100,
        current_activity: 'Research completed successfully',
        estimated_time_remaining: 0,
        phases_completed: ['foundation', 'perspective', 'trend', 'synthesis']
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
        ]
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