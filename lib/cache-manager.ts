/**
 * Multi-layer cache manager for Crawlplexity
 * Implements memory + Redis caching with intelligent invalidation
 */

import { createHash } from 'crypto'

interface CacheEntry<T> {
  data: T
  expiry: number
  created: number
  hits: number
  lastAccess: number
}

interface CacheStats {
  memoryHits: number
  memoryMisses: number
  redisHits: number
  redisMisses: number
  totalEntries: number
  memoryUsage: number
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private redisClient: any = null
  private stats: CacheStats = {
    memoryHits: 0,
    memoryMisses: 0,
    redisHits: 0,
    redisMisses: 0,
    totalEntries: 0,
    memoryUsage: 0
  }
  private maxMemoryEntries = 1000
  private defaultTTL = 3600 // 1 hour

  constructor() {
    this.initRedis()
    this.startCleanupInterval()
  }

  private async initRedis() {
    if (typeof window !== 'undefined') return // Skip in browser

    try {
      const { createClient } = await import('redis')
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:29674'
      
      this.redisClient = createClient({ url: redisUrl })
      
      this.redisClient.on('error', (err: Error) => {
        console.warn('Redis client error:', err.message)
        this.redisClient = null
      })
      
      await this.redisClient.connect()
      console.log('✅ Redis cache connected')
    } catch (error) {
      console.warn('Redis not available, using memory cache only:', error)
      this.redisClient = null
    }
  }

  /**
   * Generate cache key from query and parameters
   */
  generateCacheKey(
    type: string,
    query: string,
    params: Record<string, any> = {}
  ): string {
    const normalizedQuery = query.toLowerCase().trim()
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {} as Record<string, any>)

    const keyData = `${type}:${normalizedQuery}:${JSON.stringify(sortedParams)}`
    return createHash('sha256').update(keyData).digest('hex').substring(0, 32)
  }

  /**
   * Get from cache with L1 (memory) → L2 (Redis) fallback
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now()

    // L1: Check memory cache first
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && memoryEntry.expiry > now) {
      memoryEntry.hits++
      memoryEntry.lastAccess = now
      this.stats.memoryHits++
      
      console.log(`🎯 Memory cache HIT for key: ${key.substring(0, 8)}...`)
      return memoryEntry.data as T
    }

    if (memoryEntry) {
      // Expired, remove from memory
      this.memoryCache.delete(key)
    }
    this.stats.memoryMisses++

    // L2: Check Redis cache
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(`crawlplexity:${key}`)
        if (redisValue) {
          const parsed = JSON.parse(redisValue)
          
          if (parsed.expiry > now) {
            // Found in Redis, promote to memory cache
            const entry: CacheEntry<T> = {
              data: parsed.data,
              expiry: parsed.expiry,
              created: parsed.created,
              hits: parsed.hits + 1,
              lastAccess: now
            }
            
            this.memoryCache.set(key, entry)
            this.stats.redisHits++
            
            console.log(`🎯 Redis cache HIT for key: ${key.substring(0, 8)}...`)
            return parsed.data as T
          } else {
            // Expired in Redis, clean up
            await this.redisClient.del(`crawlplexity:${key}`)
          }
        }
      } catch (error) {
        console.warn('Redis get error:', error)
      }
    }

    this.stats.redisMisses++
    console.log(`❌ Cache MISS for key: ${key.substring(0, 8)}...`)
    return null
  }

  /**
   * Set in both memory and Redis cache
   */
  async set<T>(
    key: string,
    data: T,
    ttlSeconds: number = this.defaultTTL
  ): Promise<void> {
    const now = Date.now()
    const expiry = now + (ttlSeconds * 1000)

    const entry: CacheEntry<T> = {
      data,
      expiry,
      created: now,
      hits: 0,
      lastAccess: now
    }

    // Store in memory cache
    this.memoryCache.set(key, entry)
    this.evictOldEntries()

    // Store in Redis cache
    if (this.redisClient) {
      try {
        const redisData = JSON.stringify(entry)
        await this.redisClient.setEx(
          `crawlplexity:${key}`,
          ttlSeconds,
          redisData
        )
      } catch (error) {
        console.warn('Redis set error:', error)
      }
    }

    this.updateStats()
    console.log(`💾 Cached data for key: ${key.substring(0, 8)}... (TTL: ${ttlSeconds}s)`)
  }

  /**
   * Get data with automatic cache population
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Cache miss - fetch data
    console.log(`🔄 Fetching data for key: ${key.substring(0, 8)}...`)
    const data = await fetchFn()
    
    // Store in cache
    await this.set(key, data, ttlSeconds)
    
    return data
  }

  /**
   * Cache search results with smart TTL
   */
  async cacheSearchResults(
    query: string,
    results: any,
    options: { maxResults?: number; strategy?: string } = {}
  ): Promise<void> {
    const key = this.generateCacheKey('search', query, options)
    
    // Smart TTL based on query characteristics
    let ttl = this.defaultTTL
    
    // News/current events - shorter TTL
    if (this.isTimesensitive(query)) {
      ttl = 300 // 5 minutes
    }
    // General knowledge - longer TTL
    else if (this.isEvergreen(query)) {
      ttl = 7200 // 2 hours
    }
    
    await this.set(key, results, ttl)
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    query: string,
    options: { maxResults?: number; strategy?: string } = {}
  ): Promise<any | null> {
    const key = this.generateCacheKey('search', query, options)
    return await this.get(key)
  }

  /**
   * Cache LLM responses
   */
  async cacheLLMResponse(
    messages: any[],
    response: any,
    modelInfo: { provider: string; model: string }
  ): Promise<void> {
    const key = this.generateCacheKey('llm', JSON.stringify(messages), modelInfo)
    
    // LLM responses can be cached longer for identical inputs
    await this.set(key, response, 1800) // 30 minutes
  }

  /**
   * Get cached LLM response
   */
  async getCachedLLMResponse(
    messages: any[],
    modelInfo: { provider: string; model: string }
  ): Promise<any | null> {
    const key = this.generateCacheKey('llm', JSON.stringify(messages), modelInfo)
    return await this.get(key)
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate memory cache
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key)
      }
    }

    // Invalidate Redis cache
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`crawlplexity:*${pattern}*`)
        if (keys.length > 0) {
          await this.redisClient.del(keys)
        }
      } catch (error) {
        console.warn('Redis invalidation error:', error)
      }
    }

    console.log(`🗑️ Invalidated cache entries matching: ${pattern}`)
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys('crawlplexity:*')
        if (keys.length > 0) {
          await this.redisClient.del(keys)
        }
      } catch (error) {
        console.warn('Redis clear error:', error)
      }
    }

    this.resetStats()
    console.log('🗑️ Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRatio: number } {
    const totalRequests = this.stats.memoryHits + this.stats.memoryMisses + 
                         this.stats.redisHits + this.stats.redisMisses
    const totalHits = this.stats.memoryHits + this.stats.redisHits
    const hitRatio = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0

    return {
      ...this.stats,
      hitRatio: Math.round(hitRatio * 100) / 100
    }
  }

  /**
   * Check if query is time-sensitive
   */
  private isTimesensitive(query: string): boolean {
    const timeSensitiveKeywords = [
      'news', 'today', 'latest', 'current', 'now', 'breaking',
      'stock price', 'weather', 'traffic', 'live', 'recent'
    ]
    
    const lowerQuery = query.toLowerCase()
    return timeSensitiveKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  /**
   * Check if query is evergreen content
   */
  private isEvergreen(query: string): boolean {
    const evergreenKeywords = [
      'what is', 'how to', 'definition', 'meaning', 'history of',
      'biography', 'tutorial', 'guide', 'explanation'
    ]
    
    const lowerQuery = query.toLowerCase()
    return evergreenKeywords.some(keyword => lowerQuery.includes(keyword))
  }

  /**
   * Evict old entries when memory cache is full
   */
  private evictOldEntries(): void {
    if (this.memoryCache.size <= this.maxMemoryEntries) return

    // Sort by last access time and remove oldest
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccess - b.lastAccess)

    const toRemove = entries.slice(0, entries.length - this.maxMemoryEntries)
    toRemove.forEach(([key]) => this.memoryCache.delete(key))

    console.log(`🧹 Evicted ${toRemove.length} old cache entries`)
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalEntries = this.memoryCache.size
    this.stats.memoryUsage = this.estimateMemoryUsage()
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let size = 0
    for (const [key, entry] of this.memoryCache) {
      size += key.length * 2 // UTF-16
      size += JSON.stringify(entry).length * 2
    }
    return Math.round(size / 1024) // KB
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      totalEntries: 0,
      memoryUsage: 0
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      let expiredCount = 0

      for (const [key, entry] of this.memoryCache) {
        if (entry.expiry <= now) {
          this.memoryCache.delete(key)
          expiredCount++
        }
      }

      if (expiredCount > 0) {
        console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`)
        this.updateStats()
      }
    }, 60000) // Every minute
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit()
        console.log('✅ Redis client disconnected')
      } catch (error) {
        console.warn('Redis disconnect error:', error)
      }
    }
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager()
  }
  return cacheManager
}

// Utility function for React components
export function useCache() {
  return getCacheManager()
}