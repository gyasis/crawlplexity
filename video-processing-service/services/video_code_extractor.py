import os
from pathlib import Path
from .multimodal.gemini_multimedia import GeminiMultimedia
from .video_process.videoocr import VideoOCR
from .multimodal.ocraggregator import OCRAggregator
import tempfile
import shutil
import logging
import re
import subprocess
import argparse
import time
import random
from typing import List, Dict, Optional, Tuple
from rich.console import Console
from rich.prompt import Prompt
from rich.panel import Panel
from .multimodal.litellm_image_processing import MediaBatchProcessor
from .youtube_subtitles_processor.processor import YouTubeSubtitlesProcessor
import tiktoken
import shlex
from urllib.parse import urlparse, parse_qs, urlunparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# User agents for rotation to avoid detection
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36"
]

def get_random_user_agent():
    """Get a random user agent to avoid detection."""
    return random.choice(USER_AGENTS)

def update_yt_dlp():
    """Update yt-dlp to the latest version to handle YouTube API changes."""
    try:
        # Check current version
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True, check=True, timeout=30)
        current_version = result.stdout.strip()
        logger.info(f"Current yt-dlp version: {current_version}")
        
        # Update yt-dlp
        logger.info("Updating yt-dlp to latest version...")
        subprocess.run(['pip', 'install', '--upgrade', 'yt-dlp'], check=True, timeout=120)
        
        # Check new version
        result = subprocess.run(['yt-dlp', '--version'], capture_output=True, text=True, check=True, timeout=30)
        new_version = result.stdout.strip()
        logger.info(f"yt-dlp updated to version: {new_version}")
        return True
    except subprocess.CalledProcessError as e:
        logger.warning(f"Error updating yt-dlp: {e}")
        return False
    except subprocess.TimeoutExpired:
        logger.warning("yt-dlp update timed out")
        return False
    except Exception as e:
        logger.warning(f"Unexpected error updating yt-dlp: {e}")
        return False

# # Suppress browser-related logging unless debugging
# logging.getLogger('browser_cookie3').setLevel(logging.WARNING)
# logging.getLogger('urllib3.connectionpool').setLevel(logging.WARNING)

# def get_chrome_cookies_option():
#     """
#     Get the appropriate Chrome cookies option for yt-dlp.
#     Handles both regular Chrome and Flatpak Chrome installations.
#     """
#     # Check for Flatpak Chrome first
#     flatpak_chrome_path = os.path.expanduser("~/.var/app/com.google.Chrome")
#     if os.path.exists(flatpak_chrome_path):
#         logger.info("Found Flatpak Chrome installation. Using its cookies.")
#         return ["--cookies-from-browser", f"chrome:{flatpak_chrome_path}"]
    
#     # Check for regular Chrome
#     regular_chrome_path = os.path.expanduser("~/.config/google-chrome")
#     if os.path.exists(regular_chrome_path):
#         logger.info("Found standard Chrome installation. Using its cookies.")
#         return ["--cookies-from-browser", "chrome"]
    
#     # No Chrome cookies found
#     logger.warning("No Chrome installation found. Proceeding without cookies. This may fail for age-restricted or private videos.")
#     return []

def get_clean_youtube_url(url: str) -> str:
    """Strips unnecessary parameters from a YouTube URL, keeping only the video ID."""
    parsed_url = urlparse(url)
    if "youtube.com" in parsed_url.netloc or "youtu.be" in parsed_url.netloc:
        if parsed_url.path == "/watch":
            qs = parse_qs(parsed_url.query)
            if 'v' in qs:
                # Reconstruct with only the 'v' parameter
                clean_url = urlunparse(parsed_url._replace(query=f"v={qs['v'][0]}", fragment=""))
                logger.info(f"Cleaned URL from {url} to {clean_url}")
                return clean_url
        elif parsed_url.path.startswith("/shorts/"):
            # Shorts URLs are usually clean already, but we can ensure it
            clean_url = urlunparse(parsed_url._replace(query="", fragment=""))
            logger.info(f"Cleaned Shorts URL from {url} to {clean_url}")
            return clean_url
    # Return original URL if it's not a standard YouTube video/shorts URL that needs cleaning
    return url

def download_youtube_video(url: str, debug_mode: bool = False, max_retries: int = 3) -> Tuple[str, str, Optional[str]]:
    """
    Download a YouTube video using yt-dlp with retry logic and anti-detection measures.
    
    Args:
        url: YouTube video URL
        debug_mode: Enable debug logging
        max_retries: Maximum number of retry attempts
        
    Returns:
        Tuple of (video_path, temp_dir, video_title)
    """
    temp_dir = tempfile.mkdtemp()
    video_title: Optional[str] = None
    cleaned_url = get_clean_youtube_url(url)
    
    # Update yt-dlp first (only do this once per session)
    if not hasattr(download_youtube_video, '_updated_yt_dlp'):
        logger.info("Checking for yt-dlp updates...")
        update_yt_dlp()
        download_youtube_video._updated_yt_dlp = True

    # Try to get video title with retry logic
    for title_attempt in range(max_retries):
        try:
            user_agent = get_random_user_agent()
            title_command = [
                "yt-dlp",
                "--get-title",
                "--no-warnings",
                "--user-agent", user_agent,
                "--extractor-args", "youtube:player_client=web",
                cleaned_url
            ]

            if debug_mode:
                logger.info(f"Title attempt {title_attempt + 1}: {shlex.join(title_command)}")

            title_process = subprocess.run(
                title_command, 
                check=False, 
                capture_output=True, 
                text=True, 
                encoding='utf-8', 
                errors='replace',
                timeout=60
            )
            
            if title_process.returncode == 0 and title_process.stdout:
                video_title = title_process.stdout.strip() or None
                logger.info(f"Extracted video title: '{video_title}'")
                break
            else:
                logger.warning(f"Title attempt {title_attempt + 1} failed. Return code: {title_process.returncode}")
                if title_attempt < max_retries - 1:
                    wait_time = (2 ** title_attempt) + random.uniform(1, 3)
                    logger.info(f"Retrying title extraction in {wait_time:.1f} seconds...")
                    time.sleep(wait_time)
                    
        except subprocess.TimeoutExpired:
            logger.warning(f"Title extraction timeout on attempt {title_attempt + 1}")
            if title_attempt < max_retries - 1:
                time.sleep(2 ** title_attempt)
        except Exception as e_title:
            logger.warning(f"Title extraction error on attempt {title_attempt + 1}: {e_title}")
            if title_attempt < max_retries - 1:
                time.sleep(2 ** title_attempt)

    output_path = os.path.join(temp_dir, "video.mp4")

    # Download video with retry logic and anti-detection measures
    for attempt in range(max_retries):
        try:
            user_agent = get_random_user_agent()
            command = [
                "yt-dlp",
                "-f", "bestvideo[height<=720][vcodec^=avc]+bestaudio/best[height<=720]",
                "--no-playlist",
                "--merge-output-format", "mp4",
                "--user-agent", user_agent,
                "--extractor-args", "youtube:player_client=web",
                "--retries", "3",
                "--fragment-retries", "3",
                "-o", output_path,
                cleaned_url
            ]

            if debug_mode:
                logger.info(f"Download attempt {attempt + 1}: yt-dlp resolved to: {shutil.which('yt-dlp')}")
                logger.info(f"Download attempt {attempt + 1}: {shlex.join(command)}")
            else:
                logger.info(f"Download attempt {attempt + 1} for: {cleaned_url}")

            process = subprocess.run(
                command, 
                check=True, 
                capture_output=True, 
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if debug_mode:
                logger.info(f"yt-dlp output:\n{process.stdout}")
            if process.stderr:
                logger.warning(f"yt-dlp stderr:\n{process.stderr}")

            if not os.path.exists(output_path):
                raise FileNotFoundError(f"yt-dlp finished but output file {output_path} not found.")

            logger.info(f"Successfully downloaded video to {output_path}")
            return output_path, temp_dir, video_title

        except subprocess.CalledProcessError as e:
            stderr = e.stderr or ""
            returncode = e.returncode
            
            logger.error(f"Download attempt {attempt + 1} failed with return code {returncode}")
            
            # Analyze specific error types
            is_bot_detection = "Sign in to confirm you're not a bot" in stderr
            is_http_403 = "HTTP Error 403" in stderr or "Forbidden" in stderr
            is_nsig_error = "nsig extraction failed" in stderr
            is_private_video = "Private video" in stderr or "This video is private" in stderr
            is_unavailable = "Video unavailable" in stderr or "This video is not available" in stderr
            
            # Log specific error details and determine if retry should be skipped
            if is_bot_detection:
                logger.error(f"Attempt {attempt + 1}: YouTube bot detection triggered - NO RETRY (makes it worse)")
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise  # Don't retry for bot detection
            elif is_http_403:
                logger.error(f"Attempt {attempt + 1}: HTTP 403 Forbidden error - NO RETRY (bot detection)")
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise  # Don't retry for 403 errors
            elif is_nsig_error:
                logger.error(f"Attempt {attempt + 1}: nsig extraction failed - YouTube signature changed")
            elif is_private_video or is_unavailable:
                logger.error(f"Attempt {attempt + 1}: Video is private or unavailable - no retry needed")
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise  # Don't retry for these errors
            else:
                logger.error(f"Attempt {attempt + 1}: Generic yt-dlp error: {stderr[:500]}")

            # If this was the last attempt, clean up and raise
            if attempt == max_retries - 1:
                logger.error(f"All {max_retries} download attempts failed")
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise
            
            # Only retry for specific errors (nsig, generic errors)
            # Calculate backoff time with jitter
            base_wait = 2 ** attempt
            jitter = random.uniform(1, 5)
            wait_time = base_wait + jitter
            
            logger.info(f"Retrying download in {wait_time:.1f} seconds... (attempt {attempt + 2}/{max_retries})")
            time.sleep(wait_time)

        except subprocess.TimeoutExpired:
            logger.error(f"Download attempt {attempt + 1} timed out")
            if attempt == max_retries - 1:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise
            
            wait_time = (2 ** attempt) + random.uniform(2, 8)
            logger.info(f"Retrying after timeout in {wait_time:.1f} seconds...")
            time.sleep(wait_time)

        except Exception as e:
            logger.error(f"Download attempt {attempt + 1} unexpected error: {e}")
            if attempt == max_retries - 1:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                raise
            
            wait_time = (2 ** attempt) + random.uniform(1, 4)
            time.sleep(wait_time)

    # Should never reach here, but just in case
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    raise RuntimeError(f"Failed to download video after {max_retries} attempts")

def merge_subtitles_and_code(subtitles, code_blocks):
    """
    subtitles: list of dicts with 'start', 'end', 'text'
    code_blocks: list of dicts with 'timestamp', 'content'
    Returns: list of dicts with 'timestamp', 'subtitle', 'code'
    """
    merged = []
    sub_idx = 0
    n_subs = len(subtitles)
    for block in code_blocks:
        # Find the subtitle whose time range includes or is closest to the code block's timestamp
        ts = block['timestamp']
        while sub_idx + 1 < n_subs and subtitles[sub_idx + 1]['start'] <= ts:
            sub_idx += 1
        subtitle = subtitles[sub_idx]['text'] if n_subs > 0 else ''
        merged.append({
            'timestamp': ts,
            'subtitle': subtitle,
            'code': block['content']
        })
    return merged

class VideoCodeExtractor:
    def __init__(self, api_key: Optional[str] = None, change_threshold: float = 0.4, check_interval: int = 3):
        """Initialize the video code extractor with both Gemini and OCR capabilities."""
        self.gemini = GeminiMultimedia(api_key)
        self.video_ocr = VideoOCR(change_threshold=change_threshold, check_interval=check_interval)
        self.ocr_aggregator = OCRAggregator(similarity_threshold=0.85)
        self.console = Console()
        # Set up Gemini Vision batch processor for OCR
        self.vision_batch_processor = MediaBatchProcessor(
            model="gemini/gemini-1.5-pro",
            prompt=self._default_vision_prompt(),
            # Add any other necessary MediaBatchProcessor parameters here if needed
        )

    def _default_vision_prompt(self):
        return (
            """
            Analyze this screenshot and extract:
            1. All code blocks and snippets
            2. Terminal outputs and commands
            3. Configuration settings
            4. File contents
            5. URLs and paths
            6. Technical explanations
            7. Step-by-step instructions
            8. diagrams - use mermaid diagrams to capture the diagrams

            For each of the above, also capture what is being said or shown during the time that the above is displayed and summarize as comments in the code block or in separate sections with headers associated with the content. The ordering is important and the comments should be in the same order as the content.

            Format the output as a markdown document with:
            - Clear section headings
            - Properly formatted code blocks with language specification
            - Preserved indentation and formatting
            - All technical details intact
            - diagrams - use mermaid diagrams for captured diagrams or inferred diagrams, i.e. your way of explaining the logic

            Your ultimate goal is to extract ALL code blocks, snippets, terminal outputs, commands, and docs without repeating information.
            """
        )

    def process_video(self, video_path: str, input_url_or_path: str, output_dir: str = "extracted_content", custom_prompt: Optional[str] = None, skip_gemini: bool = False, skip_ocr: bool = False, preferred_title: Optional[str] = None) -> Dict[str, str]:
        """
        Process a video using both Gemini and OCR to extract code blocks and content.

        Args:
            video_path: Path to the processed video file (could be temporary)
            input_url_or_path: Original input, either a YouTube URL or local file path.
            output_dir: Directory to save extracted content
            custom_prompt: Optional custom prompt to use with Gemini
            skip_gemini: If True, skip the Gemini step and only do OCR
            skip_ocr: If True, skip the OCR step and only do Gemini
            preferred_title: Optional title to be prioritized for the final article.
        Returns:
            Dictionary containing extracted content from both methods
        """
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        gemini_result = None
        ocr_analysis_text = None
        combined_content = None

        try:
            # Step 1: Process with Gemini (unless skipped)
            if not skip_gemini:
                self.console.print("\n[bold blue]Processing video with Gemini...[/bold blue]")
                try:
                    gemini_prompt_to_use = custom_prompt if custom_prompt else self._default_vision_prompt()
                    gemini_result = self.gemini.process_media(
                        video_path,
                        prompt=gemini_prompt_to_use,
                        model_name="gemini-1.5-pro"
                    )
                except Exception as e_gemini:
                    logger.error(f"Error processing video with Gemini: {str(e_gemini)[:500]}...")
                    gemini_result = f"[Gemini step failed: {str(e_gemini)[:200]}]"
            else:
                self.console.print("[yellow]Skipping Gemini step as requested.[/yellow]")
                gemini_result = "[Gemini step skipped]"

            # Save Gemini results (if not None and is string)
            if gemini_result and isinstance(gemini_result, str):
                try:
                    with open(os.path.join(output_dir, "gemini_analysis.md"), "w", encoding="utf-8") as f:
                        f.write(gemini_result)
                except Exception as e_write_gemini:
                    logger.error(f"Error writing Gemini results: {str(e_write_gemini)}")

            # Step 2: Process with Gemini Vision for OCR (unless skipped)
            if not skip_ocr:
                self.console.print("\n[bold blue]Processing video frames with Gemini Vision...[/bold blue]")
                frame_dir_path = os.path.join(output_dir, "frames")
                try:
                    frames = self.video_ocr.capture_frames(
                        video_path,
                        save_frames=True,
                        output_folder=frame_dir_path,
                        test_display=False
                    )
                    if frames: # Only process if frames were extracted
                        ocr_results_list = self.vision_batch_processor.process_media(frame_dir_path)
                        ocr_analysis_text = "\n\n".join(ocr_results_list)
                    else:
                        ocr_analysis_text = "[No frames extracted for OCR]"
                except Exception as e_ocr:
                    logger.error(f"Error during OCR frame processing: {str(e_ocr)[:500]}...")
                    ocr_analysis_text = f"[OCR step failed: {str(e_ocr)[:200]}]"
                finally:
                    if os.path.exists(frame_dir_path):
                        if os.path.isdir(frame_dir_path):
                            shutil.rmtree(frame_dir_path) # Clean up frames dir after processing

                # Save OCR results (if not None and is string)
                if ocr_analysis_text and isinstance(ocr_analysis_text, str):
                    try:
                        with open(os.path.join(output_dir, "ocr_analysis.md"), "w", encoding="utf-8") as f:
                            f.write(ocr_analysis_text)
                    except Exception as e_write_ocr:
                        logger.error(f"Error writing OCR results: {str(e_write_ocr)}")

                # Ensure both results are strings before combining
                str_gemini_result = str(gemini_result) if gemini_result is not None else "[Gemini result not available]"
                str_ocr_analysis_text = str(ocr_analysis_text) if ocr_analysis_text is not None else "[OCR result not available]"

                combined_content = f"""# Video Content Analysis\n\n## Gemini Analysis\n{str_gemini_result}\n\n## OCR Analysis (Gemini Vision)\n{str_ocr_analysis_text}\n"""
                if combined_content and isinstance(combined_content, str):
                    try:
                        with open(os.path.join(output_dir, "combined_analysis.md"), "w", encoding="utf-8") as f:
                            f.write(combined_content)
                    except Exception as e_write_combined:
                        logger.error(f"Error writing combined analysis: {str(e_write_combined)}")

                # Determine title for final article
                # Prioritize preferred_title if provided and valid
                video_title_to_pass_to_generate: Optional[str] = None
                if preferred_title and preferred_title.strip():
                    video_title_to_pass_to_generate = preferred_title.strip()
                    logger.info(f"Using preferred title: '{video_title_to_pass_to_generate}'")

                if not video_title_to_pass_to_generate:
                    if "youtube.com/" in input_url_or_path or "youtu.be/" in input_url_or_path:
                        logger.info(f"Preferred title not available or empty, attempting to fetch YouTube title for {input_url_or_path} via SubtitlesProcessor as fallback.")
                        try:
                            # Fallback to YouTubeSubtitlesProcessor if preferred_title (e.g., from yt-dlp) wasn't available
                            title_processor = YouTubeSubtitlesProcessor(video_url=input_url_or_path, return_text=False)
                            fetched_processor_title = title_processor.get_video_title()
                            if fetched_processor_title and fetched_processor_title.strip():
                                video_title_to_pass_to_generate = fetched_processor_title.strip()
                                logger.info(f"Fetched title via SubtitlesProcessor: '{video_title_to_pass_to_generate}'")
                            else:
                                logger.warning(f"YouTubeSubtitlesProcessor returned empty title for {input_url_or_path}. Falling back to video path stem.")
                                video_title_to_pass_to_generate = Path(video_path).stem 
                        except Exception as e_sub_proc_title:
                            logger.warning(f"Could not fetch YouTube title via SubtitlesProcessor for {input_url_or_path}: {e_sub_proc_title}. Falling back to video path stem.")
                            video_title_to_pass_to_generate = Path(video_path).stem
                    else: # Local file and no preferred_title
                        logger.info(f"Input is a local file and no preferred_title, using video path stem: {Path(video_path).stem}")
                        video_title_to_pass_to_generate = Path(video_path).stem

                # Final fallback if still no title (e.g. Path(video_path).stem was empty or problematic)
                if not video_title_to_pass_to_generate or not video_title_to_pass_to_generate.strip():
                    logger.warning(f"Title remains empty after all checks for {input_url_or_path}. Using generic title 'Untitled Video Analysis'.")
                    video_title_to_pass_to_generate = "Untitled Video Analysis"
                else:
                    # Sanitize title just in case, though Path.stem should be safe
                    video_title_to_pass_to_generate = video_title_to_pass_to_generate.strip()

                self.generate_final_article_from_combined(input_url_or_path, output_dir, video_title=video_title_to_pass_to_generate)
                return {
                    "gemini_analysis": str_gemini_result,
                    "ocr_analysis": str_ocr_analysis_text, 
                    "combined_analysis": combined_content
                }
            else:
                self.console.print("[yellow]Skipping OCR step as requested but still generating final article.[/yellow]")
                # Create combined_analysis.md with just Gemini results when OCR is skipped
                str_gemini_result_only = str(gemini_result) if gemini_result is not None else "[Gemini result not available]"
                
                # Create combined_analysis.md with just Gemini content for consistency
                combined_content_gemini_only = f"""# Video Content Analysis\n\n## Gemini Analysis\n{str_gemini_result_only}\n\n## OCR Analysis (Gemini Vision)\n[OCR step skipped]\n"""
                try:
                    with open(os.path.join(output_dir, "combined_analysis.md"), "w", encoding="utf-8") as f:
                        f.write(combined_content_gemini_only)
                    logger.info(f"Created combined_analysis.md with Gemini-only content for {input_url_or_path}")
                except Exception as e_write_combined_skip:
                    logger.error(f"Error writing combined analysis (skip OCR) for {input_url_or_path}: {e_write_combined_skip}")
                
                # Logic to determine title when OCR is skipped
                title_for_skip_ocr: Optional[str] = None
                if preferred_title and preferred_title.strip():
                    title_for_skip_ocr = preferred_title.strip()
                    logger.info(f"Using preferred title (skip OCR): '{title_for_skip_ocr}'")
                
                if not title_for_skip_ocr:
                    if "youtube.com/" in input_url_or_path or "youtu.be/" in input_url_or_path:
                        logger.info(f"Preferred title not available (skip OCR), fetching YouTube title for {input_url_or_path}")
                        try:
                            title_processor = YouTubeSubtitlesProcessor(video_url=input_url_or_path, return_text=False)
                            fetched_skip_ocr_title = title_processor.get_video_title()
                            if fetched_skip_ocr_title and fetched_skip_ocr_title.strip():
                                title_for_skip_ocr = fetched_skip_ocr_title.strip()
                                logger.info(f"Fetched title via SubtitlesProcessor (skip OCR): '{title_for_skip_ocr}'")
                            # Fallback if YouTubeSubtitlesProcessor fails or returns empty title
                            elif video_path: # Only use video_path if it's not None
                                title_for_skip_ocr = Path(video_path).stem
                            elif input_url_or_path: # Fallback to input_url_or_path stem if video_path is None
                                title_for_skip_ocr = Path(input_url_or_path).stem
                        except Exception as e_skip_ocr:
                            logger.warning(f"Could not fetch YouTube title (skip_ocr) for {input_url_or_path}: {e_skip_ocr}")
                            if video_path: # Only use video_path if it's not None
                                title_for_skip_ocr = Path(video_path).stem
                            elif input_url_or_path: # Fallback to input_url_or_path stem if video_path is None
                                title_for_skip_ocr = Path(input_url_or_path).stem
                    else: # local file
                        if video_path: # Should always exist for local files, but check anyway
                            title_for_skip_ocr = Path(video_path).stem
                        elif input_url_or_path: # Fallback if video_path was somehow None for a local scenario
                            title_for_skip_ocr = Path(input_url_or_path).stem

                if not title_for_skip_ocr or not title_for_skip_ocr.strip():
                     title_for_skip_ocr = "Untitled Video Analysis" # Final fallback
                else:
                    title_for_skip_ocr = title_for_skip_ocr.strip()

                # Now generate final article from the combined analysis we just created
                self.generate_final_article_from_combined(input_url_or_path, output_dir, video_title=title_for_skip_ocr)

                return {"gemini_analysis": str_gemini_result_only, "ocr_analysis": "[OCR step skipped]", "combined_analysis": combined_content_gemini_only}

        except Exception as e_process_video:
            # General error in process_video, log a concise message
            logger.error(f"Critical error in process_video: {str(e_process_video)[:500]}...")
            return {
                "gemini_analysis": f"[Processing failed: {str(e_process_video)[:200]}]",
                "ocr_analysis": f"[Processing failed: {str(e_process_video)[:200]}]",
                "combined_analysis": f"[Processing failed: {str(e_process_video)[:200]}]"
            }

    def extract_subtitles(self, video_url):
        processor = YouTubeSubtitlesProcessor(video_url=video_url, return_text=False)
        # This should return a list of dicts: [{'start': float, 'end': float, 'text': str}]
        return processor.get_subtitles_with_timestamps()

    def extract_code_blocks_with_timestamps(self, ocr_results):
        # ocr_results: list of (timestamp, content)
        # Return list of dicts: [{'timestamp': float, 'content': str}]
        return [{'timestamp': ts, 'content': content} for ts, content in ocr_results]

    def generate_timeline_aligned_markdown(self, subtitles, code_blocks):
        merged = merge_subtitles_and_code(subtitles, code_blocks)
        lines = []
        for item in merged:
            lines.append(f"## [{item['timestamp']}] {item['subtitle']}")
            lines.append('')
            lines.append(item['code'])
            lines.append('')
        return '\n'.join(lines)

    def interleave_code_with_subtitles(self, subtitles, code_blocks):
        """
        subtitles: list of dicts with 'start', 'end', 'text'
        code_blocks: list of dicts with 'timestamp', 'content'
        Returns: markdown string with subtitles as backbone and code/explanations interleaved.
        """
        lines = []
        code_idx = 0
        n_code = len(code_blocks)
        for seg in subtitles:
            # Output the subtitle text (as a section or paragraph)
            lines.append(f"### [{seg['start']:.2f} - {seg['end']:.2f}] {seg['text']}")
            lines.append("")
            # Insert all code blocks whose timestamp falls within this segment
            while code_idx < n_code and seg['start'] <= code_blocks[code_idx]['timestamp'] < seg['end']:
                lines.append(code_blocks[code_idx]['content'])
                lines.append("")
                code_idx += 1
        # If any code blocks remain, append them at the end
        while code_idx < n_code:
            lines.append(code_blocks[code_idx]['content'])
            lines.append("")
            code_idx += 1
        return '\n'.join(lines)

    def analyze_video_timeline_aligned(self, video_url, output_dir="project_output", use_gemini_postprocess=False):
        # 1. Extract subtitles
        subtitles = self.extract_subtitles(video_url)
        print("\n--- Extracted Subtitles (with timestamps) ---")
        for seg in subtitles:
            print(f"[{seg['start']:.2f} - {seg['end']:.2f}] {seg['text']}")
        print("--- End of Subtitles ---\n")
        # 2. Download video and extract frames/OCR/code blocks with timestamps
        video_path, temp_dir = self.download_youtube_video(video_url)
        ocr_results = self.video_ocr.perform_ocr_with_timestamps(video_path)  # You may need to implement this
        code_blocks = self.extract_code_blocks_with_timestamps(ocr_results)
        # 3. Interleave code with subtitles
        merged_markdown = self.interleave_code_with_subtitles(subtitles, code_blocks)
        # 4. (Optional) Multi-pass with Gemini for tutorial formatting
        if use_gemini_postprocess:
            gemini_prompt = (
                "This is a transcript with code and explanations interleaved. "
                "Format it as a clear, step-by-step technical tutorial, preserving all information and code blocks. "
                "Use markdown, maintain logical flow, and do not lose any content."
            )
            merged_markdown = self.gemini.process_media(
                merged_markdown,
                prompt=gemini_prompt,
                model_name="gemini-1.5-flash",
                max_tokens=32000
            )
        with open(os.path.join(output_dir, "timeline_aligned_analysis.md"), "w", encoding="utf-8") as f:
            f.write(merged_markdown)

        # Token counting for information loss check
        subtitle_text = "\n".join([seg['text'] for seg in subtitles])
        subtitle_tokens = count_tokens(subtitle_text)
        final_tokens = count_tokens(merged_markdown)
        ratio = final_tokens / subtitle_tokens if subtitle_tokens else 1.0
        if ratio < 0.8:
            print(f"Warning: Final output has only {ratio:.1%} of the original subtitle tokens. Possible information loss!")
        else:
            print(f"Token retention is good: {ratio:.1%}")

        # Automatically generate the final article
        # Determine title for final article
        video_title = None
        if "youtube.com/" in video_url or "youtu.be/" in video_url:
            try:
                title_processor = YouTubeSubtitlesProcessor(video_url=video_url, return_text=False)
                video_title = title_processor.get_video_title()
            except Exception as e:
                logger.warning(f"Could not fetch YouTube title for {video_url}: {e}")
                video_title = "Untitled Video" # Fallback title
        else:
            video_title = Path(video_url).stem # Assuming video_url is a path for local files

        self.generate_final_article_from_combined(video_url, output_dir, video_title=video_title)

        return merged_markdown

    def generate_final_article_from_combined(self, video_url_or_path: str, output_dir="project_output", video_title: Optional[str] = None):
        # 1. Determine the YouTube video title
        title_to_use = "Video Analysis" # Default title

        if video_title and video_title.strip():
            title_to_use = video_title.strip()
            logger.info(f"Using provided video_title for final article: '{title_to_use}'")
        elif video_url_or_path and ("youtube.com/" in video_url_or_path or "youtu.be/" in video_url_or_path) :
            logger.info(f"video_title not provided or empty, attempting to fetch YouTube title for final article using SubtitlesProcessor for {video_url_or_path}.")
            try:
                processor = YouTubeSubtitlesProcessor(video_url=video_url_or_path, return_text=False)
                fetched_final_title = processor.get_video_title()
                if fetched_final_title and fetched_final_title.strip():
                    title_to_use = fetched_final_title.strip()
                    logger.info(f"Fetched title for final article via SubtitlesProcessor: '{title_to_use}'")
                else:
                    logger.warning(f"SubtitlesProcessor returned empty title for final article ({video_url_or_path}). Using default '{title_to_use}'.")
            except Exception as e_final_title:
                logger.warning(f"Could not fetch title for final article ({video_url_or_path}) using SubtitlesProcessor: {e_final_title}. Using default '{title_to_use}'.")
        elif video_url_or_path: # Local file path
            path_stem = Path(video_url_or_path).stem
            if path_stem and path_stem.strip():
                title_to_use = path_stem.strip()
                logger.info(f"Using path stem for final article title: '{title_to_use}'")
            else:
                logger.warning(f"Path stem for {video_url_or_path} is empty. Using default '{title_to_use}'.")
        else:
            logger.warning(f"No video_title or video_url_or_path provided to determine final article title. Using default '{title_to_use}'.")

        # 2. Read combined_analysis.md
        combined_path = os.path.join(output_dir, "combined_analysis.md")
        if not os.path.exists(combined_path):
            raise FileNotFoundError(f"{combined_path} not found. Run the analysis first.")
        with open(combined_path, "r", encoding="utf-8") as f:
            combined_content = f.read()
        # 3. Prepare the prompt
        gemini_prompt = (
            f"You are given extracted content from a video titled: \"{title_to_use}\"\n\n"
            "Your task:\n"
            "- Use the title as the main heading.\n"
            "- Organize the content into a clear, step-by-step technical article or tutorial.\n"
            "- Use proper markdown formatting (headings, code blocks, lists, etc.).\n"
            "- Preserve all code, commands, and technical details.\n"
            "- Ensure the document reads naturally and is easy to follow.\n"
            "- Do not omit any information.\n\n"
            "Here is the extracted content:\n---\n"
            f"{combined_content}\n---"
        )
        
        logger.info(f"Preparing to call Gemini for final article (text generation). Title: '{title_to_use}'. Prompt length: {len(gemini_prompt)}. Model: gemini-1.5-flash.")
        logger.debug(f"Final article Gemini prompt snippet: {gemini_prompt[:500]}...")

        # 4. Call Gemini using the new generate_text method
        try:
            final_article = self.gemini.generate_text( # Use the new method
                prompt=gemini_prompt,
                model_name="gemini-1.5-flash", # Explicitly specify model for this task
                max_tokens=64000, # As per your previous setting for this call
                temperature=0.7 # A common default, adjust if needed
            )
        except Exception as e:
            logger.error(f"Error generating final article with Gemini: {e}", exc_info=True)
            final_article = f"[Error generating final article: {e}]" # Fallback content

        # 5. Save the result
        final_path = os.path.join(output_dir, "final_article.md")
        with open(final_path, "w", encoding="utf-8") as f:
            f.write(final_article)
        logger.info(f"Final article saved to {final_path}")
        return final_article

def count_tokens(text, model="gpt-4"):
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(text))

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Extract code and text from video files or YouTube URLs.")
    parser.add_argument("input_path", type=str, nargs='?', default=None, help="Path to the video file or YouTube URL (will prompt if not provided).")
    parser.add_argument("--save-youtube-video", action="store_true", help="Keep the downloaded YouTube video file and its temporary directory instead of deleting it.")
    parser.add_argument("--prompt", type=str, help="Custom prompt to use with Gemini model instead of the default prompt.")
    parser.add_argument("--prompt-file", type=str, help="Path to a file containing a custom prompt to use with Gemini model.")
    parser.add_argument("--skip-gemini", action="store_true", help="Skip the Gemini LLM step and only perform frame-by-frame OCR extraction.")
    parser.add_argument("--skip-ocr", action="store_true", help="Skip the OCR step and only perform Gemini analysis.")
    parser.add_argument("--change-threshold", type=float, default=0.4, help="Change threshold for frame extraction (lower means more frames). Default: 0.4")
    parser.add_argument("--check-interval", type=int, default=3, help="Frame check interval for frame extraction (lower means more frames). Default: 3")
    args = parser.parse_args()

    # Initialize the extractor with user-specified frame extraction params
    extractor = VideoCodeExtractor(change_threshold=args.change_threshold, check_interval=args.check_interval)
    console = Console() # Initialize console here for use in error handling too

    # Get video path from user if not provided via argument
    if args.input_path:
        input_path = args.input_path
    else:
        input_path = Prompt.ask("\n[bold yellow]Enter path to video file or YouTube URL[/bold yellow]")

    # Set default output directory
    output_dir = "extracted_content"

    # Handle custom prompt options
    custom_prompt = None
    if args.prompt_file:
        try:
            with open(args.prompt_file, 'r', encoding='utf-8') as f:
                custom_prompt = f.read()
            console.print(f"[cyan]Using custom prompt from file: {args.prompt_file}[/cyan]")
        except Exception as e:
            console.print(f"[red]Error reading prompt file: {str(e)}. Using default prompt instead.[/red]")
    elif args.prompt:
        custom_prompt = args.prompt
        console.print(f"[cyan]Using custom prompt provided via command line[/cyan]")

    temp_dir_youtube = None
    video_path_to_process = None
    temp_video_path_for_saving = None # Store the initial temp path for saving

    try:
        # If the input is a local file, use it directly. Otherwise, treat as YouTube URL.
        if os.path.exists(input_path):
            video_path_to_process = input_path
            processing_file_path = None # Initialize for clarity, though not strictly needed by current logic flow
        else:
            console.print(f"[cyan]Assuming YouTube URL. Attempting download...[/cyan]")
            os.makedirs(output_dir, exist_ok=True)
            # download_youtube_video returns (actual_video_file_path, temp_directory_of_video, title)
            downloaded_video_file_path, temp_dir_youtube_download, youtube_video_title = download_youtube_video(input_path)

            # Store the title from yt-dlp to pass to the processor
            preferred_title_for_processor = youtube_video_title 

            temp_video_path_for_saving = downloaded_video_file_path # Keep for potential save
            temp_dir_youtube = temp_dir_youtube_download # This is the directory to clean up

            if args.save_youtube_video:
                # If saving, the video_path_to_process becomes the *intended final path*
                # The actual move will happen in the finally block to ensure it's attempted even on error
                target_save_path = os.path.join(output_dir, "saved_youtube_video.mp4")
                video_path_to_process = target_save_path # Used for context/naming if different
                # We'll copy to target_save_path later, for now, process the temp one
                # For processing, use the actual downloaded file path
                processing_file_path = downloaded_video_file_path
            else:
                # Use the temporary path for processing (will be cleaned up later)
                processing_file_path = downloaded_video_file_path
                video_path_to_process = downloaded_video_file_path # For clarity, though processing_file_path is used

        if not video_path_to_process and not processing_file_path: # ensure one of them is set
            raise ValueError("Could not determine video path to process.")

        # Use processing_file_path for the actual processing, video_path_to_process for context/naming if different
        file_to_feed_processor = processing_file_path if processing_file_path else video_path_to_process

        if not os.path.exists(file_to_feed_processor):
            # If it's a YouTube URL that was meant to be saved, downloaded_video_file_path should exist.
            # If it's a local file, video_path_to_process (input_path) should exist.
            raise FileNotFoundError(f"Video file for processing not found: {file_to_feed_processor}")

        # Process the video
        results = extractor.process_video(
            file_to_feed_processor, # This is the actual video file
            input_path, # Pass the original input_path (URL or local file) for titling etc.
            output_dir,
            custom_prompt,
            skip_gemini=args.skip_gemini,
            skip_ocr=args.skip_ocr,
            preferred_title=preferred_title_for_processor # Pass the fetched/derived title
        )

        # Display results
        console.print(Panel(
            f"""[green]Processing complete![/green]
Results saved in: {output_dir}
- gemini_analysis.md
- ocr_analysis.md
- combined_analysis.md""",
            title="Success",
            border_style="green"
        ))
        # Also mention the new subtitles file if it was created
        if os.path.exists(os.path.join(output_dir, "subtitles_text_only.md")):
            console.print("- subtitles_text_only.md")

    except Exception as e:
        console.print(f"[red]Error: {str(e)}[/red]")
    finally:
        # Cleanup logic
        if temp_dir_youtube and os.path.exists(temp_dir_youtube):
            if args.save_youtube_video and temp_video_path_for_saving and os.path.exists(temp_video_path_for_saving):
                # Move the originally downloaded video to the output directory before deleting the temp dir
                try:
                    target_save_path = os.path.join(output_dir, "saved_youtube_video.mp4")
                    os.makedirs(output_dir, exist_ok=True) # Ensure output dir exists

                    if os.path.isfile(temp_video_path_for_saving):
                        shutil.move(temp_video_path_for_saving, target_save_path)
                        logger.info(f"Saved YouTube video to: {target_save_path}")
                    else:
                        logger.warning(f"Could not find downloaded video at {temp_video_path_for_saving} to save. It might have already been moved or was not a file.")

                except Exception as e:
                    logger.error(f"Error saving video from {temp_video_path_for_saving} or cleaning up temp directory {temp_dir_youtube}: {e}")

            try:
                shutil.rmtree(temp_dir_youtube)
                logger.info(f"Cleaned up temporary YouTube download directory: {temp_dir_youtube}")
            except Exception as e:
                logger.error(f"Failed to clean up temporary directory {temp_dir_youtube}: {e}")



if __name__ == "__main__":
    main() 
