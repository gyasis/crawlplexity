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
  } = useCrawlplexityChat()

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
  }, [isLoading, searchStatus])

  // Handle Gemini API key warnings
  useEffect(() => {
    if (warnings && warnings.length > 0) {
      const geminiWarning = warnings.find(w => w.type === 'gemini_key_missing')
      if (geminiWarning && !showGeminiWarning) {
        setShowGeminiWarning(true)
      }
    }
  }, [warnings, showGeminiWarning])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const query = input.trim()
    setInput('')
    setHasSearched(true)
    setSearchStatus('Starting search...')

    // Add user message and start streaming
    await append({
      role: 'user',
      content: query
    })
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
      <header className="px-4 sm:px-6 lg:px-8 py-1 mt-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span>Crawlplexity</span>
          </div>
          <div className="flex items-center gap-2">
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
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                New Search
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
              isLoading={isLoading}
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
    </>
  )
}