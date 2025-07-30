/**
 * Search orchestrator that combines Serper API and Crawl4AI
 * Self-hosted web scraping and search solution
 */

import { getSerperClient, type SerperResponse } from './serper-client';
import { getCrawl4AIClient, type CrawlResult } from './crawl4ai-client';
import { getCacheManager } from './cache-manager';
import { getVideoProcessingClient, type VideoProcessingResult } from './video-processing-client';
import { getDebugLogger } from './debug-logger';

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
  contentType?: 'webpage' | 'video' | 'image';
  videoContent?: {
    platform?: string;
    duration?: string;
    processedContent?: string;
  };
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
  private videoProcessingClient = getVideoProcessingClient();

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

      // Step 3: Classify URLs
      const crawlStartTime = Date.now();
      const { videoUrls, webpageUrls } = await this.classifyUrls(urls);
      
      console.log(`📊 URL Classification: ${videoUrls.length} videos, ${webpageUrls.length} webpages`);
      console.log(`🎥 Video URLs:`, videoUrls);
      console.log(`🌐 Webpage URLs:`, webpageUrls);

      // Step 4: Process URLs in parallel
      const crawlPromises = webpageUrls.map(url => 
        this.crawl4aiClient.crawlAndWait(
          [url],
          this.getOptimalCrawlConfig([url]),
          crawlTimeout
        ).then(results => results[0])
        .catch(error => ({
          url,
          success: false,
          error: error.message || 'Crawl failed',
        } as CrawlResult))
      );
      
      // Check if video processing service is available before processing videos
      let processVideos = true;
      if (videoUrls.length > 0) {
        console.log(`🗘️ Checking video processing service health before processing ${videoUrls.length} videos...`);
        const isVideoServiceHealthy = await this.videoProcessingClient.healthCheck();
        if (!isVideoServiceHealthy) {
          console.log(`⚠️ Video processing service is not healthy - videos will be processed as search snippets only`);
          processVideos = false;
        } else {
          console.log(`✅ Video processing service is healthy`);
        }
      }

      const videoPromises = processVideos ? videoUrls.map((url, index) => {
        console.log(`🎬 Starting video processing for URL ${index + 1}/${videoUrls.length}: ${url}`);
        
        // Add explicit timeout wrapper for video processing (longer timeout than crawling)
        const videoProcessingPromise = this.videoProcessingClient.processVideo(url, query);
        const videoTimeout = 300000; // 5 minutes for video processing
        const timeoutPromise = new Promise<VideoProcessingResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Video processing timeout after ${videoTimeout}ms`));
          }, videoTimeout);
        });
        
        return Promise.race([videoProcessingPromise, timeoutPromise])
          .then(result => {
            console.log(`✅ Video processing completed for ${url}:`, {
              success: result.success,
              hasContent: !!result.processedContent,
              contentLength: result.processedContent?.length || 0,
              error: result.error,
              type: result.type
            });
            return result;
          })
          .catch(error => {
            console.log(`❌ Video processing failed for ${url}:`, error.message);
            return {
              url,
              success: false,
              error: error.message || 'Video processing failed',
              type: 'video' as const,
            } as VideoProcessingResult;
          });
      }) : videoUrls.map(url => {
        console.log(`⚠️ Skipping video processing for ${url} - service unavailable`);
        return Promise.resolve({
          url,
          success: false,
          error: 'Video processing service unavailable',
          type: 'video' as const,
        } as VideoProcessingResult);
      });

      // Wait for all processing to complete - NO GLOBAL TIMEOUT
      console.log(`⏳ VIDEO DEBUG: Waiting for ${crawlPromises.length} crawl promises and ${videoPromises.length} video promises...`);
      console.log(`🎬 VIDEO DEBUG: Video processing enabled: ${processVideos}`);
      console.log(`⏰ VIDEO DEBUG: Video timeout set to 5 minutes per video`);
      
      // Use Promise.allSettled to properly await ALL promises including 5-minute video processing
      const allResults = await Promise.allSettled([
        ...crawlPromises,
        ...videoPromises,
      ]);
      
      console.log(`✅ VIDEO DEBUG: All promises settled. Total results: ${allResults.length}`);

      // Separate results by type
      const crawlResults: CrawlResult[] = [];
      const videoResults: VideoProcessingResult[] = [];

      allResults.forEach((result, index) => {
        const isVideoResult = index >= crawlPromises.length;
        const url = isVideoResult ? videoUrls[index - crawlPromises.length] : webpageUrls[index];
        
        if (result.status === 'fulfilled') {
          if (isVideoResult) {
            const videoResult = result.value as VideoProcessingResult;
            console.log(`🎥 Video result processed for ${url}:`, {
              success: videoResult.success,
              hasContent: !!videoResult.processedContent,
              contentLength: videoResult.processedContent?.length || 0
            });
            videoResults.push(result.value as VideoProcessingResult);
          } else {
            crawlResults.push(result.value as CrawlResult);
          }
        } else {
          console.error(`❌ Processing failed for ${url} (${isVideoResult ? 'video' : 'webpage'}):`, result.reason);
          
          if (isVideoResult) {
            videoResults.push({
              url,
              success: false,
              error: result.reason?.message || 'Unknown error',
              type: 'video',
            } as VideoProcessingResult);
          } else {
            crawlResults.push({
              url,
              success: false,
              error: result.reason?.message || 'Unknown error',
            } as CrawlResult);
          }
        }
      });
      
      console.log(`📊 Processing Summary:`);
      console.log(`   • Crawl results: ${crawlResults.length} (${crawlResults.filter(r => r.success).length} successful)`);
      console.log(`   • Video results: ${videoResults.length} (${videoResults.filter(r => r.success).length} successful)`);
      console.log(`   • Video processing was enabled: ${processVideos}`);
      
      // Additional debugging for video results
      if (videoResults.length > 0) {
        console.log(`🔍 Detailed video results:`);
        videoResults.forEach((vr, index) => {
          console.log(`   ${index + 1}. ${vr.url}`);
          console.log(`      Success: ${vr.success}`);
          console.log(`      Content length: ${vr.processedContent?.length || 0}`);
          console.log(`      Error: ${vr.error || 'none'}`);
        });
      }

      const crawlTime = Date.now() - crawlStartTime;

      // Step 5: Transform and combine results
      console.log(`🔄 Combining search results...`);
      const results = this.combineResults(serperResponse, crawlResults, videoResults);
      console.log(`📋 Combined results: ${results.length} total`);
      console.log(`   • Video content results: ${results.filter(r => r.contentType === 'video').length}`);
      console.log(`   • Webpage results: ${results.filter(r => r.contentType === 'webpage').length}`);
      
      // Debug individual results
      results.forEach((result, index) => {
        if (result.contentType === 'video') {
          console.log(`🎬 Video result ${index + 1}: ${result.title}`);
          console.log(`   • Success: ${result.success}`);
          console.log(`   • Has content: ${!!result.content}`);
          console.log(`   • Content length: ${result.content?.length || 0}`);
          console.log(`   • Has video content: ${!!result.videoContent}`);
          console.log(`   • Video processed content length: ${result.videoContent?.processedContent?.length || 0}`);
        }
      });

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
    videoProcessor: boolean;
    geminiConfigured?: boolean;
    overall: boolean;
  }> {
    const [crawl4aiHealthy, videoProcessorHealthy, videoServiceInfo] = await Promise.all([
      this.crawl4aiClient.healthCheck(),
      this.videoProcessingClient.healthCheck(),
      this.videoProcessingClient.getServiceInfo().catch(() => ({ geminiConfigured: false })),
    ]);

    // Serper health is checked implicitly through API calls
    const serperHealthy = true;

    return {
      serper: serperHealthy,
      crawl4ai: crawl4aiHealthy,
      videoProcessor: videoProcessorHealthy,
      geminiConfigured: videoServiceInfo.geminiConfigured,
      overall: serperHealthy && crawl4aiHealthy, // Don't require video processor for overall health
    };
  }

  /**
   * Classify URLs into video and webpage categories
   */
  private async classifyUrls(urls: string[]): Promise<{
    videoUrls: string[];
    webpageUrls: string[];
  }> {
    const videoUrls: string[] = [];
    const webpageUrls: string[] = [];

    console.log(`🔍 VIDEO DEBUG: Classifying ${urls.length} URLs...`);
    // Write to log file for debugging
    require('fs').appendFileSync('/home/gyasis/Documents/code/fireplexity/video-debug.log', 
      `[${new Date().toISOString()}] 🔍 VIDEO DEBUG: Classifying ${urls.length} URLs: ${JSON.stringify(urls)}\n`);
    
    // Use video processing service to classify URLs
    const classificationPromises = urls.map((url, index) => {
      console.log(`🔍 Classifying URL ${index + 1}/${urls.length}: ${url}`);
      return this.videoProcessingClient.classifyUrl(url)
        .then(result => {
          console.log(`✅ Classification result for ${url}: ${result.type}`);
          return result;
        })
        .catch(error => {
          console.log(`❌ Classification failed for ${url}:`, error.message, '- defaulting to webpage');
          return { type: 'webpage' };
        });
    });

    const classifications = await Promise.all(classificationPromises);

    urls.forEach((url, index) => {
      if (classifications[index].type === 'video' || classifications[index].type === 'image') {
        console.log(`🎥 Adding to video URLs: ${url}`);
        videoUrls.push(url);
      } else {
        console.log(`🌐 Adding to webpage URLs: ${url}`);
        webpageUrls.push(url);
      }
    });

    return { videoUrls, webpageUrls };
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
   * Combine Serper search results with Crawl4AI and video processing results
   */
  private combineResults(
    serperResponse: SerperResponse,
    crawlResults: CrawlResult[],
    videoResults: VideoProcessingResult[] = []
  ): SearchResult[] {
    const results: SearchResult[] = [];
    
    console.log(`🔗 Combining results:`);
    console.log(`   • Serper organic results: ${serperResponse.organic.length}`);
    console.log(`   • Available crawl results: ${crawlResults.length}`);
    console.log(`   • Available video results: ${videoResults.length}`);

    serperResponse.organic.forEach((searchResult, index) => {
      const crawlResult = crawlResults.find(cr => cr.url === searchResult.link);
      const videoResult = videoResults.find(vr => vr.url === searchResult.link);
      
      console.log(`🔗 Processing search result ${index + 1}: ${searchResult.link}`);
      console.log(`   • Has crawl result: ${!!crawlResult}`);
      console.log(`   • Has video result: ${!!videoResult}`);
      
      if (videoResult) {
        console.log(`🎬 Creating video result for: ${searchResult.link}`);
        console.log(`   • Video success: ${videoResult.success}`);
        console.log(`   • Video content length: ${videoResult.processedContent?.length || 0}`);
        console.log(`   • Video metadata:`, videoResult.metadata);
        
        // Handle video/image results
        const videoSearchResult = {
          url: searchResult.link,
          title: videoResult.metadata?.title || searchResult.title,
          description: videoResult.metadata?.description || searchResult.snippet,
          content: videoResult.processedContent || '',
          markdown: videoResult.processedContent || '',
          publishedDate: videoResult.metadata?.publishedDate,
          author: videoResult.metadata?.author,
          image: videoResult.metadata?.thumbnail || searchResult.image,
          favicon: searchResult.favicon,
          siteName: videoResult.metadata?.siteName,
          success: videoResult.success,
          error: videoResult.error,
          searchSnippet: searchResult.snippet,
          searchRank: index + 1,
          contentType: videoResult.type as 'video' | 'image',
          videoContent: videoResult.type === 'video' ? {
            platform: videoResult.metadata?.platform,
            duration: videoResult.metadata?.duration,
            processedContent: videoResult.processedContent,
          } : undefined,
        };
        
        console.log(`✅ Video result created:`, {
          url: videoSearchResult.url,
          success: videoSearchResult.success,
          contentLength: videoSearchResult.content.length,
          hasVideoContent: !!videoSearchResult.videoContent
        });
        
        results.push(videoSearchResult);
      } else {
        console.log(`🌐 Creating webpage result for: ${searchResult.link}`);
        
        // Handle webpage results
        results.push({
          url: searchResult.link,
          title: crawlResult?.metadata?.title || searchResult.title,
          description: crawlResult?.metadata?.description || searchResult.snippet,
          content: crawlResult?.extracted_content || '',
          markdown: crawlResult?.markdown || '',
          publishedDate: crawlResult?.metadata?.published_date,
          author: crawlResult?.metadata?.author,
          image: crawlResult?.metadata?.image || searchResult.image,
          favicon: crawlResult?.metadata?.favicon || searchResult.favicon,
          siteName: crawlResult?.metadata?.site_name,
          success: crawlResult?.success || false,
          error: crawlResult?.error,
          searchSnippet: searchResult.snippet,
          searchRank: index + 1,
          contentType: 'webpage',
        });
      }
    });
    
    console.log(`✅ Final combined results: ${results.length}`);
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