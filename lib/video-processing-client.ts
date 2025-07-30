/**
 * Video Processing Service Client
 * Handles video and image processing via dedicated microservice
 */

// Removed debug logger import to fix dependency issues

export interface VideoProcessingResult {
  url: string;
  success: boolean;
  error?: string;
  type: 'video' | 'image';
  processedContent?: string;
  metadata?: {
    title?: string;
    description?: string;
    duration?: string;
    platform?: string;
    author?: string;
    publishedDate?: string;
    siteName?: string;
    thumbnail?: string;
  };
}

export interface URLClassification {
  type: 'video' | 'image' | 'webpage';
  platform?: string;
  extension?: string;
}

export interface VideoProcessingConfig {
  processingMode?: 'comprehensive' | 'quick';
  customPrompt?: string;
  useCache?: boolean;
}

export class VideoProcessingClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    // Use environment variable or default to localhost
    this.baseUrl = process.env.VIDEO_PROCESSOR_URL || 'http://localhost:11236';
    this.timeout = parseInt(process.env.VIDEO_PROCESSOR_TIMEOUT || '300000'); // 5 minutes
    console.log(`[VideoProcessingClient] Initialized with baseUrl: ${this.baseUrl}`);
  }

  /**
   * Classify a URL to determine if it's video, image, or webpage
   */
  async classifyUrl(url: string): Promise<URLClassification> {
    console.log(`[VideoProcessingClient] Classifying URL: ${url} using ${this.baseUrl}/classify`);
    try {
      const response = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(5000), // Quick classification
      });

      if (!response.ok) {
        throw new Error(`Classification failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[VideoProcessingClient] Classification result for ${url}:`, result);
      return result;
    } catch (error) {
      console.warn(`[VideoProcessingClient] URL classification failed for ${url}:`, error);
      // Default to webpage for any classification failures
      return { type: 'webpage' };
    }
  }

  /**
   * Process a video or image URL with comprehensive analysis
   */
  async processVideo(
    url: string,
    searchQuery: string,
    config: VideoProcessingConfig = {}
  ): Promise<VideoProcessingResult> {
    console.log(`🎥 VIDEO DEBUG: Starting video processing for: ${url}`);
    
    try {
      const requestBody = {
        url,
        search_query: searchQuery,
        processing_mode: config.processingMode || 'comprehensive',
        custom_prompt: config.customPrompt,
        use_cache: config.useCache !== false, // Default to true
      };
      
      console.log(`📦 VIDEO DEBUG: Request prepared for ${this.baseUrl}/process`, requestBody);

      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });
      
      console.log(`📋 VIDEO DEBUG: Response received - Status: ${response.status}, OK: ${response.ok}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ VIDEO DEBUG: Error response:`, errorData);
        throw new Error(errorData.detail || `Processing failed: ${response.status}`);
      }

      // Check if it's a streaming response
      const contentType = response.headers.get('content-type');
      console.log(`VIDEO DEBUG: Processing...`);
      
      if (contentType?.includes('text/event-stream')) {
        console.log(`VIDEO DEBUG: Processing...`);
        return await this.handleStreamingResponse(response, url);
      } else {
        console.log(`VIDEO DEBUG: Processing...`);
        const result = await response.json();
        console.log(`VIDEO DEBUG: Processing...`);
        return this.formatResult(result, url);
      }
    } catch (error) {
      console.error(`❌ VIDEO DEBUG: Video processing failed for ${url}:`, error);
      const errorResult = {
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'video' as const,
      };
      console.log(`VIDEO DEBUG: Returning error result`);
      return errorResult;
    }
  }

  /**
   * Handle streaming response from video processing
   */
  private async handleStreamingResponse(
    response: Response,
    url: string
  ): Promise<VideoProcessingResult> {
    console.log(`🌊 VIDEO DEBUG: Starting streaming response handling for ${url}`);
    
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let processedContent = '';
    let metadata: any = {};
    let hasError = false;
    let errorMessage = '';
    let chunksReceived = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log(`🌊 VIDEO DEBUG: Stream complete for ${url}:`, {
            totalChunks: chunksReceived,
            finalContentLength: processedContent.length
          });
          break;
        }

        chunksReceived++;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        console.log(`📦 VIDEO DEBUG: Chunk ${chunksReceived} received:`, {
          linesCount: lines.length,
          chunkPreview: chunk.substring(0, 200) + '...'
        });

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log(`📝 VIDEO DEBUG: SSE data received:`, {
                status: data.status,
                dataKeys: Object.keys(data),
                fullData: data
              });
              
              if (data.status === 'content') {
                const contentToAdd = data.content || '';
                processedContent += contentToAdd + '\n\n';
                console.log(`➕ VIDEO DEBUG: Content added:`, {
                  hasDataContent: !!data.content,
                  contentLength: contentToAdd.length,
                  totalLength: processedContent.length,
                  contentPreview: contentToAdd.substring(0, 200) + '...'
                });
              } else if (data.status === 'metadata') {
                metadata = { ...metadata, ...data.data };
                console.log(`📋 VIDEO DEBUG: Metadata received:`, data.data);
              } else if (data.status === 'error') {
                hasError = true;
                errorMessage = data.message;
                console.error(`❌ VIDEO DEBUG: Error in stream:`, errorMessage);
              } else if (data.status === 'complete') {
                console.log(`✅ VIDEO DEBUG: Stream marked as complete`);
                break;
              }
            } catch (parseError) {
              console.error(`⚠️ VIDEO DEBUG: Failed to parse SSE data:`, {
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                line
              });
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (hasError) {
      console.error(`❌ VIDEO DEBUG: Streaming completed with error for ${url}:`, errorMessage);
      return {
        url,
        success: false,
        error: errorMessage,
        type: 'video',
      };
    }

    const finalResult = {
      url,
      success: true,
      type: 'video' as const,
      processedContent: processedContent.trim(),
      metadata,
    };
    
    console.log(`✅ VIDEO DEBUG: Streaming completed successfully for ${url}:`, {
      contentLength: finalResult.processedContent.length,
      metadataKeys: Object.keys(metadata),
      contentPreview: finalResult.processedContent.substring(0, 200) + '...'
    });
    
    return finalResult;
  }

  /**
   * Format the result from the processing service
   */
  private formatResult(result: any, url: string): VideoProcessingResult {
    console.log(`[VideoProcessing] 🔄 Formatting result for ${url}:`, result);
    
    const formattedResult = {
      url,
      success: !result.error,
      error: result.error,
      type: result.type || 'video',
      processedContent: result.content,
      metadata: result.metadata,
    };
    
    console.log(`[VideoProcessing] ✅ Formatted result:`, {
      url: formattedResult.url,
      success: formattedResult.success,
      contentLength: formattedResult.processedContent?.length || 0,
      hasMetadata: !!formattedResult.metadata
    });
    
    return formattedResult;
  }

  /**
   * Check if the video processing service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      return response.ok;
    } catch (error) {
      console.warn('Video processing service health check failed:', error);
      return false;
    }
  }

  /**
   * Get service information and status
   */
  async getServiceInfo(): Promise<{
    status: string;
    geminiConfigured: boolean;
    supportedFormats?: any;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Service check failed: ${response.status}`);
      }

      const healthData = await response.json();
      
      // Also get supported formats
      const formatsResponse = await fetch(`${this.baseUrl}/supported-formats`, {
        signal: AbortSignal.timeout(5000),
      });
      
      const supportedFormats = formatsResponse.ok 
        ? await formatsResponse.json() 
        : undefined;

      return {
        status: healthData.status,
        geminiConfigured: healthData.gemini_configured,
        supportedFormats,
      };
    } catch (error) {
      return {
        status: 'error',
        geminiConfigured: false,
      };
    }
  }

  /**
   * Clear cache for a specific pattern
   */
  async clearCache(pattern?: string): Promise<{ cleared: number }> {
    try {
      const url = pattern 
        ? `${this.baseUrl}/cache/clear?pattern=${encodeURIComponent(pattern)}`
        : `${this.baseUrl}/cache/clear`;

      const response = await fetch(url, {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Cache clear failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return { cleared: 0 };
    }
  }
}

// Singleton instance
let videoProcessingClient: VideoProcessingClient | null = null;

export function getVideoProcessingClient(): VideoProcessingClient {
  if (!videoProcessingClient) {
    videoProcessingClient = new VideoProcessingClient();
  }
  return videoProcessingClient;
}