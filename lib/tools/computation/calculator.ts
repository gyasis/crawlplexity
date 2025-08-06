// Calculator Tool - Perform mathematical calculations

import { ToolDefinition } from '../types';

export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: 'Perform mathematical calculations and expressions',
  category: 'computation',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")',
        required: true
      },
      precision: {
        type: 'number',
        description: 'Number of decimal places for the result',
        default: 2
      }
    },
    required: ['expression']
  },
  handler: async ({ expression, precision = 2 }) => {
    try {
      // Validate expression - only allow safe mathematical operations
      const safeExpression = String(expression).replace(/[^0-9+\-*/().\s]/g, '');
      
      if (safeExpression !== expression) {
        return {
          error: 'Invalid characters in expression',
          expression,
          safeExpression
        };
      }

      // Use Function constructor for safe evaluation
      // In production, consider using a proper math parser library like mathjs
      const result = Function(`"use strict"; return (${safeExpression})`)();
      
      if (typeof result !== 'number' || !isFinite(result)) {
        return {
          error: 'Invalid mathematical expression',
          expression
        };
      }

      // Format result with specified precision
      const formattedResult = Number(result.toFixed(precision as number));

      return {
        expression,
        result: formattedResult,
        type: 'number',
        precision,
        calculation: `${expression} = ${formattedResult}`
      };
    } catch (error: any) {
      return {
        error: 'Failed to evaluate expression',
        expression,
        details: error.message
      };
    }
  }
};

// Advanced calculator with more operations
export const advancedCalculatorTool: ToolDefinition = {
  name: 'advanced_calculator',
  description: 'Perform advanced mathematical operations including trigonometry and statistics',
  category: 'computation',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'Type of operation to perform',
        enum: ['basic', 'trigonometry', 'statistics', 'conversion'],
        required: true
      },
      values: {
        type: 'array',
        description: 'Array of values for the operation',
        required: true
      },
      function: {
        type: 'string',
        description: 'Specific function (sin, cos, tan, mean, median, etc.)'
      },
      unit: {
        type: 'string',
        description: 'Unit for conversion operations'
      }
    },
    required: ['operation', 'values']
  },
  handler: async ({ operation, values, function: func, unit }) => {
    try {
      const nums = (values as any[]).map(v => Number(v));
      
      switch (operation) {
        case 'basic':
          return {
            sum: nums.reduce((a, b) => a + b, 0),
            product: nums.reduce((a, b) => a * b, 1),
            min: Math.min(...nums),
            max: Math.max(...nums),
            count: nums.length
          };
          
        case 'trigonometry':
          if (!func) {
            return { error: 'Function required for trigonometry operations' };
          }
          
          const trigResults = nums.map(n => {
            switch (func) {
              case 'sin': return Math.sin(n);
              case 'cos': return Math.cos(n);
              case 'tan': return Math.tan(n);
              case 'asin': return Math.asin(n);
              case 'acos': return Math.acos(n);
              case 'atan': return Math.atan(n);
              default: return null;
            }
          });
          
          return {
            operation: 'trigonometry',
            function: func,
            inputs: nums,
            results: trigResults
          };
          
        case 'statistics':
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
          const sorted = [...nums].sort((a, b) => a - b);
          const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
          
          const variance = nums.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / nums.length;
          const stdDev = Math.sqrt(variance);
          
          return {
            operation: 'statistics',
            values: nums,
            mean,
            median,
            min: Math.min(...nums),
            max: Math.max(...nums),
            variance,
            standardDeviation: stdDev,
            count: nums.length
          };
          
        case 'conversion':
          // Simple unit conversion example
          if (!unit) {
            return { error: 'Unit required for conversion operations' };
          }
          
          // Add more conversion logic as needed
          return {
            operation: 'conversion',
            input: nums[0],
            unit,
            message: 'Conversion feature to be implemented'
          };
          
        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch (error: any) {
      return {
        error: 'Calculation failed',
        details: error.message
      };
    }
  }
};