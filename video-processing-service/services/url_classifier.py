import re
from typing import Dict, List
from urllib.parse import urlparse, unquote

class URLClassifier:
    """Intelligent URL classification for routing to appropriate processors"""
    
    # Video platforms and their patterns
    VIDEO_PLATFORMS = {
        "youtube": [
            r"youtube\.com/watch\?v=",
            r"youtu\.be/",
            r"youtube\.com/embed/",
            r"youtube\.com/v/",
            r"youtube\.com/shorts/"
        ],
        "vimeo": [
            r"vimeo\.com/\d+",
            r"player\.vimeo\.com/video/\d+"
        ],
        "dailymotion": [
            r"dailymotion\.com/video/",
            r"dai\.ly/"
        ],
        "twitch": [
            r"twitch\.tv/videos/\d+",
            r"clips\.twitch\.tv/"
        ],
        "facebook": [
            r"facebook\.com/.*/videos/",
            r"fb\.watch/"
        ],
        "twitter": [
            r"twitter\.com/.*/status/\d+",
            r"x\.com/.*/status/\d+"
        ],
        "tiktok": [
            r"tiktok\.com/@.*/video/\d+",
            r"vm\.tiktok\.com/"
        ],
        "instagram": [
            r"instagram\.com/p/",
            r"instagram\.com/reel/",
            r"instagram\.com/tv/"
        ]
    }
    
    # Video file extensions
    VIDEO_EXTENSIONS = [
        ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv", ".m4v",
        ".mpg", ".mpeg", ".3gp", ".3g2", ".f4v", ".f4p", ".f4a", ".f4b",
        ".vob", ".ogv", ".ogg", ".drc", ".mng", ".mts", ".m2ts", ".ts",
        ".qt", ".yuv", ".rm", ".rmvb", ".asf", ".amv", ".m4p", ".m4v",
        ".svi", ".3gpp", ".3gpp2", ".mxf", ".roq", ".nsv"
    ]
    
    # Image file extensions
    IMAGE_EXTENSIONS = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico",
        ".tiff", ".tif", ".psd", ".raw", ".heif", ".heic", ".ind", ".indd",
        ".jp2", ".j2k", ".jpf", ".jpx", ".jpm", ".mj2", ".svg", ".svgz",
        ".ai", ".eps"
    ]
    
    @classmethod
    def classify(cls, url: str) -> Dict[str, str]:
        """
        Classify a URL to determine its type and processing requirements
        
        Returns:
            Dict with keys:
            - type: "video", "image", or "webpage"
            - platform: platform name for videos (e.g., "youtube")
            - extension: file extension if applicable
        """
        url_lower = url.lower()
        parsed = urlparse(url)
        path = unquote(parsed.path)
        
        # Check video platforms first
        for platform, patterns in cls.VIDEO_PLATFORMS.items():
            for pattern in patterns:
                if re.search(pattern, url_lower):
                    return {
                        "type": "video",
                        "platform": platform,
                        "url": url
                    }
        
        # Check file extensions
        for ext in cls.VIDEO_EXTENSIONS:
            if path.endswith(ext):
                return {
                    "type": "video",
                    "platform": "direct",
                    "extension": ext,
                    "url": url
                }
        
        for ext in cls.IMAGE_EXTENSIONS:
            if path.endswith(ext):
                return {
                    "type": "image",
                    "extension": ext,
                    "url": url
                }
        
        # Check for video indicators in query parameters
        if any(param in parsed.query.lower() for param in ["video", "watch", "embed"]):
            return {
                "type": "video",
                "platform": "unknown",
                "url": url
            }
        
        # Default to webpage
        return {
            "type": "webpage",
            "url": url
        }
    
    @classmethod
    def is_video_url(cls, url: str) -> bool:
        """Quick check if URL is a video"""
        result = cls.classify(url)
        return result["type"] == "video"
    
    @classmethod
    def is_image_url(cls, url: str) -> bool:
        """Quick check if URL is an image"""
        result = cls.classify(url)
        return result["type"] == "image"
    
    @classmethod
    def get_platform_info(cls, url: str) -> Dict[str, any]:
        """Get detailed platform information for a video URL"""
        result = cls.classify(url)
        
        if result["type"] != "video":
            return None
        
        platform = result.get("platform", "unknown")
        
        # Extract video ID based on platform
        video_id = None
        if platform == "youtube":
            # Extract YouTube video ID
            patterns = [
                r"v=([a-zA-Z0-9_-]{11})",
                r"youtu\.be/([a-zA-Z0-9_-]{11})",
                r"embed/([a-zA-Z0-9_-]{11})",
                r"v/([a-zA-Z0-9_-]{11})",
                r"shorts/([a-zA-Z0-9_-]{11})"
            ]
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    video_id = match.group(1)
                    break
        
        elif platform == "vimeo":
            match = re.search(r"vimeo\.com/(\d+)", url)
            if match:
                video_id = match.group(1)
        
        return {
            "platform": platform,
            "video_id": video_id,
            "url": url,
            "type": "video"
        }