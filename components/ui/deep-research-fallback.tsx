'use client'

import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface DeepResearchFallbackProps {
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  error?: string
  details?: string[]
}

export function DeepResearchFallback({ 
  isOpen, 
  onClose, 
  onRetry, 
  error = 'Deep Research Engine is currently unavailable',
  details = []
}: DeepResearchFallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Unavailable
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              {error}
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium mb-2">
                🔄 Using Regular Search Mode
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Your search will work normally using the standard Crawlplexity engine. 
                Deep Research provides more comprehensive analysis but requires additional services.
              </p>
            </div>

            {details.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Required Services:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="text-sm"
            >
              Continue with Regular Search
            </Button>
            {onRetry && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-sm"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Deep Research
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}