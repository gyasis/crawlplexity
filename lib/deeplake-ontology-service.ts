/**
 * DeepLake Ontology Service
 * Provides automatic ontology discovery and knowledge graph generation
 */

import { spawn, ChildProcess } from 'child_process';
import * as msgpack from '@msgpack/msgpack';
import path from 'path';
import { promisify } from 'util';

export interface OntologyEntity {
  id: string;
  label: string;
  type: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface OntologyRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeGraph {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
  metadata: {
    totalEntities: number;
    totalRelationships: number;
    domain: string;
    generatedAt: string;
  };
}

export interface OntologyConfig {
  datasetPath: string;
  domain?: string;
  minConfidence?: number;
  maxEntities?: number;
  enableClustering?: boolean;
  enableRelationshipDiscovery?: boolean;
}

export class DeepLakeOntologyService {
  private pythonProcess: ChildProcess | null = null;
  private isProcessReady = false;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private messageQueue: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor(private config?: Partial<OntologyConfig>) {
    this.initializationPromise = this.initialize();
  }

  /**
   * Initialize Python subprocess for ontology processing
   */
  private async initialize(): Promise<void> {
    try {
      const projectRoot = process.cwd();
      const pythonPath = process.env.PYTHON_PATH || '/home/gyasis/miniconda3/envs/deeplake/bin/python3';
      const ontologyScript = path.resolve(projectRoot, 'python/utils/ontology_service.py');
      
      const env = {
        ...process.env,
        PYTHONPATH: `${path.resolve(projectRoot, 'python')}:${process.env.PYTHONPATH || ''}`,
      };

      console.log(`🧠 Starting DeepLake Ontology Service:`);
      console.log(`  - Python: ${pythonPath}`);
      console.log(`  - Script: ${ontologyScript}`);

      this.pythonProcess = spawn(pythonPath, [ontologyScript], {
        cwd: projectRoot,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.setupMessageHandling();
      await this.waitForReady();

      const testResult = await this.sendCommand('test', {});
      console.log('✅ Ontology Service test successful:', testResult);

      this.initialized = true;
      console.log('✅ DeepLake Ontology Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Ontology Service:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Generate ontology from DeepLake dataset
   */
  async generateOntology(config: OntologyConfig): Promise<KnowledgeGraph> {
    await this.ensureInitialized();

    const params = {
      dataset_path: config.datasetPath,
      domain: config.domain || 'general',
      min_confidence: config.minConfidence || 0.7,
      max_entities: config.maxEntities || 1000,
      enable_clustering: config.enableClustering ?? true,
      enable_relationship_discovery: config.enableRelationshipDiscovery ?? true
    };

    const result = await this.sendCommand('generate_ontology', params);
    return result as KnowledgeGraph;
  }

  /**
   * Discover entities from text data
   */
  async discoverEntities(texts: string[]): Promise<OntologyEntity[]> {
    await this.ensureInitialized();

    const params = {
      texts: texts,
      min_confidence: this.config?.minConfidence || 0.7
    };

    const result = await this.sendCommand('discover_entities', params);
    return result as OntologyEntity[];
  }

  /**
   * Extract relationships between entities
   */
  async extractRelationships(entities: OntologyEntity[], texts: string[]): Promise<OntologyRelationship[]> {
    await this.ensureInitialized();

    const params = {
      entities: entities,
      texts: texts,
      min_confidence: this.config?.minConfidence || 0.6
    };

    const result = await this.sendCommand('extract_relationships', params);
    return result as OntologyRelationship[];
  }

  /**
   * Query knowledge graph
   */
  async queryKnowledgeGraph(query: string, graph: KnowledgeGraph): Promise<any> {
    await this.ensureInitialized();

    const params = {
      query: query,
      graph: graph
    };

    const result = await this.sendCommand('query_graph', params);
    return result;
  }

  /**
   * Update ontology with new data
   */
  async updateOntology(graph: KnowledgeGraph, newData: any[]): Promise<KnowledgeGraph> {
    await this.ensureInitialized();

    const params = {
      existing_graph: graph,
      new_data: newData
    };

    const result = await this.sendCommand('update_ontology', params);
    return result as KnowledgeGraph;
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializationPromise;
    }
  }

  private setupMessageHandling(): void {
    if (!this.pythonProcess) return;

    this.pythonProcess.stdout?.on('data', (data) => {
      try {
        const messages = data.toString().split('\n').filter(line => line.trim());
        
        for (const messageStr of messages) {
          if (messageStr.trim()) {
            const message = JSON.parse(messageStr);
            this.handleMessage(message);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      console.error('Python stderr:', data.toString());
    });

    this.pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
    });

    this.pythonProcess.on('exit', (code) => {
      console.log('Python process exited with code:', code);
      this.cleanup();
    });
  }

  private handleMessage(message: any): void {
    const { id, result, error } = message;
    
    const pending = this.messageQueue.get(id);
    if (pending) {
      this.messageQueue.delete(id);
      
      if (error) {
        pending.reject(new Error(error));
      } else {
        pending.resolve(result);
      }
    }
  }

  private async waitForReady(timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout waiting for Python process to be ready'));
      }, timeout);

      const checkReady = () => {
        if (this.isProcessReady) {
          clearTimeout(timer);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }

  private async sendCommand(command: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substr(2, 9);
      
      this.messageQueue.set(id, { resolve, reject });
      
      const message = {
        id,
        command,
        params
      };
      
      this.pythonProcess?.stdin?.write(JSON.stringify(message) + '\n');
    });
  }

  private cleanup(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
    this.isProcessReady = false;
    this.initialized = false;
  }

  async close(): Promise<void> {
    this.cleanup();
  }
}

// Singleton instance
let ontologyServiceInstance: DeepLakeOntologyService | null = null;

export function getOntologyService(config?: Partial<OntologyConfig>): DeepLakeOntologyService {
  if (!ontologyServiceInstance) {
    ontologyServiceInstance = new DeepLakeOntologyService(config);
  }
  return ontologyServiceInstance;
}

export async function closeOntologyService(): Promise<void> {
  if (ontologyServiceInstance) {
    await ontologyServiceInstance.close();
    ontologyServiceInstance = null;
  }
} 