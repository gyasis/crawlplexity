'use client'

import { useState, useEffect } from 'react'
import { Microscope, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface DeepResearchStatusProps {
  status: string | null
  isActive: boolean
}

interface StatusLine {
  id: string
  message: string
  timestamp: number
  completed: boolean
}

export function DeepResearchStatus({ status, isActive }: DeepResearchStatusProps) {
  const [statusLines, setStatusLines] = useState<StatusLine[]>([])

  useEffect(() => {
    if (status && isActive) {
      // Add new status line
      const newLine: StatusLine = {
        id: Math.random().toString(36).substring(7),
        message: status,
        timestamp: Date.now(),
        completed: false
      }
      
      setStatusLines(prev => {
        // Mark previous lines as completed if this is a new phase
        const updatedPrev = prev.map(line => ({ ...line, completed: true }))
        return [...updatedPrev, newLine]
      })
    }
  }, [status, isActive])

  useEffect(() => {
    if (!isActive) {
      // Mark all lines as completed when research finishes
      setStatusLines(prev => prev.map(line => ({ ...line, completed: true })))
      
      // Clear status lines after a delay
      const timer = setTimeout(() => {
        setStatusLines([])
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (statusLines.length === 0) {
    return null
  }

  return (
    <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <Microscope className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
          Deep Research Progress
        </span>
        {isActive && (
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {statusLines.map((line, index) => (
          <div 
            key={line.id}
            className="flex items-center gap-2 text-sm"
          >
            {line.completed ? (
              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
            ) : (
              <Clock className="h-3 w-3 text-purple-500 flex-shrink-0 animate-spin" />
            )}
            <span className={`${
              line.completed 
                ? 'text-gray-600 dark:text-gray-400' 
                : 'text-purple-700 dark:text-purple-300 font-medium'
            }`}>
              {line.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}