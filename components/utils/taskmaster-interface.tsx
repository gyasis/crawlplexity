'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { TaskBreakdown, TaskOptions, TaskType } from '@/lib/utils/types';

interface TaskmasterInterfaceProps {
  onBreakdown?: (task: string, options: TaskOptions) => void;
  breakdowns?: TaskBreakdown[];
  className?: string;
}

export default function TaskmasterInterface({
  onBreakdown,
  breakdowns = [],
  className
}: TaskmasterInterfaceProps) {
  const [task, setTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBreakdown, setCurrentBreakdown] = useState<TaskBreakdown | null>(null);
  const [options, setOptions] = useState<TaskOptions>({
    task_type: 'general',
    max_steps: 8,
    include_estimates: true
  });

  const handleBreakdown = async () => {
    if (!task.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/utils/taskmaster/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: task.trim(),
          ...options
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCurrentBreakdown(result.data);
        onBreakdown?.(task, options);
      } else {
        console.error('Task breakdown failed:', result.error);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error('Task breakdown request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetInterface = () => {
    setTask('');
    setCurrentBreakdown(null);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="w-5 h-5" />
            Task Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Describe the complex task you want to break down..."
              rows={4}
              className="resize-none"
              maxLength={2000}
            />
            <div className="text-sm text-muted-foreground mt-1">
              {task.length}/2000 characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Task Type</label>
              <Select
                value={options.task_type}
                onValueChange={(value: TaskType) =>
                  setOptions({ ...options, task_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="content_creation">Content Creation</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Max Steps</label>
              <Select
                value={options.max_steps?.toString()}
                onValueChange={(value) =>
                  setOptions({ ...options, max_steps: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10, 15, 20].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} steps
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleBreakdown}
                disabled={!task.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Breaking Down...
                  </>
                ) : (
                  'Break Down Task'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Breakdown Display */}
      {currentBreakdown && (
        <TaskBreakdownCard
          breakdown={currentBreakdown}
          onReset={resetInterface}
        />
      )}

      {/* Recent Breakdowns */}
      {breakdowns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Breakdowns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdowns.slice(0, 3).map((breakdown) => (
                <div
                  key={breakdown.task_id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setCurrentBreakdown(breakdown)}
                >
                  <div className="font-medium truncate mb-2">
                    {breakdown.original_task}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{breakdown.breakdown.steps.length} steps</span>
                    <span>{breakdown.breakdown.total_estimated_time}min</span>
                    <Badge variant="outline">
                      {breakdown.metadata.task_type}
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

interface TaskBreakdownCardProps {
  breakdown: TaskBreakdown;
  onReset?: () => void;
}

function TaskBreakdownCard({ breakdown, onReset }: TaskBreakdownCardProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStepCompletion = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const completionPercentage = (completedSteps.size / breakdown.breakdown.steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg mb-2">
              {breakdown.original_task}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Circle className="w-4 h-4" />
                Complexity: {breakdown.breakdown.complexity_score}/10
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {breakdown.breakdown.total_estimated_time} min total
              </div>
              <Badge variant="outline">
                {breakdown.metadata.task_type}
              </Badge>
            </div>
          </div>
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              New Task
            </Button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{Math.round(completionPercentage)}% complete</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {breakdown.breakdown.steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isNext = !isCompleted && index === 0 || 
              (!isCompleted && breakdown.breakdown.steps.slice(0, index).every(s => completedSteps.has(s.id)));

            return (
              <div
                key={step.id}
                className={`border rounded-lg p-4 transition-all ${
                  isCompleted ? 'bg-green-50 border-green-200' : 
                  isNext ? 'bg-blue-50 border-blue-200' : 
                  'bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStepCompletion(step.id)}
                    className="mt-1 flex-shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Step {step.order}
                      </span>
                      {isNext && (
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {step.estimated_time}min
                      </Badge>
                    </div>

                    <h4 className={`font-medium mb-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {step.title}
                    </h4>

                    <p className="text-sm text-muted-foreground mb-3">
                      {step.description}
                    </p>

                    {/* Resources and Success Criteria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {step.resources_needed.length > 0 && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Resources:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {step.resources_needed.map((resource, i) => (
                              <li key={i} className="text-muted-foreground">{resource}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {step.success_criteria.length > 0 && (
                        <div>
                          <div className="font-medium text-muted-foreground mb-1">Success Criteria:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {step.success_criteria.map((criteria, i) => (
                              <li key={i} className="text-muted-foreground">{criteria}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Commands */}
                    {step.commands && step.commands.length > 0 && (
                      <div className="mt-3">
                        <div className="font-medium text-muted-foreground mb-1 text-xs">Commands:</div>
                        <div className="space-y-1">
                          {step.commands.map((command, i) => (
                            <code key={i} className="text-xs bg-muted px-2 py-1 rounded block">
                              {command}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dependencies */}
                    {step.dependencies.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Depends on: {step.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}