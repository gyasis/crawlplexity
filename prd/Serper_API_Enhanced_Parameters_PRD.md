# Serper API Enhanced Parameters PRD
## Product Requirements Document

**Document Version:** 1.0  
**Date:** December 2024  
**Project:** Crawlplexity - Serper API Enhancement  
**Status:** Draft

---

## Executive Summary

This PRD outlines the enhancement of the Serper API client in Crawlplexity to support all available Serper API parameters with graceful fallbacks to sensible defaults. The current implementation only supports a limited subset of parameters, restricting the flexibility and power of search operations.

### Key Objectives
- Expand Serper API parameter support from 7 to 20+ parameters
- Implement graceful fallbacks to maintain backward compatibility
- Enhance search filtering and customization capabilities
- Improve user experience with more granular control over search results

---

## Current State Analysis

### Existing Implementation
The current `SerperClient` class in `lib/serper-client.ts` supports only basic parameters:

```typescript
export interface SerperOptions {
  num?: number;          // Number of results (default: 10, max: 100)
  start?: number;        // Start index for pagination
  gl?: string;          // Country code (e.g., 'us', 'uk')
  hl?: string;          // Language code (e.g., 'en', 'es')
  autocorrect?: boolean; // Enable autocorrect (default: true)
  page?: number;        // Page number for pagination
  type?: 'search' | 'images' | 'videos' | 'places' | 'news';
}
```

### Limitations
1. **Limited Parameter Support**: Only 7 out of 20+ available Serper API parameters
2. **No Advanced Filtering**: Missing domain exclusion, time-based filtering, device targeting
3. **Restricted Search Types**: Limited search type options
4. **No Location Precision**: Missing precise location targeting capabilities

---

## Requirements

### 1. Core Search Parameters

#### 1.1 Query Parameters
- **`q`** (required): Search query string
  - Type: `string`
  - Default: None (required)
  - Example: `"best restaurants in NYC"`

#### 1.2 Result Control
- **`num`**: Number of results to return
  - Type: `number`
  - Default: `6`
  - Range: 1-100
  - Example: `10`

- **`start`**: Start index for pagination
  - Type: `number`
  - Default: `0`
  - Example: `10` (for results 11-20)

- **`page`**: Page number for pagination
  - Type: `number`
  - Default: `1`
  - Example: `2`

### 2. Localization Parameters

#### 2.1 Geographic Targeting
- **`gl`**: Country code for search results
  - Type: `string`
  - Default: `'us'`
  - Format: ISO 3166-1 alpha-2
  - Examples: `'us'`, `'uk'`, `'fr'`, `'de'`

- **`hl`**: Interface language
  - Type: `string`
  - Default: `'en'`
  - Format: ISO 639-1
  - Examples: `'en'`, `'es'`, `'fr'`, `'de'`

- **`location`**: Specific location for local searches
  - Type: `string`
  - Default: `undefined`
  - Examples: `"New York, NY"`, `"London, UK"`

- **`google_domain`**: Google domain to use
  - Type: `string`
  - Default: `'google.com'`
  - Examples: `'google.co.uk'`, `'google.fr'`

#### 2.2 Language and Region Filtering
- **`lr`**: Language restriction
  - Type: `string`
  - Default: `undefined`
  - Examples: `'lang_en'`, `'lang_fr'`

- **`cr`**: Country restriction
  - Type: `string`
  - Default: `undefined`
  - Examples: `'countryUS'`, `'countryUK'`

### 3. Search Type and Content Parameters

#### 3.1 Search Types
- **`type`**: Type of search to perform
  - Type: `'search' | 'images' | 'videos' | 'places' | 'news'`
  - Default: `'search'`

- **`tbm`**: Search type modifier
  - Type: `string`
  - Default: `undefined`
  - Examples: `'isch'` (images), `'vid'` (videos), `'nws'` (news), `'shop'` (shopping)

#### 3.2 Content Filtering
- **`tbs`**: Time-based filtering
  - Type: `string`
  - Default: `undefined`
  - Examples: `'qdr:d'` (past day), `'qdr:w'` (past week), `'qdr:m'` (past month), `'qdr:y'` (past year)

### 4. Device and Display Parameters

#### 4.1 Device Targeting
- **`device`**: Device type for search results
  - Type: `'desktop' | 'mobile' | 'tablet'`
  - Default: `'desktop'`

#### 4.2 Browser Configuration
- **`brd_mobile`**: Mobile browser configuration
  - Type: `boolean`
  - Default: `false`

- **`brd_browser`**: Browser type configuration
  - Type: `string`
  - Default: `undefined`

### 5. Advanced Search Parameters

#### 5.1 Query Enhancement
- **`autocorrect`**: Enable query autocorrection
  - Type: `boolean`
  - Default: `true`

#### 5.2 Knowledge Graph
- **`kgmid`**: Knowledge Graph ID override
  - Type: `string`
  - Default: `undefined`

- **`si`**: Knowledge Graph tabs scraping
  - Type: `string`
  - Default: `undefined`

#### 5.3 Location Encoding
- **`uule`**: Encoded location parameter
  - Type: `string`
  - Default: `undefined`
  - Note: Base64 encoded location string

### 6. Filtering and Exclusion Parameters

#### 6.1 Domain Filtering
- **`excludeDomains`**: Domains to exclude from search
  - Type: `string[]`
  - Default: `[]`
  - Example: `['youtube.com', 'facebook.com']`

- **`includeDomains`**: Domains to include in search
  - Type: `string[]`
  - Default: `[]`
  - Example: `['wikipedia.org', 'stackoverflow.com']`

#### 6.2 Content Filtering
- **`safe`**: Safe search filtering
  - Type: `'active' | 'moderate' | 'off'`
  - Default: `'moderate'`

---

## Technical Implementation

### 1. Enhanced Interface Definition

```typescript
export interface SerperOptions {
  // Core Parameters
  q?: string;
  num?: number;
  start?: number;
  page?: number;
  
  // Localization
  gl?: string;
  hl?: string;
  location?: string;
  google_domain?: string;
  lr?: string;
  cr?: string;
  
  // Search Types
  type?: 'search' | 'images' | 'videos' | 'places' | 'news';
  tbm?: string;
  
  // Content Filtering
  tbs?: string;
  safe?: 'active' | 'moderate' | 'off';
  
  // Device Targeting
  device?: 'desktop' | 'mobile' | 'tablet';
  brd_mobile?: boolean;
  brd_browser?: string;
  
  // Advanced Parameters
  autocorrect?: boolean;
  kgmid?: string;
  si?: string;
  uule?: string;
  
  // Custom Filtering
  excludeDomains?: string[];
  includeDomains?: string[];
}
```

### 2. Graceful Fallback Implementation

```typescript
export class SerperClient {
  private readonly DEFAULT_OPTIONS = {
    num: 6,
    start: 0,
    page: 1,
    gl: 'us',
    hl: 'en',
    type: 'search' as const,
    autocorrect: true,
    device: 'desktop' as const,
    safe: 'moderate' as const,
    excludeDomains: [],
    includeDomains: []
  };

  async search(
    query: string, 
    options: SerperOptions = {}
  ): Promise<SerperResponse> {
    // Merge with defaults
    const mergedOptions = this.mergeWithDefaults(options);
    
    // Build request body
    const requestBody = this.buildRequestBody(query, mergedOptions);
    
    // Make API call
    return this.makeApiCall(requestBody, mergedOptions.type);
  }

  private mergeWithDefaults(options: SerperOptions): Required<SerperOptions> {
    return {
      ...this.DEFAULT_OPTIONS,
      ...options,
      // Handle array defaults
      excludeDomains: options.excludeDomains || this.DEFAULT_OPTIONS.excludeDomains,
      includeDomains: options.includeDomains || this.DEFAULT_OPTIONS.includeDomains
    };
  }

  private buildRequestBody(query: string, options: Required<SerperOptions>) {
    const requestBody: any = {
      q: this.buildEnhancedQuery(query, options),
      num: options.num,
      start: options.start,
      gl: options.gl,
      hl: options.hl,
      autocorrect: options.autocorrect,
      page: options.page
    };

    // Add optional parameters only if they have values
    if (options.location) requestBody.location = options.location;
    if (options.google_domain) requestBody.google_domain = options.google_domain;
    if (options.lr) requestBody.lr = options.lr;
    if (options.cr) requestBody.cr = options.cr;
    if (options.tbm) requestBody.tbm = options.tbm;
    if (options.tbs) requestBody.tbs = options.tbs;
    if (options.device) requestBody.device = options.device;
    if (options.brd_mobile !== undefined) requestBody.brd_mobile = options.brd_mobile;
    if (options.brd_browser) requestBody.brd_browser = options.brd_browser;
    if (options.kgmid) requestBody.kgmid = options.kgmid;
    if (options.si) requestBody.si = options.si;
    if (options.uule) requestBody.uule = options.uule;
    if (options.safe) requestBody.safe = options.safe;

    return requestBody;
  }

  private buildEnhancedQuery(query: string, options: Required<SerperOptions>): string {
    let enhancedQuery = query;

    // Add domain exclusions
    if (options.excludeDomains.length > 0) {
      const exclusionString = options.excludeDomains
        .map(domain => `-site:${domain}`)
        .join(' ');
      enhancedQuery = `${enhancedQuery} ${exclusionString}`;
    }

    // Add domain inclusions
    if (options.includeDomains.length > 0) {
      const inclusionString = options.includeDomains
        .map(domain => `site:${domain}`)
        .join(' OR ');
      enhancedQuery = `(${inclusionString}) ${enhancedQuery}`;
    }

    return enhancedQuery.trim();
  }
}
```

### 3. Validation and Error Handling

```typescript
private validateOptions(options: SerperOptions): void {
  // Validate numeric ranges
  if (options.num && (options.num < 1 || options.num > 100)) {
    throw new Error('num must be between 1 and 100');
  }

  if (options.start && options.start < 0) {
    throw new Error('start must be non-negative');
  }

  if (options.page && options.page < 1) {
    throw new Error('page must be positive');
  }

  // Validate country codes
  if (options.gl && !this.isValidCountryCode(options.gl)) {
    throw new Error(`Invalid country code: ${options.gl}`);
  }

  // Validate language codes
  if (options.hl && !this.isValidLanguageCode(options.hl)) {
    throw new Error(`Invalid language code: ${options.hl}`);
  }
}

private isValidCountryCode(code: string): boolean {
  const validCodes = ['us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'kr', 'cn', 'in', 'br', 'mx'];
  return validCodes.includes(code.toLowerCase());
}

private isValidLanguageCode(code: string): boolean {
  const validCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi'];
  return validCodes.includes(code.toLowerCase());
}
```

---

## Benefits

### 1. Enhanced Search Capabilities
- **Precise Location Targeting**: Search for local businesses and services
- **Time-Based Filtering**: Get recent or historical results
- **Device-Specific Results**: Optimize for mobile or desktop experiences
- **Content Filtering**: Exclude inappropriate content

### 2. Improved User Experience
- **Domain Exclusion**: Avoid unwanted sources (YouTube, social media)
- **Language Localization**: Better results for international users
- **Customizable Results**: Tailor search results to specific needs

### 3. Developer Flexibility
- **Backward Compatibility**: Existing code continues to work
- **Gradual Adoption**: Developers can use new features incrementally
- **Type Safety**: Full TypeScript support with proper interfaces

### 4. Performance Optimization
- **Query-Level Filtering**: Reduce unnecessary API calls
- **Efficient Pagination**: Better control over result sets
- **Caching Optimization**: More granular cache keys

---

## Implementation Plan

### Phase 1: Core Enhancement (Week 1)
1. **Update Interface**: Expand `SerperOptions` interface
2. **Implement Defaults**: Add comprehensive default values
3. **Basic Validation**: Add parameter validation
4. **Backward Compatibility**: Ensure existing code works

### Phase 2: Advanced Features (Week 2)
1. **Domain Filtering**: Implement `excludeDomains` and `includeDomains`
2. **Query Enhancement**: Build enhanced query construction
3. **Error Handling**: Add comprehensive error handling
4. **Documentation**: Update API documentation

### Phase 3: Testing and Optimization (Week 3)
1. **Unit Tests**: Add comprehensive test coverage
2. **Integration Tests**: Test with real Serper API
3. **Performance Testing**: Validate performance impact
4. **User Testing**: Test with sample use cases

### Phase 4: Documentation and Deployment (Week 4)
1. **API Documentation**: Complete parameter documentation
2. **Examples**: Create usage examples
3. **Migration Guide**: Guide for existing users
4. **Deployment**: Deploy to production

---

## Testing Strategy

### 1. Unit Tests
```typescript
describe('SerperClient Enhanced Parameters', () => {
  test('should handle all parameters with defaults', () => {
    const client = new SerperClient('test-key');
    const result = client.search('test query', {
      num: 10,
      gl: 'uk',
      excludeDomains: ['youtube.com']
    });
    // Assert expected behavior
  });

  test('should gracefully handle invalid parameters', () => {
    // Test validation and error handling
  });

  test('should maintain backward compatibility', () => {
    // Test existing code still works
  });
});
```

### 2. Integration Tests
- Test with real Serper API
- Validate parameter combinations
- Test error scenarios
- Performance benchmarking

### 3. User Acceptance Tests
- Test common use cases
- Validate user workflows
- Performance under load
- Error recovery

---

## LLM-Driven Parameter Selection System

### Overview
This enhancement adds an intelligent LLM-driven parameter selection system that automatically analyzes user queries and selects optimal Serper API parameters, similar to MCP server function calling patterns.

### System Architecture

#### 1. Core Components

**LLM Parameter Selector**
- Analyzes user queries for intent, location, device context, and filtering needs
- Generates structured parameter selections using function calling
- Provides confidence scores for parameter selections

**Parameter Validation Engine**
- Validates LLM-generated parameters against JSON schema
- Provides fallback parameters for invalid selections
- Ensures backward compatibility

**Query Intent Analyzer**
- Extracts entities (locations, devices, time periods, domains)
- Identifies search intent (informational, navigational, transactional, local)
- Maps intent to optimal parameter combinations

#### 2. JSON Schema for LLM Function Calling

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Serper API Parameter Selection Schema",
  "description": "Schema for LLM-driven Serper API parameter selection",
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The user's search query"
    },
    "location": {
      "type": "string",
      "description": "Geographical location for local searches",
      "examples": ["New York, NY", "London", "United States"],
      "nullable": true
    },
    "gl": {
      "type": "string",
      "description": "Country code (ISO 3166-1 alpha-2)",
      "pattern": "^[A-Z]{2}$",
      "examples": ["US", "GB", "DE"],
      "nullable": true
    },
    "hl": {
      "type": "string", 
      "description": "Language code (ISO 639-1 alpha-2)",
      "pattern": "^[a-z]{2}$",
      "examples": ["en", "fr", "de"],
      "nullable": true
    },
    "device": {
      "type": "string",
      "description": "Device type for search optimization",
      "enum": ["desktop", "mobile", "tablet"],
      "nullable": true
    },
    "num": {
      "type": "integer",
      "description": "Number of results to return",
      "minimum": 1,
      "maximum": 100,
      "default": 6,
      "nullable": true
    },
    "tbs": {
      "type": "string",
      "description": "Time-based filtering",
      "enum": ["qdr:h", "qdr:d", "qdr:w", "qdr:m", "qdr:y"],
      "nullable": true
    },
    "excludeDomains": {
      "type": "array",
      "description": "Domains to exclude from search results",
      "items": {
        "type": "string",
        "format": "hostname"
      },
      "nullable": true
    },
    "includeDomains": {
      "type": "array", 
      "description": "Domains to include in search results",
      "items": {
        "type": "string",
        "format": "hostname"
      },
      "nullable": true
    },
    "type": {
      "type": "string",
      "description": "Search type",
      "enum": ["search", "images", "videos", "places", "news"],
      "default": "search",
      "nullable": true
    },
    "confidence": {
      "type": "number",
      "description": "LLM confidence in parameter selection (0-1)",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["query", "confidence"],
  "additionalProperties": false
}
```

#### 3. LLM Integration Pattern

```typescript
interface LLMParameterSelector {
  analyzeQuery(query: string, context?: SearchContext): Promise<ParameterSelection>;
  validateParameters(selection: ParameterSelection): ValidationResult;
  fallbackToDefaults(invalidSelection: ParameterSelection): SerperOptions;
}

interface ParameterSelection {
  parameters: SerperOptions;
  confidence: number;
  reasoning: string;
  intent: SearchIntent;
  entities: ExtractedEntity[];
}

interface SearchContext {
  userAgent?: string;
  userLocation?: string;
  userPreferences?: UserPreferences;
  searchHistory?: SearchHistory[];
}
```

#### 4. Implementation Strategy

**Phase 1: Basic LLM Integration**
```typescript
class LLMEnhancedSerperClient extends SerperClient {
  private llmSelector: LLMParameterSelector;
  
  async searchWithLLM(
    query: string, 
    context?: SearchContext
  ): Promise<SerperResponse> {
    // Step 1: LLM analyzes query and selects parameters
    const selection = await this.llmSelector.analyzeQuery(query, context);
    
    // Step 2: Validate LLM selection
    const validation = this.llmSelector.validateParameters(selection);
    
    // Step 3: Use LLM parameters or fallback to defaults
    const finalOptions = validation.isValid 
      ? selection.parameters 
      : this.llmSelector.fallbackToDefaults(selection);
    
    // Step 4: Execute search with optimized parameters
    return this.search(query, finalOptions);
  }
}
```

**Phase 2: Advanced Intent Analysis**
```typescript
class QueryIntentAnalyzer {
  extractIntent(query: string): SearchIntent {
    // Analyze query for intent patterns
    const patterns = {
      local: ['near me', 'nearby', 'in [location]', 'restaurant', 'hotel'],
      transactional: ['buy', 'purchase', 'price', 'cost', 'deal'],
      navigational: ['login', 'website', 'official', 'homepage'],
      informational: ['how to', 'what is', 'why', 'when', 'where']
    };
    
    // Return detected intent with confidence
  }
  
  extractEntities(query: string): ExtractedEntity[] {
    // Extract locations, devices, time periods, domains
    // Use NER techniques and pattern matching
  }
}
```

#### 5. MCP-Style Function Calling

```typescript
// Function definition for LLM
const serperParameterFunction = {
  name: "select_serper_parameters",
  description: "Analyze user query and select optimal Serper API parameters",
  parameters: {
    type: "object",
    properties: {
      // JSON schema properties as defined above
    },
    required: ["query", "confidence"]
  }
};

// LLM prompt template
const parameterSelectionPrompt = `
You are an expert search parameter optimizer. Analyze the user query and select the best Serper API parameters.

Query: "{query}"
Context: {context}

Consider:
- Location hints in the query
- Device context from user agent
- Time sensitivity (news, recent events)
- Domain preferences or exclusions
- Search intent (local, transactional, informational)

Generate parameters with high confidence only. Use null for uncertain parameters.
`;
```

### Benefits of LLM-Driven Selection

#### 1. Intelligent Parameter Optimization
- **Automatic Location Detection**: "restaurants near Central Park" → `location: "New York, NY"`
- **Device Context Inference**: "mobile app development" → `device: "mobile"`
- **Time Sensitivity**: "latest news" → `tbs: "qdr:d"`
- **Domain Filtering**: "unbiased news" → `excludeDomains: ["biased-news.com"]`

#### 2. Enhanced User Experience
- **Zero Configuration**: Users don't need to understand API parameters
- **Contextual Results**: Better results based on query intent
- **Personalized Search**: Learns from user preferences over time
- **Adaptive Filtering**: Automatically excludes irrelevant domains

#### 3. Performance Improvements
- **Reduced API Calls**: Better parameter selection reduces need for multiple searches
- **Faster Results**: Optimized parameters lead to more relevant results
- **Caching Optimization**: LLM selections can be cached for similar queries

### Implementation Examples

#### Example 1: Local Search Optimization
```typescript
// User Query: "best Italian restaurants near me"
const llmSelection = await llmSelector.analyzeQuery(query, {
  userLocation: "New York, NY",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
});

// LLM Output:
{
  parameters: {
    query: "best Italian restaurants",
    location: "New York, NY",
    gl: "US",
    device: "mobile",
    type: "places",
    num: 10
  },
  confidence: 0.95,
  intent: "local",
  reasoning: "Query contains location intent and mobile device detected"
}
```

#### Example 2: News Search with Time Filtering
```typescript
// User Query: "latest AI developments this week"
const llmSelection = await llmSelector.analyzeQuery(query);

// LLM Output:
{
  parameters: {
    query: "AI developments",
    tbs: "qdr:w",
    type: "news",
    excludeDomains: ["youtube.com", "social-media.com"],
    num: 15
  },
  confidence: 0.88,
  intent: "informational",
  reasoning: "Time-sensitive news query, excluding video/social content"
}
```

### Integration with Existing System

#### 1. Backward Compatibility
```typescript
// Existing code continues to work
const results = await serperClient.search("query");

// New LLM-enhanced search
const results = await serperClient.searchWithLLM("query");
```

#### 2. Gradual Rollout
- Phase 1: LLM suggestions with manual override
- Phase 2: Automatic LLM selection with fallback
- Phase 3: Full LLM-driven optimization

#### 3. Monitoring and Feedback
```typescript
interface LLMPerformanceMetrics {
  parameterAccuracy: number;
  userSatisfaction: number;
  searchRelevance: number;
  fallbackRate: number;
}
```

## Success Metrics

### 1. Technical Metrics
- **Parameter Coverage**: 100% of Serper API parameters supported
- **Backward Compatibility**: 100% of existing code continues to work
- **Performance**: No degradation in response times
- **Error Rate**: <1% error rate for new parameters
- **LLM Accuracy**: >90% parameter selection accuracy
- **Fallback Rate**: <5% fallback to default parameters

### 2. User Metrics
- **Adoption Rate**: >50% of new searches use enhanced parameters
- **User Satisfaction**: Improved search result relevance
- **Feature Usage**: Domain filtering used in >30% of searches
- **LLM Adoption**: >70% of searches use LLM-driven parameters
- **Query Intent Accuracy**: >85% correct intent detection

### 3. Business Metrics
- **API Efficiency**: Reduced unnecessary API calls
- **Cost Optimization**: Better resource utilization
- **Developer Productivity**: Faster feature development
- **Search Quality**: 25% improvement in result relevance
- **User Engagement**: 15% increase in search interactions

---

## Risk Assessment

### 1. Technical Risks
- **API Changes**: Serper API parameter changes
- **Performance Impact**: Additional processing overhead
- **Complexity**: Increased code complexity

### 2. Mitigation Strategies
- **Versioning**: Maintain API version compatibility
- **Performance Monitoring**: Continuous performance tracking
- **Code Reviews**: Thorough review process
- **Documentation**: Comprehensive documentation

---

## Conclusion

This enhancement will significantly improve the flexibility and power of the Serper API client in Crawlplexity. By implementing all available parameters with graceful fallbacks, we provide developers with maximum control while maintaining ease of use and backward compatibility.

The implementation follows best practices for API design, includes comprehensive testing, and provides clear migration paths for existing users. The enhanced functionality will enable more sophisticated search applications and improve the overall user experience.

---

**Document Approval:**
- [ ] Technical Lead Review
- [ ] Product Manager Approval
- [ ] Architecture Review
- [ ] Security Review 