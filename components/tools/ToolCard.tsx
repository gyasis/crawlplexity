'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Play, 
  Trash2, 
  Edit3, 
  Copy,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Tool {
  toolId: string;
  name: string;
  category: 'data_access' | 'computation' | 'communication' | 'search' | 'utility';
  description: string;
  parameters: any;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  usageCount?: number;
  lastUsed?: string;
}

interface ToolCardProps {
  tool: Tool;
  onEdit?: (tool: Tool) => void;
  onDelete?: (toolId: string) => void;
  onTest?: (tool: Tool) => void;
  onConfigure?: (tool: Tool) => void;
  onToggleActive?: (toolId: string, isActive: boolean) => void;
  className?: string;
  showActions?: boolean;
}

const categoryColors = {
  data_access: 'bg-blue-50 text-blue-700 border-blue-200',
  computation: 'bg-purple-50 text-purple-700 border-purple-200',
  communication: 'bg-green-50 text-green-700 border-green-200',
  search: 'bg-orange-50 text-orange-700 border-orange-200',
  utility: 'bg-gray-50 text-gray-700 border-gray-200'
};

const categoryIcons = {
  data_access: '🗄️',
  computation: '🧮',
  communication: '📢',
  search: '🔍',
  utility: '🛠️'
};

export function ToolCard({ 
  tool, 
  onEdit, 
  onDelete, 
  onTest, 
  onConfigure,
  onToggleActive,
  className,
  showActions = true 
}: ToolCardProps) {
  const paramCount = tool.parameters?.properties ? Object.keys(tool.parameters.properties).length : 0;
  const requiredParams = tool.parameters?.required?.length || 0;

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      !tool.isActive && 'opacity-60',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{categoryIcons[tool.category]}</span>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {tool.name}
                {tool.isActive ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={cn('text-xs', categoryColors[tool.category])}
                >
                  {tool.category.replace('_', ' ')}
                </Badge>
                {paramCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {paramCount} params ({requiredParams} required)
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2 text-sm">
          {tool.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="py-2">
        {tool.usageCount !== undefined && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              <span>{tool.usageCount} uses</span>
            </div>
            {tool.lastUsed && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Last used {new Date(tool.lastUsed).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="pt-2 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              {onTest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTest(tool)}
                  disabled={!tool.isActive}
                  className="gap-1"
                >
                  <Play className="w-3 h-3" />
                  Test
                </Button>
              )}
              {onConfigure && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(tool)}
                  className="gap-1"
                >
                  <Settings className="w-3 h-3" />
                  Config
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(tool)}
                  className="gap-1 text-gray-600 hover:text-gray-900"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              )}
              {onToggleActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleActive(tool.toolId, !tool.isActive)}
                  className={cn(
                    'gap-1',
                    tool.isActive 
                      ? 'text-green-600 hover:text-green-800' 
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {tool.isActive ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(tool.toolId)}
                  className="gap-1 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}