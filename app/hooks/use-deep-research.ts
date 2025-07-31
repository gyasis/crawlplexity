'use client'

import { useState, useCallback, useRef } from 'react'
import { Message } from '../types'
import { 
  ResearchStreamEvent, 
  ResearchSession, 
  ResearchAnalysis,
  ResearchResult,
  Citation
} from '@/lib/deep-research/types'

interface UseDeepResearchReturn {
  // State
  isResearching: boolean
  researchProgress: ResearchProgress | null
  currentSessionId: string | null
  researchSessions: ResearchSessionSummary[]
  error: string | null
  
  // Actions
  startResearch: (query: string, options?: ResearchOptions) => Promise<string | null>
  getResearchStatus: (sessionId: string) => Promise<void>
  getResearchResults: (sessionId: string) => Promise<ResearchResultsResponse | null>
  listResearchSessions: () => Promise<void>
  cancelResearch: (sessionId: string) => Promise<void>
  
  // Stream handling
  streamEvents: ResearchStreamEvent[]
}

interface ResearchOptions {
  type?: 'comprehensive' | 'foundation' | 'perspective' | 'trend' | 'synthesis'
  maxSourcesPerPhase?: number
  streaming?: boolean
}

interface ResearchProgress {
  sessionId: string
  status: string
  currentPhase: string
  phaseProgress: number
  totalProgress: number
  currentActivity: string
  estimatedTimeRemaining: number
  phasesCompleted: string[]
}

interface ResearchSessionSummary {
  sessionId: string
  query: string
  status: string
  createdAt: string
  totalSources: number
  tier: string
}

interface ResearchResultsResponse {
  sessionId: string
  query: string
  analysis: ResearchAnalysis
  sources: ResearchResult[]
  citations: Citation[]
  metadata: any
}

export function useDeepResearch(): UseDeepResearchReturn {
  const [isResearching, setIsResearching] = useState(false)
  const [researchProgress, setResearchProgress] = useState<ResearchProgress | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [researchSessions, setResearchSessions] = useState<ResearchSessionSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [streamEvents, setStreamEvents] = useState<ResearchStreamEvent[]>([])
  
  const eventSourceRef = useRef<EventSource | null>(null)

  // Start a new research session
  const startResearch = useCallback(async (query: string, options: ResearchOptions = {}) => {
    setError(null)
    setIsResearching(true)
    setStreamEvents([])
    
    try {
      // First check if Deep Research is available
      const healthResponse = await fetch('/api/deep-research/start')
      const healthData = await healthResponse.json()
      
      if (healthData.status === 'unhealthy') {
        throw new Error(`Deep Research unavailable: ${healthData.message}`)
      }
      const requestBody = {
        query,
        research_type: options.type || 'comprehensive',
        max_sources_per_phase: options.maxSourcesPerPhase || 10,
        include_citations: true
      }

      if (options.streaming !== false) {
        // Streaming approach (default)
        const response = await fetch('/api/deep-research/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to start research')
        }

        // Set up EventSource for streaming
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let sessionId: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              // Event type line
            } else if (line.startsWith('data: ')) {
              try {
                const event: ResearchStreamEvent = JSON.parse(line.substring(6))
                setStreamEvents(prev => [...prev, event])

                // Handle specific events
                switch (event.type) {
                  case 'session_started':
                    sessionId = event.session_id
                    setCurrentSessionId(sessionId)
                    setResearchProgress({
                      sessionId,
                      status: 'in_progress',
                      currentPhase: 'foundation',
                      phaseProgress: 0,
                      totalProgress: 0,
                      currentActivity: 'Starting research...',
                      estimatedTimeRemaining: event.data.estimated_completion_time || 300,
                      phasesCompleted: []
                    })
                    break

                  case 'phase_started':
                    setResearchProgress(prev => prev ? {
                      ...prev,
                      currentPhase: event.data.phase,
                      currentActivity: event.data.description
                    } : null)
                    break

                  case 'phase_completed':
                    setResearchProgress(prev => prev ? {
                      ...prev,
                      phasesCompleted: [...prev.phasesCompleted, event.data.phase],
                      totalProgress: Math.min(prev.totalProgress + 25, 100)
                    } : null)
                    break

                  case 'progress_update':
                    setResearchProgress(prev => prev ? {
                      ...prev,
                      ...event.data
                    } : null)
                    break

                  case 'session_completed':
                    setIsResearching(false)
                    setResearchProgress(prev => prev ? {
                      ...prev,
                      status: 'completed',
                      totalProgress: 100
                    } : null)
                    break

                  case 'session_error':
                    setIsResearching(false)
                    setError(event.data.error || 'Research failed')
                    break
                }
              } catch (e) {
                console.error('Failed to parse event:', e)
              }
            }
          }
        }

        return sessionId

      } else {
        // Non-streaming approach
        const response = await fetch('/api/deep-research/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to start research')
        }

        const data = await response.json()
        setCurrentSessionId(data.session_id)
        setIsResearching(true)
        
        // Start polling for progress
        pollProgress(data.session_id)
        
        return data.session_id
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research')
      setIsResearching(false)
      return null
    }
  }, [])

  // Poll for progress (non-streaming mode)
  const pollProgress = useCallback(async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/deep-research/${sessionId}`)
        if (!response.ok) {
          clearInterval(pollInterval)
          return
        }

        const data = await response.json()
        setResearchProgress({
          sessionId,
          status: data.status,
          ...data.progress
        })

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval)
          setIsResearching(false)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    // Clean up on unmount
    return () => clearInterval(pollInterval)
  }, [])

  // Get research status
  const getResearchStatus = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/deep-research/${sessionId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get status')
      }

      const data = await response.json()
      setResearchProgress({
        sessionId,
        status: data.status,
        ...data.progress
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get status')
    }
  }, [])

  // Get research results
  const getResearchResults = useCallback(async (sessionId: string): Promise<ResearchResultsResponse | null> => {
    try {
      const response = await fetch(`/api/deep-research/${sessionId}/results`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get results')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get results')
      return null
    }
  }, [])

  // List research sessions
  const listResearchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/deep-research/sessions?limit=20&include_summary=true')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to list sessions')
      }

      const data = await response.json()
      setResearchSessions(data.sessions.map((session: any) => ({
        sessionId: session.session_id,
        query: session.query,
        status: session.status,
        createdAt: session.created_at,
        totalSources: session.results_summary.total_sources,
        tier: session.tier
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list sessions')
    }
  }, [])

  // Cancel research
  const cancelResearch = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/deep-research/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel research')
      }

      setIsResearching(false)
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setResearchProgress(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel research')
    }
  }, [currentSessionId])

  return {
    isResearching,
    researchProgress,
    currentSessionId,
    researchSessions,
    error,
    streamEvents,
    startResearch,
    getResearchStatus,
    getResearchResults,
    listResearchSessions,
    cancelResearch
  }
}