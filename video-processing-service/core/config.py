from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import Field, validator

class Settings(BaseSettings):
    # API Keys
    GOOGLE_AI_API_KEY: Optional[str] = None
    
    # Redis Configuration
    REDIS_URL: str = "redis://redis:6379/1"
    
    # Cache Configuration
    CACHE_TTL_SECONDS: int = 3600  # 1 hour default
    
    # Processing Configuration
    FRAME_INTERVAL: int = 1  # Process every second - comprehensive analysis
    
    # Gemini Model Configuration
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    GEMINI_VISION_MODEL: str = "gemini-2.0-flash-exp"
    
    # Service Configuration
    SERVICE_PORT: int = 11236
    MAX_RETRIES: int = 3
    REQUEST_TIMEOUT: int = 300  # 5 minutes
    
    # File Size Limits (generous limits, not restrictive)
    MAX_IMAGE_SIZE_MB: int = 50  # Reasonable for images
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()