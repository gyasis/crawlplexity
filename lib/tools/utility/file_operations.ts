// File Operations Tool - Read, write, and manage files

import { ToolDefinition } from '../types';
import { promises as fs } from 'fs';
import path from 'path';

export const fileOperationsTool: ToolDefinition = {
  name: 'file_operations',
  description: 'Read, write, list, and manage files safely within allowed directories',
  category: 'utility',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'File operation to perform',
        enum: ['read', 'write', 'list', 'exists', 'delete', 'info'],
        required: true
      },
      filePath: {
        type: 'string',
        description: 'Path to the file or directory (relative to project root)',
        required: true
      },
      content: {
        type: 'string',
        description: 'Content to write (for write operation)'
      },
      encoding: {
        type: 'string',
        description: 'File encoding',
        default: 'utf8'
      },
      recursive: {
        type: 'boolean',
        description: 'For list operation, include subdirectories',
        default: false
      }
    },
    required: ['operation', 'filePath']
  },
  handler: async ({ operation, filePath, content, encoding = 'utf8', recursive = false }) => {
    try {
      // Security: Restrict to safe directories
      const baseDir = process.cwd();
      const safePath = path.resolve(baseDir, String(filePath));
      
      // Ensure path is within allowed directory
      if (!safePath.startsWith(baseDir)) {
        return {
          error: 'Access denied: Path outside allowed directory',
          requestedPath: filePath
        };
      }

      // Check for sensitive file patterns
      const sensitivePatterns = ['.env', '.git', 'node_modules', '.ssh', 'private'];
      const isRestrictedPath = sensitivePatterns.some(pattern => 
        safePath.includes(pattern)
      );
      
      if (isRestrictedPath && operation !== 'exists') {
        return {
          error: 'Access denied: Restricted file or directory',
          requestedPath: filePath
        };
      }

      switch (operation) {
        case 'read': {
          // Check file size before reading
          const stats = await fs.stat(safePath);
          const maxSize = 10 * 1024 * 1024; // 10MB limit
          
          if (stats.size > maxSize) {
            return {
              error: 'File too large',
              size: stats.size,
              maxSize
            };
          }

          const fileContent = await fs.readFile(safePath, encoding as BufferEncoding);
          
          return {
            operation: 'read',
            filePath,
            content: fileContent,
            size: stats.size,
            encoding,
            lastModified: stats.mtime.toISOString()
          };
        }

        case 'write': {
          if (!content) {
            return {
              error: 'Content is required for write operation'
            };
          }

          // Create directory if it doesn't exist
          const dir = path.dirname(safePath);
          await fs.mkdir(dir, { recursive: true });

          // Write file
          await fs.writeFile(safePath, String(content), encoding as BufferEncoding);
          
          // Get file info after writing
          const stats = await fs.stat(safePath);
          
          return {
            operation: 'write',
            filePath,
            bytesWritten: stats.size,
            encoding,
            success: true,
            timestamp: new Date().toISOString()
          };
        }

        case 'list': {
          const files = await fs.readdir(safePath, { withFileTypes: true });
          
          const fileList = await Promise.all(
            files.map(async (dirent) => {
              const fullPath = path.join(safePath, dirent.name);
              const stats = await fs.stat(fullPath);
              
              const item: any = {
                name: dirent.name,
                type: dirent.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime.toISOString(),
                path: path.relative(baseDir, fullPath)
              };

              // Recursively list subdirectories if requested
              if (recursive && dirent.isDirectory() && !dirent.name.startsWith('.')) {
                const subHandler = await fileOperationsTool.handler({
                  operation: 'list',
                  filePath: path.join(String(filePath), dirent.name),
                  recursive: true
                });
                
                if (subHandler && !subHandler.error) {
                  item.children = subHandler.files;
                }
              }

              return item;
            })
          );

          return {
            operation: 'list',
            directory: filePath,
            files: fileList,
            count: fileList.length,
            recursive
          };
        }

        case 'exists': {
          try {
            await fs.access(safePath);
            const stats = await fs.stat(safePath);
            
            return {
              operation: 'exists',
              filePath,
              exists: true,
              type: stats.isDirectory() ? 'directory' : 'file',
              size: stats.size,
              modified: stats.mtime.toISOString()
            };
          } catch {
            return {
              operation: 'exists',
              filePath,
              exists: false
            };
          }
        }

        case 'delete': {
          // Extra safety check for delete operations
          const confirmPath = path.relative(baseDir, safePath);
          
          if (confirmPath.startsWith('..') || confirmPath === '') {
            return {
              error: 'Cannot delete files outside project directory'
            };
          }

          const stats = await fs.stat(safePath);
          
          if (stats.isDirectory()) {
            await fs.rmdir(safePath, { recursive: true });
          } else {
            await fs.unlink(safePath);
          }

          return {
            operation: 'delete',
            filePath,
            success: true,
            deletedType: stats.isDirectory() ? 'directory' : 'file',
            timestamp: new Date().toISOString()
          };
        }

        case 'info': {
          const stats = await fs.stat(safePath);
          
          return {
            operation: 'info',
            filePath,
            exists: true,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            accessed: stats.atime.toISOString(),
            permissions: stats.mode.toString(8).slice(-3),
            isReadable: true,
            isWritable: true
          };
        }

        default:
          return {
            error: `Unsupported operation: ${operation}`
          };
      }
    } catch (error: any) {
      return {
        operation,
        filePath,
        error: error.message,
        code: error.code,
        success: false
      };
    }
  }
};