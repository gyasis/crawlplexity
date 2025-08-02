# Debug Area Documentation

## Overview

The Debug Area is a developer tool integrated into the Crawlplexity sidebar that provides real-time visibility into application operations, API calls, and system events. It helps developers troubleshoot issues and monitor application behavior during development.

## Location

The Debug Area is located in the sidebar and can be accessed through the `DebugToggle` component (`/components/sidebar/DebugToggle.tsx`).

## Visual States

### 1. Collapsed Sidebar Mode
- Displays as a compact 8x8 pixel button
- Shows "✓" icon when debug mode is active (green background)
- Shows "?" icon when debug mode is inactive (gray background)
- Tooltip displays current debug status on hover

### 2. Expanded Sidebar Mode
Full debug interface with:
- Toggle switch for enabling/disabling debug mode
- Status indicator showing active state and log count
- Expandable log viewer section
- Log management controls

## Features

### Debug Mode Toggle
- **Type**: Toggle switch
- **Colors**: Orange when active, gray when inactive
- **Function**: Enables/disables debug logging throughout the application
- **Keyboard**: Supports focus states with orange ring

### Status Display
- **Active Indicator**: Green dot with "Debug Active" text
- **Log Counter**: Shows total number of debug logs captured
- **Real-time Updates**: Counter updates as new logs are added

### Log Viewer
- **Expandable Section**: Click "Logs" button to show/hide log display
- **Terminal Style**: Black background with monospace font
- **Log Limit**: Displays last 10 logs (most recent)
- **Scrollable**: Vertical scroll for reviewing logs
- **Empty State**: Shows "No debug logs yet" when empty

### Log Entry Format
Each log entry displays:
```
[Timestamp] - HH:MM:SS format
[Type]: [Message or Data Preview]
```

### Interactive Features
1. **Copy Log**: Hover over any log entry to reveal copy button
   - Copies full log JSON to clipboard
   - Shows checkmark confirmation for 2 seconds

2. **Clear Logs**: Trash icon button to remove all logs
   - Disabled when no logs present
   - Red colored to indicate destructive action

## State Management

The debug functionality is managed through the `SidebarContext`:

### State Variables
- `debugMode: boolean` - Current debug mode status
- `debugLogs: Array<DebugLog>` - Collection of debug log entries

### Functions
- `setDebugMode(value: boolean)` - Toggle debug mode
- `addDebugLog(log: DebugLog)` - Add new debug entry
- `clearDebugLogs()` - Remove all debug logs

### Debug Log Structure
```typescript
interface DebugLog {
  id: string;          // Unique identifier
  timestamp: number;   // Unix timestamp
  type: string;        // Log category (e.g., 'api', 'cache', 'error')
  message?: string;    // Optional human-readable message
  data?: any;          // Additional structured data
}
```

## Usage

### Enabling Debug Mode
1. Click the debug toggle in the sidebar
2. The toggle will turn orange and show "Debug Active"
3. Application will start capturing debug logs

### Viewing Logs
1. With debug mode active, click the "Logs" button
2. The log viewer will expand showing recent entries
3. Scroll to review older logs (within the last 10)

### Copying Log Data
1. Hover over any log entry
2. Click the copy icon that appears
3. Full log JSON will be copied to clipboard

### Clearing Logs
1. Click the trash icon button
2. All debug logs will be removed
3. Log counter will reset to 0

## Integration Points

The debug system integrates with various parts of the application:

1. **API Routes**: Log request/response data
2. **Service Clients**: Track external service calls
3. **Cache Operations**: Monitor cache hits/misses
4. **Error Handling**: Capture error details
5. **Search Orchestration**: Track search pipeline events

## Best Practices

1. **Development Only**: Debug mode should be used during development
2. **Performance**: Disable debug mode in production to avoid memory overhead
3. **Sensitive Data**: Be cautious about logging sensitive information
4. **Log Rotation**: Clear logs periodically to maintain performance

## Technical Implementation

### Component Location
- **Main Component**: `/components/sidebar/DebugToggle.tsx`
- **Context Provider**: `/contexts/SidebarContext.tsx`
- **Debug Logger Utility**: `/lib/debug-logger.ts`

### Styling
- Uses Tailwind CSS for all styling
- Dark mode support with appropriate color schemes
- Responsive design adapts to sidebar state

### Accessibility
- Keyboard navigable with focus indicators
- ARIA labels for screen readers
- Clear visual feedback for all interactions