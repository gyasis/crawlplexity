/**
 * Tests for Taskmaster module
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock Python modules for testing
const mockTaskmasterModule = {
  async initialize() {
    return { status: 'initialized' };
  },
  
  async breakdown_task(task: string, task_type: string, max_steps: number) {
    // Return mock msgpack data
    const mockBreakdown = {
      task_id: 'test-task-123',
      original_task: task,
      breakdown: {
        steps: [
          {
            id: 'step_1',
            order: 1,
            title: 'Research Phase',
            description: 'Conduct initial research on the topic',
            estimated_time: 30,
            dependencies: [],
            resources_needed: ['Internet access', 'Research databases'],
            success_criteria: ['Research completed', 'Key findings documented'],
            commands: ['Search academic databases', 'Take notes']
          },
          {
            id: 'step_2',
            order: 2,
            title: 'Analysis Phase', 
            description: 'Analyze gathered information',
            estimated_time: 45,
            dependencies: ['step_1'],
            resources_needed: ['Analysis tools', 'Documentation'],
            success_criteria: ['Analysis completed', 'Insights documented'],
            commands: ['Run analysis', 'Document findings']
          }
        ],
        total_estimated_time: 75,
        complexity_score: 6.5,
        dependencies: []
      },
      metadata: {
        task_type: task_type,
        created_at: new Date().toISOString(),
        optimization_version: '1.0.0'
      }
    };
    
    // Mock msgpack encoding
    return new Uint8Array(Buffer.from(JSON.stringify(mockBreakdown)));
  }
};

// Mock PyBridge
jest.mock('pybridge', () => ({
  PyBridge: jest.fn().mockImplementation(() => ({
    controller: jest.fn().mockReturnValue(mockTaskmasterModule),
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

describe('Taskmaster Module', () => {
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

  describe('Task Breakdown', () => {
    it('should break down a simple task', async () => {
      const task = 'Create a research report on AI ethics';
      const options = {
        task_type: 'research' as const,
        max_steps: 5,
        include_estimates: true
      };

      const result = await dspyService.breakdownTask(task, options);

      expect(result).toBeDefined();
      expect(result.task_id).toBeDefined();
      expect(result.original_task).toBe(task);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.steps).toBeInstanceOf(Array);
      expect(result.breakdown.steps.length).toBeGreaterThan(0);
      expect(result.breakdown.total_estimated_time).toBeGreaterThan(0);
      expect(result.breakdown.complexity_score).toBeGreaterThan(0);
      expect(result.metadata.task_type).toBe('research');
    });

    it('should validate task step structure', async () => {
      const task = 'Develop a mobile app';
      const options = {
        task_type: 'development' as const,
        max_steps: 3
      };

      const result = await dspyService.breakdownTask(task, options);
      const steps = result.breakdown.steps;

      expect(steps).toBeInstanceOf(Array);
      
      steps.forEach((step: any, index: number) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('order');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('estimated_time');
        expect(step).toHaveProperty('dependencies');
        expect(step).toHaveProperty('resources_needed');
        expect(step).toHaveProperty('success_criteria');
        
        expect(typeof step.id).toBe('string');
        expect(typeof step.order).toBe('number');
        expect(typeof step.title).toBe('string');
        expect(typeof step.description).toBe('string');
        expect(typeof step.estimated_time).toBe('number');
        expect(Array.isArray(step.dependencies)).toBe(true);
        expect(Array.isArray(step.resources_needed)).toBe(true);
        expect(Array.isArray(step.success_criteria)).toBe(true);
        
        expect(step.order).toBe(index + 1);
        expect(step.estimated_time).toBeGreaterThan(0);
      });
    });

    it('should handle different task types', async () => {
      const taskTypes = ['research', 'content_creation', 'analysis', 'development', 'general'] as const;
      
      for (const taskType of taskTypes) {
        const task = `Sample ${taskType} task`;
        const result = await dspyService.breakdownTask(task, { task_type: taskType });
        
        expect(result.metadata.task_type).toBe(taskType);
        expect(result.breakdown.steps.length).toBeGreaterThan(0);
      }
    });

    it('should respect max_steps parameter', async () => {
      const task = 'Complex multi-phase project';
      const maxSteps = 3;
      
      const result = await dspyService.breakdownTask(task, { max_steps: maxSteps });
      
      expect(result.breakdown.steps.length).toBeLessThanOrEqual(maxSteps);
    });

    it('should calculate total estimated time correctly', async () => {
      const task = 'Time estimation test';
      const result = await dspyService.breakdownTask(task);
      
      const calculatedTotal = result.breakdown.steps.reduce(
        (sum: number, step: any) => sum + step.estimated_time, 
        0
      );
      
      expect(result.breakdown.total_estimated_time).toBe(calculatedTotal);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty task input', async () => {
      await expect(dspyService.breakdownTask('')).rejects.toThrow();
      await expect(dspyService.breakdownTask('   ')).rejects.toThrow();
    });

    it('should handle invalid options', async () => {
      const task = 'Valid task';
      
      // Test invalid max_steps
      await expect(
        dspyService.breakdownTask(task, { max_steps: 0 })
      ).rejects.toThrow();
      
      await expect(
        dspyService.breakdownTask(task, { max_steps: 25 })
      ).rejects.toThrow();
    });
  });

  describe('Caching', () => {
    it('should use cached results for identical requests', async () => {
      const task = 'Caching test task';
      const options = { task_type: 'general' as const };
      
      // First call
      const result1 = await dspyService.breakdownTask(task, options);
      
      // Second call (should use cache)
      const result2 = await dspyService.breakdownTask(task, options);
      
      expect(result1.task_id).toBe(result2.task_id);
    });
  });
});