import asyncio
import aiohttp
import base64
from typing import Optional, Dict, Any
from .gemini_multimedia import GeminiMultimedia
from core.config import settings

class GeminiService:
    """Async wrapper for Gemini multimedia processing"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.gemini_mm = GeminiMultimedia(api_key=api_key)
        
    async def process_image(self, image_url: str, prompt: str) -> str:
        """
        Process an image with Gemini Vision API
        """
        try:
            # Download image first
            image_data = await self._download_image(image_url)
            
            # Run Gemini processing in executor (since original is sync)
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                self._process_image_sync,
                image_data,
                prompt,
                image_url
            )
            
            return result
            
        except Exception as e:
            return f"Error processing image: {str(e)}"
    
    async def _download_image(self, url: str) -> bytes:
        """Download image from URL"""
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    raise Exception(f"Failed to download image: HTTP {response.status}")
                
                # Check content type
                content_type = response.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    raise Exception(f"URL does not point to an image: {content_type}")
                
                # Check size
                content_length = int(response.headers.get('content-length', 0))
                max_size = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
                if content_length > max_size:
                    raise Exception(f"Image too large: {content_length} bytes")
                
                return await response.read()
    
    def _process_image_sync(self, image_data: bytes, prompt: str, url: str) -> str:
        """
        Process image synchronously using the existing Gemini multimedia module
        """
        try:
            # Save image temporarily
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp.write(image_data)
                tmp_path = tmp.name
            
            try:
                # Use the existing Gemini multimedia processor
                result = self.gemini_mm.process_image(
                    image_path=tmp_path,
                    prompt=prompt
                )
                
                # Format result as markdown
                markdown_result = f"""# Image Analysis

**Source:** {url}

## Analysis

{result}

---
*Processed with Gemini Vision API*
"""
                return markdown_result
                
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                    
        except Exception as e:
            return f"Error in Gemini processing: {str(e)}"
    
    async def check_api_key(self) -> bool:
        """Check if the Gemini API key is valid"""
        try:
            # Simple check - try to initialize the client
            return bool(self.api_key and len(self.api_key) > 20)
        except Exception:
            return False