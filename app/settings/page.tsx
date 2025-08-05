'use client'

import React, { useState, useEffect } from 'react'
import { 
  Settings,
  User,
  Shield,
  Bell,
  Database,
  Zap,
  Palette,
  Monitor,
  Globe,
  Key,
  Server,
  Activity,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  EyeOff,
  Upload,
  Download,
  Trash2,
  Plus,
  Edit,
  Copy,
  Moon,
  Sun,
  Laptop,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface SettingsData {
  profile: {
    name: string
    email: string
    avatar?: string
    timezone: string
    language: 'en' | 'es' | 'fr' | 'de' | 'zh'
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    allowedDomains: string[]
    apiKeys: Array<{
      id: string
      name: string
      key: string
      created: string
      lastUsed?: string
      permissions: string[]
    }>
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    workflowAlerts: boolean
    agentStatus: boolean
    systemUpdates: boolean
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    accentColor: string
    compactMode: boolean
    animations: boolean
    fontSize: 'small' | 'medium' | 'large'
  }
  system: {
    autoSave: boolean
    backupFrequency: 'none' | 'daily' | 'weekly' | 'monthly'
    logLevel: 'minimal' | 'standard' | 'verbose'
    cacheSize: number
    debugMode: boolean
  }
  integrations: {
    openai: { enabled: boolean, apiKey?: string }
    anthropic: { enabled: boolean, apiKey?: string }
    google: { enabled: boolean, apiKey?: string }
    groq: { enabled: boolean, apiKey?: string }
    ollama: { enabled: boolean, endpoint?: string }
  }
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' }
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
]

const ACCENT_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' }
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'appearance' | 'system' | 'integrations'>('profile')
  const [settings, setSettings] = useState<SettingsData>({
    profile: {
      name: '',
      email: '',
      timezone: 'UTC',
      language: 'en'
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 3600000,
      allowedDomains: [],
      apiKeys: []
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      workflowAlerts: true,
      agentStatus: true,
      systemUpdates: true,
      frequency: 'immediate'
    },
    appearance: {
      theme: 'system',
      accentColor: '#3B82F6',
      compactMode: false,
      animations: true,
      fontSize: 'medium'
    },
    system: {
      autoSave: true,
      backupFrequency: 'daily',
      logLevel: 'standard',
      cacheSize: 100,
      debugMode: false
    },
    integrations: {
      openai: { enabled: false },
      anthropic: { enabled: false },
      google: { enabled: false },
      groq: { enabled: false },
      ollama: { enabled: true, endpoint: 'http://localhost:11434' }
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [newDomain, setNewDomain] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      // TODO: Load settings from API
      // For now, using default values
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // TODO: Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.')
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
  }

  const generateApiKey = () => {
    if (!newApiKeyName.trim()) {
      alert('Please enter an API key name')
      return
    }

    const newKey = {
      id: Date.now().toString(),
      name: newApiKeyName,
      key: `sk-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`,
      created: new Date().toISOString(),
      permissions: ['workflows:read', 'workflows:write', 'agents:read', 'agents:write']
    }

    updateSetting('security.apiKeys', [...settings.security.apiKeys, newKey])
    setNewApiKeyName('')
  }

  const removeApiKey = (keyId: string) => {
    updateSetting('security.apiKeys', settings.security.apiKeys.filter(key => key.id !== keyId))
  }

  const addAllowedDomain = () => {
    if (!newDomain.trim()) return
    if (settings.security.allowedDomains.includes(newDomain)) return
    
    updateSetting('security.allowedDomains', [...settings.security.allowedDomains, newDomain.trim()])
    setNewDomain('')
  }

  const removeAllowedDomain = (domain: string) => {
    updateSetting('security.allowedDomains', settings.security.allowedDomains.filter(d => d !== domain))
  }

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Profile Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.profile.name}
                    onChange={(e) => updateSetting('profile.name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => updateSetting('profile.email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.profile.language}
                    onChange={(e) => updateSetting('profile.language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.profile.timezone}
                    onChange={(e) => updateSetting('profile.timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Security Settings
              </h3>
              
              {/* Two-Factor Authentication */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <Button
                    variant={settings.security.twoFactorEnabled ? "default" : "outline"}
                    onClick={() => updateSetting('security.twoFactorEnabled', !settings.security.twoFactorEnabled)}
                  >
                    {settings.security.twoFactorEnabled ? 'Enabled' : 'Enable'}
                  </Button>
                </div>
              </div>

              {/* Session Timeout */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.security.sessionTimeout / 60000}
                  onChange={(e) => updateSetting('security.sessionTimeout', parseInt(e.target.value) * 60000)}
                  min={5}
                  max={1440}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* API Keys */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">API Keys</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                      placeholder="API key name..."
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <Button size="sm" onClick={generateApiKey}>
                      <Plus className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {settings.security.apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{apiKey.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {showApiKeys[apiKey.id] ? apiKey.key : `${apiKey.key.substring(0, 12)}...`}
                          <button
                            onClick={() => toggleApiKeyVisibility(apiKey.id)}
                            className="ml-2 text-blue-600 hover:text-blue-700"
                          >
                            {showApiKeys[apiKey.id] ? <EyeOff className="w-4 h-4 inline" /> : <Eye className="w-4 h-4 inline" />}
                          </button>
                        </div>
                        <div className="text-xs text-gray-400">
                          Created: {new Date(apiKey.created).toLocaleDateString()}
                          {apiKey.lastUsed && ` • Last used: ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(apiKey.key)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => removeApiKey(apiKey.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allowed Domains */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Allowed Domains</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="example.com"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <Button size="sm" onClick={addAllowedDomain}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.security.allowedDomains.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-sm"
                    >
                      {domain}
                      <button onClick={() => removeAllowedDomain(domain)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Notification Preferences
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailNotifications}
                    onChange={(e) => updateSetting('notifications.emailNotifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Push Notifications</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Receive browser push notifications</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.pushNotifications}
                    onChange={(e) => updateSetting('notifications.pushNotifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Workflow Alerts</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about workflow status changes</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.workflowAlerts}
                    onChange={(e) => updateSetting('notifications.workflowAlerts', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Agent Status</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about agent health and performance</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.agentStatus}
                    onChange={(e) => updateSetting('notifications.agentStatus', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">System Updates</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about system updates and maintenance</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.systemUpdates}
                    onChange={(e) => updateSetting('notifications.systemUpdates', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notification Frequency
                  </label>
                  <select
                    value={settings.notifications.frequency}
                    onChange={(e) => updateSetting('notifications.frequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="hourly">Hourly digest</option>
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly digest</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Appearance Settings
              </h3>
              
              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Laptop }
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => updateSetting('appearance.theme', value)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                          settings.appearance.theme === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => updateSetting('appearance.accentColor', color.value)}
                        className={`w-10 h-10 rounded-lg border-2 transition-transform hover:scale-110 ${
                          settings.appearance.accentColor === color.value
                            ? 'border-gray-400 ring-2 ring-gray-300'
                            : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Font Size
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' }
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => updateSetting('appearance.fontSize', value)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          settings.appearance.fontSize === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Compact Mode</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Reduce spacing and padding for more content</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.appearance.compactMode}
                      onChange={(e) => updateSetting('appearance.compactMode', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Animations</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Enable smooth transitions and animations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.appearance.animations}
                      onChange={(e) => updateSetting('appearance.animations', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'system':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                System Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Auto Save</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automatically save changes as you work</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.system.autoSave}
                    onChange={(e) => updateSetting('system.autoSave', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Backup Frequency
                  </label>
                  <select
                    value={settings.system.backupFrequency}
                    onChange={(e) => updateSetting('system.backupFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Log Level
                  </label>
                  <select
                    value={settings.system.logLevel}
                    onChange={(e) => updateSetting('system.logLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="standard">Standard</option>
                    <option value="verbose">Verbose</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cache Size (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.system.cacheSize}
                    onChange={(e) => updateSetting('system.cacheSize', parseInt(e.target.value))}
                    min={10}
                    max={1000}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Debug Mode</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable detailed logging and debug information</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.system.debugMode}
                    onChange={(e) => updateSetting('system.debugMode', e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Settings
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Import Settings
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'integrations':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                API Integrations
              </h3>
              
              <div className="space-y-4">
                {Object.entries(settings.integrations).map(([provider, config]) => (
                  <div key={provider} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                          {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {provider === 'openai' && 'GPT models and API access'}
                          {provider === 'anthropic' && 'Claude models and API access'}
                          {provider === 'google' && 'Gemini models and API access'}
                          {provider === 'groq' && 'Fast inference API access'}
                          {provider === 'ollama' && 'Local LLM models'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updateSetting(`integrations.${provider}.enabled`, e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    
                    {config.enabled && (
                      <div className="mt-3">
                        {provider === 'ollama' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Endpoint URL
                            </label>
                            <input
                              type="url"
                              value={(config as any).endpoint || ''}
                              onChange={(e) => updateSetting(`integrations.${provider}.endpoint`, e.target.value)}
                              placeholder="http://localhost:11434"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              API Key
                            </label>
                            <div className="flex gap-2">
                              <input
                                type={showApiKeys[provider] ? 'text' : 'password'}
                                value={(config as any).apiKey || ''}
                                onChange={(e) => updateSetting(`integrations.${provider}.apiKey`, e.target.value)}
                                placeholder="Enter API key..."
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleApiKeyVisibility(provider)}
                              >
                                {showApiKeys[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: Database },
    { id: 'integrations', label: 'Integrations', icon: Zap }
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Chat
                </Button>
              </Link>
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 sticky top-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-500">Loading settings...</span>
                </div>
              ) : (
                renderTabContent()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}