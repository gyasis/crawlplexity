'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Plus, 
  RefreshCw,
  Server,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';
import { MCPServerCard, MCPServer } from './MCPServerCard';
import { MCPServerEditor } from './MCPServerEditor';
import { cn } from '@/lib/utils';

interface MCPServerDashboardProps {
  className?: string;
}

export function MCPServerDashboard({ className }: MCPServerDashboardProps) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);

  // Load servers from API
  const loadServers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mcp-servers');
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
    
    // Auto-refresh every 30 seconds for health status
    const interval = setInterval(loadServers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter servers based on search
  const filteredServers = servers.filter(server => 
    server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: servers.length,
    connected: servers.filter(s => s.status === 'connected').length,
    disconnected: servers.filter(s => s.status === 'disconnected').length,
    error: servers.filter(s => s.status === 'error').length,
    stdio: servers.filter(s => s.type === 'stdio').length,
    http: servers.filter(s => s.type === 'http').length
  };

  const handleCreateServer = () => {
    setEditingServer(null);
    setShowEditor(true);
  };

  const handleEditServer = (server: MCPServer) => {
    setEditingServer(server);
    setShowEditor(true);
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return;
    
    try {
      const response = await fetch(`/api/mcp-servers?id=${serverId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadServers();
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const handleConnectServer = async (serverId: string) => {
    try {
      const response = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      
      if (response.ok) {
        await loadServers();
      }
    } catch (error) {
      console.error('Failed to connect server:', error);
    }
  };

  const handleDisconnectServer = async (serverId: string) => {
    try {
      const response = await fetch(`/api/mcp-servers?id=${serverId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadServers();
      }
    } catch (error) {
      console.error('Failed to disconnect server:', error);
    }
  };

  const handleSaveServer = async (serverData: any) => {
    try {
      const method = editingServer ? 'PUT' : 'POST';
      const body = editingServer 
        ? { ...serverData, serverId: editingServer.serverId }
        : serverData;

      const response = await fetch('/api/mcp-servers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowEditor(false);
        setEditingServer(null);
        await loadServers();
      }
    } catch (error) {
      console.error('Failed to save server:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Server Dashboard</h1>
          <p className="text-gray-600">
            Manage Model Context Protocol servers and their connections
          </p>
        </div>
        <Button onClick={handleCreateServer} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Server
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-600" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-gray-600">Total Servers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
                <p className="text-sm text-gray-600">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.disconnected}</div>
                <p className="text-sm text-gray-600">Disconnected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                <p className="text-sm text-gray-600">Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.stdio}</div>
            <p className="text-sm text-gray-600">Stdio Servers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.http}</div>
            <p className="text-sm text-gray-600">HTTP Servers</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadServers}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Servers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredServers.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-400 text-lg mb-2">No MCP servers found</div>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add your first MCP server to get started'
              }
            </p>
            <Button onClick={handleCreateServer} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredServers.map((server) => (
            <MCPServerCard
              key={server.serverId}
              server={server}
              onConnect={handleConnectServer}
              onDisconnect={handleDisconnectServer}
              onEdit={handleEditServer}
              onDelete={handleDeleteServer}
            />
          ))}
        </div>
      )}

      {/* MCP Server Editor Modal */}
      {showEditor && (
        <MCPServerEditor
          server={editingServer}
          onSave={handleSaveServer}
          onCancel={() => {
            setShowEditor(false);
            setEditingServer(null);
          }}
        />
      )}
    </div>
  );
}