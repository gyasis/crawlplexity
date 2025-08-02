'use client'

import React from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Activity, 
  Cpu, 
  Sliders,
  Bug,
} from 'lucide-react'
import { ModelSelector } from './ModelSelector'
import { EnhancedParameterControls } from './EnhancedParameterControls'
import { DebugToggle } from './DebugToggle'
import { SettingsSection } from './SettingsSection'

export function Sidebar() {
  const { sidebarState, setSidebarState } = useSidebar()
  
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
  
  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-gray-700 
        transition-all duration-300 ease-in-out z-40
        ${isCollapsed ? 'w-0 -translate-x-full' : 
          isSemiCollapsed ? 'w-12 sm:w-16' : 'w-56 sm:w-80'}
        max-w-full
      `}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          {isExpanded ? (
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">Crawlplexity</span>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          ) : (
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
        <div className={`flex flex-col overflow-hidden ${isExpanded ? 'h-[calc(100%-73px)]' : 'h-[calc(100%-64px)]'}`}>
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Model Selection */}
              <div className="space-y-2">
                {isExpanded && (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Cpu className="w-4 h-4" />
                    <span>Model</span>
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Model Selection">
                    <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {!isCollapsed && <ModelSelector />}
              </div>
              
              {/* Parameters */}
              <div className="space-y-2">
                {isExpanded && (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Sliders className="w-4 h-4" />
                    <span>Parameters</span>
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Parameters">
                    <Sliders className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {!isCollapsed && <EnhancedParameterControls />}
              </div>
              
              {/* Debug Mode */}
              <div className="space-y-2">
                {isExpanded && (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Bug className="w-4 h-4" />
                    <span>Debug</span>
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Debug Mode">
                    <Bug className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {!isCollapsed && <DebugToggle />}
              </div>
              
              {/* Settings */}
              <div className="space-y-2">
                {isExpanded && (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </div>
                )}
                {isSemiCollapsed && (
                  <div className="flex justify-center" title="Settings">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                {!isCollapsed && <SettingsSection />}
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
          <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      
      {/* Content padding when sidebar is open */}
      <div className={`
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'ml-0' : 
          isSemiCollapsed ? 'ml-12 sm:ml-16' : 'ml-56 sm:ml-80'}
        max-w-full
      `} />
    </>
  )
}