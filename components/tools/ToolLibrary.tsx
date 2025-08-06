'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Filter, 
  Grid3X3, 
  List, 
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { ToolCard, Tool } from './ToolCard';
import { ToolEditor } from './ToolEditor';
import { ToolTester } from './ToolTester';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ToolLibraryProps {
  className?: string;
}

type ViewMode = 'grid' | 'list';
type CategoryFilter = 'all' | 'data_access' | 'computation' | 'communication' | 'search' | 'utility';

export function ToolLibrary({ className }: ToolLibraryProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showEditor, setShowEditor] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  // Load tools from API
  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  // Filter tools based on search and category
  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group tools by category for stats
  const toolStats = tools.reduce((acc, tool) => {
    acc[tool.category] = (acc[tool.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeTool = tools.filter(t => t.isActive).length;

  const handleCreateTool = () => {
    setEditingTool(null);
    setShowEditor(true);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    setShowEditor(true);
  };

  const handleTestTool = (tool: Tool) => {
    setSelectedTool(tool);
    setShowTester(true);
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    
    try {
      const response = await fetch(`/api/tools?id=${toolId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadTools();
      }
    } catch (error) {
      console.error('Failed to delete tool:', error);
    }
  };

  const handleToggleActive = async (toolId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/tools', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, isActive })
      });
      
      if (response.ok) {
        await loadTools();
      }
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  const handleSaveTool = async (toolData: any) => {
    try {
      const method = editingTool ? 'PUT' : 'POST';
      const body = editingTool 
        ? { ...toolData, toolId: editingTool.toolId }
        : toolData;

      const response = await fetch('/api/tools', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowEditor(false);
        setEditingTool(null);
        await loadTools();
      }
    } catch (error) {
      console.error('Failed to save tool:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tool Library</h1>
          <p className="text-gray-600">
            Manage and configure tools for your AI agents
          </p>
        </div>
        <Button onClick={handleCreateTool} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Tool
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tools.length}</div>
            <p className="text-sm text-gray-600">Total Tools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{activeTool}</div>
            <p className="text-sm text-gray-600">Active Tools</p>
          </CardContent>
        </Card>
        {Object.entries(toolStats).map(([category, count]) => (
          <Card key={category}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{count}</div>
              <p className="text-sm text-gray-600 capitalize">
                {category.replace('_', ' ')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="data_access">Data Access</SelectItem>
              <SelectItem value="computation">Computation</SelectItem>
              <SelectItem value="communication">Communication</SelectItem>
              <SelectItem value="search">Search</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTools}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="p-2"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="p-2"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tools Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredTools.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <div className="text-gray-400 text-lg mb-2">No tools found</div>
            <p className="text-gray-600 mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first tool to get started'
              }
            </p>
            <Button onClick={handleCreateTool} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          'grid gap-4',
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'
        )}>
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.toolId}
              tool={tool}
              onEdit={handleEditTool}
              onDelete={handleDeleteTool}
              onTest={handleTestTool}
              onToggleActive={handleToggleActive}
              className={viewMode === 'list' ? 'flex-row' : ''}
            />
          ))}
        </div>
      )}

      {/* Tool Editor Modal */}
      {showEditor && (
        <ToolEditor
          tool={editingTool}
          onSave={handleSaveTool}
          onCancel={() => {
            setShowEditor(false);
            setEditingTool(null);
          }}
        />
      )}

      {/* Tool Tester Modal */}
      {showTester && selectedTool && (
        <ToolTester
          tool={selectedTool}
          onClose={() => {
            setShowTester(false);
            setSelectedTool(null);
          }}
        />
      )}
    </div>
  );
}