'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Minus, 
  Code, 
  Play, 
  Save,
  X,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Tool } from './ToolCard';
import { cn } from '@/lib/utils';

interface ToolEditorProps {
  tool?: Tool | null;
  onSave: (toolData: any) => void;
  onCancel: () => void;
}

interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
}

const parameterTypes = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' }
];

const categories = [
  { value: 'data_access', label: 'Data Access', icon: '🗄️' },
  { value: 'computation', label: 'Computation', icon: '🧮' },
  { value: 'communication', label: 'Communication', icon: '📢' },
  { value: 'search', label: 'Search', icon: '🔍' },
  { value: 'utility', label: 'Utility', icon: '🛠️' }
];

export function ToolEditor({ tool, onSave, onCancel }: ToolEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'utility' as const,
    description: '',
    handlerCode: ''
  });

  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [testResult, setTestResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Initialize form data from tool
  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name,
        category: tool.category,
        description: tool.description,
        handlerCode: '' // Would be loaded from API in production
      });

      // Parse parameters
      if (tool.parameters?.properties) {
        const params = Object.entries(tool.parameters.properties).map(([name, param]: [string, any]) => ({
          name,
          type: param.type,
          description: param.description || '',
          required: tool.parameters.required?.includes(name) || false,
          default: param.default,
          enum: param.enum
        }));
        setParameters(params);
      }
    }
  }, [tool]);

  const addParameter = () => {
    setParameters([...parameters, {
      name: '',
      type: 'string',
      description: '',
      required: false
    }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: keyof Parameter, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const validateTool = async () => {
    setIsValidating(true);
    try {
      // Mock validation - in production, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestResult({
        valid: true,
        message: 'Tool validation passed successfully!'
      });
    } catch (error) {
      setTestResult({
        valid: false,
        message: 'Tool validation failed: Invalid handler code'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    // Convert parameters to the expected format
    const parametersSchema = {
      type: 'object',
      properties: parameters.reduce((acc, param) => {
        acc[param.name] = {
          type: param.type,
          description: param.description,
          ...(param.default !== undefined && { default: param.default }),
          ...(param.enum && { enum: param.enum })
        };
        return acc;
      }, {} as any),
      required: parameters.filter(p => p.required).map(p => p.name)
    };

    const toolData = {
      ...formData,
      parameters: parametersSchema
    };

    onSave(toolData);
  };

  const isFormValid = formData.name && formData.description && formData.handlerCode;

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tool ? 'Edit Tool' : 'Create New Tool'}
            {formData.category && (
              <Badge variant="outline" className="ml-2">
                {categories.find(c => c.value === formData.category)?.icon}
                {categories.find(c => c.value === formData.category)?.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="code">Handler Code</TabsTrigger>
              <TabsTrigger value="test">Test & Validate</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4">
              <TabsContent value="basic" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Tool Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., weather_api"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              {cat.icon} {cat.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this tool does and how agents should use it..."
                    rows={3}
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Tool Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div>• Use clear, descriptive names in snake_case</div>
                    <div>• Provide detailed descriptions for agent understanding</div>
                    <div>• Define all required parameters with validation</div>
                    <div>• Include error handling in your tool handler</div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="parameters" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Tool Parameters</h3>
                  <Button onClick={addParameter} size="sm" className="gap-1">
                    <Plus className="w-3 h-3" />
                    Add Parameter
                  </Button>
                </div>

                {parameters.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8 text-gray-500">
                      No parameters defined. Click "Add Parameter" to start.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {parameters.map((param, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-3">
                              <Label>Parameter Name</Label>
                              <Input
                                value={param.name}
                                onChange={(e) => updateParameter(index, 'name', e.target.value)}
                                placeholder="param_name"
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <Label>Type</Label>
                              <Select value={param.type} onValueChange={(value) => updateParameter(index, 'type', value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {parameterTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="col-span-4">
                              <Label>Description</Label>
                              <Input
                                value={param.description}
                                onChange={(e) => updateParameter(index, 'description', e.target.value)}
                                placeholder="Parameter description"
                              />
                            </div>
                            
                            <div className="col-span-2">
                              <Label>Default Value</Label>
                              <Input
                                value={param.default || ''}
                                onChange={(e) => updateParameter(index, 'default', e.target.value)}
                                placeholder="Optional"
                              />
                            </div>
                            
                            <div className="col-span-1 flex items-center gap-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={param.required}
                                  onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                                  className="rounded"
                                />
                                <Label className="text-xs">Required</Label>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeParameter(index)}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="code" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Handler Code</h3>
                  <Badge variant="secondary" className="gap-1">
                    <Code className="w-3 h-3" />
                    TypeScript
                  </Badge>
                </div>

                <Textarea
                  value={formData.handlerCode}
                  onChange={(e) => setFormData({ ...formData, handlerCode: e.target.value })}
                  placeholder={`async function handler(params: any) {
  // Your tool implementation here
  try {
    const { param1, param2 } = params;
    
    // Process the parameters
    const result = await someOperation(param1, param2);
    
    return {
      success: true,
      result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}`}
                  rows={15}
                  className="font-mono text-sm"
                />

                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-amber-800 mb-1">Security Notice</div>
                        <div className="text-amber-700">
                          Tools run in a sandboxed environment with limited access to system resources.
                          Always validate inputs and handle errors gracefully.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Test & Validate Tool</h3>
                  <Button 
                    onClick={validateTool} 
                    disabled={isValidating || !formData.handlerCode}
                    className="gap-2"
                  >
                    <Play className="w-3 h-3" />
                    {isValidating ? 'Validating...' : 'Validate Tool'}
                  </Button>
                </div>

                {testResult && (
                  <Card className={cn(
                    'border-2',
                    testResult.valid 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        {testResult.valid ? (
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        ) : (
                          <X className="w-4 h-4 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <div className={cn(
                            'font-medium',
                            testResult.valid ? 'text-green-800' : 'text-red-800'
                          )}>
                            {testResult.valid ? 'Validation Passed' : 'Validation Failed'}
                          </div>
                          <div className={cn(
                            'text-sm mt-1',
                            testResult.valid ? 'text-green-700' : 'text-red-700'
                          )}>
                            {testResult.message}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tool Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {formData.name || 'Not set'}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {formData.category}
                      </div>
                      <div>
                        <span className="font-medium">Parameters:</span> {parameters.length} 
                        {parameters.filter(p => p.required).length > 0 && 
                          ` (${parameters.filter(p => p.required).length} required)`
                        }
                      </div>
                      <div>
                        <span className="font-medium">Handler:</span> {formData.handlerCode ? 'Defined' : 'Missing'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={validateTool}
              disabled={isValidating || !formData.handlerCode}
            >
              Validate
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isFormValid}
              className="gap-2"
            >
              <Save className="w-3 h-3" />
              {tool ? 'Update Tool' : 'Create Tool'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}