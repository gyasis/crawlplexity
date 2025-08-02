/**
 * Debug logger for capturing LiteLLM calls and responses
 * This handles the server-side debug logging that gets sent to clients
 */

export interface DebugLogEntry {
  id: string
  timestamp: string
  type: 'llm_request' | 'llm_response' | 'followup_request' | 'followup_response' | 'error'
  data: any
}

export class DebugLogger {
  private logs: DebugLogEntry[] = []
  private maxLogs = 100

  /**
   * Add a debug log entry
   */
  log(type: DebugLogEntry['type'], data: any): DebugLogEntry {
    const entry: DebugLogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      type,
      data
    }

    // Add to logs array, keeping only the most recent entries
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    return entry
  }

  /**
   * Log an LLM request
   */
  logLLMRequest(model: string, provider: string, parameters: any, messages: any[], promptPreview: string, contextLength?: number) {
    return this.log('llm_request', {
      model,
      provider,
      parameters,
      messages,
      prompt_preview: promptPreview,
      context_length: contextLength,
      message_count: messages.length
    })
  }

  /**
   * Log an LLM response with verification data
   */
  logLLMResponse(model: string, provider: string, source: 'cache' | 'stream', contentLength: number, finishReason: string, metadata?: any) {
    // Extract verification data if available
    const verification = metadata?.verification
    
    return this.log('llm_response', {
      requested_model: model, // What was originally requested
      selected_model: metadata?.selected_model || model, // What was actually selected
      selected_provider: metadata?.selected_provider || provider,
      provider,
      source,
      content_length: contentLength,
      finish_reason: finishReason,
      verification: verification ? {
        intended_litellm_id: verification.intended_litellm_id,
        actual_response_model: verification.actual_response_model,
        model_match_confirmed: verification.model_match_confirmed,
        confidence_score: verification.confidence_score,
        verification_method: verification.verification_method,
        flags: verification.flags || []
      } : null,
      metadata
    })
  }

  /**
   * Log a follow-up request
   */
  logFollowupRequest(model: string, provider: string, parameters: any, messages: any[], promptPreview: string) {
    return this.log('followup_request', {
      model,
      provider,
      parameters,
      messages,
      prompt_preview: promptPreview,
      message_count: messages.length
    })
  }

  /**
   * Log a follow-up response
   */
  logFollowupResponse(model: string, provider: string, contentLength: number, finishReason: string, questionsGenerated: number) {
    return this.log('followup_response', {
      model,
      provider,
      content_length: contentLength,
      finish_reason: finishReason,
      questions_generated: questionsGenerated
    })
  }

  /**
   * Log an error
   */
  logError(error: string, context?: any) {
    return this.log('error', {
      error,
      context
    })
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 50): DebugLogEntry[] {
    return this.logs.slice(-limit)
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = []
  }

  /**
   * Get logs count
   */
  getLogsCount(): number {
    return this.logs.length
  }
}

// Singleton instance for request-scoped logging
const debugLoggers = new Map<string, DebugLogger>()

export function getDebugLogger(requestId: string): DebugLogger {
  if (!debugLoggers.has(requestId)) {
    debugLoggers.set(requestId, new DebugLogger())
  }
  return debugLoggers.get(requestId)!
}

export function clearDebugLogger(requestId: string) {
  debugLoggers.delete(requestId)
}