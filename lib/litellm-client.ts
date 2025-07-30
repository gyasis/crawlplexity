/**
 * LiteLLM client for unified LLM access
 * Simple OpenAI-compatible interface to the LiteLLM proxy service
 */

export interface LiteLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LiteLLMRequest {
  messages: LiteLLMMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  task_type?: 'general' | 'search' | 'summary' | 'followup';
  strategy?: 'performance' | 'cost' | 'balanced' | 'local';
}

export interface LiteLLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  x_metadata?: {
    selected_model: string;
    selected_provider: string;
    latency_ms: number;
    cost_per_1k_tokens: number;
  };
}

export interface LiteLLMStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface ModelInfo {
  model: string;
  provider: string;
  available: boolean;
  priority: number;
  cost_per_1k_tokens: number;
  task_types: string[];
  max_tokens: number;
}

export class LiteLLMClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout: number = 60000) {
    this.baseUrl = baseUrl || process.env.LITELLM_API_URL || 'http://localhost:14782';
    this.timeout = timeout;
  }

  /**
   * Check if LiteLLM service is healthy
   */
  async healthCheck(): Promise<{
    status: string;
    healthy_models: string[];
    unhealthy_models: string[];
    total_configured: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('LiteLLM health check failed:', error);
      return {
        status: 'unhealthy',
        healthy_models: [],
        unhealthy_models: [],
        total_configured: 0,
      };
    }
  }

  /**
   * Get available models
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status}`);
      }

      const data = await response.json();
      return data.available_models || [];
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }

  /**
   * Generate streaming completion
   */
  async *streamCompletion(request: LiteLLMRequest): AsyncGenerator<LiteLLMStreamChunk, void, unknown> {
    const requestBody: LiteLLMRequest = {
      ...request,
      stream: true,
    };

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LiteLLM API error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed === 'data: [DONE]') continue;
            
            if (trimmed.startsWith('data: ')) {
              try {
                const jsonStr = trimmed.slice(6);
                const chunk = JSON.parse(jsonStr);
                
                // Check for errors
                if (chunk.error) {
                  throw new Error(chunk.error.message || 'Stream error');
                }
                
                yield chunk as LiteLLMStreamChunk;
              } catch (parseError) {
                console.warn('Failed to parse stream chunk:', parseError);
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('LiteLLM streaming failed:', error);
      throw new Error(`Streaming completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate non-streaming completion
   */
  async completion(request: LiteLLMRequest): Promise<LiteLLMResponse> {
    const requestBody: LiteLLMRequest = {
      ...request,
      stream: false,
    };

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LiteLLM API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('LiteLLM completion failed:', error);
      throw new Error(`Completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a streaming text response compatible with AI SDK
   */
  async createStreamingResponse(request: LiteLLMRequest) {
    let fullContent = '';
    let finishReason = '';
    let streamingComplete = false;
    
    return {
      mergeIntoDataStream: (dataStream: any) => {
        // Convert stream to data stream format
        (async () => {
          try {
            for await (const chunk of this.streamCompletion(request)) {
              if (chunk.choices?.[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                fullContent += content;
                dataStream.writeData({ type: 'text-delta', textDelta: content });
              }
              
              if (chunk.choices?.[0]?.finish_reason) {
                finishReason = chunk.choices[0].finish_reason;
                break;
              }
            }
            streamingComplete = true;
          } catch (error) {
            streamingComplete = true;
            dataStream.writeData({
              type: 'error',
              error: error instanceof Error ? error.message : 'Stream error',
            });
          }
        })();
      },
      getFullResponse: async () => {
        // Wait for streaming to complete
        while (!streamingComplete) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: fullContent,
            },
            finish_reason: finishReason,
          }],
          x_metadata: {
            selected_provider: 'litellm',
            selected_model: request.model || 'auto',
          },
        };
      },
    };
  }

  /**
   * Select optimal model for a task (convenience method)
   */
  getOptimalModel(taskType: 'general' | 'search' | 'summary' | 'followup' = 'general'): string | undefined {
    // Let LiteLLM service handle model selection
    // Return undefined to use service's auto-selection
    return undefined;
  }
}

// Singleton instance
let litellmClient: LiteLLMClient | null = null;

export function getLiteLLMClient(): LiteLLMClient {
  if (!litellmClient) {
    litellmClient = new LiteLLMClient();
  }
  return litellmClient;
}

// Convenience function for creating messages
export function createMessages(
  systemPrompt: string,
  userPrompt: string,
  conversationHistory: LiteLLMMessage[] = []
): LiteLLMMessage[] {
  const messages: LiteLLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userPrompt },
  ];
  
  return messages;
}