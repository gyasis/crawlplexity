'use client'

import React from 'react'
import { useSidebar } from '@/contexts/SidebarContext'
import { 
  User, 
  Palette, 
  Shield, 
  Zap, 
  Database, 
  FileText,
  Bell,
  Globe,
  Lock
} from 'lucide-react'

interface SettingItem {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
  comingSoon?: boolean
}

const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'account',
    name: 'Account',
    description: 'Manage your profile and preferences',
    icon: <User className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'appearance',
    name: 'Appearance',
    description: 'Customize theme and layout',
    icon: <Palette className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'privacy',
    name: 'Privacy',
    description: 'Control data sharing and privacy',
    icon: <Shield className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Optimize speed and resource usage',
    icon: <Zap className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'data',
    name: 'Data Management',
    description: 'Export, import, and manage your data',
    icon: <Database className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'export',
    name: 'Export Chats',
    description: 'Download conversation history',
    icon: <FileText className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Configure alerts and updates',
    icon: <Bell className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'language',
    name: 'Language',
    description: 'Change interface language',
    icon: <Globe className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  },
  {
    id: 'security',
    name: 'Security',
    description: 'API keys and security settings',
    icon: <Lock className="w-4 h-4" />,
    enabled: false,
    comingSoon: true
  }
]

export function SettingsSection() {
  const { sidebarState } = useSidebar()
  const isExpanded = sidebarState === 'expanded'
  
  if (!isExpanded) {
    // Semi-collapsed view - show a settings icon
    return (
      <div className="flex justify-center">
        <div 
          className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center opacity-50 cursor-not-allowed"
          title="Settings (Coming Soon)"
        >
          <span className="text-gray-400 text-xs">⚙️</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {SETTINGS_ITEMS.map((item) => (
        <div
          key={item.id}
          className={`
            flex items-center gap-3 p-2 rounded-lg transition-all cursor-not-allowed
            ${item.enabled 
              ? 'hover:bg-gray-100 dark:hover:bg-zinc-800' 
              : 'opacity-50'
            }
          `}
          title={item.comingSoon ? `${item.name} - Coming Soon` : item.description}
        >
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${item.enabled 
              ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' 
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
            }
          `}>
            {item.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={`
              text-sm font-medium
              ${item.enabled 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-400'
              }
            `}>
              {item.name}
              {item.comingSoon && (
                <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {item.description}
            </div>
          </div>
          
          {!item.enabled && (
            <div className="flex-shrink-0 w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
          )}
        </div>
      ))}
      
      {/* Footer note */}
      <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
          More Features Coming Soon
        </div>
        <div className="text-xs text-orange-500 dark:text-orange-300">
          We're actively developing new features. Stay tuned for updates!
        </div>
      </div>
    </div>
  )
}