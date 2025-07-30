import asyncio
from typing import AsyncGenerator, Dict, Any, Optional
import json
from datetime import datetime

from .gemini_video_url import GeminiVideoURLProcessor
from core.config import settings

class VideoProcessor:
    """Simplified video processor - sends URLs directly to Gemini"""
    
    def __init__(self, gemini_api_key: str):
        self.gemini_processor = GeminiVideoURLProcessor(api_key=gemini_api_key)
        
    async def process_video_comprehensive(
        self,
        url: str,
        search_query: str,
        custom_prompt: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Send video URL directly to Gemini for comprehensive analysis
        No downloads, no local processing - just URL to Gemini
        """
        
        try:
            # Send initial status
            yield {
                "status": "initializing",
                "message": "Starting video analysis...",
                "timestamp": datetime.now().isoformat()
            }
            
            # Send processing status
            yield {
                "status": "processing",
                "message": f"Sending video URL to Gemini for analysis...",
                "timestamp": datetime.now().isoformat()
            }
            
            # Process video URL directly with Gemini
            result = await self.gemini_processor.process_video_url(
                video_url=url,
                search_query=search_query,
                custom_prompt=custom_prompt
            )
            
            # Send the complete content
            yield {
                "status": "content",
                "type": "video_analysis",
                "content": result,
                "timestamp": datetime.now().isoformat(),
                "message": "Video analysis complete"
            }
            
            # Send completion status
            yield {
                "status": "complete",
                "message": "Video processing completed successfully",
                "summary": {
                    "url": url,
                    "processing_time": datetime.now().isoformat(),
                    "method": "direct_gemini_url"
                }
            }
            
        except Exception as e:
            yield {
                "status": "error",
                "message": f"Error processing video URL: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
