/**
 * Python Agent Service Client
 * 
 * This client connects to the Python FastAPI service for advanced processing
 * capabilities that require Python-specific libraries or heavy computation.
 */

export interface PythonProcessingRequest {
  task_type: string;
  data: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface PythonProcessingResponse {
  success: boolean;
  result: Record<string, any>;
  processing_time: number;
  error?: string;
}

export interface AgentAnalytics {
  agent_id: string;
  total_runs: number;
  success_rate: number;
  avg_response_time: number;
  last_activity?: string;
}

export class PythonAgentClient {
  private baseUrl: string;
  private isAvailable: boolean = false;

  constructor() {
    this.baseUrl = process.env.PYTHON_AGENT_SERVICE_URL || 'http://localhost:8001';
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      this.isAvailable = response.ok;
    } catch (error) {
      this.isAvailable = false;
      console.warn('[PythonAgentClient] Python service not available:', error);
    }
  }

  async getHealth(): Promise<any> {
    if (!this.isAvailable) {
      throw new Error('Python agent service is not available');
    }

    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return await response.json();
  }

  async getAgentAnalytics(): Promise<AgentAnalytics[]> {
    if (!this.isAvailable) {
      // Return empty analytics if Python service not available
      console.warn('[PythonAgentClient] Python service not available, returning empty analytics');
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/agents/analytics`);
      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[PythonAgentClient] Failed to get analytics:', error);
      return [];
    }
  }

  async processWithPython(request: PythonProcessingRequest): Promise<PythonProcessingResponse> {
    if (!this.isAvailable) {
      throw new Error('Python agent service is not available for processing');
    }

    const response = await fetch(`${this.baseUrl}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Processing failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getCapabilities(): Promise<any> {
    if (!this.isAvailable) {
      return {
        task_types: [],
        libraries: [],
        status: 'unavailable'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/capabilities`);
      if (!response.ok) {
        throw new Error(`Failed to get capabilities: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[PythonAgentClient] Failed to get capabilities:', error);
      return {
        task_types: [],
        libraries: [],
        status: 'error'
      };
    }
  }

  // Convenience methods for specific processing types
  async analyzeData(data: Record<string, any>): Promise<PythonProcessingResponse> {
    return this.processWithPython({
      task_type: 'data_analysis',
      data
    });
  }

  async runMLInference(data: Record<string, any>, parameters?: Record<string, any>): Promise<PythonProcessingResponse> {
    return this.processWithPython({
      task_type: 'ml_inference',
      data,
      parameters
    });
  }

  async processText(text: string): Promise<PythonProcessingResponse> {
    return this.processWithPython({
      task_type: 'text_processing',
      data: { text }
    });
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  async refreshAvailability(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }
}

// Singleton instance
let pythonClient: PythonAgentClient | null = null;

export function getPythonAgentClient(): PythonAgentClient {
  if (!pythonClient) {
    pythonClient = new PythonAgentClient();
  }
  return pythonClient;
}