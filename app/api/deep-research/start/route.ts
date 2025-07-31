/**
 * Deep Research Engine - Start Research Session API
 * POST /api/deep-research/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemporalMemoryManager } from '@/lib/deep-research/temporal-storage';
import { ResearchOrchestrator } from '@/lib/deep-research/orchestrator';
import { 
  StartResearchRequest, 
  StartResearchResponse, 
  ResearchStreamEvent 
} from '@/lib/deep-research/types';
import { randomUUID } from 'crypto';

export const config = {
  api: {
    responseLimit: false, // Disable response limit for streaming
  },
};

// Import availability checker
import { deepResearchChecker } from '@/lib/deep-research/availability-checker';

// Global instances with lazy initialization
let memoryManager: TemporalMemoryManager | null = null;
let orchestrator: ResearchOrchestrator | null = null;
let initializationError: string | null = null;

async function initializeServices() {
  if (memoryManager && orchestrator) {
    return { memoryManager, orchestrator };
  }

  if (initializationError) {
    throw new Error(initializationError);
  }

  try {
    // Check availability first
    const status = await deepResearchChecker.checkAvailability(true);
    
    if (!status.available && !status.fallbackMode) {
      const message = deepResearchChecker.getStatusMessage(status);
      const instructions = deepResearchChecker.getSetupInstructions(status);
      initializationError = `${message}\n\nSetup required:\n${instructions.join('\n')}`;
      throw new Error(initializationError);
    }

    // Initialize memory manager
    memoryManager = new TemporalMemoryManager({
      sqlite_path: './data/research_memory.db',
      tier_durations: {
        hot_days: 3,
        warm_days: 7,
        cold_days: 30,
        trash_days: 7
      },
      cleanup_interval_hours: 6,
      max_redis_sessions: 100
    });

    // Initialize the memory manager connections
    await memoryManager.initialize();

    // Initialize orchestrator
    orchestrator = new ResearchOrchestrator(memoryManager);

    console.log('✅ Deep Research Engine initialized successfully');
    return { memoryManager, orchestrator, status };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    initializationError = errorMessage;
    console.error('❌ Deep Research Engine initialization failed:', errorMessage);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize services with error handling
    let services;
    try {
      services = await initializeServices();
    } catch (initError) {
      return NextResponse.json(
        { 
          error: 'Deep Research Engine unavailable',
          details: initError instanceof Error ? initError.message : 'Service initialization failed',
          fallback_available: true,
          message: 'Please use regular search mode. Deep Research requires additional services to be running.'
        },
        { status: 503 }
      );
    }

    const { memoryManager: mm, orchestrator: orch } = services;

    // Parse request body
    const body: StartResearchRequest = await request.json();
    
    // Validate required fields
    if (!body.query || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Generate session ID
    const sessionId = randomUUID();
    const userId = body.user_id || 'anonymous';

    // Prepare research options
    const researchOptions = {
      research_type: body.research_type || 'comprehensive',
      max_sources_per_phase: body.max_sources_per_phase || 10,
      include_citations: body.include_citations !== false, // Default to true
    };

    // Check if this should be a streaming response
    const acceptHeader = request.headers.get('accept');
    const isStreamRequest = acceptHeader?.includes('text/event-stream');

    if (isStreamRequest) {
      // Return streaming response
      return handleStreamingRequest(sessionId, userId, body.query, researchOptions, mm, orch);
    } else {
      // Return immediate response with session info
      return handleImmediateRequest(sessionId, userId, body.query, researchOptions, mm, orch);
    }

  } catch (error) {
    console.error('Error starting research session:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start research session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle streaming research session with real-time updates
 */
async function handleStreamingRequest(
  sessionId: string,
  userId: string,
  query: string,
  options: any,
  mm: TemporalMemoryManager,
  orch: ResearchOrchestrator
) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Create event emitter function
      const emitEvent = (event: string, data: any) => {
        const streamEvent: ResearchStreamEvent = {
          type: event as any,
          session_id: sessionId,
          data,
          timestamp: new Date()
        };

        const eventData = `event: ${event}\ndata: ${JSON.stringify(streamEvent)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

      // Start research session asynchronously
      startResearchSession(sessionId, userId, query, options, emitEvent, mm, orch)
        .then(() => {
          // Send completion event
          emitEvent('session_completed', { 
            session_id: sessionId,
            status: 'completed' 
          });
          controller.close();
        })
        .catch((error) => {
          // Send error event
          emitEvent('session_error', { 
            session_id: sessionId,
            error: error.message,
            status: 'failed'
          });
          controller.close();
        });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Handle immediate response (non-streaming)
 */
async function handleImmediateRequest(
  sessionId: string,
  userId: string,
  query: string,
  options: any,
  mm: TemporalMemoryManager,
  orch: ResearchOrchestrator
): Promise<NextResponse> {
  // Store initial session in temporal memory
  const initialSession = {
    session_id: sessionId,
    user_id: userId,
    query,
    status: 'pending' as const,
    research_type: options.research_type,
    start_time: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    options
  };

  await mm.storeActiveSession(sessionId, initialSession);

  // Start research in background (fire and forget)
  startResearchSession(sessionId, userId, query, options, undefined, mm, orch)
    .catch((error) => {
      console.error(`Background research session ${sessionId} failed:`, error);
    });

  // Return immediate response
  const response: StartResearchResponse = {
    session_id: sessionId,
    status: 'pending',
    estimated_completion_time: estimateCompletionTime(options),
    research_type: options.research_type
  };

  return NextResponse.json(response);
}

/**
 * Start the actual research session
 */
async function startResearchSession(
  sessionId: string,
  userId: string,
  query: string,
  options: any,
  emitEvent?: (event: string, data: any) => void,
  mm?: TemporalMemoryManager,
  orch?: ResearchOrchestrator
): Promise<void> {
  try {
    // Emit session started event
    emitEvent?.('session_started', { 
      session_id: sessionId,
      query,
      research_type: options.research_type,
      estimated_completion_time: estimateCompletionTime(options)
    });

    // Use provided services or get from global (fallback)
    const memoryMgr = mm || memoryManager;
    const researchOrch = orch || orchestrator;

    if (!memoryMgr || !researchOrch) {
      throw new Error('Research services not available');
    }

    // Execute research via orchestrator
    await researchOrch.executeResearch(sessionId, userId, query, options, emitEvent);

  } catch (error) {
    console.error(`Research session ${sessionId} failed:`, error);
    
    // Update session status to failed
    const failedSession = {
      session_id: sessionId,
      user_id: userId,
      query,
      status: 'failed' as const,
      research_type: options.research_type,
      start_time: new Date(),
      end_time: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      options
    };

    await (memoryMgr || memoryManager).completeResearchSession(sessionId, failedSession);
    
    throw error;
  }
}

/**
 * Estimate completion time based on research options
 */
function estimateCompletionTime(options: any): number {
  let baseTime = 60; // 1 minute base time

  // Add time based on research type
  switch (options.research_type) {
    case 'comprehensive':
      baseTime += 240; // 4 minutes additional
      break;
    case 'foundation':
      baseTime += 60; // 1 minute additional
      break;
    case 'perspective':
      baseTime += 90; // 1.5 minutes additional
      break;
    case 'trend':
      baseTime += 90; // 1.5 minutes additional
      break;
    case 'synthesis':
      baseTime += 120; // 2 minutes additional
      break;
  }

  // Add time based on sources per phase
  const sourcesPerPhase = options.max_sources_per_phase || 10;
  baseTime += Math.floor(sourcesPerPhase / 2); // 0.5 seconds per source

  return baseTime;
}

export async function GET(request: NextRequest) {
  // Health check endpoint with availability checking
  try {
    const status = await deepResearchChecker.checkAvailability(true);
    const statusMessage = deepResearchChecker.getStatusMessage(status);
    
    let stats = {};
    if (status.available || status.fallbackMode) {
      try {
        const services = await initializeServices();
        stats = await services.memoryManager.getMemoryStats();
      } catch (e) {
        // Memory stats not available, but that's okay for health check
      }
    }
    
    return NextResponse.json({
      status: status.available ? 'healthy' : status.fallbackMode ? 'degraded' : 'unhealthy',
      service: 'Deep Research Engine',
      message: statusMessage,
      services: status.services,
      memory_stats: stats,
      errors: status.errors,
      setup_instructions: status.available ? [] : deepResearchChecker.getSetupInstructions(status),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'Deep Research Engine',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Service initialization failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}