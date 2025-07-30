"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface GeminiKeyWarningProps {
  isOpen: boolean;
  onClose: () => void;
  hasVideoResults?: boolean;
}

export function GeminiKeyWarning({ 
  isOpen, 
  onClose, 
  hasVideoResults = false 
}: GeminiKeyWarningProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
            Gemini API Key Required
          </h3>

          {/* Message */}
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3 mb-6">
            <p>
              {hasVideoResults ? (
                <>
                  Your search results contain <strong>YouTube videos and images</strong> that 
                  require a Gemini API key for enhanced content extraction and analysis.
                </>
              ) : (
                "Video and image processing requires a Gemini API key for content extraction and analysis."
              )}
            </p>
            
            <p>
              Without a Gemini API key, video and image results will show limited information 
              from search snippets only.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 mt-4">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                To enable video processing:
              </p>
              <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                <li>Get a free Gemini API key from Google AI Studio</li>
                <li>Add <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">GOOGLE_AI_API_KEY</code> to your environment</li>
                <li>Restart the video processing service</li>
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Get API Key
              <ExternalLink className="h-4 w-4" />
            </a>
            
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors"
            >
              Continue Without
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            This warning will only show when search results contain video or image content.
          </p>
        </div>
      </div>
    </div>
  );
}