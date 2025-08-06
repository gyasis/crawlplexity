'use client'

import React, { useState, useEffect } from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { 
  ChevronLeft, 
  Menu, 
  Settings, 
  Activity, 
  Cpu, 
  Sliders,
  Bug,
  Bot,
  ChevronDown,
  GitBranch,
  Plus,
  ChevronsUpDown,
  Wrench,
  Server
} from 'lucide-react'
import { ModelSelector } from './ModelSelector'
import { EnhancedParameterControls } from './EnhancedParameterControls'
import { DebugToggle } from './DebugToggle'
import { SettingsSection } from './SettingsSection'
import { AgentManagement } from './AgentManagement'
import { WorkflowStatusIndicators } from './WorkflowStatusIndicators'
import { QuickWorkflowBuilder } from './QuickWorkflowBuilder'
import { WorkflowTemplateGallery } from './WorkflowTemplateGallery'

export function Sidebar() {
  const { 
    sidebarState, setSidebarState, 
    isWorkflowBuilderOpen, openWorkflowBuilder, closeWorkflowBuilder,
    isTemplateGalleryOpen, openTemplateGallery, closeTemplateGallery,
    selectedTemplate, setSelectedTemplate
  } = useSidebar()
  const [allSectionsOpen, setAllSectionsOpen] = useState(false)

  const [modelSelectorOpen, setModelSelectorOpen] = useState(allSectionsOpen)
  const [parametersOpen, setParametersOpen] = useState(allSectionsOpen)
  const [agentsOpen, setAgentsOpen] = useState(allSectionsOpen)
  const [workflowsOpen, setWorkflowsOpen] = useState(allSectionsOpen)
  const [debugOpen, setDebugOpen] = useState(allSectionsOpen)
  const [settingsOpen, setSettingsOpen] = useState(allSectionsOpen)

  useEffect(() => {
    setModelSelectorOpen(allSectionsOpen)
    setParametersOpen(allSectionsOpen)
    setAgentsOpen(allSectionsOpen)
    setWorkflowsOpen(allSectionsOpen)
    setDebugOpen(allSectionsOpen)
    setSettingsOpen(allSectionsOpen)
  }, [allSectionsOpen])
  
  const toggleAllSections = () => {
    setAllSectionsOpen(!allSectionsOpen)
  }
  
  const toggleSidebar = () => {
    if (sidebarState === 'collapsed') {
      setSidebarState('semi-collapsed')
    } else if (sidebarState === 'semi-collapsed') {
      setSidebarState('expanded')
    } else {
      setSidebarState('collapsed')
    }
  }
  
  const isExpanded = sidebarState === 'expanded'
  const isSemiCollapsed = sidebarState === 'semi-collapsed'
  const isCollapsed = sidebarState === 'collapsed'
  const isWorkflowBuilder = sidebarState === 'workflow-builder'
  const isTemplateGallery = sidebarState === 'template-gallery'

  const handleSaveWorkflow = async (workflowData: any) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      })

      if (!response.ok) {
        throw new Error('Failed to create workflow')
      }

      const result = await response.json()
      console.log('Workflow created successfully:', result)
      
      // Optionally refresh workflow status indicators
      // This would trigger a re-fetch of active workflows
    } catch (error) {
      console.error('Failed to save workflow:', error)
      throw error
    }
  }

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template)
    closeTemplateGallery()
    openWorkflowBuilder()
  }

  const handleTemplateRun = async (template: any) => {
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
          input: {
            query: "Quick template execution",
            timestamp: new Date().toISOString()
          }
        }),
      })

      if (!executeResponse.ok) {
        throw new Error('Failed to execute workflow')
      }

      const executionResult = await executeResponse.json()
      
      // Close template gallery and show success message
      closeTemplateGallery()
      
      // You could add a toast notification here
      console.log('Template executed successfully:', executionResult)
      
    } catch (error) {
      console.error('Failed to run template:', error)
      throw error // Re-throw so the UI can handle the error state
    }
  }
  
  return (
    <>
      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out z-40 max-w-full ${
          isCollapsed ? 'w-0 -translate-x-full' : 
          isSemiCollapsed ? 'w-12 sm:w-16' : 
          isWorkflowBuilder ? 'w-80 sm:w-96' : 
          isTemplateGallery ? 'w-80 sm:w-96' : 'w-56 sm:w-80'
        }`}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          {(isExpanded || isWorkflowBuilder || isTemplateGallery) && (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {isWorkflowBuilder ? 'Workflow Builder' : 
                   isTemplateGallery ? 'Template Gallery' : 'Crawlplexity'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleAllSections}
                  className={`px-2 py-1 rounded-lg transition-colors text-xs font-medium ${
                    allSectionsOpen 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  title={allSectionsOpen ? 'Collapse All Sections' : 'Expand All Sections'}
                >
                  {allSectionsOpen ? 'Collapse All' : 'Expand All'}
                </button>
                <button
                  onClick={isWorkflowBuilder ? closeWorkflowBuilder : 
                           isTemplateGallery ? closeTemplateGallery : toggleSidebar}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title={isWorkflowBuilder ? 'Close builder' : 
                         isTemplateGallery ? 'Close gallery' : 'Collapse sidebar'}
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}
            
            {/* Quick Navigation Links - Only show in expanded mode */}
            {!isWorkflowBuilder && !isTemplateGallery && isExpanded && (
              <div className="px-4 pb-3">
                <div className="space-y-1">
                  <button
                    onClick={() => window.location.href = '/workflows'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                    title="Full Workflow Management"
                  >
                    <GitBranch className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Workflows</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/agents'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                    title="Full Agent Management"
                  >
                    <Bot className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Agents</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/tools'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                    title="Tool Library & Management"
                  >
                    <Wrench className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Tools</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/mcp-servers'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-md transition-colors"
                    title="MCP Server Dashboard"
                  >
                    <Server className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">MCP Servers</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/agent-config'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
                    title="Agent Configuration Panel"
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Agent Config</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/settings'}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-md transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Settings</span>
                  </button>
                </div>
              </div>
            )}
          {isSemiCollapsed && (
            <div className="p-3 flex justify-center">
              <button
                onClick={toggleSidebar}
                className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center hover:shadow-lg transition-all duration-200 group"
                title="Expand sidebar"
              >
                <span className="text-white font-bold text-sm group-hover:scale-110 transition-transform">C</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className={`flex flex-col overflow-hidden ${(isExpanded || isWorkflowBuilder || isTemplateGallery) ? 'h-[calc(100%-73px)]' : 'h-[calc(100%-64px)]'}`}>
          {/* Workflow Builder */}
          {isWorkflowBuilder ? (
            <QuickWorkflowBuilder
              onClose={closeWorkflowBuilder}
              onSave={handleSaveWorkflow}
              initialTemplate={selectedTemplate}
            />
          ) : isTemplateGallery ? (
            <WorkflowTemplateGallery
              onClose={closeTemplateGallery}
              onSelectTemplate={handleTemplateSelect}
              onRunTemplate={handleTemplateRun}
            />
          ) : (
            /* Normal Sidebar Content */
            <>
            <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Model Selection */}
              <div className="space-y-2">
                {isExpanded && (
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setModelSelectorOpen(!modelSelectorOpen)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Cpu className="w-4 h-4" />
                      <span>Model</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${modelSelectorOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Model Selection">
                    <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {((isExpanded && modelSelectorOpen) || isSemiCollapsed) && !isCollapsed && <ModelSelector />}
              </div>
              
              {/* Parameters */}
              <div className="space-y-2">
                {isExpanded && (
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setParametersOpen(!parametersOpen)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Sliders className="w-4 h-4" />
                      <span>Parameters</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${parametersOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Parameters">
                    <Sliders className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {((isExpanded && parametersOpen) || isSemiCollapsed) && !isCollapsed && <EnhancedParameterControls />}
              </div>
              
              {/* Agents */}
              <div className="space-y-2">
                {isExpanded && (
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setAgentsOpen(!agentsOpen)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Bot className="w-4 h-4" />
                      <span>Agents</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${agentsOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}
                {((isExpanded && agentsOpen) || isSemiCollapsed) && !isCollapsed && (
                  <AgentManagement isExpanded={isExpanded} isSemiCollapsed={isSemiCollapsed} />
                )}
              </div>
              
              {/* Workflows */}
              <div className="space-y-2">
                {isExpanded && (
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setWorkflowsOpen(!workflowsOpen)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <GitBranch className="w-4 h-4" />
                      <span>Workflows</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${workflowsOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}
                {((isExpanded && workflowsOpen) || isSemiCollapsed) && !isCollapsed && (
                  <div className="space-y-3">
                    <WorkflowStatusIndicators isExpanded={isExpanded} isSemiCollapsed={isSemiCollapsed} />
                    {isExpanded && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <button
                          onClick={openWorkflowBuilder}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition-colors"
                          title="Create New Workflow"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Workflow</span>
                        </button>
                        <button
                          onClick={openTemplateGallery}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg transition-colors"
                          title="Browse Workflow Templates"
                        >
                          <GitBranch className="w-4 h-4" />
                          <span>Browse Templates</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Debug Mode */}
              <div className="space-y-2">
                {isExpanded && (
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setDebugOpen(!debugOpen)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Bug className="w-4 h-4" />
                      <span>Debug</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${debugOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Debug Mode">
                    <Bug className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {((isExpanded && debugOpen) || isSemiCollapsed) && !isCollapsed && <DebugToggle />}
              </div>
              
              {/* Settings */}
              <div className="space-y-2">
                {isExpanded && (
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Settings">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {((isExpanded && settingsOpen) || isSemiCollapsed) && !isCollapsed && <SettingsSection />}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {isExpanded && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Activity className="w-3 h-3" />
                <span>Ready</span>
              </div>
            )}
            {isSemiCollapsed && (
              <div className="flex justify-center" title="Status: Ready">
                <Activity className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>
      
      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="fixed left-2 sm:left-4 top-16 sm:top-4 z-50 p-3 sm:p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          title="Open sidebar"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      
      {/* Content padding when sidebar is open */}
      <div 
        className={`transition-all duration-300 ease-in-out max-w-full ${
          isCollapsed ? 'ml-12 sm:ml-16' : 
          isSemiCollapsed ? 'ml-12 sm:ml-16' : 
          isWorkflowBuilder ? 'ml-80 sm:ml-96' : 
          isTemplateGallery ? 'ml-80 sm:ml-96' : 'ml-56 sm:ml-80'
        }`} 
      />
    </>
  )
}