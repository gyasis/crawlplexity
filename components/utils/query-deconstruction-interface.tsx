'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Zap, ArrowRight, Play, Copy } from 'lucide-react';
import { QueryDeconstruction, QueryOptions, QueryType } from '@/lib/utils/types';

interface QueryDeconstructionInterfaceProps {
  onDeconstruct?: (query: string, options: QueryOptions) => void;
  deconstructions?: QueryDeconstruction[];
  className?: string;
}

export default function QueryDeconstructionInterface({
  onDeconstruct,
  deconstructions = [],
  className
}: QueryDeconstructionInterfaceProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentDeconstruction, setCurrentDeconstruction] = useState<QueryDeconstruction | null>(null);
  const [options, setOptions] = useState<QueryOptions>({
    query_type: 'general',
    max_queries: 4,
    include_semantic_groups: true
  });

  const handleDeconstruct = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/utils/query-deconstruction/deconstruct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          ...options
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentDeconstruction(result.data);
        onDeconstruct?.(query, options);
      } else {
        console.error('Query deconstruction failed:', result.error);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Query deconstruction request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetInterface = () => {
    setQuery('');
    setCurrentDeconstruction(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Query Deconstruction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a complex search query to break down into parallel components..."
              rows={3}
              className="resize-none"
              maxLength={1000}
            />
            <div className="text-sm text-muted-foreground mt-1">
              {query.length}/1000 characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Query Type</label>
              <Select
                value={options.query_type}
                onValueChange={(value: QueryType) =>
                  setOptions({ ...options, query_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Max Queries</label>
              <Select
                value={options.max_queries?.toString()}
                onValueChange={(value) =>
                  setOptions({ ...options, max_queries: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} queries
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleDeconstruct}
                disabled={!query.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deconstructing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Deconstruct Query
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Deconstruction Display */}
      {currentDeconstruction && (
        <QueryDeconstructionCard
          deconstruction={currentDeconstruction}
          onReset={resetInterface}
        />
      )}

      {/* Recent Deconstructions */}
      {deconstructions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Deconstructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deconstructions.slice(0, 3).map((deconstruction) => (
                <div
                  key={deconstruction.query_id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setCurrentDeconstruction(deconstruction)}
                >
                  <div className="font-medium truncate mb-2">
                    {deconstruction.original_query}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{deconstruction.deconstruction.queries.length} queries</span>
                    <span>{Math.round(deconstruction.deconstruction.complexity_reduction * 100)}% reduction</span>
                    <Badge variant="outline">
                      {deconstruction.metadata.query_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface QueryDeconstructionCardProps {
  deconstruction: QueryDeconstruction;
  onReset?: () => void;
}

function QueryDeconstructionCard({ deconstruction, onReset }: QueryDeconstructionCardProps) {
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());

  const toggleQuerySelection = (queryId: string) => {
    const newSelected = new Set(selectedQueries);
    if (newSelected.has(queryId)) {
      newSelected.delete(queryId);
    } else {
      newSelected.add(queryId);
    }
    setSelectedQueries(newSelected);
  };

  const copySelectedQueries = () => {
    const selected = deconstruction.deconstruction.queries
      .filter(q => selectedQueries.has(q.id))
      .map(q => q.query)
      .join('\n');
    
    navigator.clipboard.writeText(selected);
  };

  const executeSelectedQueries = () => {
    const selected = deconstruction.deconstruction.queries
      .filter(q => selectedQueries.has(q.id));
    
    // This would integrate with your search functionality
    console.log('Executing queries:', selected);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg mb-2">
              {deconstruction.original_query}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Search className="w-4 h-4" />
                {deconstruction.deconstruction.queries.length} queries
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                {Math.round(deconstruction.deconstruction.complexity_reduction * 100)}% reduction
              </div>
              <div className="flex items-center gap-1">
                <ArrowRight className="w-4 h-4" />
                {deconstruction.deconstruction.parallel_score}/10 parallel score
              </div>
              <Badge variant="outline">
                {deconstruction.metadata.query_type}
              </Badge>
            </div>
          </div>
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              New Query
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Action Bar */}
        {selectedQueries.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">
              {selectedQueries.size} queries selected
            </span>
            <Button size="sm" onClick={executeSelectedQueries}>
              <Play className="w-4 h-4 mr-1" />
              Execute
            </Button>
            <Button size="sm" variant="outline" onClick={copySelectedQueries}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        )}

        {/* Semantic Groups */}
        <div className="space-y-6">
          {deconstruction.deconstruction.semantic_groups.map((group, groupIndex) => {
            const groupQueries = deconstruction.deconstruction.queries.filter(q =>
              group.queries.includes(q.id)
            );

            return (
              <div key={groupIndex} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{group.name}</h4>
                    <p className="text-sm text-muted-foreground">{group.common_theme}</p>
                  </div>
                  <Badge 
                    variant={group.search_strategy === 'parallel' ? 'default' : 'secondary'}
                  >
                    {group.search_strategy}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {groupQueries.map((query) => (
                    <div
                      key={query.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedQueries.has(query.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleQuerySelection(query.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium mb-1 break-words">
                            {query.query}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>Priority: {query.search_priority}/5</span>
                            <span>Complexity: {query.complexity_score.toFixed(1)}/10</span>
                            <span>Est. Results: {query.estimated_results}</span>
                          </div>
                          {query.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {query.keywords.slice(0, 5).map((keyword, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {query.keywords.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{query.keywords.length - 5} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedQueries.has(query.id)}
                            onChange={() => toggleQuerySelection(query.id)}
                            className="rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Execution Recommendations */}
        {(deconstruction as any).execution_recommendations && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium mb-2">Execution Recommendations</h4>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Strategy:</span>
                <Badge variant="outline">
                  {(deconstruction as any).execution_recommendations.execution_strategy}
                </Badge>
              </div>
              <div>
                <span className="font-medium">Estimated Time:</span>{' '}
                {(deconstruction as any).execution_recommendations.estimated_execution_time.toFixed(1)}s
              </div>
              {(deconstruction as any).execution_recommendations.optimization_tips.length > 0 && (
                <div>
                  <span className="font-medium">Tips:</span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {(deconstruction as any).execution_recommendations.optimization_tips.map((tip: string, i: number) => (
                      <li key={i} className="text-muted-foreground">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}