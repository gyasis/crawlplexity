#!/usr/bin/env python3
"""
DSPy Bridge - Subprocess communication bridge for DSPy services
Handles communication between Node.js and Python DSPy modules
"""

import sys
import json
import traceback
import asyncio
from typing import Dict, Any, Optional
import msgpack

# Import the DSPy modules
from taskmaster_module import TaskmasterModule
from query_decon_module import QueryDeconstructionModule

class DSPyBridge:
    def __init__(self):
        self.taskmaster = None
        self.query_decon = None
        self.initialized = False
        
    async def initialize(self):
        """Initialize both DSPy modules"""
        try:
            self.taskmaster = TaskmasterModule()
            self.query_decon = QueryDeconstructionModule()
            
            # Initialize modules (handle both sync and async versions)
            if hasattr(self.taskmaster.initialize, '__call__'):
                if asyncio.iscoroutinefunction(self.taskmaster.initialize):
                    await self.taskmaster.initialize()
                else:
                    self.taskmaster.initialize()
            
            if hasattr(self.query_decon.initialize, '__call__'):
                if asyncio.iscoroutinefunction(self.query_decon.initialize):
                    await self.query_decon.initialize()
                else:
                    self.query_decon.initialize()
            
            self.initialized = True
            return {"status": "initialized"}
        except Exception as e:
            raise Exception(f"Failed to initialize DSPy modules: {str(e)}")
    
    async def breakdown_task(self, task: str, task_type: str, max_steps: int) -> Dict[str, Any]:
        """Break down a task using Taskmaster module"""
        if not self.initialized:
            raise Exception("Bridge not initialized")
        
        try:
            # Call the taskmaster module (handle both sync and async)
            if asyncio.iscoroutinefunction(self.taskmaster.breakdown_task):
                result_bytes = await self.taskmaster.breakdown_task(task, task_type, max_steps)
            else:
                result_bytes = self.taskmaster.breakdown_task(task, task_type, max_steps)
            
            # Decode msgpack result if it's bytes, otherwise return as-is
            if isinstance(result_bytes, bytes):
                result = msgpack.decode(result_bytes)
            else:
                result = result_bytes
            return result
        except Exception as e:
            raise Exception(f"Task breakdown failed: {str(e)}")
    
    async def deconstruct_query(self, query: str, query_type: str, max_queries: int) -> Dict[str, Any]:
        """Deconstruct a query using Query Deconstruction module"""
        if not self.initialized:
            raise Exception("Bridge not initialized")
        
        try:
            # Call the query deconstruction module (handle both sync and async)
            if asyncio.iscoroutinefunction(self.query_decon.deconstruct_query):
                result_bytes = await self.query_decon.deconstruct_query(query, query_type, max_queries)
            else:
                result_bytes = self.query_decon.deconstruct_query(query, query_type, max_queries)
            
            # Decode msgpack result if it's bytes, otherwise return as-is
            if isinstance(result_bytes, bytes):
                result = msgpack.decode(result_bytes)
            else:
                result = result_bytes
            return result
        except Exception as e:
            raise Exception(f"Query deconstruction failed: {str(e)}")
    
    async def optimize_module(self, module_name: str, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize a module based on feedback"""
        if not self.initialized:
            raise Exception("Bridge not initialized")
        
        try:
            if module_name == 'taskmaster':
                if asyncio.iscoroutinefunction(self.taskmaster.optimize_module):
                    result = await self.taskmaster.optimize_module(feedback)
                else:
                    result = self.taskmaster.optimize_module(feedback)
            elif module_name == 'query_deconstruction':
                if asyncio.iscoroutinefunction(self.query_decon.optimize_module):
                    result = await self.query_decon.optimize_module(feedback)
                else:
                    result = self.query_decon.optimize_module(feedback)
            else:
                raise Exception(f"Unknown module: {module_name}")
            
            return result
        except Exception as e:
            raise Exception(f"Module optimization failed: {str(e)}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get status of both modules"""
        if not self.initialized:
            return {
                "taskmaster": {"status": "not_initialized"},
                "query_deconstruction": {"status": "not_initialized"}
            }
        
        try:
            taskmaster_status = self.taskmaster.get_status()
            query_decon_status = self.query_decon.get_status()
            
            return {
                "taskmaster": taskmaster_status,
                "query_deconstruction": query_decon_status
            }
        except Exception as e:
            raise Exception(f"Status check failed: {str(e)}")

class BridgeServer:
    def __init__(self):
        self.bridge = DSPyBridge()
        self.running = True
    
    async def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming messages from Node.js"""
        try:
            command = message.get('command')
            params = message.get('params', {})
            
            if command == 'initialize':
                result = await self.bridge.initialize()
            elif command == 'breakdown_task':
                result = await self.bridge.breakdown_task(
                    params['task'],
                    params['task_type'],
                    params['max_steps']
                )
            elif command == 'deconstruct_query':
                result = await self.bridge.deconstruct_query(
                    params['query'],
                    params['query_type'],
                    params['max_queries']
                )
            elif command == 'optimize_module':
                result = await self.bridge.optimize_module(
                    params['module_name'],
                    params['feedback']
                )
            elif command == 'get_status':
                result = await self.bridge.get_status()
            elif command == 'shutdown':
                self.running = False
                result = {"status": "shutting_down"}
            else:
                raise Exception(f"Unknown command: {command}")
            
            return {
                "id": message.get('id'),
                "result": result
            }
        
        except Exception as e:
            return {
                "id": message.get('id'),
                "error": str(e)
            }
    
    async def run(self):
        """Main server loop"""
        # Debug: Print startup message to stderr
        print("DSPy Bridge server starting...", file=sys.stderr, flush=True)
        
        # Send ready signal
        print(json.dumps({"type": "ready"}), flush=True)
        print("DSPy Bridge ready signal sent", file=sys.stderr, flush=True)
        
        try:
            while self.running:
                try:
                    # Read line from stdin (with timeout to avoid hanging)
                    line = await asyncio.wait_for(
                        asyncio.get_event_loop().run_in_executor(
                            None, sys.stdin.readline
                        ),
                        timeout=1.0
                    )
                    
                    if not line:
                        break
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        message = json.loads(line)
                        response = await self.handle_message(message)
                        print(json.dumps(response), flush=True)
                    except json.JSONDecodeError:
                        print(json.dumps({
                            "error": "Invalid JSON message"
                        }), flush=True)
                
                except asyncio.TimeoutError:
                    # Timeout is expected when no input is available
                    continue
                except Exception as e:
                    print(json.dumps({
                        "error": f"Server error: {str(e)}"
                    }), flush=True)
                    print(f"Server error: {str(e)}", file=sys.stderr, flush=True)
        
        except KeyboardInterrupt:
            pass
        
        finally:
            # Cleanup
            if self.bridge.initialized:
                try:
                    # Close any resources if needed
                    pass
                except:
                    pass

def main():
    """Main entry point"""
    try:
        # Debug: Print startup message to stderr
        print("DSPy Bridge starting...", file=sys.stderr, flush=True)
        server = BridgeServer()
        asyncio.run(server.run())
    except Exception as e:
        print(json.dumps({
            "type": "error",
            "error": f"Bridge startup failed: {str(e)}"
        }), flush=True)
        print(f"Bridge startup failed: {str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    main()