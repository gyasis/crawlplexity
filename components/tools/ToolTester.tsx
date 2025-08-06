'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Code2,
  Copy,
  X
} from 'lucide-react';
import { Tool } from './ToolCard';
import { cn } from '@/lib/utils';

interface ToolTesterProps {
  tool: Tool;
  onClose: () => void;
}

interface TestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
  timestamp?: string;
}

export function ToolTester({ tool, onClose }: ToolTesterProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [testHistory, setTestHistory] = useState<(TestResult & { params: any })[]>([]);

  // Initialize parameters with defaults
  React.useEffect(() => {
    if (tool.parameters?.properties) {
      const initialParams: Record<string, any> = {};
      Object.entries(tool.parameters.properties).forEach(([name, param]: [string, any]) => {
        if (param.default !== undefined) {
          initialParams[name] = param.default;
        } else {
          // Set default values based on type
          switch (param.type) {
            case 'string':
              initialParams[name] = '';
              break;
            case 'number':
              initialParams[name] = 0;
              break;
            case 'boolean':
              initialParams[name] = false;
              break;
            case 'array':
              initialParams[name] = [];
              break;
            case 'object':
              initialParams[name] = {};
              break;
            default:
              initialParams[name] = '';
          }
        }
      });
      setParameters(initialParams);
    }
  }, [tool]);

  const executeTool = async () => {
    setIsExecuting(true);
    setTestResult(null);

    try {
      // Mock tool execution - in production, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Simulate different outcomes based on tool type
      let mockResult;
      if (tool.name === 'calculator') {
        const expr = parameters.expression || '2 + 2';
        try {
          const result = Function(`"use strict"; return (${expr})`)();
          mockResult = {
            success: true,
            result: {
              expression: expr,
              result,
              type: 'number'
            },
            executionTime: 150,
            timestamp: new Date().toISOString()
          };
        } catch {
          mockResult = {
            success: false,
            error: 'Invalid mathematical expression',
            executionTime: 50,
            timestamp: new Date().toISOString()
          };
        }
      } else if (tool.name === 'web_search') {
        mockResult = {
          success: true,
          result: {
            query: parameters.query || 'test query',
            results: [
              {
                title: `Result for: ${parameters.query || 'test query'}`,
                url: 'https://example.com/result1',
                description: 'Mock search result for testing'
              },
              {
                title: `Another result for: ${parameters.query || 'test query'}`,
                url: 'https://example.com/result2',
                description: 'Another mock search result'
              }
            ],
            resultCount: 2
          },
          executionTime: 850,
          timestamp: new Date().toISOString()
        };
      } else {
        mockResult = {
          success: true,
          result: {
            tool: tool.name,
            parameters,
            message: `Tool ${tool.name} executed successfully with test parameters`
          },
          executionTime: 300,
          timestamp: new Date().toISOString()
        };
      }

      setTestResult(mockResult);
      setTestHistory(prev => [{ ...mockResult, params: { ...parameters } }, ...prev.slice(0, 4)]);
    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message,
        executionTime: 100,
        timestamp: new Date().toISOString()
      };
      setTestResult(errorResult);
      setTestHistory(prev => [{ ...errorResult, params: { ...parameters } }, ...prev.slice(0, 4)]);
    } finally {
      setIsExecuting(false);
    }
  };

  const updateParameter = (name: string, value: any) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  const copyResult = () => {
    if (testResult) {
      navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
    }
  };

  const renderParameterInput = (name: string, paramSchema: any) => {
    const value = parameters[name] || '';

    switch (paramSchema.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => updateParameter(name, e.target.checked)}
              className="rounded"
            />
            <Label>{value ? 'true' : 'false'}</Label>
          </div>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateParameter(name, Number(e.target.value))}
            placeholder={paramSchema.default?.toString()}
          />
        );
      
      case 'array':
      case 'object':
        return (
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateParameter(name, parsed);
              } catch {
                updateParameter(name, e.target.value);
              }
            }}
            placeholder={`Enter JSON ${paramSchema.type}`}
            rows={3}
            className="font-mono text-sm"
          />
        );
      
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateParameter(name, e.target.value)}
            placeholder={paramSchema.default || `Enter ${paramSchema.type}`}
          />
        );
    }
  };

  const paramProperties = tool.parameters?.properties || {};
  const requiredParams = tool.parameters?.required || [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Tool Tester: {tool.name}
            <Badge variant="outline">
              {tool.category.replace('_', ' ')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-6">
          {/* Left Side - Parameters */}
          <div className="space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parameters</CardTitle>
                <p className="text-sm text-gray-600">{tool.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(paramProperties).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    This tool doesn't require any parameters.
                  </p>
                ) : (
                  Object.entries(paramProperties).map(([name, param]: [string, any]) => (
                    <div key={name}>
                      <div className="flex items-center gap-2 mb-2">
                        <Label htmlFor={name} className="font-medium">
                          {name}
                        </Label>
                        {requiredParams.includes(name) && (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            required
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {param.type}
                        </Badge>
                      </div>
                      {param.description && (
                        <p className="text-sm text-gray-600 mb-2">{param.description}</p>
                      )}
                      {renderParameterInput(name, param)}
                      {param.enum && (
                        <p className="text-xs text-gray-500 mt-1">
                          Options: {param.enum.join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                )}

                <div className="pt-4 border-t">
                  <Button 
                    onClick={executeTool}
                    disabled={isExecuting}
                    className="w-full gap-2"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Execute Tool
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Results */}
          <div className="space-y-4 overflow-y-auto">
            {/* Current Result */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Result</CardTitle>
                {testResult && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResult}
                    className="gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {!testResult ? (
                  <div className="text-center py-8 text-gray-500">
                    Click "Execute Tool" to see results
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={cn(
                        'font-medium',
                        testResult.success ? 'text-green-700' : 'text-red-700'
                      )}>
                        {testResult.success ? 'Success' : 'Error'}
                      </span>
                      {testResult.executionTime && (
                        <>
                          <Clock className="w-4 h-4 text-gray-400 ml-2" />
                          <span className="text-sm text-gray-600">
                            {testResult.executionTime}ms
                          </span>
                        </>
                      )}
                    </div>

                    {/* Result/Error */}
                    <div className="bg-gray-50 rounded-md p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Code2 className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {testResult.success ? 'Output' : 'Error Message'}
                        </span>
                      </div>
                      <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                        {testResult.success 
                          ? JSON.stringify(testResult.result, null, 2)
                          : testResult.error
                        }
                      </pre>
                    </div>

                    {testResult.timestamp && (
                      <p className="text-xs text-gray-500">
                        Executed at {new Date(testResult.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test History */}
            {testHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testHistory.map((test, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {test.success ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              Test #{testHistory.length - index}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {test.executionTime}ms
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Params: {JSON.stringify(test.params, null, 0).substring(0, 100)}
                          {JSON.stringify(test.params).length > 100 && '...'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}