import { useState, useCallback, useRef } from 'react'
import { Message, SearchResult, StreamEvent, ChatState } from '../types'
import { useSidebar } from '@/contexts/SidebarContext'

export function useCrawlplexityChat() {
  const { availableModels, selectedModel, parameters, debugMode, addDebugLog } = useSidebar()
  
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    sources: [],
    followUpQuestions: [],
    ticker: undefined,
    error: undefined,
    warnings: []
  })
  
  const [deepResearchStatus, setDeepResearchStatus] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const generateId = () => Math.random().toString(36).substring(7)

  const append = useCallback(async (message: Omit<Message, 'id'>, options?: { deepResearch?: boolean, researchType?: string }) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      createdAt: new Date()
    }

    // Add user message immediately
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isLoading: true,
      error: undefined,
      sources: [],
      followUpQuestions: [],
      ticker: undefined,
      warnings: []
    }))

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      // Get selected model info
      const selectedModelInfo = availableModels.find(m => m.id === selectedModel)
      
      // 🚨 MODEL SELECTION BUG FIX: Remove frontend defaulting, ensure model is always passed explicitly
      console.log('🔍 MODEL SELECTION DEBUG:')
      console.log('  • selectedModel from context:', selectedModel)
      console.log('  • selectedModelInfo found:', selectedModelInfo)
      console.log('  • availableModels count:', availableModels.length)
      console.log('  • availableModels:', availableModels.map(m => ({ id: m.id, name: m.name, provider: m.provider })))
      
      if (!selectedModelInfo) {
        console.error('❌ No model selected! This should not happen.')
        setState(prev => ({
          ...prev,
          error: 'No model selected. Please select a model from the sidebar.',
          isLoading: false
        }))
        return
      }
      
      // Check if enhanced parameters are available on the window object
      const enhancedParams = (window as any).fireplexityActiveParameters
      const parametersToSend = enhancedParams || parameters
      
      console.log('🎛️ Parameter System Debug:')
      console.log('  • Enhanced params available:', !!enhancedParams)
      console.log('  • Enhanced params:', enhancedParams)
      console.log('  • Legacy params:', parameters)
      console.log('  • Final params to send:', parametersToSend)
      
      console.log('🎛️ Parameters being sent to API:')
      console.log('  • Parameters payload:', parametersToSend)
      
      // Prepare request body - NEVER default to gpt-4o-mini, always use selected model
      const requestBody = {
        messages: [...state.messages, newMessage],
        query: message.content,
        research_type: options?.researchType || 'comprehensive',
        model: selectedModelInfo.id, // 🔧 FIXED: No more defaulting!
        modelInfo: selectedModelInfo, // Include full model info for API
        parameters: parametersToSend, // Pass enhanced or legacy parameters
        debugMode: debugMode // Pass debug mode state
      }
      
      // DEBUG: Log debug mode from context and request body
      console.log('🐛 debugMode from useSidebar():', debugMode, typeof debugMode)
      console.log('🚀 FRONTEND REQUEST BODY:', JSON.stringify(requestBody, null, 2))

      // Choose endpoint based on Deep Research mode
      const endpoint = options?.deepResearch ? '/api/deep-research/search' : '/api/crawlplexity/search'
      
      // Make POST request to start streaming
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Create EventSource-like reader for the stream
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No readable stream available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let assistantMessage = ''
      let assistantMessageId = generateId()

      // Add empty assistant message that we'll update
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: assistantMessageId,
          role: 'assistant' as const,
          content: '',
          createdAt: new Date()
        }]
      }))

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed === '' || !trimmed.startsWith('data: ')) continue

            try {
              const jsonStr = trimmed.slice(6) // Remove 'data: ' prefix
              if (jsonStr === '[DONE]') continue
              
              const event: StreamEvent = JSON.parse(jsonStr)
              
              // DEBUG: Log ALL events to see what's being received
              console.log('🌟 ALL SSE EVENTS:', event.type, event)
              
              // Handle different event types
              switch (event.type) {
                case 'status':
                  console.log('Status:', event.message)
                  // For Deep Research, show status messages as they are more detailed
                  if (options?.deepResearch && event.message) {
                    setDeepResearchStatus(event.message)
                    console.log('🔬 Deep Research:', event.message)
                  }
                  break
                  
                case 'sources':
                  setState(prev => ({
                    ...prev,
                    sources: event.sources || []
                  }))
                  break
                  
                case 'text':
                case 'content': // Deep Research uses 'content' event type
                  if (event.content) {
                    assistantMessage += event.content
                    setState(prev => ({
                      ...prev,
                      messages: prev.messages.map(msg => 
                        msg.id === assistantMessageId 
                          ? { ...msg, content: assistantMessage }
                          : msg
                      )
                    }))
                  }
                  break
                  
                case 'ticker':
                  setState(prev => ({
                    ...prev,
                    ticker: event.symbol
                  }))
                  break
                  
                case 'follow_up_questions':
                  setState(prev => ({
                    ...prev,
                    followUpQuestions: event.questions || []
                  }))
                  break
                  
                case 'warning':
                  setState(prev => ({
                    ...prev,
                    warnings: [...(prev.warnings || []), {
                      type: event.type || 'general',
                      message: event.message || 'Warning occurred',
                      details: event.details
                    }]
                  }))
                  break
                  
                case 'error':
                  setState(prev => ({
                    ...prev,
                    error: event.error,
                    isLoading: false
                  }))
                  break
                  
                case 'complete':
                case 'completed': // Deep Research uses 'completed' event type
                  setState(prev => ({
                    ...prev,
                    isLoading: false
                  }))
                  setDeepResearchStatus(null) // Clear status when done
                  break
                
                case 'debug_event':
                  // Add individual debug event to sidebar context
                  console.log('🔥 DEBUG EVENT HANDLER REACHED!', event)
                  console.log('🐛 Frontend received debug event:', event.data?.type || event.type || 'unknown', event.data?.model || event.model || 'no-model')
                  // The debug event properties are directly on the event object, not nested in event.data
                  const debugLogEntry = {
                    type: event.data?.type || event.debugType || 'debug',
                    message: event.data?.message || event.message || `${event.data?.type || event.debugType || 'debug'}: ${event.data?.model || event.model || 'unknown'}`,
                    data: event.data || event, // Use event.data if it exists, otherwise use the whole event
                    timestamp: event.timestamp || new Date().toISOString(),
                    id: event.id || Math.random().toString(36).substr(2, 9)
                  }
                  addDebugLog(debugLogEntry)
                  console.log('🐛 Added debug log entry:', debugLogEntry)
                  break
                  
                default:
                  console.log('Unknown event type:', event.type)
              }
            } catch (parseError) {
              console.warn('Failed to parse stream event:', parseError)
              continue
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      console.error('Chat error:', error)
      
      // Handle abort signal
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted')
        return
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))
    }
  }, [state.messages, debugMode, availableModels, selectedModel, parameters])

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setState(prev => ({
      ...prev,
      isLoading: false
    }))
  }, [])

  const reload = useCallback(() => {
    if (state.messages.length === 0) return
    
    const lastUserMessage = [...state.messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      // Remove the last assistant message if it exists
      const messagesWithoutLastAssistant = state.messages.filter((msg, index, arr) => {
        if (msg.role === 'assistant') {
          // Check if this is the last assistant message
          const laterAssistantExists = arr.slice(index + 1).some(laterMsg => laterMsg.role === 'assistant')
          return laterAssistantExists
        }
        return true
      })
      
      setState(prev => ({
        ...prev,
        messages: messagesWithoutLastAssistant,
        error: undefined
      }))
      
      // Resend the last user message
      append({
        role: 'user',
        content: lastUserMessage.content
      })
    }
  }, [state.messages, append])

  const setMessages = useCallback((messages: Message[]) => {
    setState(prev => ({
      ...prev,
      messages
    }))
  }, [])

  return {
    messages: state.messages,
    append,
    reload,
    stop,
    isLoading: state.isLoading,
    error: state.error,
    setMessages,
    // Additional Crawlplexity-specific state
    sources: state.sources,
    followUpQuestions: state.followUpQuestions,
    ticker: state.ticker,
    warnings: state.warnings,
    // Deep Research status
    deepResearchStatus,
  }
}