/**
 * Tests for Query Deconstruction module
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock Python modules for testing
const mockQueryDeconModule = {
  async initialize() {
    return { status: 'initialized' };
  },
  
  async deconstruct_query(query: string, query_type: string, max_queries: number) {
    // Return mock msgpack data
    const mockDeconstruction = {
      query_id: 'test-query-456',
      original_query: query,
      deconstruction: {
        queries: [
          {
            id: 'q_1',
            query: 'quantum computing developments 2024',
            complexity_score: 3.5,
            semantic_group: 'quantum_tech',
            search_priority: 5,
            estimated_results: 150,
            keywords: ['quantum', 'computing', 'developments', '2024']
          },
          {
            id: 'q_2',
            query: 'quantum cryptography applications',
            complexity_score: 4.0,
            semantic_group: 'quantum_crypto',
            search_priority: 4,
            estimated_results: 120,
            keywords: ['quantum', 'cryptography', 'applications']
          }
        ],
        semantic_groups: [
          {
            name: 'Quantum Technology',
            queries: ['q_1'],
            common_theme: 'Latest quantum computing advances',
            search_strategy: 'parallel'
          },
          {
            name: 'Quantum Cryptography',
            queries: ['q_2'],
            common_theme: 'Cryptographic applications of quantum tech',
            search_strategy: 'independent'
          }
        ],
        parallel_score: 8.5,
        complexity_reduction: 0.65
      },
      metadata: {
        query_type: query_type,
        created_at: new Date().toISOString(),
        optimization_version: '1.0.0'
      }
    };
    
    // Mock msgpack encoding
    return new Uint8Array(Buffer.from(JSON.stringify(mockDeconstruction)));
  }
};

// Mock PyBridge
jest.mock('pybridge', () => ({
  PyBridge: jest.fn().mockImplementation(() => ({
    controller: jest.fn().mockReturnValue(mockQueryDeconModule),
    close: jest.fn()
  }))
}));

// Mock msgpack
jest.mock('@msgpack/msgpack', () => ({
  decode: jest.fn((data) => JSON.parse(Buffer.from(data).toString())),
  encode: jest.fn((data) => new Uint8Array(Buffer.from(JSON.stringify(data))))
}));

// Mock cache manager
jest.mock('@/lib/cache-manager', () => ({
  getCacheManager: jest.fn(() => ({
    generateCacheKey: jest.fn(() => 'test-cache-key'),
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve())
  }))
}));

import { getDSPyService } from '@/lib/utils/services/dspy-service';

describe('Query Deconstruction Module', () => {
  let dspyService: any;

  beforeAll(async () => {
    dspyService = getDSPyService();
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (dspyService) {
      await dspyService.close();
    }
  });

  describe('Query Deconstruction', () => {
    it('should deconstruct a complex query', async () => {
      const query = 'What are the latest developments in quantum computing and their applications in cryptography?';
      const options = {
        query_type: 'research' as const,
        max_queries: 4,
        include_semantic_groups: true
      };

      const result = await dspyService.deconstructQuery(query, options);

      expect(result).toBeDefined();
      expect(result.query_id).toBeDefined();
      expect(result.original_query).toBe(query);
      expect(result.deconstruction).toBeDefined();
      expect(result.deconstruction.queries).toBeInstanceOf(Array);
      expect(result.deconstruction.queries.length).toBeGreaterThan(0);
      expect(result.deconstruction.semantic_groups).toBeInstanceOf(Array);
      expect(result.deconstruction.parallel_score).toBeGreaterThan(0);
      expect(result.deconstruction.complexity_reduction).toBeGreaterThan(0);
      expect(result.metadata.query_type).toBe('research');
    });

    it('should validate deconstructed query structure', async () => {
      const query = 'AI impact on healthcare systems';
      const options = {
        query_type: 'analysis' as const,
        max_queries: 3
      };

      const result = await dspyService.deconstructQuery(query, options);
      const queries = result.deconstruction.queries;

      expect(queries).toBeInstanceOf(Array);
      
      queries.forEach((q: any) => {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('query');
        expect(q).toHaveProperty('complexity_score');
        expect(q).toHaveProperty('semantic_group');
        expect(q).toHaveProperty('search_priority');
        expect(q).toHaveProperty('estimated_results');
        expect(q).toHaveProperty('keywords');
        
        expect(typeof q.id).toBe('string');
        expect(typeof q.query).toBe('string');
        expect(typeof q.complexity_score).toBe('number');
        expect(typeof q.semantic_group).toBe('string');
        expect(typeof q.search_priority).toBe('number');
        expect(typeof q.estimated_results).toBe('number');
        expect(Array.isArray(q.keywords)).toBe(true);
        
        expect(q.complexity_score).toBeGreaterThan(0);
        expect(q.complexity_score).toBeLessThanOrEqual(10);
        expect(q.search_priority).toBeGreaterThan(0);
        expect(q.search_priority).toBeLessThanOrEqual(5);
        expect(q.estimated_results).toBeGreaterThan(0);
        expect(q.query.trim().length).toBeGreaterThan(0);
      });
    });

    it('should validate semantic groups structure', async () => {
      const query = 'Climate change effects on agriculture and food security';
      const result = await dspyService.deconstructQuery(query);
      const groups = result.deconstruction.semantic_groups;

      expect(groups).toBeInstanceOf(Array);
      
      groups.forEach((group: any) => {
        expect(group).toHaveProperty('name');
        expect(group).toHaveProperty('queries');
        expect(group).toHaveProperty('common_theme');
        expect(group).toHaveProperty('search_strategy');
        
        expect(typeof group.name).toBe('string');
        expect(Array.isArray(group.queries)).toBe(true);
        expect(typeof group.common_theme).toBe('string');
        expect(typeof group.search_strategy).toBe('string');
        
        expect(group.name.trim().length).toBeGreaterThan(0);
        expect(group.queries.length).toBeGreaterThan(0);
        expect(['parallel', 'sequential', 'independent']).toContain(group.search_strategy);
      });
    });

    it('should handle different query types', async () => {
      const queryTypes = ['research', 'search', 'analysis', 'general'] as const;
      
      for (const queryType of queryTypes) {
        const query = `Sample ${queryType} query about machine learning`;
        const result = await dspyService.deconstructQuery(query, { query_type: queryType });
        
        expect(result.metadata.query_type).toBe(queryType);
        expect(result.deconstruction.queries.length).toBeGreaterThan(0);
      }
    });

    it('should respect max_queries parameter', async () => {
      const query = 'Complex multi-faceted research question with many aspects';
      const maxQueries = 3;
      
      const result = await dspyService.deconstructQuery(query, { max_queries: maxQueries });
      
      expect(result.deconstruction.queries.length).toBeLessThanOrEqual(maxQueries);
    });

    it('should achieve meaningful complexity reduction', async () => {
      const query = 'Comprehensive analysis of blockchain technology impacts on financial systems, regulatory challenges, and future adoption patterns across different industries';
      
      const result = await dspyService.deconstructQuery(query);
      
      // Should achieve some complexity reduction
      expect(result.deconstruction.complexity_reduction).toBeGreaterThan(0.1);
      expect(result.deconstruction.complexity_reduction).toBeLessThanOrEqual(1.0);
    });

    it('should provide parallel execution scores', async () => {
      const query = 'Multiple independent research topics';
      
      const result = await dspyService.deconstructQuery(query);
      
      expect(result.deconstruction.parallel_score).toBeGreaterThan(0);
      expect(result.deconstruction.parallel_score).toBeLessThanOrEqual(10);
    });
  });

  describe('Query Keywords', () => {
    it('should extract relevant keywords from queries', async () => {
      const query = 'Machine learning applications in healthcare diagnostics';
      
      const result = await dspyService.deconstructQuery(query);
      
      result.deconstruction.queries.forEach((q: any) => {
        expect(q.keywords).toBeInstanceOf(Array);
        expect(q.keywords.length).toBeGreaterThan(0);
        
        // Keywords should be strings
        q.keywords.forEach((keyword: any) => {
          expect(typeof keyword).toBe('string');
          expect(keyword.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty query input', async () => {
      await expect(dspyService.deconstructQuery('')).rejects.toThrow();
      await expect(dspyService.deconstructQuery('   ')).rejects.toThrow();
    });

    it('should handle invalid options', async () => {
      const query = 'Valid query';
      
      // Test invalid max_queries
      await expect(
        dspyService.deconstructQuery(query, { max_queries: 1 })
      ).rejects.toThrow();
      
      await expect(
        dspyService.deconstructQuery(query, { max_queries: 15 })
      ).rejects.toThrow();
    });

    it('should handle minimum complexity reduction threshold', async () => {
      const query = 'Simple query';
      const options = {
        min_complexity_reduction: 0.8 // Very high threshold
      };
      
      // Should still return result even if threshold not met
      const result = await dspyService.deconstructQuery(query, options);
      expect(result).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should use cached results for identical requests', async () => {
      const query = 'Caching test query';
      const options = { query_type: 'general' as const };
      
      // First call
      const result1 = await dspyService.deconstructQuery(query, options);
      
      // Second call (should use cache)
      const result2 = await dspyService.deconstructQuery(query, options);
      
      expect(result1.query_id).toBe(result2.query_id);
    });
  });
});