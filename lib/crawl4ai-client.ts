/**
 * Crawl4AI client for web scraping using the Docker container
 * Interfaces with the Crawl4AI FastAPI server running in Docker
 */

export interface CrawlConfig {
  chunking_strategy?: 'topic' | 'regex' | 'sentence' | 'sliding_window';
  output_format?: 'markdown' | 'html' | 'text';
  word_count_threshold?: number;
  max_dist?: number;
  linkage_method?: string;
  top_k?: number;
  window_size?: number;
  step?: number;
  browser_config?: {
    headless?: boolean;
    user_agent_mode?: 'random' | 'desktop' | 'mobile';
    viewport_width?: number;
    viewport_height?: number;
    headers?: Record<string, string>;
  };
  crawler_config?: {
    delay_before_return_html?: number;
    timeout?: number;
    remove_overlay_elements?: boolean;
    simulate_user?: boolean;
    magic?: boolean;
    page_timeout?: number;
  };
}

export interface CrawlResult {
  url: string;
  success: boolean;
  cleaned_html?: string;
  markdown?: string;
  extracted_content?: string;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string;
    author?: string;
    language?: string;
    published_date?: string;
    modified_date?: string;
    image?: string;
    favicon?: string;
    site_name?: string;
  };
  links?: {
    internal: string[];
    external: string[];
  };
  media?: {
    images: Array<{
      src: string;
      alt?: string;
      width?: number;
      height?: number;
    }>;
    videos: Array<{
      src: string;
      poster?: string;
      width?: number;
      height?: number;
    }>;
  };
  error?: string;
  execution_time?: number;
}

export interface CrawlResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: CrawlResult[];
  error?: string;
  created_at: string;
  completed_at?: string;
  total_urls?: number;
  successful_urls?: number;
  failed_urls?: number;
}

export interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: {
    total: number;
    completed: number;
    failed: number;
    current_url?: string;
  };
  results?: CrawlResult[];
  error?: string;
  created_at: string;
  completed_at?: string;
}

export class Crawl4AIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:11235', timeout: number = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Check if the Crawl4AI service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Crawl multiple URLs asynchronously
   */
  async crawlUrls(
    urls: string[],
    config: CrawlConfig = {}
  ): Promise<CrawlResponse> {
    const defaultConfig: CrawlConfig = {
      chunking_strategy: 'topic',
      output_format: 'markdown',
      browser_config: {
        headless: true,
        user_agent_mode: 'random',
        viewport_width: 1920,
        viewport_height: 1080,
      },
      crawler_config: {
        delay_before_return_html: 2000,
        timeout: 30000,
        remove_overlay_elements: true,
        simulate_user: true,
        magic: true,
        page_timeout: 30000,
      },
    };

    const mergedConfig = this.mergeConfig(defaultConfig, config);

    try {
      const response = await fetch(`${this.baseUrl}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls,
          config: mergedConfig,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Crawl4AI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Transform the response to match expected format
      // Crawl4AI returns results directly, not a task_id
      const now = new Date().toISOString();
      return {
        task_id: 'direct-response',
        status: 'completed' as const,
        created_at: now,
        completed_at: now,
        total_urls: urls.length,
        successful_urls: data.results?.filter((r: any) => r.success).length || 0,
        failed_urls: data.results?.filter((r: any) => !r.success).length || 0,
        results: data.results?.map((result: any) => ({
          url: result.url,
          success: result.success,
          cleaned_html: result.cleaned_html,
          markdown: result.markdown?.raw_markdown || '',
          extracted_content: result.extracted_content || result.markdown?.raw_markdown || '',
          metadata: result.metadata,
          links: result.links,
          error: result.error_message,
        })) || [],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Crawl4AI request failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred during Crawl4AI request');
    }
  }

  /**
   * Get the status of a crawling task
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Failed to get task status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Get task status failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred while getting task status');
    }
  }

  /**
   * Wait for a task to complete and return results
   */
  async waitForCompletion(
    taskId: string,
    maxWaitTime: number = 120000,
    pollInterval: number = 2000
  ): Promise<CrawlResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTaskStatus(taskId);

      if (status.status === 'completed') {
        return {
          task_id: taskId,
          status: 'completed',
          results: status.results,
          created_at: status.created_at,
          completed_at: status.completed_at,
          total_urls: status.results?.length || 0,
          successful_urls: status.results?.filter(r => r.success).length || 0,
          failed_urls: status.results?.filter(r => !r.success).length || 0,
        };
      }

      if (status.status === 'failed') {
        throw new Error(`Crawling task failed: ${status.error || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task ${taskId} did not complete within ${maxWaitTime}ms`);
  }

  /**
   * Crawl URLs and wait for completion (convenience method)
   */
  async crawlAndWait(
    urls: string[],
    config: CrawlConfig = {},
    maxWaitTime: number = 120000
  ): Promise<CrawlResult[]> {
    const response = await this.crawlUrls(urls, config);
    
    if (response.status === 'completed') {
      return response.results || [];
    }

    const completedResponse = await this.waitForCompletion(
      response.task_id,
      maxWaitTime
    );
    
    return completedResponse.results || [];
  }

  /**
   * Transform Crawl4AI results to match Firecrawl format
   */
  transformToFirecrawlFormat(
    crawlResults: CrawlResult[],
    searchResults: Array<{ title: string; link: string; snippet: string }>
  ) {
    return searchResults.map((searchResult, index) => {
      const crawlResult = crawlResults.find(r => r.url === searchResult.link);
      
      return {
        url: searchResult.link,
        title: crawlResult?.metadata?.title || searchResult.title,
        description: crawlResult?.metadata?.description || searchResult.snippet,
        content: crawlResult?.extracted_content || '',
        markdown: crawlResult?.markdown || '',
        publishedDate: crawlResult?.metadata?.published_date,
        author: crawlResult?.metadata?.author,
        image: crawlResult?.metadata?.image,
        favicon: crawlResult?.metadata?.favicon,
        siteName: crawlResult?.metadata?.site_name,
        success: crawlResult?.success || false,
        error: crawlResult?.error,
      };
    });
  }

  /**
   * Analyze URLs to determine optimal crawling strategy
   */
  analyzeUrls(urls: string[]): Record<string, CrawlConfig> {
    const configs: Record<string, CrawlConfig> = {};

    urls.forEach(url => {
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();

        // Configure based on known website characteristics
        if (this.requiresJavaScript(hostname)) {
          configs[url] = {
            chunking_strategy: 'topic',
            output_format: 'markdown',
            browser_config: {
              headless: true,
              user_agent_mode: 'random',
            },
            crawler_config: {
              delay_before_return_html: 3000,
              simulate_user: true,
              magic: true,
              page_timeout: 45000,
            },
          };
        } else {
          // Lighter config for static sites
          configs[url] = {
            chunking_strategy: 'topic',
            output_format: 'markdown',
            browser_config: {
              headless: true,
              user_agent_mode: 'desktop',
            },
            crawler_config: {
              delay_before_return_html: 1000,
              simulate_user: false,
              magic: false,
              page_timeout: 20000,
            },
          };
        }
      } catch {
        // Use default config for invalid URLs
        configs[url] = {};
      }
    });

    return configs;
  }

  /**
   * Check if a website likely requires JavaScript rendering
   */
  private requiresJavaScript(hostname: string): boolean {
    const jsHeavySites = [
      'react', 'angular', 'vue', 'spa', 'app.',
      'medium.com', 'dev.to', 'stackoverflow.com',
      'github.com', 'gitlab.com', 'bitbucket.org',
      'notion.so', 'airtable.com', 'figma.com',
    ];

    return jsHeavySites.some(pattern => hostname.includes(pattern));
  }

  /**
   * Merge configuration objects deeply
   */
  private mergeConfig(defaultConfig: CrawlConfig, userConfig: CrawlConfig): CrawlConfig {
    return {
      ...defaultConfig,
      ...userConfig,
      browser_config: {
        ...defaultConfig.browser_config,
        ...userConfig.browser_config,
      },
      crawler_config: {
        ...defaultConfig.crawler_config,
        ...userConfig.crawler_config,
      },
    };
  }
}

// Singleton instance
let crawl4aiClient: Crawl4AIClient | null = null;

export function getCrawl4AIClient(): Crawl4AIClient {
  if (!crawl4aiClient) {
    const apiUrl = process.env.CRAWL4AI_API_URL || 'http://localhost:11235';
    crawl4aiClient = new Crawl4AIClient(apiUrl);
  }
  return crawl4aiClient;
}