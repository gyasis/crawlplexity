import { NextResponse, NextRequest } from 'next/server'
import { detectCompanyTicker } from '@/lib/company-ticker-map'
import { selectRelevantContent } from '@/lib/content-selection'
import { getSearchOrchestrator } from '@/lib/search-orchestrator'
import { getLiteLLMClient, createMessages } from '@/lib/litellm-client'
import { getCacheManager } from '@/lib/cache-manager'

// Helper function to validate and filter active parameters
function getValidatedParameters(userParameters: any, modelInfo: any) {
  const defaults = {
    temperature: 0.7,
    max_tokens: 200000, // Updated to match new default
    stream: true // Enable streaming by default
  }
  
  if (!userParameters) return defaults
  
  // Check if using new enhanced parameter format with active/inactive states
  if (userParameters.activeParameters && typeof userParameters.activeParameters === 'object') {
    // New enhanced parameter system
    const activeParams: any = {}
    
    // Extract only active parameters
    Object.entries(userParameters.activeParameters).forEach(([key, paramData]: [string, any]) => {
      if (paramData && typeof paramData === 'object' && paramData.active && paramData.value !== undefined) {
        activeParams[key] = paramData.value
      }
    })
    
    // Always ensure essential parameters are included
    if (!activeParams.temperature && userParameters.activeParameters.temperature) {
      activeParams.temperature = userParameters.activeParameters.temperature.value || defaults.temperature
    }
    if (!activeParams.max_tokens && userParameters.activeParameters.max_tokens) {
      activeParams.max_tokens = userParameters.activeParameters.max_tokens.value || defaults.max_tokens
    }
    if (!activeParams.stream && userParameters.activeParameters.stream) {
      activeParams.stream = userParameters.activeParameters.stream.value !== undefined ? userParameters.activeParameters.stream.value : defaults.stream
    }
    
    console.log('🎛️ Enhanced parameters - Active:', Object.keys(activeParams).length, 'Total received:', Object.keys(userParameters.activeParameters).length)
    return activeParams
  }
  
  // Legacy parameter system (backward compatibility)
  const modelMaxTokens = modelInfo?.max_tokens || 200000
  const requestedMaxTokens = userParameters.max_tokens || defaults.max_tokens
  const validMaxTokens = Math.min(requestedMaxTokens, modelMaxTokens)
  
  return {
    temperature: Math.max(0, Math.min(2, userParameters.temperature || defaults.temperature)),
    max_tokens: Math.max(1, validMaxTokens),
    stream: userParameters.stream !== undefined ? userParameters.stream : defaults.stream,
    top_p: userParameters.top_p !== undefined ? Math.max(0.0, Math.min(1, userParameters.top_p)) : undefined,
    frequency_penalty: userParameters.frequency_penalty !== undefined ? Math.max(-2, Math.min(2, userParameters.frequency_penalty)) : undefined,
    presence_penalty: userParameters.presence_penalty !== undefined ? Math.max(-2, Math.min(2, userParameters.presence_penalty)) : undefined,
    // Include other parameters if provided
    ...Object.fromEntries(
      Object.entries(userParameters).filter(([key, value]) => 
        !['temperature', 'max_tokens', 'stream', 'top_p', 'frequency_penalty', 'presence_penalty'].includes(key) && 
        value !== undefined && value !== null
      )
    )
  }
}

// Helper function to create debug callback for LiteLLM calls
function createDebugCallback(sendEvent: Function, debugMode: boolean, requestId: string) {
  console.log(`[${requestId}] Creating debug callback, debugMode:`, debugMode)
  if (!debugMode) {
    console.log(`[${requestId}] Debug mode disabled, returning undefined callback`)
    return undefined;
  }
  
  console.log(`[${requestId}] Debug mode enabled, creating callback function`)
  return (event: any) => {
    console.log(`[${requestId}] 🐛 DEBUG CALLBACK CALLED:`, event.type, event.data.type || event.data.model)
    const debugEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: event.timestamp,
      type: event.type,
      data: event.data
    }
    console.log(`[${requestId}] 🐛 Sending debug event:`, debugEvent)
    sendEvent('debug_event', debugEvent)
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] Crawlplexity Search API called`)
  
  try {
    const body = await request.json()
    console.log(`[${requestId}] 🔍 RAW REQUEST BODY:`, JSON.stringify(body, null, 2))
    
    const messages = body.messages || []
    const query = messages[messages.length - 1]?.content || body.query
    const selectedModel = body.model // 🔧 FIXED: No more defaulting to gpt-4o-mini!
    const modelInfo = body.modelInfo
    const userParameters = body.parameters
    const debugMode = body.debugMode || false // Debug mode from client
    
    // 🚨 MODEL SELECTION BUG FIX: Validate that model is provided
    if (!selectedModel) {
      console.error(`[${requestId}] ❌ No model provided in request!`)
      return NextResponse.json({ 
        error: 'Model selection required',
        suggestion: 'Please select a model from the sidebar before making a request'
      }, { status: 400 })
    }
    
    const validatedParams = getValidatedParameters(userParameters, modelInfo)
    
    // 🔍 Enhanced logging for model selection debugging
    console.log(`[${requestId}] 🔥 MODEL SELECTION DEBUG:`)
    console.log(`[${requestId}]   • Query:`, query)
    console.log(`[${requestId}]   • Selected model ID:`, selectedModel)
    console.log(`[${requestId}]   • Model info name:`, modelInfo?.name)
    console.log(`[${requestId}]   • Model info provider:`, modelInfo?.provider)
    console.log(`[${requestId}]   • Model info category:`, modelInfo?.category)
    console.log(`[${requestId}]   • User parameters:`, userParameters)
    console.log(`[${requestId}]   • Validated parameters:`, validatedParams)
    console.log(`[${requestId}]   • Debug mode:`, debugMode, typeof debugMode)

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Crawlplexity is now the default and only search engine

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

    // Check if this is a follow-up conversation
    const isFollowUp = messages.length > 2

    // Create a readable stream for Server-Sent Events
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
        
        // Create debug callback for LiteLLM calls
        const debugCallback = createDebugCallback(sendEvent, debugMode, requestId)
        console.log(`[${requestId}] Debug callback created:`, debugCallback !== undefined)
        
        // Enable cache debugging if debug mode is on
        if (debugMode) {
          console.log(`[${requestId}] 🗄️ Enabling cache debugging`)
          cacheManager.enableCacheDebugging((cacheEvent) => {
            console.log(`[${requestId}] 🗄️ Cache debug event:`, cacheEvent.type, cacheEvent.keyPreview)
            
            // Convert cache event to debug event format
            const debugEvent = {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: cacheEvent.timestamp,
              debugType: 'cache_event',
              data: {
                type: cacheEvent.type,
                cacheType: cacheEvent.cacheType,
                operationType: cacheEvent.operationType,
                model: cacheEvent.model,
                queryPreview: cacheEvent.queryPreview,
                keyPreview: cacheEvent.keyPreview,
                dataSize: cacheEvent.dataSize,
                ttl: cacheEvent.ttl,
                hitCount: cacheEvent.hitCount,
                message: `Cache ${cacheEvent.type}: ${cacheEvent.keyPreview} (${cacheEvent.cacheType})`
              }
            }
            
            console.log(`[${requestId}] 🗄️ Sending cache debug event:`, debugEvent)
            sendEvent('debug_event', debugEvent)
          })
        }
        
        // Send test debug event if debug mode is enabled
        if (debugMode) {
          console.log(`[${requestId}] 🧪 SENDING TEST DEBUG EVENT`)
          sendEvent('debug_event', {
            id: 'test-123',
            timestamp: new Date().toISOString(),
            debugType: 'request', // Changed from 'type' to 'debugType' to avoid collision
            data: {
              type: 'test',
              model: 'test-model',
              message: 'Test debug event to verify client-side handling'
            }
          })
        }

        try {
          // Step 1: Health check for services
          sendEvent('status', { message: 'Checking service health...' })
          
          const [searchHealthCheck, litellmHealthCheck] = await Promise.all([
            searchOrchestrator.healthCheck(),
            litellmClient.healthCheck()
          ])
          
          if (!searchHealthCheck.overall) {
            throw new Error(
              `Search services not available - Crawl4AI: ${searchHealthCheck.crawl4ai ? 'OK' : 'DOWN'}, Serper: ${searchHealthCheck.serper ? 'OK' : 'DOWN'}, Video Processor: ${searchHealthCheck.videoProcessor ? 'OK' : 'DOWN'}`
            )
          }
          
          // Check if video processor has Gemini key configured
          if (searchHealthCheck.videoProcessor && !searchHealthCheck.geminiConfigured) {
            sendEvent('warning', { 
              type: 'gemini_key_missing',
              message: 'Video and image processing requires Gemini API key',
              details: 'YouTube videos and images in search results will have limited processing without GOOGLE_AI_API_KEY'
            })
          }
          
          if (litellmHealthCheck.status !== 'healthy' || litellmHealthCheck.healthy_models.length === 0) {
            throw new Error(
              `LLM services not available - Healthy models: ${litellmHealthCheck.healthy_models.length}/${litellmHealthCheck.total_configured}`
            )
          }

          // Step 2: Perform search with Serper + Crawl4AI
          sendEvent('status', { message: 'Searching with Serper API...' })
          
          const searchResponse = await searchOrchestrator.search(query, {
            maxResults: 6,
            includeAnswerBox: true,
            includeSuggestions: false,
            crawlTimeout: 60000,
            retryFailedCrawls: true,
            filterResults: true,
          })

          console.log(`[${requestId}] Search completed:`, {
            totalResults: searchResponse.totalResults,
            searchTime: searchResponse.searchTime,
            crawlTime: searchResponse.crawlTime,
            successfulCrawls: searchResponse.results.filter(r => r.success).length,
            videoResults: searchResponse.results.filter(r => r.contentType === 'video').length,
            successfulVideoResults: searchResponse.results.filter(r => r.contentType === 'video' && r.success).length
          })
          
          // Debug video results specifically
          const videoResults = searchResponse.results.filter(r => r.contentType === 'video');
          console.log(`[${requestId}] 🎬 Video results details:`);
          videoResults.forEach((result, index) => {
            console.log(`[${requestId}]   Video ${index + 1}: ${result.title}`);
            console.log(`[${requestId}]     • URL: ${result.url}`);
            console.log(`[${requestId}]     • Success: ${result.success}`);
            console.log(`[${requestId}]     • Content length: ${result.content?.length || 0}`);
            console.log(`[${requestId}]     • Has videoContent: ${!!result.videoContent}`);
            console.log(`[${requestId}]     • Video processed content length: ${result.videoContent?.processedContent?.length || 0}`);
            console.log(`[${requestId}]     • Error: ${result.error || 'none'}`);
          });

          // Step 3: Transform results to match expected format
          console.log(`[${requestId}] 🔄 Transforming ${searchResponse.results.length} search results...`);
          
          const sources = searchResponse.results.map((result, index) => {
            console.log(`[${requestId}] Transforming result ${index + 1}:`);
            console.log(`[${requestId}]   • URL: ${result.url}`);
            console.log(`[${requestId}]   • Type: ${result.contentType}`);
            console.log(`[${requestId}]   • Success: ${result.success}`);
            console.log(`[${requestId}]   • Content length: ${result.content?.length || 0}`);
            console.log(`[${requestId}]   • Markdown length: ${result.markdown?.length || 0}`);
            
            return {
              url: result.url,
              title: result.title,
              description: result.description || result.searchSnippet,
              content: result.content || '',
              markdown: result.markdown || '',
              publishedDate: result.publishedDate,
              author: result.author,
              image: result.image,
              favicon: result.favicon,
              siteName: result.siteName,
              success: result.success,
              searchRank: result.searchRank,
            };
          }).filter((source, index) => {
            const keep = (source.success && source.markdown) || source.description;
            console.log(`[${requestId}] Source ${index + 1} keep: ${keep} (success: ${source.success}, hasMarkdown: ${!!source.markdown}, hasDescription: ${!!source.description})`);
            return keep;
          });
          
          console.log(`[${requestId}] ✅ Filtered to ${sources.length} sources`);

          // Send sources immediately
          sendEvent('sources', { sources })
          
          // Step 4: Update status
          sendEvent('status', { message: `Analyzing ${sources.length} sources and generating answer...` })
          
          // Step 5: Detect if query is about a company
          const ticker = detectCompanyTicker(query)
          console.log(`[${requestId}] Query: "${query}" -> Detected ticker: ${ticker}`)
          if (ticker) {
            sendEvent('ticker', { symbol: ticker })
          }
          
          // Step 6: Prepare context from sources with intelligent content selection
          console.log(`[${requestId}] 📝 Preparing context from ${sources.length} sources...`);
          
          const context = sources
            .map((source, index) => {
              const content = source.markdown || source.content || '';
              const relevantContent = selectRelevantContent(content, query, 2000);
              const sourceInfo = `[${index + 1}] ${source.title}\nURL: ${source.url}`;
              
              // Add success indicator for debugging
              const successIndicator = source.success ? '' : ' (search snippet only)';
              
              console.log(`[${requestId}] Source ${index + 1} context:`);
              console.log(`[${requestId}]   • Original content length: ${content.length}`);
              console.log(`[${requestId}]   • Relevant content length: ${relevantContent.length}`);
              console.log(`[${requestId}]   • Success indicator: "${successIndicator}"`);
              
              return `${sourceInfo}${successIndicator}\n${relevantContent}`;
            })
            .join('\n\n---\n\n');
            
          console.log(`[${requestId}] ✅ Final context length: ${context.length}`);

          console.log(`[${requestId}] 💬 Creating text stream for query:`, query);
          console.log(`[${requestId}] 📝 Context length:`, context.length);
          console.log(`[${requestId}] ✅ Successful crawls: ${sources.filter(s => s.success).length}/${sources.length}`);
          console.log(`[${requestId}] 🎬 Video sources in final context: ${sources.filter(s => s.url.includes('youtube.com') || s.url.includes('youtu.be')).length}`);
          
          // Log a preview of the context to see if video content is included
          if (context.length > 0) {
            const contextPreview = context.substring(0, 500) + (context.length > 500 ? '...' : '');
            console.log(`[${requestId}] 👁️ Context preview:`, contextPreview);
          }
          
          // Step 7: Prepare messages for the AI using LiteLLM
          console.log(`[${requestId}] 🤖 PREPARING LLM CALL:`)
          console.log(`[${requestId}]   • Using model: ${selectedModel}`)
          console.log(`[${requestId}]   • Provider: ${modelInfo?.provider || 'unknown'}`)
          console.log(`[${requestId}]   • Temperature: ${validatedParams.temperature}`)
          console.log(`[${requestId}]   • Max tokens: ${validatedParams.max_tokens}`)
          
          let systemPrompt: string
          let userPrompt: string
          let conversationHistory: any[] = []
          
          if (!isFollowUp) {
            // Initial query with sources
            systemPrompt = `You are a helpful AI assistant powered by Crawlplexity (Serper + Crawl4AI).
            
            RESPONSE STYLE:
            - For greetings (hi, hello), respond warmly and ask how you can help
            - For simple questions, give direct, concise answers
            - For complex topics, provide detailed explanations when helpful
            - Match the user's energy level - be brief if they're brief
            
            SOURCE QUALITY:
            - Sources may include both full content (crawled) and search snippets
            - Prioritize information from successfully crawled sources when available
            - Use search snippets as supplementary information when crawling failed
            
            FORMAT:
            - Use markdown for readability when appropriate
            - Keep responses natural and conversational
            - Include citations inline as [1], [2], etc. when referencing specific sources
            - Citations should correspond to the source order (first source = [1], second = [2], etc.)
            - Use the format [1] not CITATION_1 or any other format
            
            CRAWLPLEXITY ADVANTAGES:
            - Self-hosted and cost-effective
            - Real-time web crawling with intelligent content extraction
            - Multi-provider LLM support for reliability`
            
            userPrompt = `Answer this query: "${query}"\n\nBased on these sources:\n${context}`
          } else {
            // Follow-up question - include conversation context
            systemPrompt = `You are a helpful AI assistant continuing our conversation using Crawlplexity.
            
            REMEMBER:
            - Keep the same conversational tone from before
            - Build on previous context naturally
            - Match the user's communication style
            - Use markdown when it helps clarity
            - Include citations inline as [1], [2], etc. when referencing specific sources
            - Citations should correspond to the source order (first source = [1], second = [2], etc.)
            - Use the format [1] not CITATION_1 or any other format
            
            SOURCE CONTEXT:
            - These are fresh sources retrieved for this specific follow-up question
            - Combine information from previous conversation with new source material when relevant`
            
            // Include conversation context
            conversationHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content
            }))
            
            userPrompt = `Answer this follow-up query: "${query}"\n\nBased on these new sources:\n${context}`
          }
          
          const aiMessages = createMessages(systemPrompt, userPrompt, conversationHistory)
          
          // Check for cached LLM response  
          const cacheMetadata = { provider: 'litellm', model: selectedModel }
          const cachedResponse = await cacheManager.getCachedLLMResponse(aiMessages, cacheMetadata)
          
          // Step 8: Generate follow-up questions in parallel using LiteLLM
          const conversationPreview = isFollowUp 
            ? messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n\n')
            : `user: ${query}`
            
          const followUpSystemPrompt = `Generate 5 natural follow-up questions based on the query and available sources.
          
          ONLY generate questions if the query warrants them:
          - Skip for simple greetings or basic acknowledgments
          - Create questions that feel natural, not forced
          - Make them genuinely helpful, not just filler
          - Focus on the topic and sources available
          - Consider both successfully crawled content and search snippets
          
          If the query doesn't need follow-ups, return an empty response.
          ${isFollowUp ? 'Consider the full conversation history and avoid repeating previous questions.' : ''}
          Return only the questions, one per line, no numbering or bullets.`
          
          const followUpUserPrompt = `Query: ${query}\n\nConversation context:\n${conversationPreview}\n\n${sources.length > 0 ? `Available sources about: ${sources.map(s => s.title).join(', ')}\n\nSuccessful crawls: ${sources.filter(s => s.success).length}/${sources.length}\n\n` : ''}Generate 5 diverse follow-up questions that would help the user learn more about this topic from different angles.`
          
          const followUpMessages = createMessages(followUpSystemPrompt, followUpUserPrompt)
          
          // 🔍 Log follow-up question model usage too
          console.log(`[${requestId}] 🔄 FOLLOW-UP QUESTIONS CALL:`)
          console.log(`[${requestId}]   • model: "${selectedModel}"`)
          
          const followUpPromise = litellmClient.completion({
            messages: followUpMessages,
            model: selectedModel,
            temperature: validatedParams.temperature,
            max_tokens: 150, // Follow-up questions should be short
            task_type: 'followup',
            strategy: process.env.LLM_STRATEGY as any || 'balanced',
            debug: debugMode,
            debugCallback: debugCallback
          })
          
          // Step 9: Stream the text generation using LiteLLM
          let llmResponse: any
          
          if (cachedResponse) {
            // Use cached response - send as chunks
            console.log(`[${requestId}] Using cached LLM response`)
            
            // Send debug event for cache hit with verification data if available
            if (debugMode) {
              const verification = cachedResponse?.x_metadata?.verification
              
              const cacheHitDebugEvent = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                debugType: 'cache_hit', // Changed from 'type' to 'debugType'
                data: {
                  type: 'cache_hit',
                  requested_model: selectedModel, // What was originally requested
                  selected_model: cachedResponse?.x_metadata?.selected_model || selectedModel, // What was actually used (from cache)
                  selected_provider: cachedResponse?.x_metadata?.selected_provider || modelInfo?.provider || 'unknown',
                  provider: modelInfo?.provider || 'unknown',
                  cacheHit: true,
                  verification: verification ? {
                    intended_litellm_id: verification.intended_litellm_id,
                    actual_response_model: verification.actual_response_model,
                    model_match_confirmed: verification.model_match_confirmed,
                    confidence_score: verification.confidence_score,
                    verification_method: verification.verification_method,
                    flags: verification.flags || []
                  } : null,
                  metadata: cachedResponse?.x_metadata,
                  message: verification && verification.model_match_confirmed
                    ? `✅ Verified Cache Hit: ${cachedResponse?.x_metadata?.selected_model || selectedModel}`
                    : `🗄️ Cache Hit: ${selectedModel}`,
                  contentLength: cachedResponse.choices[0].message.content.length
                }
              }
              console.log(`[${requestId}] ✅ Sending cache hit debug event with verification:`, cacheHitDebugEvent)
              sendEvent('debug_event', cacheHitDebugEvent)
            }
            
            const content = cachedResponse.choices[0].message.content
            
            // Send cached content word by word to simulate streaming
            const words = content.split(' ')
            for (let i = 0; i < words.length; i++) {
              if (streamClosed) break
              
              const word = words[i] + (i < words.length - 1 ? ' ' : '')
              sendEvent('text', { content: word })
              
              // Small delay to simulate streaming
              if (i % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 50))
              }
            }
            
            llmResponse = cachedResponse
          } else {
            // Generate new response using direct streaming
            console.log(`[${requestId}] Generating new LLM response`)
            
            // Send debug event for LLM request when cache miss occurs
            if (debugMode) {
              const llmRequestDebugEvent = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                debugType: 'llm_request', // Changed from 'type' to 'debugType'
                data: {
                  type: 'llm_request',
                  model: selectedModel,
                  provider: modelInfo?.provider || 'unknown',
                  parameters: {
                    temperature: validatedParams.temperature,
                    max_tokens: validatedParams.max_tokens,
                    top_p: validatedParams.top_p,
                    frequency_penalty: validatedParams.frequency_penalty
                  },
                  cacheHit: false,
                  message: `LLM Request: ${selectedModel} (temp=${validatedParams.temperature})`,
                  prompt_preview: aiMessages[aiMessages.length - 1]?.content?.substring(0, 100) + '...',
                  message_count: aiMessages.length
                }
              }
              console.log(`[${requestId}] 🤖 Sending LLM request debug event:`, llmRequestDebugEvent)
              sendEvent('debug_event', llmRequestDebugEvent)
            }
            
            let fullContent = ''
            const startTime = Date.now()
            
            // 🚨 CRITICAL: Log the EXACT model being sent to LiteLLM
            console.log(`[${requestId}] 🎯 FINAL LLM CALL PARAMETERS:`)
            console.log(`[${requestId}]   • model: "${selectedModel}"`)
            console.log(`[${requestId}]   • temperature: ${validatedParams.temperature}`)
            console.log(`[${requestId}]   • max_tokens: ${validatedParams.max_tokens}`)
            console.log(`[${requestId}]   • task_type: 'search'`)
            console.log(`[${requestId}]   • strategy: '${process.env.LLM_STRATEGY || 'balanced'}'`)
            console.log(`[${requestId}]   • debug: ${debugMode}`)
            
            const streamGenerator = litellmClient.streamCompletion({
              messages: aiMessages,
              model: selectedModel,
              temperature: validatedParams.temperature,
              max_tokens: validatedParams.max_tokens,
              top_p: validatedParams.top_p,
              frequency_penalty: validatedParams.frequency_penalty,
              task_type: 'search',
              strategy: process.env.LLM_STRATEGY as any || 'balanced',
              debug: debugMode,
              debugCallback: debugCallback
            })
            
            try {
              for await (const chunk of streamGenerator) {
                if (streamClosed) break
                
                if (chunk.choices?.[0]?.delta?.content) {
                  const content = chunk.choices[0].delta.content
                  fullContent += content
                  sendEvent('text', { content })
                }
                
                if (chunk.choices?.[0]?.finish_reason) {
                  break
                }
              }
              
              // Create response object for caching
              llmResponse = {
                choices: [{
                  message: {
                    role: 'assistant',
                    content: fullContent,
                  },
                  finish_reason: 'stop',
                }],
                x_metadata: {
                  selected_provider: modelInfo?.provider || 'litellm',
                  selected_model: selectedModel,
                },
              }
              
              // Send debug event for LLM response completion with verification data
              if (debugMode) {
                const responseTime = Date.now() - startTime
                const verification = llmResponse?.x_metadata?.verification
                
                const llmResponseDebugEvent = {
                  id: Math.random().toString(36).substr(2, 9),
                  timestamp: new Date().toISOString(),
                  debugType: 'llm_response', // Changed from 'type' to 'debugType'
                  data: {
                    type: 'llm_response',
                    requested_model: selectedModel, // What was originally requested
                    selected_model: llmResponse?.x_metadata?.selected_model || selectedModel, // What was actually selected
                    selected_provider: llmResponse?.x_metadata?.selected_provider || modelInfo?.provider || 'unknown',
                    provider: modelInfo?.provider || 'unknown',
                    responseTime: responseTime,
                    responseTimeFormatted: `${(responseTime / 1000).toFixed(2)}s`,
                    contentLength: fullContent.length,
                    cacheHit: false,
                    verification: verification ? {
                      intended_litellm_id: verification.intended_litellm_id,
                      actual_response_model: verification.actual_response_model,
                      model_match_confirmed: verification.model_match_confirmed,
                      confidence_score: verification.confidence_score,
                      verification_method: verification.verification_method,
                      flags: verification.flags || []
                    } : null,
                    metadata: llmResponse?.x_metadata,
                    message: verification && verification.model_match_confirmed
                      ? `✅ Verified LLM Response: ${llmResponse?.x_metadata?.selected_model || selectedModel} - ${(responseTime / 1000).toFixed(2)}s`
                      : `⚠️ LLM Response: ${selectedModel} - ${(responseTime / 1000).toFixed(2)}s`
                  }
                }
                console.log(`[${requestId}] 🤖 Sending LLM response debug event with verification:`, llmResponseDebugEvent)
                sendEvent('debug_event', llmResponseDebugEvent)
              }
              
              // Cache the response for future use
              if (llmResponse && llmResponse.choices?.[0]?.message?.content) {
                await cacheManager.cacheLLMResponse(aiMessages, llmResponse, cacheMetadata)
              }
              
            } catch (streamError) {
              console.error(`[${requestId}] Streaming error:`, streamError)
              sendEvent('error', { 
                error: 'LLM streaming failed',
                suggestion: 'Please try again'
              })
            }
          }
          
          // Step 10: Wait for follow-up questions
          const followUpResponse = await followUpPromise
          
          // Process follow-up questions
          const followUpQuestions = followUpResponse.choices?.[0]?.message?.content
            ?.split('\n')
            ?.map((q: string) => q.trim())
            ?.filter((q: string) => q.length > 0)
            ?.slice(0, 5) || []

          // Send follow-up questions after the answer is complete
          sendEvent('follow_up_questions', { questions: followUpQuestions })
          
          // Send performance metrics including LLM info
          sendEvent('metrics', { 
            searchTime: searchResponse.searchTime,
            crawlTime: searchResponse.crawlTime,
            totalResults: searchResponse.totalResults,
            successfulCrawls: sources.filter(s => s.success).length,
            llm_provider: llmResponse?.x_metadata?.selected_provider || followUpResponse.x_metadata?.selected_provider || 'unknown',
            llm_model: llmResponse?.x_metadata?.selected_model || followUpResponse.x_metadata?.selected_model || 'unknown',
            cached_response: !!cachedResponse,
            healthy_llm_models: litellmHealthCheck.healthy_models.length
          })
          
          // Signal completion
          sendEvent('complete', {})
          
        } catch (error) {
          console.error(`[${requestId}] Stream error:`, error)
          
          // Handle specific error types
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          // Provide user-friendly error messages
          let userError = errorMessage
          let suggestion = 'Please try again or check your configuration.'
          
          if (errorMessage.includes('Crawl4AI')) {
            userError = 'Web crawling service is unavailable'
            suggestion = 'Please ensure Docker containers are running: docker-compose up -d'
          } else if (errorMessage.includes('Serper')) {
            userError = 'Search service is unavailable'
            suggestion = 'Please check your Serper API key configuration'
          } else if (errorMessage.includes('timeout')) {
            userError = 'Request timeout'
            suggestion = 'The search took too long. Try a simpler query or check your network connection.'
          }
          
          sendEvent('error', { 
            error: userError,
            suggestion,
            technical_details: errorMessage
          })
        } finally {
          streamClosed = true
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
    
  } catch (error) {
    console.error(`[${requestId}] Search API error:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error(`[${requestId}] Error details:`, { errorMessage, errorStack })
    
    return NextResponse.json(
      { 
        error: 'Search failed', 
        message: errorMessage,
        suggestion: 'Please check your configuration and try again',
        powered_by: 'Crawlplexity'
      },
      { status: 500 }
    )
  }
}