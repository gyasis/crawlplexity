'use client'

import { SearchComponent } from './search'
import { ChatInterface } from './chat-interface'
import { SearchResult } from './types'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'
import { useCrawlplexityChat } from './hooks/use-crawlplexity-chat'
import { ThemeToggle } from '@/components/theme-toggle'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useSidebar } from '@/contexts/SidebarContext'
import { GeminiKeyWarning } from '@/components/ui/gemini-key-warning'
import { DeepResearchFallback } from '@/components/ui/deep-research-fallback'
import { ModelStatusIndicator } from '@/components/ui/model-status-indicator'
import { useDeepResearch } from './hooks/use-deep-research'
import { toast } from 'sonner'

interface MessageData {
  sources: SearchResult[]
  followUpQuestions: string[]
  ticker?: string
}

export default function CrawlplexityPage() {
  const [searchStatus, setSearchStatus] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [messageData, setMessageData] = useState<Map<number, MessageData>>(new Map())
  const currentMessageIndex = useRef(0)
  const [input, setInput] = useState('')
  const [showGeminiWarning, setShowGeminiWarning] = useState(false)
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false)
  const [showDeepResearchFallback, setShowDeepResearchFallback] = useState(false)
  const [deepResearchError, setDeepResearchError] = useState<string>('')
  const [deepResearchDetails, setDeepResearchDetails] = useState<string[]>([])
  const [showModelStatus, setShowModelStatus] = useState(false)
  
  // Sidebar context
  const { sidebarState } = useSidebar()

  // Use our custom Crawlplexity chat hook
  const {
    messages,
    append,
    isLoading,
    error,
    sources,
    followUpQuestions,
    ticker: currentTicker,
    warnings,
    deepResearchStatus,
  } = useCrawlplexityChat()

  // Deep Research hook
  const {
    isResearching,
    researchProgress,
    currentSessionId,
    researchSessions,
    error: researchError,
    streamEvents,
    startResearch,
    getResearchStatus,
    getResearchResults,
    listResearchSessions,
    cancelResearch
  } = useDeepResearch()

  // Debug logging
  console.log('Crawlplexity Chat State:', { 
    messagesCount: messages.length, 
    sourcesCount: sources.length, 
    isLoading, 
    error 
  })

  // Clear search status when loading completes
  useEffect(() => {
    if (!isLoading && searchStatus) {
      setSearchStatus('')
    }
    
    // Auto-hide model status when search completes
    if (!isLoading && !isResearching && showModelStatus) {
      const timer = setTimeout(() => {
        setShowModelStatus(false)
      }, 12000) // Hide after 12 seconds
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, isResearching, searchStatus, showModelStatus])

  // Handle Gemini API key warnings
  useEffect(() => {
    if (warnings && warnings.length > 0) {
      const geminiWarning = warnings.find(w => w.type === 'gemini_key_missing')
      if (geminiWarning && !showGeminiWarning) {
        setShowGeminiWarning(true)
      }
    }
  }, [warnings, showGeminiWarning])

  // Handle Deep Research status updates
  useEffect(() => {
    if (deepResearchStatus) {
      // Show status updates as toasts
      toast.info(`🔬 ${deepResearchStatus}`, {
        duration: 3000,
        id: 'deep-research-status' // Use consistent ID to replace previous status
      })
    }
  }, [deepResearchStatus])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isResearching) return

    const query = input.trim()
    setInput('')
    setHasSearched(true)

    // Check for slash commands
    if (query.startsWith('/')) {
      await handleSlashCommand(query)
      return
    }

    // Check if deep research is enabled
    if (deepResearchEnabled) {
      setSearchStatus('Starting deep research...')
      toast.info('🔬 Starting Deep Research - enhanced multi-phase analysis')
      
      try {
        // Use the enhanced Deep Research that outputs like regular search
        setShowModelStatus(true) // Show model status during research
        await append({
          role: 'user',
          content: query
        }, { 
          deepResearch: true, 
          researchType: 'comprehensive' 
        })
        return
      } catch (error) {
        // Handle Deep Research failure - fall back to regular search
        console.error('Deep Research failed:', error)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setDeepResearchError(errorMessage)
        
        // Extract setup instructions if available
        if (errorMessage.includes('Setup required:')) {
          const instructions = errorMessage.split('Setup required:')[1]?.split('\n').filter(line => line.trim())
          setDeepResearchDetails(instructions || [])
        }
        
        setShowDeepResearchFallback(true)
        toast.error('Deep Research unavailable - falling back to regular search')
        
        // Continue with regular search
        setDeepResearchEnabled(false)
      }
    }

    // Regular search
    setSearchStatus('Starting search...')
    setShowModelStatus(true) // Show model status during search
    await append({
      role: 'user',
      content: query
    })
  }

  // Handle slash commands
  const handleSlashCommand = async (command: string) => {
    const parts = command.split(' ')
    const cmd = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')

    switch (cmd) {
      case '/research':
        if (!args.trim()) {
          toast.error('Usage: /research [your question]')
          return
        }
        toast.info('🔬 Starting comprehensive Deep Research...')
        setShowModelStatus(true) // Show model status during research
        await append({
          role: 'user',
          content: args
        }, { deepResearch: true, researchType: 'comprehensive' })
        break

      case '/research-quick':
        if (!args.trim()) {
          toast.error('Usage: /research-quick [your question]')
          return
        }
        toast.info('⚡ Starting quick foundation research...')
        setShowModelStatus(true) // Show model status during research
        await append({
          role: 'user',
          content: args
        }, { deepResearch: true, researchType: 'foundation' })
        break

      case '/research-trends':
        if (!args.trim()) {
          toast.error('Usage: /research-trends [your topic]')
          return
        }
        toast.info('📈 Starting trend analysis...')
        setShowModelStatus(true) // Show model status during research
        await append({
          role: 'user',
          content: args
        }, { deepResearch: true, researchType: 'trend' })
        break


      default:
        toast.error(`Unknown command: ${cmd}\n\nAvailable commands:\n/research, /research-quick, /research-trends`)
        break
    }
  }


  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return
    
    setHasSearched(true)
    // Note: Our custom hook handles clearing data automatically
    handleSubmit(e)
  }
  
  // Wrapped submit handler for chat interface
  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Store current data in messageData before clearing
    if (messages.length > 0 && sources.length > 0) {
      const assistantMessages = messages.filter(m => m.role === 'assistant')
      const lastAssistantIndex = assistantMessages.length - 1
      if (lastAssistantIndex >= 0) {
        const newMap = new Map(messageData)
        newMap.set(lastAssistantIndex, {
          sources: sources,
          followUpQuestions: followUpQuestions,
          ticker: currentTicker || undefined
        })
        setMessageData(newMap)
      }
    }
    
    // Note: Our custom hook handles clearing data automatically
    handleSubmit(e)
  }

  const isChatActive = hasSearched || messages.length > 0

  return (
    <>
      <Sidebar />
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${
        sidebarState === 'collapsed' ? 'ml-0' : 
        sidebarState === 'semi-collapsed' ? 'ml-16' : 'ml-80'
      }`}>
      {/* Header with logo - matching other pages */}
      <header className="px-4 sm:px-6 lg:px-8 py-2 min-h-[56px]">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 text-lg font-bold text-gray-900 dark:text-white min-w-0">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="truncate">Crawlplexity</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            {isChatActive && (
              <Button
                onClick={() => {
                  setHasSearched(false)
                  setInput('')
                  setMessageData(new Map())
                  currentMessageIndex.current = 0
                  window.location.reload()
                }}
                variant="code"
                className="font-medium flex items-center gap-2"
                aria-label="New Search"
                title="New Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                <span className="hidden sm:inline">New Search</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero section - matching other pages */}
      <div className={`px-4 sm:px-6 lg:px-8 pt-2 pb-4 transition-all duration-500 ${isChatActive ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-[2.5rem] lg:text-[3.8rem] text-[#36322F] dark:text-white font-semibold tracking-tight leading-[1.1] opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:200ms] [animation-fill-mode:forwards]">
            <span className="relative px-1 pb-1 text-transparent bg-clip-text bg-gradient-to-tr from-red-600 to-yellow-500 inline-flex justify-center items-center">
              Crawlplexity
            </span>
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400 opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:600ms] [animation-fill-mode:forwards]">
            Fully open sourced engine
          </p>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto h-full">
          {!isChatActive ? (
            <SearchComponent 
              handleSubmit={handleSearch}
              input={input}
              handleInputChange={handleInputChange}
              isLoading={isLoading || isResearching}
              onDeepResearchToggle={setDeepResearchEnabled}
              deepResearchEnabled={deepResearchEnabled}
            />
          ) : (
            <ChatInterface 
              messages={messages}
              sources={sources}
              followUpQuestions={followUpQuestions}
              searchStatus={searchStatus}
              isLoading={isLoading}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleChatSubmit}
              messageData={messageData}
              currentTicker={currentTicker}
              deepResearchStatus={deepResearchStatus}
            />
          )}
        </div>
      </div>

      {/* Footer - matching other pages */}
      <footer className="px-4 sm:px-6 lg:px-8 py-8 mt-auto">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Powered by{' '}
            <a 
              href="https://serper.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Serper API
            </a>
            {' & '}
            <a 
              href="https://crawl4ai.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium"
            >
              Crawl4AI
            </a>
          </p>
        </div>
      </footer>
      </div>

      {/* Gemini API Key Warning Modal */}
      <GeminiKeyWarning
        isOpen={showGeminiWarning}
        onClose={() => setShowGeminiWarning(false)}
        hasVideoResults={sources.some(s => s.url?.includes('youtube.com') || s.url?.includes('vimeo.com'))}
      />

      {/* Deep Research Fallback Modal */}
      <DeepResearchFallback
        isOpen={showDeepResearchFallback}
        onClose={() => setShowDeepResearchFallback(false)}
        onRetry={async () => {
          // Try to re-enable deep research
          setDeepResearchEnabled(true)
          setShowDeepResearchFallback(false)
          toast.info('Deep Research re-enabled - try your search again')
        }}
        error={deepResearchError}
        details={deepResearchDetails}
      />

      {/* Model Status Indicator */}
      <ModelStatusIndicator
        isVisible={showModelStatus}
        position="bottom-right"
        showDuringSearch={true}
      />
    </>
  )
}