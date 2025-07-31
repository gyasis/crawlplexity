/**
 * Temporal Memory Management System for Deep Research Engine
 * Mimics human memory patterns with time-based data tiers
 */

import { createClient, RedisClientType } from 'redis';
import Database from 'better-sqlite3';
import { ResearchSession, ResearchResult, Citation, ResearchAnalysis } from './types';

export type StorageTier = 'redis' | 'hot' | 'warm' | 'cold' | 'trash';

export interface TemporalConfig {
  redis_url?: string;
  sqlite_path?: string;
  tier_durations: {
    hot_days: number;      // 1-3 days
    warm_days: number;     // 3-7 days  
    cold_days: number;     // 1 month
    trash_days: number;    // Before permanent deletion
  };
  cleanup_interval_hours: number;
  max_redis_sessions: number;
}

export interface TieredData {
  tier: StorageTier;
  last_accessed: Date;
  created_at: Date;
  access_count: number;
  promoted_from?: StorageTier;
  data: any;
}

export class TemporalMemoryManager {
  private redis: RedisClientType;
  private db: Database.Database;
  private config: TemporalConfig;
  private cleanupInterval?: NodeJS.Timeout;

  private initialized = false;

  constructor(config: Partial<TemporalConfig> = {}) {
    this.config = {
      redis_url: config.redis_url || process.env.REDIS_URL || 'redis://localhost:6379',
      sqlite_path: config.sqlite_path || './data/research_memory.db',
      tier_durations: {
        hot_days: 3,
        warm_days: 7,
        cold_days: 30,
        trash_days: 7,
        ...config.tier_durations
      },
      cleanup_interval_hours: config.cleanup_interval_hours || 6,
      max_redis_sessions: config.max_redis_sessions || 100,
      ...config
    };
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.initializeConnections();
      this.initializeSchema();
      this.startCleanupProcess();
      this.initialized = true;
      console.log('✅ TemporalMemoryManager initialized successfully');
    } catch (error) {
      console.error('❌ TemporalMemoryManager initialization failed:', error);
      throw error;
    }
  }

  private async initializeConnections() {
    try {
      // Initialize Redis
      this.redis = createClient({ url: this.config.redis_url });
      await this.redis.connect();
    } catch (error) {
      console.warn('Redis connection failed, Deep Research will use fallback mode');
      throw new Error('REDIS_UNAVAILABLE');
    }

    try {
      // Initialize SQLite - create directory if it doesn't exist
      const path = require('path');
      const fs = require('fs');
      const dbDir = path.dirname(this.config.sqlite_path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
      }

      this.db = new Database(this.config.sqlite_path);
      this.db.pragma('journal_mode = WAL'); // Better concurrent performance
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 10000');
      console.log(`SQLite database initialized: ${this.config.sqlite_path}`);
    } catch (error) {
      console.error('SQLite initialization failed:', error);
      throw new Error('DATABASE_UNAVAILABLE');
    }
  }

  private initializeSchema() {
    // Hot tier (1-3 days) - Most frequently accessed
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS research_sessions_hot (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        research_type TEXT NOT NULL,
        data BLOB NOT NULL,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        promoted_from TEXT,
        tier_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_hot_last_accessed ON research_sessions_hot(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_hot_created_at ON research_sessions_hot(created_at);
      CREATE INDEX IF NOT EXISTS idx_hot_user_id ON research_sessions_hot(user_id);
    `);

    // Warm tier (3-7 days) - Moderately accessed
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS research_sessions_warm (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        research_type TEXT NOT NULL,
        data BLOB NOT NULL,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        promoted_from TEXT,
        tier_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_warm_last_accessed ON research_sessions_warm(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_warm_created_at ON research_sessions_warm(created_at);
      CREATE INDEX IF NOT EXISTS idx_warm_user_id ON research_sessions_warm(user_id);
    `);

    // Cold tier (1 month) - Rarely accessed
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS research_sessions_cold (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        research_type TEXT NOT NULL,
        data BLOB NOT NULL,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        promoted_from TEXT,
        tier_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_cold_last_accessed ON research_sessions_cold(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_cold_created_at ON research_sessions_cold(created_at);
      CREATE INDEX IF NOT EXISTS idx_cold_user_id ON research_sessions_cold(user_id);
    `);

    // Trash tier - Marked for deletion
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS research_sessions_trash (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        query TEXT NOT NULL,
        status TEXT NOT NULL,
        research_type TEXT NOT NULL,
        data BLOB NOT NULL,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 1,
        promoted_from TEXT,
        tier_entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_deletion DATETIME DEFAULT (datetime('now', '+7 days'))
      );

      CREATE INDEX IF NOT EXISTS idx_trash_scheduled_deletion ON research_sessions_trash(scheduled_deletion);
    `);

    // Tier migration log for analytics
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tier_migrations (
        migration_id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        from_tier TEXT NOT NULL,
        to_tier TEXT NOT NULL,
        reason TEXT NOT NULL, -- 'age', 'access', 'promotion', 'cleanup'
        migration_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count_at_migration INTEGER,
        days_in_previous_tier INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_migrations_session_id ON tier_migrations(session_id);
      CREATE INDEX IF NOT EXISTS idx_migrations_time ON tier_migrations(migration_time);
    `);

    // URL deduplication table for efficiency optimization
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_urls (
        url_hash TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        first_processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        process_count INTEGER DEFAULT 1,
        content_hash TEXT,
        content_length INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        last_success_at DATETIME,
        last_failure_at DATETIME,
        last_error TEXT,
        expires_at DATETIME DEFAULT (datetime('now', '+1 day'))
      );

      CREATE INDEX IF NOT EXISTS idx_processed_urls_domain ON processed_urls(domain);
      CREATE INDEX IF NOT EXISTS idx_processed_urls_last_processed ON processed_urls(last_processed_at);
      CREATE INDEX IF NOT EXISTS idx_processed_urls_expires ON processed_urls(expires_at);
      CREATE INDEX IF NOT EXISTS idx_processed_urls_success_count ON processed_urls(success_count);
    `);
  }

  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error('TemporalMemoryManager not initialized. Call initialize() first.');
    }
  }

  /**
   * Store active research session in Redis
   */
  async storeActiveSession(sessionId: string, sessionData: any): Promise<void> {
    this.ensureInitialized();
    const key = `research:active:${sessionId}`;
    const data = {
      ...sessionData,
      created_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      tier: 'redis'
    };

    await this.redis.setEx(key, 3600, JSON.stringify(data)); // 1 hour TTL
    
    // Track active session count
    await this.redis.sAdd('research:active_sessions', sessionId);
  }

  /**
   * Complete research session - move from Redis to Hot tier
   */
  async completeResearchSession(sessionId: string, finalData: ResearchSession & { analysis?: ResearchAnalysis }): Promise<void> {
    // Remove from Redis
    await this.redis.del(`research:active:${sessionId}`);
    await this.redis.sRem('research:active_sessions', sessionId);

    // Store in Hot tier
    await this.storeInTier('hot', sessionId, finalData);
  }

  /**
   * Retrieve research session (with automatic promotion on access)
   */
  async getResearchSession(sessionId: string): Promise<TieredData | null> {
    // First check Redis (active sessions)
    const redisKey = `research:active:${sessionId}`;
    const redisData = await this.redis.get(redisKey);
    
    if (redisData) {
      const parsed = JSON.parse(redisData);
      await this.updateLastAccessed('redis', sessionId);
      return {
        tier: 'redis',
        last_accessed: new Date(),
        created_at: new Date(parsed.created_at),
        access_count: parsed.access_count || 1,
        data: parsed
      };
    }

    // Check SQLite tiers (hot -> warm -> cold -> trash)
    const tiers: StorageTier[] = ['hot', 'warm', 'cold', 'trash'];
    
    for (const tier of tiers) {
      const data = await this.getFromTier(tier, sessionId);
      if (data) {
        // Promote to hot tier if accessed (except if already in trash)
        if (tier !== 'hot' && tier !== 'trash') {
          await this.promoteToHot(sessionId, data, tier);
          return {
            tier: 'hot',
            last_accessed: new Date(),
            created_at: data.created_at,
            access_count: data.access_count + 1,
            promoted_from: tier,
            data: data.data
          };
        }

        // Just update access if in hot or trash
        await this.updateLastAccessed(tier, sessionId);
        return {
          tier,
          last_accessed: new Date(),
          created_at: data.created_at,
          access_count: data.access_count + 1,
          data: data.data
        };
      }
    }

    return null;
  }

  /**
   * Store data in specific tier
   */
  private async storeInTier(tier: StorageTier, sessionId: string, data: any): Promise<void> {
    if (tier === 'redis') {
      return this.storeActiveSession(sessionId, data);
    }

    const tableName = `research_sessions_${tier}`;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${tableName} 
      (session_id, user_id, query, status, research_type, data, last_accessed, created_at, access_count, tier_entered_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, 1, datetime('now'))
    `);

    stmt.run(
      sessionId,
      data.user_id,
      data.query,
      data.status,
      data.research_type,
      JSON.stringify(data),
      (data.created_at instanceof Date ? data.created_at.toISOString() : data.created_at) || new Date().toISOString()
    );
  }

  /**
   * Get data from specific tier
   */
  private async getFromTier(tier: StorageTier, sessionId: string): Promise<any | null> {
    if (tier === 'redis') {
      const data = await this.redis.get(`research:active:${sessionId}`);
      return data ? JSON.parse(data) : null;
    }

    const tableName = `research_sessions_${tier}`;
    const stmt = this.db.prepare(`
      SELECT * FROM ${tableName} WHERE session_id = ?
    `);

    const row = stmt.get(sessionId) as any;
    if (!row) return null;

    return {
      ...row,
      data: JSON.parse(row.data),
      created_at: new Date(row.created_at),
      last_accessed: new Date(row.last_accessed)
    };
  }

  /**
   * Promote session to hot tier (access-based promotion)
   */
  private async promoteToHot(sessionId: string, currentData: any, fromTier: StorageTier): Promise<void> {
    // Remove from current tier
    await this.removeFromTier(fromTier, sessionId);

    // Add to hot tier with updated access count
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO research_sessions_hot 
      (session_id, user_id, query, status, research_type, data, last_accessed, created_at, access_count, promoted_from, tier_entered_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      sessionId,
      currentData.user_id,
      currentData.query,
      currentData.status,
      currentData.research_type,
      JSON.stringify(currentData.data),
      currentData.created_at.toISOString(),
      currentData.access_count + 1,
      fromTier
    );

    // Log the promotion
    await this.logTierMigration(sessionId, fromTier, 'hot', 'access', currentData.access_count);
  }

  /**
   * Remove data from specific tier
   */
  private async removeFromTier(tier: StorageTier, sessionId: string): Promise<void> {
    if (tier === 'redis') {
      await this.redis.del(`research:active:${sessionId}`);
      await this.redis.sRem('research:active_sessions', sessionId);
      return;
    }

    const tableName = `research_sessions_${tier}`;
    const stmt = this.db.prepare(`DELETE FROM ${tableName} WHERE session_id = ?`);
    stmt.run(sessionId);
  }

  /**
   * Update last accessed timestamp
   */
  private async updateLastAccessed(tier: StorageTier, sessionId: string): Promise<void> {
    if (tier === 'redis') {
      const data = await this.redis.get(`research:active:${sessionId}`);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.last_accessed = new Date().toISOString();
        parsed.access_count = (parsed.access_count || 0) + 1;
        await this.redis.setEx(`research:active:${sessionId}`, 3600, JSON.stringify(parsed));
      }
      return;
    }

    const tableName = `research_sessions_${tier}`;
    const stmt = this.db.prepare(`
      UPDATE ${tableName} 
      SET last_accessed = datetime('now'), access_count = access_count + 1 
      WHERE session_id = ?
    `);
    stmt.run(sessionId);
  }

  /**
   * Log tier migration for analytics
   */
  private async logTierMigration(
    sessionId: string, 
    fromTier: StorageTier, 
    toTier: StorageTier, 
    reason: string, 
    accessCount: number
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO tier_migrations 
      (session_id, from_tier, to_tier, reason, access_count_at_migration)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(sessionId, fromTier, toTier, reason, accessCount);
  }

  /**
   * Cleanup process - runs periodically to age data through tiers
   */
  private startCleanupProcess(): void {
    const intervalMs = this.config.cleanup_interval_hours * 60 * 60 * 1000;
    
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, intervalMs);

    // Also run cleanup on startup
    setTimeout(() => this.performCleanup(), 5000);
  }

  /**
   * Perform tier aging and cleanup
   */
  private async performCleanup(): Promise<void> {
    console.log('🧠 Starting temporal memory cleanup...');

    try {
      // 1. Age hot -> warm (data older than hot_days)
      await this.ageTier('hot', 'warm', this.config.tier_durations.hot_days);

      // 2. Age warm -> cold (data older than warm_days)  
      await this.ageTier('warm', 'cold', this.config.tier_durations.warm_days);

      // 3. Age cold -> trash (data older than cold_days)
      await this.ageTier('cold', 'trash', this.config.tier_durations.cold_days);

      // 4. Delete from trash (data older than trash_days)
      await this.permanentDelete(this.config.tier_durations.trash_days);

      // 5. Clean expired Redis sessions
      await this.cleanExpiredRedisSessions();

      console.log('✅ Temporal memory cleanup completed');
    } catch (error) {
      console.error('❌ Error during temporal memory cleanup:', error);
    }
  }

  /**
   * Age data from one tier to another
   */
  private async ageTier(fromTier: StorageTier, toTier: StorageTier, daysThreshold: number): Promise<void> {
    const fromTable = `research_sessions_${fromTier}`;
    const toTable = `research_sessions_${toTier}`;

    // Find sessions to age
    const selectStmt = this.db.prepare(`
      SELECT * FROM ${fromTable} 
      WHERE tier_entered_at < datetime('now', '-${daysThreshold} days')
      ORDER BY tier_entered_at ASC
    `);

    const sessionsToAge = selectStmt.all() as any[];

    if (sessionsToAge.length === 0) return;

    console.log(`📦 Aging ${sessionsToAge.length} sessions from ${fromTier} to ${toTier}`);

    // Begin transaction
    const transaction = this.db.transaction(() => {
      const insertStmt = this.db.prepare(`
        INSERT INTO ${toTable} 
        (session_id, user_id, query, status, research_type, data, last_accessed, created_at, access_count, promoted_from, tier_entered_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      const deleteStmt = this.db.prepare(`DELETE FROM ${fromTable} WHERE session_id = ?`);

      for (const session of sessionsToAge) {
        // Insert into new tier
        insertStmt.run(
          session.session_id,
          session.user_id,
          session.query,
          session.status,
          session.research_type,
          session.data,
          session.last_accessed,
          session.created_at,
          session.access_count,
          fromTier
        );

        // Remove from old tier
        deleteStmt.run(session.session_id);

        // Log migration
        this.logTierMigration(session.session_id, fromTier, toTier, 'age', session.access_count);
      }
    });

    transaction();
  }

  /**
   * Permanently delete old trash data
   */
  private async permanentDelete(trashDaysThreshold: number): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM research_sessions_trash 
      WHERE scheduled_deletion < datetime('now')
    `);

    const deletedCount = stmt.run().changes;
    if (deletedCount > 0) {
      console.log(`🗑️ Permanently deleted ${deletedCount} old research sessions`);
    }
  }

  /**
   * Clean expired Redis sessions
   */
  private async cleanExpiredRedisSessions(): Promise<void> {
    const activeSessionIds = await this.redis.sMembers('research:active_sessions');
    let cleanedCount = 0;

    for (const sessionId of activeSessionIds) {
      const exists = await this.redis.exists(`research:active:${sessionId}`);
      if (!exists) {
        await this.redis.sRem('research:active_sessions', sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired Redis session references`);
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<any> {
    const stats = {
      redis: {
        active_sessions: await this.redis.sCard('research:active_sessions'),
        memory_usage: await this.redis.memory('usage') || 0
      },
      hot: this.db.prepare('SELECT COUNT(*) as count FROM research_sessions_hot').get(),
      warm: this.db.prepare('SELECT COUNT(*) as count FROM research_sessions_warm').get(),
      cold: this.db.prepare('SELECT COUNT(*) as count FROM research_sessions_cold').get(),
      trash: this.db.prepare('SELECT COUNT(*) as count FROM research_sessions_trash').get(),
      migrations_today: this.db.prepare(`
        SELECT COUNT(*) as count FROM tier_migrations 
        WHERE migration_time > datetime('now', '-1 day')
      `).get()
    };

    return stats;
  }

  /**
   * Search sessions across all tiers
   */
  async searchSessions(userId: string, query?: string, limit: number = 20): Promise<TieredData[]> {
    const results: TieredData[] = [];

    // Search hot tier first (most relevant)
    const searchTier = (tier: StorageTier, tableName: string) => {
      let sql = `SELECT * FROM ${tableName} WHERE user_id = ?`;
      const params: any[] = [userId];

      if (query) {
        sql += ` AND (query LIKE ? OR data LIKE ?)`;
        params.push(`%${query}%`, `%${query}%`);
      }

      sql += ` ORDER BY last_accessed DESC LIMIT ?`;
      params.push(limit - results.length);

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as any[];

      for (const row of rows) {
        results.push({
          tier,
          last_accessed: new Date(row.last_accessed),
          created_at: new Date(row.created_at),
          access_count: row.access_count,
          promoted_from: row.promoted_from,
          data: JSON.parse(row.data)
        });
      }
    };

    // Search in order of relevance
    if (results.length < limit) searchTier('hot', 'research_sessions_hot');
    if (results.length < limit) searchTier('warm', 'research_sessions_warm');  
    if (results.length < limit) searchTier('cold', 'research_sessions_cold');

    return results;
  }

  // ==================== HYBRID REDIS + SQLITE CACHING ====================

  /**
   * Generate URL hash for content caching
   */
  private generateUrlHash(url: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(url.toLowerCase().trim()).digest('hex').substring(0, 16);
  }

  /**
   * Get cached crawl content from Redis
   */
  async getCachedContent(url: string): Promise<any | null> {
    this.ensureInitialized();
    
    try {
      const urlHash = this.generateUrlHash(url);
      const cacheKey = `crawl:content:${urlHash}`;
      
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        console.log(`🎯 Redis cache HIT for URL: ${url.substring(0, 60)}...`);
        return JSON.parse(cachedData);
      }
      
      return null;
    } catch (error) {
      console.error('Redis cache lookup failed:', error);
      return null;
    }
  }

  /**
   * Cache crawl content in Redis with TTL
   */
  async setCachedContent(url: string, content: any, ttlHours: number = 24): Promise<void> {
    this.ensureInitialized();
    
    try {
      const urlHash = this.generateUrlHash(url);
      const cacheKey = `crawl:content:${urlHash}`;
      const ttlSeconds = ttlHours * 3600;
      
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(content));
      console.log(`💾 Cached content for URL: ${url.substring(0, 60)}... (TTL: ${ttlHours}h)`);
    } catch (error) {
      console.error('Failed to cache content:', error);
    }
  }

  /**
   * Get multiple cached contents at once (pipeline for efficiency)
   */
  async getMultipleCachedContents(urls: string[]): Promise<{url: string, content: any | null}[]> {
    this.ensureInitialized();
    
    if (urls.length === 0) return [];

    try {
      const pipeline = this.redis.multi();
      const urlHashes = urls.map(url => this.generateUrlHash(url));
      
      // Add all GET commands to pipeline
      urlHashes.forEach(hash => {
        pipeline.get(`crawl:content:${hash}`);
      });
      
      const results = await pipeline.exec();
      
      return urls.map((url, index) => {
        const result = results?.[index];
        let content = null;
        
        if (result && result[1]) {
          try {
            content = JSON.parse(result[1] as string);
            console.log(`🎯 Pipeline cache HIT for: ${url.substring(0, 40)}...`);
          } catch (e) {
            console.warn('Failed to parse cached content for:', url);
          }
        }
        
        return { url, content };
      });
    } catch (error) {
      console.error('Pipeline cache lookup failed:', error);
      return urls.map(url => ({ url, content: null }));
    }
  }

  /**
   * Store active research session in Redis (fast access)  
   */
  async storeActiveSession(sessionId: string, sessionData: any, ttlHours: number = 2): Promise<void> {
    this.ensureInitialized();
    
    try {
      const cacheKey = `session:active:${sessionId}`;
      const ttlSeconds = ttlHours * 3600;
      
      await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(sessionData));
      console.log(`🔄 Stored active session in Redis: ${sessionId} (TTL: ${ttlHours}h)`);
    } catch (error) {
      console.error('Failed to store active session:', error);
    }
  }

  /**
   * Get active research session from Redis
   */
  async getActiveSession(sessionId: string): Promise<any | null> {
    this.ensureInitialized();
    
    try {
      const cacheKey = `session:active:${sessionId}`;
      const sessionData = await this.redis.get(cacheKey);
      
      if (sessionData) {
        return JSON.parse(sessionData);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  }

  /**
   * Move completed session from Redis to SQLite for long-term storage
   */
  async archiveCompletedSession(sessionId: string, completedSessionData: any): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Store in SQLite for long-term persistence
      await this.completeResearchSession(sessionId, completedSessionData);
      
      // Remove from Redis (no longer active)
      const activeKey = `session:active:${sessionId}`;
      await this.redis.del(activeKey);
      
      console.log(`📚 Archived session ${sessionId}: Redis → SQLite`);
    } catch (error) {
      console.error('Failed to archive session:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    redis_keys: number;
    cached_contents: number;
    active_sessions: number;
    memory_usage: string;
    hit_ratio_estimate: number;
  }> {
    this.ensureInitialized();
    
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Count different types of keys
      const contentKeys = await this.redis.keys('crawl:content:*');
      const sessionKeys = await this.redis.keys('session:active:*');
      
      // Extract memory usage from info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
      
      // Simple hit ratio estimation (would need counters for real metrics)
      const hitRatio = 0.85; // Placeholder - implement proper hit tracking if needed
      
      return {
        redis_keys: contentKeys.length + sessionKeys.length,
        cached_contents: contentKeys.length,
        active_sessions: sessionKeys.length,
        memory_usage: memoryUsage,
        hit_ratio_estimate: hitRatio
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        redis_keys: 0,
        cached_contents: 0,
        active_sessions: 0,
        memory_usage: 'unknown',
        hit_ratio_estimate: 0
      };
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    await this.redis.quit();
    this.db.close();
  }
}

export default TemporalMemoryManager;