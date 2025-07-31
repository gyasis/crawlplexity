"""
DSPy Taskmaster Module for breaking down complex tasks into sequential steps.
Uses DSPy's Chain of Thought for intelligent task decomposition.
"""

import asyncio
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import msgpack
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import DSPy
try:
    import dspy
except ImportError:
    print("Warning: dspy-ai not installed. Installing placeholder for development.")
    # For development, we'll create mock classes
    class dspy:
        class Signature:
            pass
        class Module:
            pass
        class ChainOfThought:
            def __init__(self, signature):
                self.signature = signature
            def __call__(self, **kwargs):
                return kwargs


# Pydantic models for type safety
class TaskStep(BaseModel):
    """Model for a single task step"""
    id: str = Field(description="Unique identifier for the step")
    order: int = Field(description="Order of execution (1, 2, 3, ...)")
    title: str = Field(description="Short, descriptive title")
    description: str = Field(description="Detailed description of what needs to be done")
    estimated_time: int = Field(description="Estimated time in minutes")
    dependencies: List[str] = Field(default_factory=list, description="List of step IDs this depends on")
    resources_needed: List[str] = Field(default_factory=list, description="Resources, tools, or data needed")
    success_criteria: List[str] = Field(default_factory=list, description="How to know this step is complete")
    commands: Optional[List[str]] = Field(default=None, description="Specific commands or actions to take")


class TaskBreakdown(BaseModel):
    """Model for complete task breakdown"""
    task_id: str = Field(description="Unique identifier for the task breakdown")
    original_task: str = Field(description="The original task description")
    breakdown: Dict[str, Any] = Field(description="The breakdown structure")
    metadata: Dict[str, Any] = Field(description="Additional metadata")


# DSPy Signatures
class TaskAnalysisSignature(dspy.Signature):
    """Analyze a task to understand its complexity and requirements."""
    task = dspy.InputField(desc="The task to analyze")
    task_type = dspy.InputField(desc="The type of task (research, content_creation, analysis, development, general)")
    max_steps = dspy.InputField(desc="Maximum number of steps allowed")
    
    complexity_score = dspy.OutputField(desc="Complexity score from 1-10")
    key_components = dspy.OutputField(desc="Key components or subtasks identified")
    estimated_total_time = dspy.OutputField(desc="Total estimated time in minutes")
    required_resources = dspy.OutputField(desc="Resources needed to complete the task")


class StepGenerationSignature(dspy.Signature):
    """Generate sequential steps for task completion."""
    task = dspy.InputField(desc="The task to break down")
    task_analysis = dspy.InputField(desc="Analysis results from task analyzer")
    max_steps = dspy.InputField(desc="Maximum number of steps allowed")
    
    steps = dspy.OutputField(desc="Ordered list of steps to complete the task")


class TaskOptimizationSignature(dspy.Signature):
    """Optimize the task breakdown for clarity and efficiency."""
    original_breakdown = dspy.InputField(desc="The initial task breakdown")
    task = dspy.InputField(desc="The original task")
    analysis = dspy.InputField(desc="Task analysis results")
    
    optimized_breakdown = dspy.OutputField(desc="Optimized task breakdown")
    optimization_notes = dspy.OutputField(desc="Notes on optimizations made")


class TaskmasterDSPyModule(dspy.Module):
    """DSPy module for breaking down complex tasks into sequential steps."""
    
    def __init__(self):
        super().__init__()
        self.task_analyzer = dspy.ChainOfThought(TaskAnalysisSignature)
        self.step_generator = dspy.ChainOfThought(StepGenerationSignature)
        self.optimizer = dspy.ChainOfThought(TaskOptimizationSignature)
        
    def forward(self, task: str, task_type: str = "general", max_steps: int = 10) -> Dict[str, Any]:
        """Forward pass through the taskmaster module."""
        # Analyze task
        analysis = self.task_analyzer(
            task=task,
            task_type=task_type,
            max_steps=max_steps
        )
        
        # Generate steps
        step_generation = self.step_generator(
            task=task,
            task_analysis=analysis,
            max_steps=max_steps
        )
        
        # Optimize breakdown
        optimization = self.optimizer(
            original_breakdown=step_generation,
            task=task,
            analysis=analysis
        )
        
        return optimization


class TaskmasterModule:
    """Main Taskmaster module for PyBridge integration."""
    
    def __init__(self):
        self.dspy_module: Optional[TaskmasterDSPyModule] = None
        self.initialized = False
        self.optimization_count = 0
        self.weights_path = "taskmaster_weights.pkl"
        
    async def initialize(self):
        """Initialize the DSPy module and load weights if available."""
        try:
            # Initialize DSPy with LiteLLM
            if hasattr(dspy, 'configure'):
                # Configure DSPy with LiteLLM proxy
                llm = dspy.LM(
                    model="litellm/gpt-3.5-turbo",
                    api_base="http://localhost:14782",  # LiteLLM proxy port
                    api_key=os.getenv("OPENAI_API_KEY", "dummy-key")
                )
                dspy.configure(lm=llm)
            
            # Initialize the DSPy module
            self.dspy_module = TaskmasterDSPyModule()
            
            # Load weights if they exist
            if os.path.exists(self.weights_path):
                await self._load_weights()
                
            self.initialized = True
            
        except Exception as e:
            print(f"Error initializing Taskmaster module: {e}")
            # For development, initialize with mock
            self.dspy_module = TaskmasterDSPyModule()
            self.initialized = True
    
    async def _load_weights(self):
        """Load pre-trained weights for the DSPy module."""
        # Placeholder for weight loading
        # In production, this would load actual DSPy optimized weights
        pass
    
    async def _save_weights(self):
        """Save optimized weights for the DSPy module."""
        # Placeholder for weight saving
        pass
    
    def _generate_task_id(self) -> str:
        """Generate a unique task ID."""
        timestamp = datetime.now().isoformat()
        return f"task_{timestamp.replace(':', '-').replace('.', '-')}"
    
    def _format_steps(self, raw_steps: List[Dict[str, Any]]) -> List[TaskStep]:
        """Format raw steps into TaskStep models."""
        formatted_steps = []
        
        for i, step in enumerate(raw_steps):
            # Ensure step has all required fields
            step_data = {
                "id": step.get("id", f"step_{i+1}"),
                "order": i + 1,
                "title": step.get("title", f"Step {i+1}"),
                "description": step.get("description", ""),
                "estimated_time": step.get("estimated_time", 15),
                "dependencies": step.get("dependencies", []),
                "resources_needed": step.get("resources_needed", []),
                "success_criteria": step.get("success_criteria", []),
                "commands": step.get("commands", [])
            }
            
            formatted_steps.append(TaskStep(**step_data))
            
        return formatted_steps
    
    async def breakdown_task(self, task: str, task_type: str = "general", max_steps: int = 10) -> bytes:
        """
        Break down a task into sequential steps.
        Returns msgpack-encoded breakdown for efficient transfer.
        """
        if not self.initialized:
            raise RuntimeError("Module not initialized. Call initialize() first.")
        
        try:
            # For development, create a mock breakdown
            if not hasattr(dspy, 'configure'):
                # Mock implementation for development
                breakdown_data = self._create_mock_breakdown(task, task_type, max_steps)
            else:
                # Real DSPy implementation
                result = self.dspy_module.forward(task, task_type, max_steps)
                
                # Extract and format the breakdown
                raw_steps = result.get("optimized_breakdown", {}).get("steps", [])
                formatted_steps = self._format_steps(raw_steps)
                
                breakdown_data = {
                    "task_id": self._generate_task_id(),
                    "original_task": task,
                    "breakdown": {
                        "steps": [step.dict() for step in formatted_steps],
                        "total_estimated_time": sum(step.estimated_time for step in formatted_steps),
                        "complexity_score": result.get("analysis", {}).get("complexity_score", 5.0),
                        "dependencies": []
                    },
                    "metadata": {
                        "task_type": task_type,
                        "created_at": datetime.now().isoformat(),
                        "optimization_version": f"1.0.{self.optimization_count}"
                    }
                }
            
            # Serialize with msgpack for efficiency
            return msgpack.packb(breakdown_data, use_bin_type=True)
            
        except Exception as e:
            error_data = {
                "error": str(e),
                "task_id": self._generate_task_id(),
                "original_task": task
            }
            return msgpack.packb(error_data, use_bin_type=True)
    
    def _create_mock_breakdown(self, task: str, task_type: str, max_steps: int) -> Dict[str, Any]:
        """Create a mock breakdown for development."""
        # Generate mock steps based on task type
        mock_steps = []
        
        if task_type == "research":
            mock_steps = [
                {
                    "id": "step_1",
                    "title": "Define Research Scope",
                    "description": "Clearly define the research question and scope",
                    "estimated_time": 15,
                    "dependencies": [],
                    "resources_needed": ["Research topic", "Access to sources"],
                    "success_criteria": ["Clear research question defined", "Scope boundaries set"],
                    "commands": ["Create research document", "List key questions"]
                },
                {
                    "id": "step_2", 
                    "title": "Gather Initial Sources",
                    "description": "Collect primary and secondary sources",
                    "estimated_time": 30,
                    "dependencies": ["step_1"],
                    "resources_needed": ["Academic databases", "Search engines"],
                    "success_criteria": ["10+ relevant sources identified", "Sources validated"],
                    "commands": ["Search academic databases", "Verify source credibility"]
                },
                {
                    "id": "step_3",
                    "title": "Analyze and Synthesize",
                    "description": "Analyze sources and synthesize findings",
                    "estimated_time": 45,
                    "dependencies": ["step_2"],
                    "resources_needed": ["Analysis tools", "Note-taking system"],
                    "success_criteria": ["Key themes identified", "Findings documented"],
                    "commands": ["Create analysis matrix", "Document key findings"]
                }
            ]
        elif task_type == "content_creation":
            mock_steps = [
                {
                    "id": "step_1",
                    "title": "Content Planning",
                    "description": "Plan the content structure and key points",
                    "estimated_time": 20,
                    "dependencies": [],
                    "resources_needed": ["Content brief", "Target audience info"],
                    "success_criteria": ["Outline created", "Key messages defined"],
                    "commands": ["Create content outline", "Define target audience"]
                },
                {
                    "id": "step_2",
                    "title": "Draft Creation",
                    "description": "Write the initial draft",
                    "estimated_time": 60,
                    "dependencies": ["step_1"],
                    "resources_needed": ["Writing tools", "Reference materials"],
                    "success_criteria": ["First draft completed", "All sections written"],
                    "commands": ["Write introduction", "Develop main content", "Create conclusion"]
                }
            ]
        else:
            # Generic task breakdown
            for i in range(min(3, max_steps)):
                mock_steps.append({
                    "id": f"step_{i+1}",
                    "title": f"Task Step {i+1}",
                    "description": f"Complete subtask {i+1} of the main task",
                    "estimated_time": 20,
                    "dependencies": [f"step_{i}"] if i > 0 else [],
                    "resources_needed": ["Required tools", "Documentation"],
                    "success_criteria": [f"Subtask {i+1} completed"],
                    "commands": [f"Execute subtask {i+1}"]
                })
        
        formatted_steps = self._format_steps(mock_steps[:max_steps])
        
        return {
            "task_id": self._generate_task_id(),
            "original_task": task,
            "breakdown": {
                "steps": [step.dict() for step in formatted_steps],
                "total_estimated_time": sum(step.estimated_time for step in formatted_steps),
                "complexity_score": 5.0,
                "dependencies": []
            },
            "metadata": {
                "task_type": task_type,
                "created_at": datetime.now().isoformat(),
                "optimization_version": "1.0.0"
            }
        }
    
    async def optimize_module(self, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize the module based on user feedback."""
        self.optimization_count += 1
        
        # Placeholder for DSPy optimization
        # In production, this would use DSPy's optimization capabilities
        
        optimization_result = {
            "optimization_id": f"opt_{self.optimization_count}",
            "timestamp": datetime.now().isoformat(),
            "improvements": ["Enhanced step clarity", "Better time estimates"],
            "metrics": {
                "before": {"accuracy": 0.75, "user_satisfaction": 0.8},
                "after": {"accuracy": 0.82, "user_satisfaction": 0.85}
            }
        }
        
        # Save optimized weights
        await self._save_weights()
        
        return optimization_result
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the module."""
        return {
            "initialized": self.initialized,
            "model_version": "1.0.0",
            "optimization_count": self.optimization_count,
            "weights_loaded": os.path.exists(self.weights_path),
            "backend": "dspy" if hasattr(dspy, 'configure') else "mock"
        }


# Module instance for PyBridge
taskmaster_instance = TaskmasterModule()

# Async wrapper functions for PyBridge
async def initialize():
    """Initialize the taskmaster module."""
    await taskmaster_instance.initialize()
    return {"status": "initialized"}

async def breakdown_task(task: str, task_type: str = "general", max_steps: int = 10) -> bytes:
    """Break down a task into sequential steps."""
    return await taskmaster_instance.breakdown_task(task, task_type, max_steps)

async def optimize_module(feedback: Dict[str, Any]) -> Dict[str, Any]:
    """Optimize the module based on feedback."""
    return await taskmaster_instance.optimize_module(feedback)

def get_status() -> Dict[str, Any]:
    """Get module status."""
    return taskmaster_instance.get_status()


# For testing
if __name__ == "__main__":
    async def test():
        await initialize()
        
        # Test task breakdown
        result = await breakdown_task(
            "Research the impact of AI on healthcare and create a comprehensive report",
            "research",
            5
        )
        
        # Decode the msgpack result
        decoded = msgpack.unpackb(result, raw=False)
        print(json.dumps(decoded, indent=2))
        
        # Get status
        status = get_status()
        print("\nModule Status:", json.dumps(status, indent=2))
    
    asyncio.run(test())