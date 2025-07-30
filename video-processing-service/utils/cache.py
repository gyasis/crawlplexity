import redis.asyncio as redis
import json
import hashlib
from typing import Optional, Dict, Any
from core.config import settings

class CacheManager:
    """Redis-based cache manager for processed video/image content"""
    
    def __init__(self):
        self.redis_client = None
        self.prefix = "video_proc:"
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            print("Redis cache connected successfully")
        except Exception as e:
            print(f"Redis connection failed: {e}")
            # Continue without cache if Redis is not available
            self.redis_client = None
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
    
    def generate_key(self, url: str, search_query: str) -> str:
        """Generate cache key from URL and search query"""
        combined = f"{url}:{search_query}:{settings.GEMINI_MODEL}"
        hash_digest = hashlib.sha256(combined.encode()).hexdigest()[:16]
        return f"{self.prefix}{hash_digest}"
    
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached content"""
        if not self.redis_client:
            return None
            
        try:
            data = await self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"Cache get error: {e}")
        
        return None
    
    async def set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None):
        """Set cached content with optional TTL"""
        if not self.redis_client:
            return
            
        try:
            data = json.dumps(value)
            if ttl:
                await self.redis_client.setex(key, ttl, data)
            else:
                await self.redis_client.set(key, data)
        except Exception as e:
            print(f"Cache set error: {e}")
    
    async def delete(self, key: str):
        """Delete cached content"""
        if not self.redis_client:
            return
            
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            print(f"Cache delete error: {e}")
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear cache entries matching pattern"""
        if not self.redis_client:
            return 0
            
        try:
            keys = []
            async for key in self.redis_client.scan_iter(f"{self.prefix}*{pattern}*"):
                keys.append(key)
            
            if keys:
                await self.redis_client.delete(*keys)
            
            return len(keys)
        except Exception as e:
            print(f"Cache clear pattern error: {e}")
            return 0
    
    async def clear_all(self) -> int:
        """Clear all cache entries"""
        if not self.redis_client:
            return 0
            
        try:
            keys = []
            async for key in self.redis_client.scan_iter(f"{self.prefix}*"):
                keys.append(key)
            
            if keys:
                await self.redis_client.delete(*keys)
            
            return len(keys)
        except Exception as e:
            print(f"Cache clear all error: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            return {"status": "disabled", "message": "Redis not connected"}
            
        try:
            # Count keys
            count = 0
            async for _ in self.redis_client.scan_iter(f"{self.prefix}*"):
                count += 1
            
            # Get Redis info
            info = await self.redis_client.info()
            
            return {
                "status": "active",
                "total_keys": count,
                "prefix": self.prefix,
                "memory_used": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "redis_version": info.get("redis_version", "unknown")
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def ping(self):
        """Check Redis connection"""
        if not self.redis_client:
            raise Exception("Redis client not initialized")
        
        await self.redis_client.ping()