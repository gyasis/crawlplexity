// Types for Crawlplexity - replacing Vercel AI SDK types

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

export interface SearchResult {
  url: string
  title: string
  description?: string
  content?: string
  publishedDate?: string
  author?: string
  markdown?: string
  image?: string
  favicon?: string
  siteName?: string
  success?: boolean
  searchRank?: number
}

export interface StreamEvent {
  type: 'status' | 'sources' | 'text' | 'ticker' | 'follow_up_questions' | 'metrics' | 'complete' | 'error'
  message?: string
  sources?: SearchResult[]
  content?: string
  symbol?: string
  questions?: string[]
  error?: string
  suggestion?: string
  technical_details?: string
  [key: string]: any
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  sources: SearchResult[]
  followUpQuestions: string[]
  ticker?: string
  error?: string
}