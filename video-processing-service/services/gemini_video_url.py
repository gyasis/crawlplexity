"""
Simplified Gemini video URL processor - sends YouTube/video URLs directly to Gemini
No downloading, no local processing - just URL to Gemini
"""
import os
from typing import Optional
import google.generativeai as genai

class GeminiVideoURLProcessor:
    """Process video URLs directly with Gemini - no downloads"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GOOGLE_AI_API_KEY')
        if not self.api_key:
            raise ValueError("Gemini API key is required")
        
        genai.configure(api_key=self.api_key)
        self.model = "gemini-1.5-pro"  # Model with multimodal video support
        
    async def process_video_url(
        self, 
        video_url: str, 
        search_query: str,
        custom_prompt: Optional[str] = None
    ) -> str:
        """
        Process a video URL directly with Gemini
        
        Args:
            video_url: YouTube or video URL
            search_query: User's search query for context
            custom_prompt: Optional custom prompt
            
        Returns:
            Processed markdown content
        """
        
        # Build context-aware prompt
        if custom_prompt:
            prompt = custom_prompt
        else:
            prompt = f"""
You are analyzing a video about "{search_query}". Create a comprehensive, academic-style article that extracts the COMPLETE TRANSCRIPT and all visual content.

Video URL: {video_url}

CRITICAL: Extract EVERY SINGLE WORD spoken in the video. Do not summarize - provide the full verbatim transcript organized as a structured document.

Required Output Format:

# Comprehensive Analysis of "[Exact Video Title]"

**Video URL:** {video_url}
**Topic:** {search_query}
**Duration:** [If visible]
**Author/Channel:** [If visible]

## Abstract
[2-3 sentence summary of the video's main thesis and conclusions]

## Full Transcript and Analysis

### [0:00-0:XX] Introduction
**Verbatim Transcript:**
"[Every single word spoken during this time period, using quotation marks]"

**Visual Elements Present:**
- [Describe any slides, diagrams, code shown on screen]
- [Extract any text visible on screen]
- [Describe animations, demonstrations, UI elements]

**Technical Content:**
- [List all technical concepts mentioned]
- [Note any formulas, equations, or specifications]

### [X:XX-X:XX] [Next Section Title Based on Content]
**Verbatim Transcript:**
"[Complete spoken content with quotation marks]"

**Code Demonstrations:** (if any)
```programming-language
// Exact code as shown on screen with comments
[Complete code blocks exactly as displayed]
```

**Visual Elements Present:**
- [All diagrams, charts, screenshots described]
- [Text from slides or presentations extracted]

**Technical Details:**
- [All technical explanations and concepts]
- [Step-by-step procedures mentioned]

[Continue this exact format for EVERY section of the video]

## Summary of Key Points
1. [Main point 1 with timestamp]
2. [Main point 2 with timestamp]
3. [All major points covered]

## Technical Specifications and Commands
[Every command, configuration, technical setting mentioned]

## Code Repository
[All code snippets consolidated with proper syntax highlighting]

## Resources and References
[Every external resource, book, website, or link mentioned]

## Conclusion
[Final thoughts and key takeaways from the complete transcript]

MANDATORY REQUIREMENTS:
1. EXTRACT THE COMPLETE TRANSCRIPT - Every single word spoken
2. Use quotation marks around all verbatim speech
3. Include detailed timestamps for every section
4. Capture ALL visual text, code, and demonstrations
5. Preserve exact technical terminology and specifications
6. Format as a scholarly article with proper sections
7. Include ALL code examples with complete context
8. Extract text from any slides, terminal windows, or IDE screens
9. Note every external resource or reference mentioned
10. Provide complete, searchable documentation of the entire video

The goal is to create a complete textual archive of the video that preserves 100% of the educational content for future reference and searchability.
"""

        try:
            # Send URL directly to Gemini
            model = genai.GenerativeModel(self.model)
            response = model.generate_content(
                [prompt, video_url],
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=16384,  # Increased for full transcripts
                    temperature=0.1  # Very low for maximum accuracy and verbatim content
                )
            )
            
            return response.text if response.text else "No content generated"
            
        except Exception as e:
            raise Exception(f"Error processing video URL with Gemini: {str(e)}")
    
    async def process_image_url(
        self,
        image_url: str,
        search_query: str,
        custom_prompt: Optional[str] = None
    ) -> str:
        """Process an image URL directly with Gemini"""
        
        if custom_prompt:
            prompt = custom_prompt
        else:
            prompt = f"""
Analyze this image in the context of the search query: "{search_query}"

Image URL: {image_url}

Please provide analysis in markdown format including:

1. **Image Description**: What the image shows
2. **Text Content**: Any visible text, code, or written information
3. **Technical Elements**: Diagrams, code snippets, UI elements
4. **Key Information**: Important details relevant to the search query
5. **Context**: How this image relates to "{search_query}"

Format as clean markdown.
"""
        
        try:
            model = genai.GenerativeModel(self.model)
            response = model.generate_content(
                [prompt, image_url],
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=4096,
                    temperature=0.3
                )
            )
            
            return response.text if response.text else "No content generated"
            
        except Exception as e:
            raise Exception(f"Error processing image URL with Gemini: {str(e)}")