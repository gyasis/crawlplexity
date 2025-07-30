/**
 * Debug logger that writes to both console and file
 */
import fs from 'fs';
import path from 'path';

class DebugLogger {
  private logFile: string;
  
  constructor() {
    this.logFile = path.join(process.cwd(), 'debug-video-processing.log');
    // Clear the log file on startup
    this.clearLog();
  }
  
  private clearLog() {
    try {
      fs.writeFileSync(this.logFile, `=== Video Processing Debug Log Started at ${new Date().toISOString()} ===\n`);
    } catch (error) {
      console.warn('Could not create debug log file:', error);
    }
  }
  
  log(component: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] ${message}`;
    const dataStr = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    const fullMessage = logMessage + dataStr;
    
    // Log to console
    console.log(logMessage, data || '');
    
    // Log to file
    try {
      fs.appendFileSync(this.logFile, fullMessage + '\n');
    } catch (error) {
      console.warn('Could not write to debug log file:', error);
    }
  }
  
  error(component: string, message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] ERROR: ${message}`;
    const errorStr = error ? ` ${error.stack || error.message || JSON.stringify(error)}` : '';
    const fullMessage = logMessage + errorStr;
    
    // Log to console
    console.error(logMessage, error || '');
    
    // Log to file
    try {
      fs.appendFileSync(this.logFile, fullMessage + '\n');
    } catch (err) {
      console.warn('Could not write to debug log file:', err);
    }
  }
  
  getLogFilePath(): string {
    return this.logFile;
  }
}

// Singleton instance
let debugLogger: DebugLogger | null = null;

export function getDebugLogger(): DebugLogger {
  if (!debugLogger) {
    debugLogger = new DebugLogger();
  }
  return debugLogger;
}