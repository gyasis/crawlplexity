import { NextRequest, NextResponse } from 'next/server';
import { getAgentService } from '@/lib/agent-service';

// GET /api/agents - List all agents
export async function GET() {
  try {
    const agentService = getAgentService();
    const agents = await agentService.getAgentList();
    
    return NextResponse.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('[API] Failed to get agents:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create new agent
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    
    // Transform frontend data structure to AgentManifest format
    let manifest;
    
    if (requestData.config?.name) {
      // Already in correct format
      manifest = requestData;
    } else if (requestData.name) {
      // Transform from frontend format to AgentManifest format
      manifest = {
        config: {
          name: requestData.name,
          model: requestData.config?.model,
          personality: requestData.config?.personality,
          temperature: requestData.config?.temperature,
          maxTokens: requestData.config?.maxTokens,
          tools: requestData.config?.tools
        },
        capabilities: requestData.capabilities || {},
        metadata: {
          ...requestData.metadata,
          description: requestData.description || requestData.metadata?.description,
          author: requestData.metadata?.author
        }
      };
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: agent name is required' 
        },
        { status: 400 }
      );
    }
    
    // Validate manifest structure
    if (!manifest.config?.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid manifest: config.name is required' 
        },
        { status: 400 }
      );
    }

    const agentService = getAgentService();
    const agentId = await agentService.createAgent(manifest);
    
    return NextResponse.json({
      success: true,
      data: { agent_id: agentId },
      message: `Agent '${manifest.config.name}' created successfully`
    });
  } catch (error) {
    console.error('[API] Failed to create agent:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}