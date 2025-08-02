/**
 * Serper API client for Google search results
 * Provides a cost-effective alternative to direct Google Search API
 */

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  image?: string;
  favicon?: string;
  sitelinks?: Array<{
    title: string;
    link: string;
  }>;
}

export interface SerperAnswerBox {
  answer: string;
  title: string;
  link: string;
  date?: string;
}

export interface SerperKnowledgeGraph {
  title: string;
  type: string;
  description: string;
  descriptionSource: string;
  descriptionLink: string;
  imageUrl?: string;
  attributes?: Record<string, string>;
}

export interface SerperResponse {
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  organic: SerperSearchResult[];
  answerBox?: SerperAnswerBox;
  knowledgeGraph?: SerperKnowledgeGraph;
  peopleAlsoAsk?: Array<{
    question: string;
    snippet: string;
    title: string;
    link: string;
  }>;
  relatedSearches?: Array<{
    query: string;
  }>;
}

export interface SerperOptions {
  num?: number;          // Number of results (default: 10, max: 100)
  start?: number;        // Start index for pagination
  gl?: string;          // Country code (e.g., 'us', 'uk')
  hl?: string;          // Language code (e.g., 'en', 'es')
  autocorrect?: boolean; // Enable autocorrect (default: true)
  page?: number;        // Page number for pagination
  type?: 'search' | 'images' | 'videos' | 'places' | 'news';
}

export class SerperClient {
  private apiKey: string;
  private baseUrl = 'https://google.serper.dev';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Serper API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Perform a Google search using Serper API
   */
  async search(
    query: string, 
    options: SerperOptions = {}
  ): Promise<SerperResponse> {
    const {
      num = 6,
      start = 0,
      gl = 'us',
      hl = 'en',
      autocorrect = true,
      page = 1,
      type = 'search'
    } = options;

    const requestBody = {
      q: query,
      num,
      start,
      gl,
      hl,
      autocorrect,
      page
    };

    try {
      const response = await fetch(`${this.baseUrl}/${type}`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Serper API error (${response.status}): ${errorText}`
        );
      }

      const data = await response.json();
      return data as SerperResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Serper API request failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred during Serper API request');
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/autocomplete`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
      });

      if (!response.ok) {
        throw new Error(`Serper suggestions API error: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.warn('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Extract URLs from search results for crawling
   */
  extractUrls(searchResults: SerperResponse, maxUrls: number = 6): string[] {
    const urls: string[] = [];
    
    // Add organic search results
    if (searchResults.organic) {
      for (const result of searchResults.organic) {
        if (urls.length >= maxUrls) break;
        if (result.link && this.isValidUrl(result.link)) {
          urls.push(result.link);
        }
      }
    }

    // Add answer box source if available
    if (searchResults.answerBox?.link && urls.length < maxUrls) {
      if (this.isValidUrl(searchResults.answerBox.link)) {
        urls.push(searchResults.answerBox.link);
      }
    }

    return urls.slice(0, maxUrls);
  }

  /**
   * Validate if a URL is suitable for crawling
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Skip non-HTTP protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false;
      }

      // Skip common non-content URLs
      // NOTE: YouTube is now supported by video processing service
      const skipDomains = [
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'linkedin.com/posts',
        'pinterest.com'
      ];

      const skipExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
        '.ppt', '.pptx', '.zip', '.rar', '.exe'
      ];

      if (skipDomains.some(domain => parsed.hostname.includes(domain))) {
        return false;
      }

      if (skipExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext))) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Analyze search intent from query
   */
  analyzeIntent(query: string): {
    type: 'informational' | 'navigational' | 'transactional' | 'local';
    confidence: number;
    keywords: string[];
  } {
    const lowerQuery = query.toLowerCase();
    
    // Local intent indicators
    const localIndicators = ['near me', 'nearby', 'in ', 'at ', 'restaurant', 'hotel', 'store'];
    if (localIndicators.some(indicator => lowerQuery.includes(indicator))) {
      return {
        type: 'local',
        confidence: 0.8,
        keywords: localIndicators.filter(indicator => lowerQuery.includes(indicator))
      };
    }

    // Transactional intent indicators
    const transactionalIndicators = ['buy', 'purchase', 'order', 'price', 'cost', 'deal', 'discount'];
    if (transactionalIndicators.some(indicator => lowerQuery.includes(indicator))) {
      return {
        type: 'transactional',
        confidence: 0.7,
        keywords: transactionalIndicators.filter(indicator => lowerQuery.includes(indicator))
      };
    }

    // Navigational intent indicators
    const navigationalIndicators = ['login', 'sign in', 'website', 'homepage', 'official'];
    if (navigationalIndicators.some(indicator => lowerQuery.includes(indicator))) {
      return {
        type: 'navigational',
        confidence: 0.6,
        keywords: navigationalIndicators.filter(indicator => lowerQuery.includes(indicator))
      };
    }

    // Default to informational
    return {
      type: 'informational',
      confidence: 0.5,
      keywords: []
    };
  }
}

// Singleton instance for use across the application
let serperClient: SerperClient | null = null;

export function getSerperClient(): SerperClient {
  if (!serperClient) {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error('SERPER_API_KEY environment variable is not set');
    }
    serperClient = new SerperClient(apiKey);
  }
  return serperClient;
}