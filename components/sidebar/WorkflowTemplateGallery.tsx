'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Star, 
  Users, 
  Clock, 
  GitBranch,
  Zap,
  Bot,
  Brain,
  ChevronDown,
  ChevronUp,
  Play,
  X,
  Loader2
} from 'lucide-react'

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
}

interface WorkflowTemplateGalleryProps {
  onClose: () => void
  onSelectTemplate: (template: WorkflowTemplate) => void
}

const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: GitBranch },
  { id: 'research', name: 'Research', icon: Search },
  { id: 'content', name: 'Content', icon: Bot },
  { id: 'support', name: 'Support', icon: Users },
  { id: 'analysis', name: 'Analysis', icon: Brain },
  { id: 'general', name: 'General', icon: Zap }
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

export function WorkflowTemplateGallery({ onClose, onSelectTemplate }: WorkflowTemplateGalleryProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchQuery, selectedCategory, selectedComplexity])

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

  const filterTemplates = () => {
    let filtered = templates

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
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

    setFilteredTemplates(filtered)
  }

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    onSelectTemplate(template)
  }

  const toggleTemplateExpanded = (templateId: string) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId)
  }

  const getOrchestrationIcon = (type: WorkflowTemplate['orchestration_type']) => {
    const Icon = ORCHESTRATION_ICONS[type]
    return <Icon className="w-3 h-3" />
  }

  const getOrchestrationDescription = (type: WorkflowTemplate['orchestration_type']) => {
    switch (type) {
      case 'agent': return 'Structured workflow with defined agent roles'
      case 'agentic': return 'Autonomous agents with intelligent decision making'
      case 'hybrid': return 'Mix of structured and autonomous behavior'
      default: return 'Unknown orchestration type'
    }
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">Template Gallery</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading templates...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900 dark:text-white">Template Gallery</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            {filteredTemplates.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((category) => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{category.name}</span>
              </button>
            )
          })}
        </div>

        {/* Complexity Filter */}
        <div className="flex gap-1">
          {(['beginner', 'intermediate', 'advanced'] as const).map((complexity) => (
            <button
              key={complexity}
              onClick={() => setSelectedComplexity(selectedComplexity === complexity ? null : complexity)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedComplexity === complexity
                  ? COMPLEXITY_COLORS[complexity]
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.template_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => toggleTemplateExpanded(template.template_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${COMPLEXITY_COLORS[template.complexity_level]}`}>
                            {template.complexity_level}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500" title={getOrchestrationDescription(template.orchestration_type)}>
                            {getOrchestrationIcon(template.orchestration_type)}
                            <span className="text-xs">{template.orchestration_type}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          <span>{template.estimated_nodes} nodes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{template.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTemplateSelect(template)
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Use
                      </button>
                      {expandedTemplate === template.template_id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTemplate === template.template_id && (
                  <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="pt-3 space-y-2">
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow Structure</h4>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {template.definition?.nodes ? (
                            <div className="space-y-1">
                              {template.definition.nodes.map((node: any, index: number) => (
                                <div key={node.id} className="flex items-center gap-2">
                                  <div className="w-1 h-1 bg-gray-400 rounded-full" />
                                  <span>{node.data?.label || node.type}</span>
                                  <span className="text-gray-400">({node.type})</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>No workflow structure available</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Orchestration</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {getOrchestrationDescription(template.orchestration_type)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}