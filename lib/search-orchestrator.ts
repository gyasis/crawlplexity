/**
 * Search orchestrator that combines Serper API and Crawl4AI
 * Self-hosted web scraping and search solution
 */

import { getSerperClient, type SerperResponse } from './serper-client';
import { getCrawl4AIClient, type CrawlResult } from './crawl4ai-client';
import { getCacheManager } from './cache-manager';

export interface SearchResult {
  url: string;
  title: string;
  description?: string;
  content?: string;
  markdown?: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  success: boolean;
  error?: string;
  searchSnippet?: string;
  searchRank: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  crawlTime: number;
  answerBox?: {
    answer: string;
    title: string;
    source: string;
  };
  relatedQuestions?: string[];
  suggestions?: string[];
}

export interface SearchOptions {
  maxResults?: number;
  includeAnswerBox?: boolean;
  includeSuggestions?: boolean;
  crawlTimeout?: number;
  retryFailedCrawls?: boolean;
  filterResults?: boolean;
}

export class SearchOrchestrator {
  private serperClient = getSerperClient();
  private crawl4aiClient = getCrawl4AIClient();
  private cacheManager = getCacheManager();

  /**
   * Perform a complete search: query Serper, crawl results, return formatted data
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const {
      maxResults = 6,
      includeAnswerBox = true,
      includeSuggestions = false,
      crawlTimeout = 60000,
      retryFailedCrawls = true,
      filterResults = true,
    } = options;

    const startTime = Date.now();

    try {
      // Step 1: Check cache first
      const cacheOptions = { maxResults, includeAnswerBox, filterResults };
      const cachedResult = await this.cacheManager.getCachedSearchResults(query, cacheOptions);
      
      if (cachedResult) {
        console.log(`🎯 Returning cached search results for: "${query}"`);
        return {
          ...cachedResult,
          searchTime: 0, // Cached
          crawlTime: 0,  // Cached
        };
      }

      // Step 2: Get search results from Serper
      const searchStartTime = Date.now();
      const serperResponse = await this.serperClient.search(query, {
        num: maxResults,
        type: 'search',
      });
      const searchTime = Date.now() - searchStartTime;

      // Step 2: Extract URLs for crawling
      const urls = this.serperClient.extractUrls(serperResponse, maxResults);
      
      if (urls.length === 0) {
        return {
          query,
          results: [],
          totalResults: 0,
          searchTime,
          crawlTime: 0,
        };
      }

      // Step 3: Crawl URLs in parallel
      const crawlStartTime = Date.now();
      let crawlResults: CrawlResult[];

      try {
        crawlResults = await this.crawl4aiClient.crawlAndWait(
          urls,
          this.getOptimalCrawlConfig(urls),
          crawlTimeout
        );
      } catch (crawlError) {
        console.error('Crawling failed:', crawlError);
        
        if (retryFailedCrawls) {
          // Retry with more conservative settings
          crawlResults = await this.retryCrawling(urls, crawlTimeout);
        } else {
          throw crawlError;
        }
      }

      const crawlTime = Date.now() - crawlStartTime;

      // Step 4: Transform and combine results
      const results = this.combineResults(serperResponse, crawlResults);

      // Step 5: Filter and enhance results
      const filteredResults = filterResults 
        ? this.filterResults(results)
        : results;

      // Step 6: Get additional data if requested
      const answerBox = includeAnswerBox && serperResponse.answerBox
        ? {
            answer: serperResponse.answerBox.answer,
            title: serperResponse.answerBox.title,
            source: serperResponse.answerBox.link,
          }
        : undefined;

      const suggestions = includeSuggestions
        ? await this.getSuggestions(query)
        : undefined;

      const relatedQuestions = serperResponse.peopleAlsoAsk?.map(
        item => item.question
      ).slice(0, 3);

      const searchResult = {
        query,
        results: filteredResults,
        totalResults: filteredResults.length,
        searchTime,
        crawlTime,
        answerBox,
        relatedQuestions,
        suggestions,
      };

      // Step 7: Cache the results for future use
      await this.cacheManager.cacheSearchResults(query, searchResult, cacheOptions);

      return searchResult;

    } catch (error) {
      console.error('Search orchestration failed:', error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string): Promise<string[]> {
    try {
      return await this.serperClient.getSuggestions(query);
    } catch (error) {
      console.warn('Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    serper: boolean;
    crawl4ai: boolean;
    overall: boolean;
  }> {
    const [crawl4aiHealthy] = await Promise.all([
      this.crawl4aiClient.healthCheck(),
    ]);

    // Serper health is checked implicitly through API calls
    const serperHealthy = true;

    return {
      serper: serperHealthy,
      crawl4ai: crawl4aiHealthy,
      overall: serperHealthy && crawl4aiHealthy,
    };
  }

  /**
   * Get optimal crawl configuration based on URLs
   */
  private getOptimalCrawlConfig(urls: string[]) {
    // Analyze all URLs and determine if any need special handling
    const needsJavaScript = urls.some(url => {
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return this.requiresJavaScript(hostname);
      } catch {
        return false;
      }
    });

    return {
      chunking_strategy: 'topic' as const,
      output_format: 'markdown' as const,
      browser_config: {
        headless: true,
        user_agent_mode: 'random' as const,
        viewport_width: 1920,
        viewport_height: 1080,
      },
      crawler_config: {
        delay_before_return_html: needsJavaScript ? 3000 : 1500,
        timeout: 30000,
        remove_overlay_elements: true,
        simulate_user: needsJavaScript,
        magic: needsJavaScript,
        page_timeout: needsJavaScript ? 45000 : 30000,
      },
    };
  }

  /**
   * Retry crawling with more conservative settings
   */
  private async retryCrawling(
    urls: string[],
    timeout: number
  ): Promise<CrawlResult[]> {
    console.log('Retrying crawling with conservative settings...');
    
    const conservativeConfig = {
      chunking_strategy: 'sentence' as const,
      output_format: 'markdown' as const,
      browser_config: {
        headless: true,
        user_agent_mode: 'desktop' as const,
      },
      crawler_config: {
        delay_before_return_html: 1000,
        timeout: 20000,
        remove_overlay_elements: false,
        simulate_user: false,
        magic: false,
        page_timeout: 20000,
      },
    };

    try {
      return await this.crawl4aiClient.crawlAndWait(
        urls,
        conservativeConfig,
        timeout
      );
    } catch (error) {
      console.error('Retry crawling also failed:', error);
      
      // Return empty results for all URLs
      return urls.map(url => ({
        url,
        success: false,
        error: 'Crawling failed after retry',
      }));
    }
  }

  /**
   * Combine Serper search results with Crawl4AI crawl results
   */
  private combineResults(
    serperResponse: SerperResponse,
    crawlResults: CrawlResult[]
  ): SearchResult[] {
    const results: SearchResult[] = [];

    serperResponse.organic.forEach((searchResult, index) => {
      const crawlResult = crawlResults.find(cr => cr.url === searchResult.link);
      
      results.push({
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
        searchSnippet: searchResult.snippet,
        searchRank: index + 1,
      });
    });

    return results;
  }

  /**
   * Filter results to remove poor quality or failed crawls
   */
  private filterResults(results: SearchResult[]): SearchResult[] {
    return results.filter(result => {
      // Keep successful crawls with content
      if (result.success && result.markdown && result.markdown.length > 100) {
        return true;
      }

      // Keep results with search snippets even if crawl failed
      if (result.searchSnippet && result.searchSnippet.length > 20) {
        return true;
      }

      // Filter out completely empty results
      return false;
    });
  }

  /**
   * Check if a hostname likely requires JavaScript
   */
  private requiresJavaScript(hostname: string): boolean {
    const jsHeavySites = [
      'react', 'angular', 'vue', 'spa',
      'medium.com', 'dev.to', 'stackoverflow.com',
      'github.com', 'gitlab.com', 'notion.so',
    ];

    return jsHeavySites.some(pattern => hostname.includes(pattern));
  }
}

// Singleton instance
let searchOrchestrator: SearchOrchestrator | null = null;

export function getSearchOrchestrator(): SearchOrchestrator {
  if (!searchOrchestrator) {
    searchOrchestrator = new SearchOrchestrator();
  }
  return searchOrchestrator;
}