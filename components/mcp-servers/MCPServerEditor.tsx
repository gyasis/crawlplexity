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
  Terminal, 
  Globe,
  Play, 
  Save,
  X,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { MCPServer } from './MCPServerCard';
import { cn } from '@/lib/utils';

interface MCPServerEditorProps {
  server?: MCPServer | null;
  onSave: (serverData: any) => void;
  onCancel: () => void;
}

interface EnvVariable {
  key: string;
  value: string;
}

const serverTypes = [
  { value: 'stdio', label: 'Stdio', icon: Terminal, description: 'Local process communication' },
  { value: 'http', label: 'HTTP', icon: Globe, description: 'Remote server communication' }
];

const commonServers = [
  {
    name: 'context7',
    type: 'stdio',
    command: 'npx',
    args: ['@upstash/context7-mcp@latest'],
    description: 'Real-time documentation server'
  },
  {
    name: 'filesystem',
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '.'],
    description: 'File system access server'
  },
  {
    name: 'github',
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
    description: 'GitHub integration server',
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' }
  },
  {
    name: 'postgres',
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-postgres'],
    description: 'PostgreSQL database server',
    env: { DATABASE_URL: '' }
  }
];

export function MCPServerEditor({ server, onSave, onCancel }: MCPServerEditorProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'stdio' as 'stdio' | 'http',
    command: '',
    url: ''
  });

  const [args, setArgs] = useState<string[]>([]);
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Initialize form data from server
  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        type: server.type,
        command: server.command || '',
        url: server.url || ''
      });

      setArgs(server.args || []);
      
      if (server.env) {
        setEnvVars(Object.entries(server.env).map(([key, value]) => ({ key, value })));
      }
    }
  }, [server]);

  const addArg = () => {
    setArgs([...args, '']);
  };

  const removeArg = (index: number) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  const updateArg = (index: number, value: string) => {
    const updated = [...args];
    updated[index] = value;
    setArgs(updated);
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: keyof EnvVariable, value: string) => {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: value };
    setEnvVars(updated);
  };

  const loadTemplate = (template: any) => {
    setFormData({
      name: template.name,
      type: template.type,
      command: template.command || '',
      url: template.url || ''
    });
    setArgs(template.args || []);
    
    if (template.env) {
      setEnvVars(Object.entries(template.env).map(([key, value]) => ({ key, value })));
    } else {
      setEnvVars([]);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      // Mock connection test - in production, this would call the backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (formData.type === 'stdio' && !formData.command) {
        setTestResult({
          success: false,
          message: 'Command is required for stdio servers'
        });
      } else if (formData.type === 'http' && !formData.url) {
        setTestResult({
          success: false,
          message: 'URL is required for HTTP servers'
        });
      } else {
        setTestResult({
          success: true,
          message: 'Connection test successful!',
          capabilities: ['tool_calling', 'resource_access']
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed: Server unreachable'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const serverData = {
      ...formData,
      args: args.filter(arg => arg.trim()),
      env: envVars.reduce((acc, { key, value }) => {
        if (key.trim() && value.trim()) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {} as Record<string, string>)
    };

    onSave(serverData);
  };

  const isFormValid = formData.name && 
    ((formData.type === 'stdio' && formData.command) || 
     (formData.type === 'http' && formData.url));

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {server ? 'Edit MCP Server' : 'Add New MCP Server'}
            {formData.type && (
              <Badge variant="outline" className="ml-2 flex items-center gap-1">
                {formData.type === 'stdio' ? <Terminal className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {formData.type.toUpperCase()}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="env">Environment</TabsTrigger>
              <TabsTrigger value="test">Test Connection</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4">
              <TabsContent value="basic" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Server Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., context7"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Server Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serverTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              <div>
                                <div>{type.label}</div>
                                <div className="text-xs text-gray-500">{type.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.type === 'stdio' && (
                  <div>
                    <Label htmlFor="command">Command</Label>
                    <Input
                      id="command"
                      value={formData.command}
                      onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      placeholder="e.g., npx"
                    />
                  </div>
                )}

                {formData.type === 'http' && (
                  <div>
                    <Label htmlFor="url">Server URL</Label>
                    <Input
                      id="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="e.g., https://api.example.com/mcp"
                    />
                  </div>
                )}

                {/* Quick Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {commonServers.map((template) => (
                        <Button
                          key={template.name}
                          variant="outline"
                          size="sm"
                          onClick={() => loadTemplate(template)}
                          className="justify-start text-left h-auto p-3"
                        >
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-gray-500">{template.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="config" className="space-y-4 m-0">
                {formData.type === 'stdio' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>Command Arguments</Label>
                      <Button onClick={addArg} size="sm" className="gap-1">
                        <Plus className="w-3 h-3" />
                        Add Arg
                      </Button>
                    </div>

                    {args.length === 0 ? (
                      <Card>
                        <CardContent className="text-center py-8 text-gray-500">
                          No arguments defined. Click "Add Arg" to start.
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {args.map((arg, index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <Input
                              value={arg}
                              onChange={(e) => updateArg(index, e.target.value)}
                              placeholder={`Argument ${index + 1}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeArg(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.command && (
                      <Card className="bg-gray-50">
                        <CardContent className="pt-4">
                          <div className="text-sm font-medium text-gray-700 mb-2">Command Preview:</div>
                          <code className="text-sm bg-white p-2 rounded border block">
                            {formData.command} {args.filter(a => a.trim()).join(' ')}
                          </code>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="env" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <Label>Environment Variables</Label>
                  <Button onClick={addEnvVar} size="sm" className="gap-1">
                    <Plus className="w-3 h-3" />
                    Add Variable
                  </Button>
                </div>

                {envVars.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8 text-gray-500">
                      No environment variables defined.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {envVars.map((envVar, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-4">
                              <Label>Variable Name</Label>
                              <Input
                                value={envVar.key}
                                onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                                placeholder="VARIABLE_NAME"
                              />
                            </div>
                            
                            <div className="col-span-7">
                              <Label>Value</Label>
                              <Input
                                value={envVar.value}
                                onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                                placeholder="Variable value"
                                type={envVar.key.toLowerCase().includes('token') || 
                                     envVar.key.toLowerCase().includes('key') || 
                                     envVar.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                              />
                            </div>
                            
                            <div className="col-span-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEnvVar(index)}
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

                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <div className="font-medium text-amber-800 mb-1">Security Notice</div>
                        <div className="text-amber-700">
                          Environment variables may contain sensitive information. 
                          Ensure proper access controls are in place.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="test" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Test Connection</h3>
                  <Button 
                    onClick={testConnection} 
                    disabled={isTesting || !isFormValid}
                    className="gap-2"
                  >
                    <Play className="w-3 h-3" />
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>

                {testResult && (
                  <Card className={cn(
                    'border-2',
                    testResult.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  )}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        {testResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className={cn(
                            'font-medium',
                            testResult.success ? 'text-green-800' : 'text-red-800'
                          )}>
                            {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                          </div>
                          <div className={cn(
                            'text-sm mt-1',
                            testResult.success ? 'text-green-700' : 'text-red-700'
                          )}>
                            {testResult.message}
                          </div>
                          {testResult.capabilities && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-green-800 mb-1">
                                Available Capabilities:
                              </div>
                              <div className="flex gap-1">
                                {testResult.capabilities.map((cap: string) => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Server Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {formData.name || 'Not set'}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {formData.type.toUpperCase()}
                      </div>
                      {formData.type === 'stdio' && (
                        <>
                          <div>
                            <span className="font-medium">Command:</span> {formData.command || 'Not set'}
                          </div>
                          <div>
                            <span className="font-medium">Arguments:</span> {args.filter(a => a.trim()).length}
                          </div>
                        </>
                      )}
                      {formData.type === 'http' && (
                        <div className="col-span-2">
                          <span className="font-medium">URL:</span> {formData.url || 'Not set'}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Environment Variables:</span> {envVars.filter(e => e.key.trim()).length}
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
              onClick={testConnection}
              disabled={isTesting || !isFormValid}
            >
              Test
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!isFormValid}
              className="gap-2"
            >
              <Save className="w-3 h-3" />
              {server ? 'Update Server' : 'Add Server'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}