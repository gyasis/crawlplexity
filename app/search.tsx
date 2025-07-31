'use client'

import { Search, Loader2, Microscope } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface SearchComponentProps {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
  onDeepResearchToggle?: (enabled: boolean) => void
  deepResearchEnabled?: boolean
}

export function SearchComponent({ 
  handleSubmit, 
  input, 
  handleInputChange, 
  isLoading,
  onDeepResearchToggle,
  deepResearchEnabled = false
}: SearchComponentProps) {
  const [localDeepResearch, setLocalDeepResearch] = useState(deepResearchEnabled)

  const handleToggle = () => {
    const newValue = !localDeepResearch
    setLocalDeepResearch(newValue)
    onDeepResearchToggle?.(newValue)
  }

  return (
    <div className="max-w-4xl mx-auto pt-12">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything..."
            className="pr-24 h-14 text-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-800 transition-colors"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            variant="orange"
            className="absolute right-2 rounded-lg"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </Button>
        </div>
      </form>
      
      {/* Deep Research Toggle */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            localDeepResearch 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700'
          }`}
        >
          <Microscope className="h-4 w-4" />
          <span>Deep Research {localDeepResearch ? 'ON' : 'OFF'}</span>
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {localDeepResearch ? '4-phase comprehensive analysis' : 'Regular search'}
        </span>
      </div>
      
      {/* Slash Commands Help */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        Commands: /research, /research-quick, /research-trends
      </div>
    </div>
  )
}