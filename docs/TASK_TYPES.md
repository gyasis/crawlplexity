# Task Types Documentation

## Overview

Fireplexity supports multiple task types across different modules to optimize AI model selection, task breakdown, and query processing. This document outlines all available task types and their usage patterns.

## 🔍 Core Task Types (Taskmaster Module)

The Taskmaster module uses these task types for breaking down complex tasks into manageable steps:

### Available Task Types

| Task Type | Description | Use Case |
|-----------|-------------|----------|
| **`research`** | Research-oriented tasks | Academic research, market analysis, literature reviews |
| **`content_creation`** | Content generation tasks | Blog posts, documentation, creative writing |
| **`analysis`** | Analytical tasks | Data analysis, report generation, insights extraction |
| **`development`** | Software development tasks | Code review, architecture planning, debugging |
| **`general`** | Default fallback | Any task that doesn't fit other categories |

### Usage Example

```typescript
// Taskmaster API call
const breakdown = await dspyService.breakdownTask(
  "Analyze market trends for renewable energy",
  { 
    task_type: 'research',
    max_steps: 10 
  }
);
```

## 🤖 LLM Task Types (LiteLLM Service)

These task types are used for intelligent model selection and optimization:

### Available Task Types

| Task Type | Description | Use Case |
|-----------|-------------|----------|
| **`general`** | General purpose tasks (default) | Standard AI interactions, general Q&A |
| **`search`** | Search and retrieval tasks | Web search, information gathering |
| **`summary`** | Summarization tasks | Document summarization, meeting notes |
| **`followup`** | Follow-up and continuation tasks | Conversation continuation, iterative refinement |

### Usage Example

```typescript
// LiteLLM API call
const response = await litellmClient.chat({
  messages: [...],
  task_type: 'search',
  temperature: 0.7,
  max_tokens: 2000
});
```

## 🔍 Query Types (Query Deconstruction)

Used for breaking down complex search queries into optimized sub-queries:

### Available Query Types

| Query Type | Description | Use Case |
|------------|-------------|----------|
| **`research`** | Research queries | Academic searches, deep investigation |
| **`search`** | General search queries | Standard web searches, information lookup |
| **`analysis`** | Analytical queries | Data analysis, comparative studies |
| **`general`** | General purpose queries | Default for any query type |

### Usage Example

```typescript
// Query Deconstruction API call
const deconstruction = await dspyService.deconstructQuery(
  "Compare React vs Vue performance benchmarks",
  { 
    query_type: 'analysis',
    max_queries: 5 
  }
);
```

## 🎯 Model Support Matrix

Different AI models support different task types based on their strengths:

| Model | Provider | Supported Task Types | Priority | Cost/1K Tokens |
|-------|----------|---------------------|----------|----------------|
| **GPT-4o Mini** | OpenAI | `general`, `search`, `summary`, `followup` | 1 | $0.15 |
| **Claude 3 Haiku** | Anthropic | `general`, `summary`, `followup` | 2 | $0.25 |
| **Gemini Pro** | Google | `general`, `search`, `followup` | 3 | $0.50 |
| **Mixtral 8x7B** | Groq | `general`, `search` | 4 | $0.27 |
| **Llama 3.1 8B** | Ollama | `general`, `summary` | 5 | $0.00 |

## 🚀 Module-Specific Usage

### 1. Taskmaster Module

```typescript
// Research task breakdown
const researchBreakdown = await taskmaster.breakdownTask(
  "Conduct a comprehensive analysis of AI ethics in healthcare",
  { task_type: 'research' }
);

// Content creation task breakdown
const contentBreakdown = await taskmaster.breakdownTask(
  "Create a technical blog post about microservices architecture",
  { task_type: 'content_creation' }
);
```

### 2. Deep Research Engine

```typescript
// Research methodology with task type
const researchSession = await deepResearch.start({
  query: "Impact of climate change on agriculture",
  task_type: 'research',
  methodology: 'comprehensive'
});
```

### 3. Crawlplexity (Web Search)

```typescript
// Search-focused web crawling
const searchResults = await crawlplexity.search({
  query: "latest developments in quantum computing",
  task_type: 'search',
  max_results: 20
});
```

### 4. Document Builder

```typescript
// Content creation for document building
const document = await documentBuilder.create({
  topic: "Machine Learning Fundamentals",
  task_type: 'content_creation',
  format: 'tutorial'
});
```

## ⚙️ Configuration

### Environment Variables

```bash
# LiteLLM Service Configuration
LITELLM_API_URL=http://localhost:14782
LLM_STRATEGY=balanced  # performance, cost, balanced, local

# Model API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key
OLLAMA_BASE_URL=http://localhost:11434
```

### Strategy Selection

The system supports different strategies for model selection:

- **`performance`**: Prioritizes the highest quality models
- **`cost`**: Prioritizes the most cost-effective models
- **`balanced`**: Balances performance and cost (default)
- **`local`**: Prioritizes locally hosted models (Ollama)

## 📊 Task Type Statistics

The system tracks usage statistics for each task type:

```typescript
interface UtilsStatistics {
  taskmaster: {
    popular_task_types: Record<TaskType, number>;
    // ... other stats
  };
  query_deconstruction: {
    popular_query_types: Record<QueryType, number>;
    // ... other stats
  };
}
```

## 🔄 Task Type Optimization

The system continuously optimizes task type handling through:

1. **Usage Analytics**: Tracking which task types are most effective
2. **Model Performance**: Monitoring which models perform best for each task type
3. **User Feedback**: Incorporating user ratings and feedback
4. **Automatic Tuning**: Adjusting parameters based on historical performance

## 🛠️ API Endpoints

### Taskmaster Endpoints

```typescript
// Break down a task
POST /api/utils/taskmaster/breakdown
{
  "task": "string",
  "options": {
    "task_type": "research|content_creation|analysis|development|general",
    "max_steps": 10
  }
}

// Get breakdowns by task type
GET /api/utils/taskmaster/breakdowns?task_type=research
```

### Query Deconstruction Endpoints

```typescript
// Deconstruct a query
POST /api/utils/query-deconstruction/deconstruct
{
  "query": "string",
  "options": {
    "query_type": "research|search|analysis|general",
    "max_queries": 5
  }
}
```

### Statistics Endpoints

```typescript
// Get task type statistics
GET /api/utils/stats
// Returns popular_task_types and usage metrics
```

## 🔮 Future Enhancements

Planned improvements for task types:

1. **Custom Task Types**: Allow users to define custom task types
2. **Task Type Learning**: Automatic task type detection from user input
3. **Performance Optimization**: Machine learning-based task type optimization
4. **Integration Expansion**: More modules supporting task type selection

## 📝 Notes

- Task types are case-sensitive and should be used exactly as specified
- The `general` task type serves as a fallback when no specific type is suitable
- Model selection automatically considers task type compatibility
- Task type statistics help optimize the system over time
- All task types support customization through additional parameters

---

*This documentation is maintained as part of the Fireplexity project. Task types may be updated or expanded based on user needs and system improvements.* 