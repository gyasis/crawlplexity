import { NextResponse, NextRequest } from 'next/server'
import { getSearchOrchestrator } from '@/lib/search-orchestrator'
import { getLiteLLMClient, createMessages } from '@/lib/litellm-client'
import { getCacheManager } from '@/lib/cache-manager'
import { TemporalMemoryManager } from '@/lib/deep-research/temporal-storage'
import { ResearchOrchestrator } from '@/lib/deep-research/orchestrator'

/**
 * Deep Research Search API - Streaming endpoint that outputs like regular search
 * This amplifies regular search with multi-phase research methodology
 */
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const body = await request.json()
    const messages = body.messages || []
    const query = messages[messages.length - 1]?.content || body.query
    const research_type = body.research_type || 'comprehensive'

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check required environment variables
    const serperApiKey = process.env.SERPER_API_KEY
    
    if (!serperApiKey) {
      return NextResponse.json({ 
        error: 'Serper API key not configured',
        suggestion: 'Please set SERPER_API_KEY environment variable'
      }, { status: 500 })
    }

    // Initialize services
    const litellmClient = getLiteLLMClient()
    const cacheManager = getCacheManager()
    const searchOrchestrator = getSearchOrchestrator()

    // Create streaming response (same pattern as regular search)
    const encoder = new TextEncoder()
    let streamClosed = false

    const stream = new ReadableStream({
      async start(controller) {
        // Helper function to send SSE data
        const sendEvent = (type: string, data: any) => {
          if (streamClosed) return
          const eventData = `data: ${JSON.stringify({ type, ...data })}\n\n`
          controller.enqueue(encoder.encode(eventData))
        }

        try {
          // Step 1: Initial status
          sendEvent('status', { message: 'Starting Deep Research analysis...' })

          // Step 2: Initialize Deep Research services
          let memoryManager: TemporalMemoryManager | null = null
          let orchestrator: ResearchOrchestrator | null = null

          try {
            memoryManager = new TemporalMemoryManager({
              sqlite_path: './data/research_memory.db',
              tier_durations: { hot_days: 3, warm_days: 7, cold_days: 30, trash_days: 7 }
            })
            await memoryManager.initialize()
            
            orchestrator = new ResearchOrchestrator(memoryManager)
            sendEvent('status', { message: 'Deep Research Engine initialized...' })
          } catch (error) {
            sendEvent('status', { message: 'Using enhanced search mode...' })
          }

          // Step 3: Execute Deep Research or Enhanced Search
          let allSources: any[] = []
          let allContent = ''

          if (orchestrator && memoryManager) {
            // Execute Deep Research with multiple phases
            const sessionId = `dr_${requestId}_${Date.now()}`
            const phases = getResearchPhases(research_type)
            
            for (let i = 0; i < phases.length; i++) {
              const phase = phases[i]
              sendEvent('status', { 
                message: `Phase ${i + 1}/${phases.length}: ${getPhaseDescription(phase)}...` 
              })

              try {
                // Generate enhanced queries for this phase
                const phaseQueries = await generatePhaseQueries(query, phase, (eventName, eventData) => {
                  sendEvent('detailed_progress_update', {
                    current_phase: phase,
                    current_activity: eventName,
                    details: eventData
                  });
                });
                
                // Execute searches for each query
                for (const phaseQuery of phaseQueries) {
                  const searchResponse = await searchOrchestrator.search(phaseQuery, {
                    maxResults: 6,
                    filterResults: true
                  })

                  if (searchResponse?.results) {
                    allSources.push(...searchResponse.results)
                  }
                }
              } catch (phaseError) {
                sendEvent('status', { message: `Phase ${phase} completed with partial results...` })
              }
            }
          } else {
            // Fallback: Enhanced single search
            sendEvent('status', { message: 'Executing enhanced search...' })
            const searchResponse = await searchOrchestrator.search(query, {
              maxResults: 12, // More sources for deep research
              filterResults: true
            })

            if (searchResponse?.results) {
              allSources = searchResponse.results
            }
          }

          // Step 4: Remove duplicates and limit sources
          const uniqueSources = removeDuplicateSources(allSources).slice(0, 15)
          
          // Send sources immediately (same as regular search)
          sendEvent('sources', { sources: uniqueSources })
          
          // Step 5: Generate comprehensive analysis
          sendEvent('status', { message: `Analyzing ${uniqueSources.length} sources and generating comprehensive answer...` })

          // Collect content from sources for analysis
          allContent = uniqueSources
            .filter(source => source.content || source.markdown)
            .map(source => `Source: ${source.title}\nURL: ${source.url}\nContent: ${source.content || source.markdown}`)
            .join('\n\n---\n\n')

          // Step 6: Generate streaming LLM response (same pattern as regular search)
          // Create properly numbered source list for citations
          const numberedSources = uniqueSources
            .filter(source => source.content || source.markdown)
            .slice(0, 15) // Limit for prompt size
            .map((source, index) => 
              `[${index + 1}] ${source.title}\nURL: ${source.url}\nContent: ${(source.content || source.markdown || '').substring(0, 800)}...`
            )
            .join('\n\n')

          const isFollowUp = messages.length > 1;
          const conversationHistory = isFollowUp ? messages.slice(0, -1) : [];

          const systemMessage = `You are a comprehensive research assistant. Analyze the provided sources and generate a detailed, well-structured response that synthesizes information from multiple perspectives.

Focus on:
- Providing a comprehensive overview
- Highlighting different viewpoints and perspectives  
- Including relevant details and examples
- Using proper citations [1], [2], etc. referring to the numbered sources below
- Structuring the response clearly
- Do NOT use "Ibid." or similar - use proper numbered citations${isFollowUp ? '\n- This is a follow-up question. Use the conversation history for context.' : ''}

Query: ${query}
Research Type: ${research_type}

SOURCES:
${numberedSources}`;

          const responseMessages = createMessages(systemMessage, query, conversationHistory);
          
          // Stream the LLM response using streamCompletion method
          const streamGenerator = litellmClient.streamCompletion({
            messages: responseMessages,
            model: research_type === 'comprehensive' ? 'o3' : 'gpt-4.1-mini', // Use 2025 models
            temperature: 0.3,
            max_tokens: 4000,
            task_type: 'search', // Always use 'search' for Deep Research
            strategy: research_type === 'comprehensive' ? 'performance' : 'cost'
          })

          // Stream response chunks (same as regular search)
          for await (const chunk of streamGenerator) {
            if (streamClosed) break
            
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              sendEvent('content', { content })
            }
          }

          // Step 7: Generate follow-up questions (same as regular search)
          sendEvent('status', { message: 'Generating related questions...' })
          
          try {
            const followUpSystemPrompt = `You are an expert in generating insightful follow-up questions based on research. Your goal is to help the user explore the topic more deeply. Generate 3 concise, specific, and thought-provoking questions based on the provided research content. Do not repeat the original query.

- Ensure questions are distinct from each other.
- Frame them as natural-language questions a curious person would ask.
- If the content is insufficient, generate general questions about the topic.`

            const followUpUserPrompt = `Original Query: "${query}"

Research Content Summary:
${allContent.substring(0, 3000)}...

Based on the research, generate 3 follow-up questions.`

            const followUpResponse = await litellmClient.completion({
              messages: createMessages(followUpSystemPrompt, followUpUserPrompt),
              model: 'gpt-4.1-mini',
              temperature: 0.8,
              max_tokens: 250,
              strategy: 'cost'
            })

            const followUpContent = followUpResponse.choices[0]?.message?.content || ''
            const followUpQuestions = followUpContent
              .split('\n')
              .filter(line => line.trim().length > 10)
              .map(line => line.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
              .filter(q => q.length > 0)
              .slice(0, 3)

            if (followUpQuestions.length > 0) {
              sendEvent('suggestions', { suggestions: followUpQuestions })
            }
          } catch (followUpError) {
            // Follow-up generation failed silently
          }

          // Step 8: Send completion event
          sendEvent('completed', { 
            message: 'Deep Research analysis completed',
            sources_analyzed: uniqueSources.length,
            research_type
          })

        } catch (error) {
          if (!streamClosed) {
            sendEvent('error', { 
              error: 'Deep Research failed', 
              message: error instanceof Error ? error.message : 'Unknown error' 
            })
          }
        } finally {
          if (!streamClosed) {
            controller.close()
            streamClosed = true
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions
function getResearchPhases(research_type: string): string[] {
  switch (research_type) {
    case 'comprehensive':
      return ['foundation', 'perspective', 'trend', 'synthesis']
    case 'foundation':
      return ['foundation']
    case 'perspective':
      return ['foundation', 'perspective']
    case 'trend':
      return ['foundation', 'trend']
    case 'synthesis':
      return ['foundation', 'perspective', 'trend', 'synthesis']
    default:
      return ['foundation', 'perspective']
  }
}

function getPhaseDescription(phase: string): string {
  const descriptions = {
    foundation: 'gathering foundational knowledge',
    perspective: 'analyzing multiple perspectives',
    trend: 'identifying trends and developments',
    synthesis: 'synthesizing comprehensive insights'
  }
  return descriptions[phase as keyof typeof descriptions] || phase
}

async function generatePhaseQueries(query: string, phase: string, emitEvent?: (eventName: string, eventData: any) => void): Promise<string[]> {
  const phaseModifiers = {
    foundation: ['overview', 'introduction', 'basics', 'fundamentals'],
    perspective: ['pros and cons', 'arguments', 'debate', 'opinions', 'viewpoints'],
    trend: ['trends', 'future', 'latest', 'emerging', 'developments'],
    synthesis: ['analysis', 'expert view', 'comprehensive', 'evaluation']
  }

  emitEvent?.('query_generation_started', { phase });
  const modifiers = phaseModifiers[phase as keyof typeof phaseModifiers] || ['overview']
  const queries = modifiers.map(modifier => `${query} ${modifier}`);
  emitEvent?.('query_generation_completed', { phase, query_count: queries.length });
  return queries;
}

function removeDuplicateSources(sources: any[]): any[] {
  const seen = new Set()
  return sources.filter(source => {
    const key = source.url || source.link
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}