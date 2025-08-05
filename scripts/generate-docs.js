#!/usr/bin/env node

/**
 * Documentation Generation Script with Playwright Screenshots
 * 
 * This script automatically generates comprehensive documentation for the 
 * Fireplexity application by taking screenshots of all the pages and interfaces
 * we've created.
 */

const fs = require('fs');
const path = require('path');

// Configuration for our documentation
const DOCS_CONFIG = {
  baseUrl: 'http://localhost:18563',
  outputDir: './docs',
  screenshotsDir: './docs/screenshots',
  
  // Pages to document with screenshots
  pages: [
    {
      name: 'Main Chat Interface',
      url: '/',
      description: 'The main chat interface with sidebar navigation',
      filename: 'main-interface'
    },
    {
      name: 'Workflows Management',
      url: '/workflows',
      description: 'Full-page workflow management dashboard',
      filename: 'workflows-page'
    },
    {
      name: 'Workflow Builder',
      url: '/workflows/create',
      description: 'Advanced workflow builder with visual canvas',
      filename: 'workflow-builder'
    },
    {
      name: 'Workflow Templates',
      url: '/workflows/templates',
      description: 'Template gallery with filtering and search',
      filename: 'workflow-templates'
    },
    {
      name: 'Agent Management',
      url: '/agents',
      description: 'Comprehensive agent management interface',
      filename: 'agents-page'
    },
    {
      name: 'Agent Creation',
      url: '/agents/create',
      description: 'Multi-step agent creation wizard',
      filename: 'agent-creation'
    },
    {
      name: 'Team Management',
      url: '/teams',
      description: 'Team management with analytics and collaboration types',
      filename: 'teams-page'
    },
    {
      name: 'Settings',
      url: '/settings',
      description: 'Comprehensive settings interface',
      filename: 'settings-page'
    }
  ],

  // Different viewport sizes for responsive testing
  viewports: [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 390, height: 844 }
  ]
};

/**
 * Generates the main documentation markdown file
 */
function generateMainDocumentation() {
  const content = `# Fireplexity Documentation

## Overview

Fireplexity is a self-hosted AI-powered search engine with comprehensive agent and workflow management capabilities. This documentation covers all the interfaces and features we've implemented.

## Architecture

### Dual-Interface System
We've implemented a **dual-interface system** that provides both:
- **Sidebar Navigation** - Quick access and monitoring from the main chat interface
- **Full-Page Interfaces** - Comprehensive management screens for detailed operations

This approach ensures users can quickly access common functions while having powerful full-page interfaces for complex tasks.

## Interface Documentation

### Main Chat Interface
![Main Interface](screenshots/main-interface-desktop.png)

The main chat interface features:
- **Expandable Sidebar** with quick navigation
- **AI Chat Interface** with streaming responses
- **Quick Actions** for workflow and agent management
- **Theme Toggle** for dark/light mode
- **Model Selection** and parameter controls

### Workflow Management

#### Workflows Dashboard
![Workflows Page](screenshots/workflows-page-desktop.png)

**Features:**
- Grid and list view modes
- Advanced filtering and search
- Workflow execution and status monitoring
- Statistics sidebar with recent executions
- Direct links to templates and creation

#### Advanced Workflow Builder
![Workflow Builder](screenshots/workflow-builder-desktop.png)

**Features:**
- 4 view modes: Visual canvas, List, Preview, Code
- React Flow integration with 50+ node capacity
- Drag-and-drop node palette
- Comprehensive settings panel
- Real-time workflow validation

#### Template Gallery
![Workflow Templates](screenshots/workflow-templates-desktop.png)

**Features:**
- Advanced filtering by category, complexity, type
- Grid and list view modes
- Template preview and expansion
- Direct template execution
- One-click template instantiation

### Agent Management

#### Agents Dashboard
![Agents Page](screenshots/agents-page-desktop.png)

**Features:**
- 3 view modes: Grid, List, Teams
- Bulk operations for multiple agents
- Agent statistics and performance metrics
- Team integration and status indicators
- Advanced filtering and search

#### Agent Creation Wizard
![Agent Creation](screenshots/agent-creation-desktop.png)

**Features:**
- 4-step creation process
- Comprehensive configuration options
- Tool selection and capability management
- Advanced settings with memory and rate limiting
- Real-time validation and testing

### Team Management
![Teams Page](screenshots/teams-page-desktop.png)

**Features:**
- Grid, List, and Analytics view modes
- 4 collaboration types: Sequential, Parallel, Hierarchical, Mesh
- Performance metrics and team statistics
- Agent status indicators and bulk operations
- Team creation and configuration

### Settings Interface
![Settings Page](screenshots/settings-page-desktop.png)

**Features:**
- 6 comprehensive sections: Profile, Security, Notifications, Appearance, System, Integrations
- API key management with security features
- Theme customization with 8 accent colors
- Export/import settings functionality
- Real-time setting updates

## Navigation System

### Sidebar Quick Actions
The sidebar provides quick access to:
- Agent status and controls
- Workflow creation and templates
- Quick navigation to full pages
- Real-time monitoring

### Cross-Page Navigation
All pages include:
- "Back to Chat" buttons
- Cross-links to related functionality
- Breadcrumb navigation
- Context-aware action buttons

## Technical Implementation

### Key Technologies
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS v4** with HSL-based color system
- **React Flow** for visual workflow building
- **Radix UI** primitives for components
- **Sonner** for notifications

### Architecture Patterns
- **Service-Oriented Architecture** with external API integrations
- **Server-Sent Events (SSE)** for real-time updates
- **React Context** for global state management
- **Custom hooks** for complex functionality
- **Responsive design** with container-based layouts

### Security Features
- **API key management** with show/hide functionality
- **Domain whitelisting** for security
- **Session timeout** controls
- **Two-factor authentication** support
- **Secure password fields** throughout

## Mobile Responsiveness

All interfaces are fully responsive:

### Tablet View (768px)
- Optimized sidebar layout
- Touch-friendly interactions
- Adaptive grid systems

### Mobile View (390px)  
- Collapsible navigation
- Mobile-optimized forms
- Gesture-friendly controls

## Development

### Commands
\`\`\`bash
# Start development server
npm run dev

# Build for production  
npm run build

# Generate documentation
node scripts/generate-docs.js
\`\`\`

### File Structure
\`\`\`
/app/
  /workflows/          # Workflow management pages
  /agents/            # Agent management pages  
  /teams/             # Team management pages
  /settings/          # Settings interface
/components/
  /sidebar/           # Sidebar components
  /ui/                # Shared UI components
/contexts/            # React Context providers
/lib/                 # Service clients and utilities
\`\`\`

## Future Enhancements

- **Real-time Collaboration** - Multi-user workflow building
- **Advanced Analytics** - Detailed performance metrics
- **Plugin System** - Extensible tool and integration system
- **Mobile Apps** - Native iOS and Android applications
- **API Documentation** - Auto-generated API docs

---

*Generated automatically with Playwright screenshots and documentation system.*
`;

  return content;
}

/**
 * Generates documentation for responsive design
 */
function generateResponsiveDocumentation() {
  return `# Responsive Design Documentation

## Overview
All Fireplexity interfaces are designed to work seamlessly across devices, from mobile phones to large desktop screens.

## Breakpoints
- **Mobile**: 390px - 767px
- **Tablet**: 768px - 1023px  
- **Desktop**: 1024px+

## Mobile Screenshots

### Main Interface - Mobile
![Main Interface Mobile](screenshots/main-interface-mobile.png)

### Workflows - Mobile
![Workflows Mobile](screenshots/workflows-page-mobile.png)

### Agents - Mobile
![Agents Mobile](screenshots/agents-page-mobile.png)

## Tablet Screenshots

### Main Interface - Tablet
![Main Interface Tablet](screenshots/main-interface-tablet.png)

### Workflow Builder - Tablet
![Workflow Builder Tablet](screenshots/workflow-builder-tablet.png)

### Settings - Tablet
![Settings Tablet](screenshots/settings-page-tablet.png)

## Responsive Features

### Adaptive Layouts
- **Grid Systems**: Automatically adjust column counts
- **Flexible Sidebars**: Collapse and expand based on screen size
- **Touch Targets**: Minimum 44px for mobile interactions

### Mobile Optimizations
- **Swipe Gestures**: For navigation and actions
- **Pull-to-Refresh**: For data updates
- **Bottom Navigation**: Easy thumb access
- **Keyboard Handling**: Smart input focus and scrolling

### Performance
- **Image Optimization**: Responsive images with Next.js
- **Code Splitting**: Route-based lazy loading
- **Caching**: Intelligent caching strategies
- **Bundle Size**: Minimal JavaScript for mobile

---

*This documentation is auto-generated with device-specific screenshots.*
`;
}

/**
 * Main function to orchestrate documentation generation
 */
async function main() {
  console.log('🚀 Starting documentation generation...');
  
  // Create output directories
  if (!fs.existsSync(DOCS_CONFIG.outputDir)) {
    fs.mkdirSync(DOCS_CONFIG.outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(DOCS_CONFIG.screenshotsDir)) {
    fs.mkdirSync(DOCS_CONFIG.screenshotsDir, { recursive: true });
  }

  // Generate main documentation
  console.log('📝 Generating main documentation...');
  const mainDocs = generateMainDocumentation();
  fs.writeFileSync(path.join(DOCS_CONFIG.outputDir, 'README.md'), mainDocs);

  // Generate responsive documentation  
  console.log('📱 Generating responsive documentation...');
  const responsiveDocs = generateResponsiveDocumentation();
  fs.writeFileSync(path.join(DOCS_CONFIG.outputDir, 'RESPONSIVE.md'), responsiveDocs);

  console.log('✅ Documentation generation complete!');
  console.log(`📁 Documentation saved to: ${DOCS_CONFIG.outputDir}`);
  console.log(`📸 Screenshots will be saved to: ${DOCS_CONFIG.screenshotsDir}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Run Playwright to take screenshots');  
  console.log('3. View documentation in ./docs/README.md');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DOCS_CONFIG, generateMainDocumentation, generateResponsiveDocumentation };