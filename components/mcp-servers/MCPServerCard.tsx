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
  Plug,
  PlugZap,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Globe,
  Terminal,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MCPServer {
  serverId: string;
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  capabilities: string[];
  status: 'connected' | 'disconnected' | 'error';
  lastHealthCheck?: string;
  createdAt: string;
  env?: Record<string, string>;
}

interface MCPServerCardProps {
  server: MCPServer;
  onConnect?: (serverId: string) => void;
  onDisconnect?: (serverId: string) => void;
  onEdit?: (server: MCPServer) => void;
  onDelete?: (serverId: string) => void;
  onConfigure?: (server: MCPServer) => void;
  className?: string;
  showActions?: boolean;
}

const statusConfig = {
  connected: {
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Connected'
  },
  disconnected: {
    icon: AlertCircle,
    color: 'text-gray-500',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    label: 'Disconnected'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Error'
  }
};

const typeConfig = {
  stdio: {
    icon: Terminal,
    label: 'Stdio',
    description: 'Local process communication'
  },
  http: {
    icon: Globe,
    label: 'HTTP',
    description: 'Remote server communication'
  }
};

export function MCPServerCard({ 
  server, 
  onConnect, 
  onDisconnect, 
  onEdit, 
  onDelete, 
  onConfigure,
  className,
  showActions = true 
}: MCPServerCardProps) {
  const statusInfo = statusConfig[server.status];
  const typeInfo = typeConfig[server.type];
  const StatusIcon = statusInfo.icon;
  const TypeIcon = typeInfo.icon;

  const formatLastHealthCheck = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      server.status === 'error' && 'border-red-200',
      server.status === 'connected' && 'border-green-200',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              statusInfo.bg,
              statusInfo.border,
              'border'
            )}>
              <Server className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {server.name}
                <StatusIcon className={cn('w-4 h-4', statusInfo.color)} />
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className="text-xs flex items-center gap-1"
                >
                  <TypeIcon className="w-3 h-3" />
                  {typeInfo.label}
                </Badge>
                <Badge 
                  variant={server.status === 'connected' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2 text-sm">
          {typeInfo.description}
          {server.type === 'stdio' && server.command && (
            <div className="mt-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {server.command} {server.args?.join(' ')}
            </div>
          )}
          {server.type === 'http' && server.url && (
            <div className="mt-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {server.url}
            </div>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="py-2">
        {/* Capabilities */}
        {server.capabilities.length > 0 && (
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Capabilities:</div>
            <div className="flex flex-wrap gap-1">
              {server.capabilities.slice(0, 3).map((capability) => (
                <Badge key={capability} variant="secondary" className="text-xs">
                  {capability}
                </Badge>
              ))}
              {server.capabilities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{server.capabilities.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Health Check */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>Health check:</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatLastHealthCheck(server.lastHealthCheck)}</span>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-2 border-t">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              {server.status === 'connected' ? (
                onDisconnect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDisconnect(server.serverId)}
                    className="gap-1 text-orange-600 hover:text-orange-700"
                  >
                    <Plug className="w-3 h-3" />
                    Disconnect
                  </Button>
                )
              ) : (
                onConnect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onConnect(server.serverId)}
                    className="gap-1 text-green-600 hover:text-green-700"
                  >
                    <PlugZap className="w-3 h-3" />
                    Connect
                  </Button>
                )
              )}
              {onConfigure && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(server)}
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
                  onClick={() => onEdit(server)}
                  className="gap-1 text-gray-600 hover:text-gray-900"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(server.serverId)}
                  className="gap-1 text-red-600 hover:text-red-800"
                  disabled={server.status === 'connected'}
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