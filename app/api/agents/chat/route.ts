import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/agent-service';

// POST /api/agents/chat - Process chat message with agent orchestration (streaming)
export async function POST(request: NextRequest) {
  try {
    const { messages, query, agentId, groupId, sessionId, userId, parameters, debugMode } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query is required' 
        },
        { status: 400 }
      );
    }

    const agentService = getAgentService();
    await agentService.initialize();

    // Set up Server-Sent Events stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Initializing agent orchestration...'
          })}\n\n`))

          // Check routing: specific agent, group, or orchestration
          if (agentId) {
            // Direct agent communication
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              message: `Routing to agent: ${agentId}`
            })}\n\n`))

            const response = await agentService.chatWithAgent(agentId, query, sessionId, userId)
            
            // Stream the response
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: response
            })}\n\n`))
          } else if (groupId) {
            // Agent group collaboration
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              message: `Starting agent group collaboration: ${groupId}`
            })}\n\n`))

            const response = await agentService.chatWithAgentGroup(groupId, query, sessionId, userId)
            
            // Stream the response
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: response
            })}\n\n`))
          } else {
            // Agent orchestration - let SmallTalk decide which agent(s) to use
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'status',
              message: 'Analyzing task for optimal agent selection...'
            })}\n\n`))

            // Use SmallTalk's orchestration capabilities
            const response = await agentService.chat(query, sessionId, userId)
            
            // Stream the orchestrated response
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: response
            })}\n\n`))
          }

          // Get agent status for follow-up
          const agentList = await agentService.getAgentList()
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agents_status',
            agents: agentList
          })}\n\n`))

          // Send completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete'
          })}\n\n`))

        } catch (error) {
          console.error('Agent chat error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('[API] Agent chat route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/chat/stats - Get orchestration statistics
export async function GET() {
  try {
    const agentService = getAgentService();
    const stats = await agentService.getOrchestrationStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[API] Failed to get chat stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve chat statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}