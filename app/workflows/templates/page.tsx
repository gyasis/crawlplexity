'use client'

import React, { useState, useEffect } from 'react'
import { 
  GitBranch,
  Search, 
  Filter, 
  Star, 
  Users, 
  Clock, 
  Zap,
  Bot,
  Brain,
  ChevronDown,
  ChevronUp,
  Play,
  ArrowLeft,
  Copy,
  Download,
  Heart,
  Eye,
  Loader2,
  ArrowRight,
  Settings,
  Code
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface WorkflowTemplate {
  template_id: string
  name: string
  description: string
  category: string
  definition: any
  complexity_level: 'beginner' | 'intermediate' | 'advanced'
  estimated_nodes: number
  orchestration_type: 'agent' | 'agentic' | 'hybrid'
  created_at: string
  author?: string
  tags?: string[]
  usage_count?: number
  rating?: number
  is_featured?: boolean
}

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: GitBranch, count: 0 },
  { id: 'research', name: 'Research & Analysis', icon: Search, count: 0 },
  { id: 'content', name: 'Content Creation', icon: Bot, count: 0 },
  { id: 'support', name: 'Customer Support', icon: Users, count: 0 },
  { id: 'analysis', name: 'Data Analysis', icon: Brain, count: 0 },
  { id: 'automation', name: 'Process Automation', icon: Zap, count: 0 },
  { id: 'general', name: 'General Purpose', icon: Settings, count: 0 }
]

const COMPLEXITY_COLORS = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
}

const ORCHESTRATION_ICONS = {
  agent: Bot,
  agentic: Brain,
  hybrid: Zap
}

export default function WorkflowTemplatesPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'popularity' | 'rating'>('popularity')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [runningTemplate, setRunningTemplate] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterAndSortTemplates()
  }, [templates, searchQuery, selectedCategory, selectedComplexity, selectedType, sortBy])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/workflows/templates')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setTemplates(data.data)
        }
      } else {
        console.error('Failed to load templates:', response.status)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortTemplates = () => {
    let filtered = [...templates]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory)
    }

    // Filter by complexity
    if (selectedComplexity) {
      filtered = filtered.filter(template => template.complexity_level === selectedComplexity)
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(template => template.orchestration_type === selectedType)
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popularity':
          return (b.usage_count || 0) - (a.usage_count || 0)
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        default:
          return 0
      }
    })

    setFilteredTemplates(filtered)
  }

  const handleUseTemplate = (template: WorkflowTemplate) => {
    // Navigate to workflow builder with template
    window.location.href = `/workflows/create?template=${template.template_id}`
  }

  const handleRunTemplate = async (template: WorkflowTemplate) => {
    setRunningTemplate(template.template_id)
    try {
      // First, instantiate the template as a workflow
      const response = await fetch(`/api/workflows/templates/${template.template_id}/instantiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${template.name} (Quick Run)`,
          description: `Auto-executed from template: ${template.description}`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to instantiate template')
      }

      const { data: workflow } = await response.json()

      // Then execute the workflow
      const executeResponse = await fetch(`/api/workflows/${workflow.workflow_id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputData: {},
          sessionId: 'template-test',
          userId: 'user'
        }),
      })

      if (!executeResponse.ok) {
        throw new Error('Failed to execute workflow')
      }

      // TODO: Show execution results or redirect to execution page
      alert('Template executed successfully!')
      
    } catch (error) {
      console.error('Failed to run template:', error)
      alert('Failed to run template. Please try again.')
    } finally {
      setRunningTemplate(null)
    }
  }

  const toggleTemplateExpanded = (templateId: string) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId)
  }

  const getOrchestrationIcon = (type: WorkflowTemplate['orchestration_type']) => {
    const Icon = ORCHESTRATION_ICONS[type]
    return <Icon className="w-4 h-4" />
  }

  const getOrchestrationDescription = (type: WorkflowTemplate['orchestration_type']) => {
    switch (type) {
      case 'agent': return 'Structured workflow with defined agent roles'
      case 'agentic': return 'Autonomous agents with intelligent decision making'
      case 'hybrid': return 'Mix of structured and autonomous behavior'
      default: return 'Unknown orchestration type'
    }
  }

  const renderTemplate = (template: WorkflowTemplate) => {
    const isExpanded = expandedTemplate === template.template_id
    const isRunning = runningTemplate === template.template_id

    if (viewMode === 'list') {
      return (
        <div key={template.template_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  {template.is_featured && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COMPLEXITY_COLORS[template.complexity_level]}`}>
                      {template.complexity_level}
                    </span>
                    <div className="flex items-center gap-1 text-gray-500" title={getOrchestrationDescription(template.orchestration_type)}>
                      {getOrchestrationIcon(template.orchestration_type)}
                      <span className="text-xs">{template.orchestration_type}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-4 h-4" />
                    <span>{template.estimated_nodes} nodes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{template.category}</span>
                  </div>
                  {template.usage_count && (
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{template.usage_count} uses</span>
                    </div>
                  )}
                  {template.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{template.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUseTemplate(template)}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Use Template
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRunTemplate(template)}
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isRunning ? 'Running...' : 'Quick Run'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleTemplateExpanded(template.template_id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workflow Structure</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {template.definition?.nodes ? (
                        <div className="space-y-1">
                          {template.definition.nodes.slice(0, 5).map((node: any, index: number) => (
                            <div key={node.id} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              <span>{node.data?.label || node.type}</span>
                              <span className="text-gray-400">({node.type})</span>
                            </div>
                          ))}
                          {template.definition.nodes.length > 5 && (
                            <div className="text-gray-400">+{template.definition.nodes.length - 5} more nodes</div>
                          )}
                        </div>
                      ) : (
                        <span>No workflow structure available</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Details</h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div>Author: {template.author || 'System'}</div>
                      <div>Created: {new Date(template.created_at).toLocaleDateString()}</div>
                      <div>Category: {template.category}</div>
                      <div>Orchestration: {getOrchestrationDescription(template.orchestration_type)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Grid view
    return (
      <div key={template.template_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {template.is_featured && (
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                {template.name}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${COMPLEXITY_COLORS[template.complexity_level]}`}>
                {template.complexity_level}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {template.description}
          </p>
          
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                <span>{template.estimated_nodes}</span>
              </div>
              <div className="flex items-center gap-1" title={getOrchestrationDescription(template.orchestration_type)}>
                {getOrchestrationIcon(template.orchestration_type)}
                <span>{template.orchestration_type}</span>
              </div>
            </div>
            {template.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                <span>{template.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUseTemplate(template)}
              className="flex-1 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Use
            </Button>
            <Button
              size="sm"
              onClick={() => handleRunTemplate(template)}
              disabled={isRunning}
              className="flex-1 text-xs"
            >
              {isRunning ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Play className="w-3 h-3 mr-1" />
              )}
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <Link href="/workflows">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Workflow Templates
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                {filteredTemplates.length} of {templates.length} templates
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title="Grid View"
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                    <div className="bg-current rounded-sm"></div>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                  title="List View"
                >
                  <div className="w-4 h-4 flex flex-col gap-0.5">
                    <div className="bg-current h-0.5 rounded-full"></div>
                    <div className="bg-current h-0.5 rounded-full"></div>
                    <div className="bg-current h-0.5 rounded-full"></div>
                    <div className="bg-current h-0.5 rounded-full"></div>
                  </div>
                </button>
              </div>
              <Link href="/workflows/create">
                <Button className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Create Custom
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
              
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categories</h4>
                <div className="space-y-1">
                  {CATEGORIES.map((category) => {
                    const Icon = category.icon
                    const count = category.id === 'all' ? templates.length : templates.filter(t => t.category === category.id).length
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                          selectedCategory === category.id
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="truncate">{category.name}</span>
                        </div>
                        <span className="text-xs">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Complexity */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Complexity</h4>
                <div className="space-y-1">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((complexity) => (
                    <button
                      key={complexity}
                      onClick={() => setSelectedComplexity(selectedComplexity === complexity ? null : complexity)}
                      className={`w-full px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                        selectedComplexity === complexity
                          ? COMPLEXITY_COLORS[complexity]
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</h4>
                <div className="space-y-1">
                  {(['agent', 'agentic', 'hybrid'] as const).map((type) => {
                    const Icon = ORCHESTRATION_ICONS[type]
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(selectedType === type ? null : type)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                          selectedType === type
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="capitalize">{type}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sort */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort by</h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="popularity">Popularity</option>
                  <option value="rating">Rating</option>
                  <option value="name">Name</option>
                  <option value="created">Newest</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-500">Loading templates...</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No templates found
                </h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your search or filters
                </p>
                <Button onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                  setSelectedComplexity(null)
                  setSelectedType(null)
                }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                  : 'space-y-4'
              }>
                {filteredTemplates.map(renderTemplate)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}