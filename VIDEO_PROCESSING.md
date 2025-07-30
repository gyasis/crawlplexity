# Video Processing Integration Guide

## Overview

Crawlplexity now includes comprehensive video and image processing capabilities using Gemini AI. This feature enables intelligent analysis of YouTube videos, Vimeo content, direct video files, and images found in search results.

## Architecture

### Service Architecture
```
Search Request → Search Orchestrator → URL Classification → Processing Routes
                                           ↓                        ↓
                                    Video/Image URLs          Webpage URLs
                                           ↓                        ↓
                               Video Processing Service    Crawl4AI Service
                                     (Port 11236)         (Port 11235)
                                           ↓                        ↓
                                    Gemini Analysis        Web Scraping
                                           ↓                        ↓
                                 Comprehensive Markdown   Page Content
```

### Key Components

1. **Video Processing Service** (`video-processing-service/`)
   - FastAPI service running on port 11236
   - Integrates existing Python video processing scripts
   - Handles video, image, and URL classification
   - Provides streaming responses for real-time updates

2. **Search Orchestrator Enhancement** (`lib/search-orchestrator.ts`)
   - Intelligent URL classification
   - Parallel processing of video and webpage URLs
   - Health monitoring for all services

3. **Video Processing Client** (`lib/video-processing-client.ts`)
   - TypeScript client for video processing service
   - Handles streaming responses and error recovery
   - Provides health checks and service information

## Supported Formats

### Video Platforms
- **YouTube**: Full support including shorts, embeds, and live streams
- **Vimeo**: Standard and player URLs
- **Dailymotion**: Video URLs and shortened links
- **Twitch**: VODs and clips
- **Facebook**: Video posts and watch links
- **Twitter/X**: Video tweets and posts
- **TikTok**: Video posts and VM links
- **Instagram**: Posts, reels, and IGTV

### Direct Video Files
- `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mkv`
- `.m4v`, `.mpg`, `.mpeg`, `.3gp`, `.f4v`, `.ogg`
- And many more formats supported by yt-dlp

### Image Formats
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- `.bmp`, `.tiff`, `.heif`, `.heic`, `.raw`
- Advanced formats like `.ai`, `.eps`, `.psd`

## Configuration

### Environment Variables

#### Required
- `SERPER_API_KEY`: Google search via Serper API
- `GOOGLE_AI_API_KEY`: Gemini API for video/image processing

#### Optional Video Processing
- `GEMINI_MODEL`: Default Gemini model (default: `gemini-2.0-flash-exp`)
- `GEMINI_VISION_MODEL`: Vision model for image processing
- `MAX_VIDEO_DURATION`: Maximum video length in seconds (no limit by default)
- `FRAME_INTERVAL`: Frame processing interval in seconds (default: 1)
- `REDIS_URL`: Cache connection (default: `redis://redis:6379/1`)

### Docker Configuration

The video processing service is automatically included in `docker-compose.yml`:

```yaml
video-processor:
  build: ./video-processing-service
  container_name: crawlplexity-video-processor
  ports:
    - "11236:11236"
  environment:
    - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
    - REDIS_URL=redis://redis:6379/1
  volumes:
    - video_cache:/app/cache
    - video_temp:/app/temp
  depends_on:
    - redis
```

## API Endpoints

### Video Processing Service (Port 11236)

#### `/classify` (POST)
Quickly classify a URL to determine content type.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=example"
}
```

**Response:**
```json
{
  "type": "video",
  "platform": "youtube",
  "extension": null
}
```

#### `/process` (POST)
Process video or image content comprehensively.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=example",
  "search_query": "machine learning tutorial",
  "processing_mode": "comprehensive",
  "custom_prompt": "Focus on code examples and key concepts",
  "use_cache": true
}
```

**Response:** Server-Sent Events (SSE) stream with progress updates

#### `/health` (GET)
Service health check including Gemini API status.

#### `/supported-formats` (GET)
List of supported video and image formats.

#### `/cache/stats` (GET)
Cache statistics and usage information.

#### `/cache/clear` (DELETE)
Clear cache entries with optional pattern matching.

## Features

### Comprehensive Video Analysis
- **No Time Limits**: Processes entire videos regardless of length
- **Full Frame Analysis**: Extracts content from every second by default
- **Code Detection**: Identifies and extracts code snippets with syntax highlighting
- **Visual Elements**: Captures diagrams, charts, UI elements, and slides
- **Audio Processing**: Transcribes spoken content and extracts key insights
- **Timeline Preservation**: Maintains timestamps for all extracted content

### Intelligent Content Extraction
- **Context-Aware Processing**: Uses search query context for relevant extraction
- **Technical Content Focus**: Optimized for tutorials, documentation, and technical videos
- **Multi-Language Support**: Handles various languages and character sets
- **Format Preservation**: Maintains code formatting, indentation, and structure

### Performance Optimizations
- **Parallel Processing**: Videos and webpages processed simultaneously
- **Intelligent Caching**: Redis-based caching with smart TTL management
- **Streaming Responses**: Real-time progress updates during processing
- **Error Recovery**: Graceful handling of service failures with fallbacks

### User Experience
- **Warning System**: Alerts users when Gemini API key is missing
- **Progress Indicators**: Real-time status updates during video processing
- **Enhanced Search Results**: Video content integrated seamlessly with web results
- **Content Type Indicators**: Clear labeling of video vs. webpage content

## Processing Workflow

### 1. URL Classification
When search results are received:
1. Each URL is sent to the video processing service for classification
2. URLs are categorized as 'video', 'image', or 'webpage'
3. Parallel processing queues are created for each type

### 2. Video Processing
For video URLs:
1. Video is downloaded using yt-dlp with anti-detection measures
2. Frames are extracted at specified intervals (default: 1 second)
3. Gemini Vision API analyzes each frame for content
4. Audio is transcribed and analyzed for spoken content
5. Results are combined into comprehensive markdown

### 3. Content Integration
1. Video analysis results are streamed back to the client
2. Content is cached for future requests
3. Results are integrated with search results
4. Enhanced content is displayed to the user

## Error Handling

### Service Failures
- **Graceful Degradation**: Falls back to basic search results if video processing fails
- **Retry Logic**: Automatic retries for temporary failures
- **Health Monitoring**: Continuous monitoring of all services
- **User Notifications**: Clear error messages and suggestions

### API Key Issues
- **Detection**: Automatic detection of missing Gemini API key
- **User Warning**: Modal popup explaining the limitation
- **Fallback Behavior**: Continues with web scraping for non-video content
- **Setup Guidance**: Direct links to API key setup instructions

## Performance Metrics

### Typical Processing Times
- **YouTube Video (10 min)**: 2-5 minutes depending on content complexity
- **Image Analysis**: 5-15 seconds
- **URL Classification**: < 1 second
- **Cache Hit**: < 100ms

### Resource Usage
- **Memory**: 2-4GB for video processing service
- **Storage**: Temporary files cleaned after processing
- **Network**: Efficient streaming with chunked responses
- **Cache**: Redis storage for processed content

## Development

### Local Development
1. Copy video processing files to `video-processing-service/services/`
2. Set up environment variables in `.env`
3. Run services: `docker-compose up video-processor`
4. Test with various video URLs

### Testing
```bash
# Test video classification
curl -X POST http://localhost:11236/classify \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ"}'

# Test video processing
curl -X POST http://localhost:11236/process \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "search_query": "music video",
    "processing_mode": "comprehensive"
  }'
```

### Health Monitoring
```bash
# Check service health
curl http://localhost:11236/health

# Check cache stats
curl http://localhost:11236/cache/stats

# Clear cache
curl -X DELETE http://localhost:11236/cache/clear
```

## Troubleshooting

### Common Issues

#### "Gemini API key not configured"
- Ensure `GOOGLE_AI_API_KEY` is set in environment
- Restart video processing service after adding key
- Verify key has proper permissions

#### "Video processing service unavailable"
- Check if service is running: `docker ps | grep video-processor`
- Review logs: `docker logs crawlplexity-video-processor`
- Verify port 11236 is not blocked

#### "Cache connection failed"
- Ensure Redis is running and accessible
- Check `REDIS_URL` configuration
- Verify network connectivity between services

#### "yt-dlp download failed"
- Update yt-dlp to latest version
- Check if video is available and public
- Review video service logs for specific errors

### Performance Optimization

#### For Large Videos
- Increase `FRAME_INTERVAL` to process fewer frames
- Set `MAX_VIDEO_DURATION` to limit processing time
- Use `processing_mode: "quick"` for faster results

#### For High Volume
- Scale video processing service horizontally
- Implement Redis clustering for cache
- Use CDN for frequently accessed content

### Monitoring

#### Key Metrics to Monitor
- Video processing success rate
- Average processing time per video
- Cache hit ratio
- Service health status
- Memory and CPU usage

#### Logging
- All services log to stdout in JSON format
- Use log aggregation tools like ELK stack
- Monitor error patterns and service availability

## Roadmap

### Planned Enhancements
- **Multi-language OCR**: Support for more languages
- **Advanced Video Analysis**: Scene detection and content segmentation
- **Real-time Processing**: Live stream analysis capabilities
- **Custom Models**: Fine-tuned models for specific content types
- **Batch Processing**: Efficient processing of multiple videos
- **API Rate Limiting**: Protect against abuse and overuse

### Integration Opportunities
- **Search Analytics**: Track video processing effectiveness
- **Content Recommendations**: Suggest related videos based on analysis
- **Accessibility**: Generate captions and audio descriptions
- **SEO Enhancement**: Extract metadata for better search indexing

This comprehensive video processing integration transforms Crawlplexity into a truly multimodal search engine capable of understanding and analyzing visual content alongside traditional web pages.