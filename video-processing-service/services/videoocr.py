import cv2
import os
import sys
import random
import numpy as np
import re
import pytesseract
from PIL import Image
from tqdm import tqdm
import string
import difflib
import nltk
from nltk.tokenize import sent_tokenize
from dotenv import load_dotenv
import dspy
from dspy.clients.lm import LM
from dspy import Signature, Module
import re
import argparse
import subprocess
import tempfile
import shutil
import logging
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

# Load environment variables if needed
load_dotenv(
    "/media/gyasis/Blade 15 SSD/Users/gyasi/Google Drive (not syncing)/Collection/chatrepository/.env",
    override=True,
)

# Ensure NLTK data is downloaded
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

@dataclass
class LineChange:
    """Represents a change to a specific line"""
    content: str
    timestamp: str
    line_number: int
    change_type: str  # 'added', 'removed', 'modified'

@dataclass
class CodeBlock:
    """Represents a code block with its content and metadata"""
    content: str
    timestamp: str
    signature: str  # Function/class signature or first line
    indentation_level: int
    last_modified: str  # timestamp of last modification
    line_history: List[LineChange]  # Track changes at line level
    original_lines: List[str]  # Keep original lines for comparison

class CodeTracker:
    """Tracks code blocks and their changes across video frames"""
    def __init__(self):
        self.code_blocks: Dict[str, CodeBlock] = {}  # signature -> CodeBlock
        self.text_content: List[Tuple[str, str]] = []  # [(timestamp, text)]
        
        # Common patterns to ignore
        self.ignore_patterns = [
            # IDE/Editor elements
            r'^\s*\d+\s*$',  # Line numbers
            r'^\s*[▶▼►▽○●⚫⬤]\s*',  # Bullet points and arrows
            r'^[\s-]*Terminal[\s-]*$',  # Terminal headers
            r'^[\s-]*Output[\s-]*$',  # Output headers
            r'^[\s-]*Debug[\s-]*$',  # Debug headers
            r'^[\s-]*Problems[\s-]*$',  # Problems tab
            r'^\s*Explorer\s*$',  # Explorer tab
            r'^\s*Outline\s*$',  # Outline tab
            r'^\s*Search\s*$',  # Search tab
            
            # Status bar elements
            r'^\s*Python\s+\d+\.\d+\.\d+\s*$',  # Python version
            r'^\s*Line\s+\d+\s*,\s*Column\s+\d+\s*$',  # Line/column indicators
            r'^\s*UTF-8\s*$',  # Encoding indicators
            r'^\s*CRLF\s*$',  # Line ending indicators
            r'^\s*Spaces:\s*\d+\s*$',  # Space/tab indicators
            
            # Common UI elements
            r'^\s*File\s+Edit\s+View\s+.*$',  # Menu bars
            r'^\s*Open\s+Editors\s*$',  # Editor lists
            r'^\s*Untitled-\d+\s*$',  # Untitled documents
            r'^\s*\[\+\]\s*$',  # New tab indicators
            r'^\s*Loading\.{3}\s*$',  # Loading indicators
            
            # Git/Version control
            r'^\s*main\s*\*?\s*$',  # Branch indicators
            r'^\s*Changes\s*\(\d+\)\s*$',  # Change counts
            r'^\s*Staged\s*Changes\s*$',  # Staged changes
            
            # Timestamps and system info
            r'^\s*\d{2}:\d{2}:\d{2}\s*$',  # Time stamps
            r'^\s*\d{2}/\d{2}/\d{4}\s*$',  # Dates
            r'^\s*CPU:\s*\d+%\s*$',  # System stats
            r'^\s*Memory:\s*\d+%\s*$',  # Memory stats
        ]
        
        # Compile patterns for efficiency
        self.ignore_patterns = [re.compile(pattern) for pattern in self.ignore_patterns]
    
    def _should_ignore_text(self, text: str) -> bool:
        """Check if text matches any ignore patterns"""
        # Skip empty lines
        if not text.strip():
            return True
            
        # Check against ignore patterns
        for pattern in self.ignore_patterns:
            if pattern.match(text):
                return True
                
        # Additional checks for common non-relevant text
        if len(text.strip()) < 3:  # Very short text
            return True
            
        if text.strip().isdigit():  # Just numbers
            return True
            
        if all(c in string.punctuation for c in text.strip()):  # Just punctuation
            return True
            
        return False
    
    def _clean_block(self, block: str) -> str:
        """Clean a block of text by removing ignored lines"""
        lines = block.split('\n')
        cleaned_lines = [line for line in lines if not self._should_ignore_text(line)]
        return '\n'.join(cleaned_lines)
    
    def _get_block_signature(self, text: str) -> Optional[str]:
        """Extract signature from code block (e.g., function/class definition)"""
        # Match function or class definitions
        pattern = r'^(\s*)(def\s+\w+\s*\([^)]*\)|class\s+\w+[^:]*)'
        match = re.match(pattern, text, re.MULTILINE)
        if match:
            return match.group(2).strip()
        return None
    
    def _get_indentation_level(self, text: str) -> int:
        """Get indentation level of first non-empty line"""
        lines = text.split('\n')
        for line in lines:
            if line.strip():
                return len(line) - len(line.lstrip())
        return 0
    
    def _is_code_block(self, text: str) -> bool:
        """Determine if text is likely a code block"""
        code_indicators = [
            r'^\s*(def|class|import|from|if|for|while|try|except|with|async|@)',
            r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=',
            r'^\s*return\s+',
            r'^\s*raise\s+',
            r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)',
        ]
        return any(re.match(pattern, text, re.MULTILINE) for pattern in code_indicators)
    
    def _split_into_blocks(self, text: str) -> List[str]:
        """Split text into code blocks based on indentation and patterns"""
        blocks = []
        current_block = []
        lines = text.split('\n')
        
        for line in lines:
            if not line.strip():
                if current_block:
                    blocks.append('\n'.join(current_block))
                    current_block = []
                continue
                
            if not current_block:
                current_block.append(line)
            else:
                # Check if this line starts a new block
                prev_indent = len(current_block[0]) - len(current_block[0].lstrip())
                curr_indent = len(line) - len(line.lstrip())
                
                if curr_indent < prev_indent or (curr_indent == 0 and self._is_code_block(line)):
                    blocks.append('\n'.join(current_block))
                    current_block = [line]
                else:
                    current_block.append(line)
        
        if current_block:
            blocks.append('\n'.join(current_block))
        
        return blocks
    
    def _calculate_block_similarity(self, block1: str, block2: str) -> float:
        """Calculate similarity between two code blocks"""
        return difflib.SequenceMatcher(None, block1, block2).ratio()
    
    def _compare_lines(self, old_lines: List[str], new_lines: List[str]) -> List[LineChange]:
        """Compare two sets of lines and return the changes"""
        changes = []
        matcher = difflib.SequenceMatcher(None, old_lines, new_lines)
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'replace':
                # Lines were modified
                for line_num in range(i1, i2):
                    changes.append(('modified', line_num, new_lines[j1:j2]))
            elif tag == 'delete':
                # Lines were removed
                for line_num in range(i1, i2):
                    changes.append(('removed', line_num, []))
            elif tag == 'insert':
                # Lines were added
                for line_num in range(j1, j2):
                    changes.append(('added', i1, [new_lines[line_num]]))
                    
        return changes

    def update_from_frame(self, text: str, timestamp: str):
        """Update code blocks with text from new frame"""
        # Clean the text first
        text = self._clean_block(text)
        if not text.strip():
            return
            
        blocks = self._split_into_blocks(text)
        
        for block in blocks:
            if not self._is_code_block(block):
                # For non-code blocks, use diff to detect changes
                if self.text_content:
                    last_text = self.text_content[-1][1]
                    if self._calculate_block_similarity(last_text, block) < 0.95:  # Higher threshold for text
                        # Only add if it's not just UI elements
                        cleaned_block = self._clean_block(block)
                        if cleaned_block.strip():
                            self.text_content.append((timestamp, cleaned_block))
                else:
                    cleaned_block = self._clean_block(block)
                    if cleaned_block.strip():
                        self.text_content.append((timestamp, cleaned_block))
                continue
                
            signature = self._get_block_signature(block)
            if not signature:
                continue
                
            indent_level = self._get_indentation_level(block)
            new_lines = block.split('\n')
            
            # Check if we have this block already
            if signature in self.code_blocks:
                existing_block = self.code_blocks[signature]
                old_lines = existing_block.original_lines
                
                # Get detailed line changes
                changes = self._compare_lines(old_lines, new_lines)
                
                if changes:  # If there are any changes
                    # Create line change records
                    line_changes = []
                    for change_type, line_num, new_content in changes:
                        if new_content:  # For modifications and additions
                            for line in new_content:
                                line_changes.append(LineChange(
                                    content=line,
                                    timestamp=timestamp,
                                    line_number=line_num,
                                    change_type=change_type
                                ))
                        else:  # For removals
                            line_changes.append(LineChange(
                                content=old_lines[line_num],
                                timestamp=timestamp,
                                line_number=line_num,
                                change_type='removed'
                            ))
                    
                    # Update the block with new content and changes
                    self.code_blocks[signature] = CodeBlock(
                        content=block,
                        timestamp=existing_block.timestamp,
                        signature=signature,
                        indentation_level=indent_level,
                        last_modified=timestamp,
                        line_history=existing_block.line_history + line_changes,
                        original_lines=new_lines
                    )
            else:
                # New block
                self.code_blocks[signature] = CodeBlock(
                    content=block,
                    timestamp=timestamp,
                    signature=signature,
                    indentation_level=indent_level,
                    last_modified=timestamp,
                    line_history=[],
                    original_lines=new_lines
                )
    
    def get_organized_content(self) -> str:
        """Get organized content with code blocks and text in chronological order"""
        all_content = []
        
        # Add code blocks with their timestamps and change history
        for block in self.code_blocks.values():
            # Build change history notes
            change_notes = []
            if block.line_history:
                changes_by_time = {}
                for change in block.line_history:
                    if change.timestamp not in changes_by_time:
                        changes_by_time[change.timestamp] = []
                    changes_by_time[change.timestamp].append(
                        f"Line {change.line_number + 1}: {change.change_type} - {change.content}"
                    )
                
                for timestamp, changes in sorted(changes_by_time.items()):
                    change_notes.append(f"\n[Changes at {timestamp}]:")
                    change_notes.extend([f"  • {change}" for change in changes])
            
            # Format the block with its history
            block_content = (
                f"[Original: {block.timestamp}] [Last Modified: {block.last_modified}]\n"
                f"{block.content}\n"
                f"{''.join(change_notes) if change_notes else ''}"
            )
            all_content.append((block.timestamp, block_content))
        
        # Add text content
        all_content.extend(self.text_content)
        
        # Sort by timestamp
        all_content.sort(key=lambda x: x[0])
        
        # Return formatted content
        return "\n\n".join(content for _, content in all_content)

class VideoOCR:
    def __init__(self, change_threshold=0.1, check_interval=5):
        self.change_threshold = change_threshold
        self.check_interval = check_interval
        self.chunk_size = 50  # Process text in chunks of 50 lines

    def _chunk_text(self, text: str) -> List[str]:
        """Split text into chunks of self.chunk_size lines"""
        lines = text.split('\n')
        chunks = []
        for i in range(0, len(lines), self.chunk_size):
            chunk = lines[i:i + self.chunk_size]
            chunks.append('\n'.join(chunk))
        return chunks
        
    def _grep_similar_content(self, text: str, existing_chunks: List[str]) -> List[Tuple[str, float, int]]:
        """Find similar content using grep-like search
        Returns: List of (matching_chunk, similarity_score, chunk_index)"""
        results = []
        text_lines = text.split('\n')
        
        for idx, chunk in enumerate(existing_chunks):
            chunk_lines = chunk.split('\n')
            # Look for common lines using set intersection
            common_lines = set(text_lines) & set(chunk_lines)
            if common_lines:
                similarity = len(common_lines) / max(len(text_lines), len(chunk_lines))
                if similarity > 0.3:  # At least 30% similar
                    results.append((chunk, similarity, idx))
                    
        return sorted(results, key=lambda x: x[1], reverse=True)
        
    def _diff_merge_chunks(self, chunk1: str, chunk2: str) -> str:
        """Merge two chunks using diff algorithm to preserve unique content"""
        lines1 = chunk1.split('\n')
        lines2 = chunk2.split('\n')
        matcher = difflib.SequenceMatcher(None, lines1, lines2)
        
        merged_lines = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                # Add lines that are the same in both chunks
                merged_lines.extend(lines1[i1:i2])
            elif tag == 'replace':
                # For replaced sections, keep both versions if they look like code
                for line in lines1[i1:i2] + lines2[j1:j2]:
                    if self._is_code_line(line) or not self._has_similar_line(line, merged_lines):
                        merged_lines.append(line)
            elif tag == 'delete':
                # Keep deleted lines if they're code or unique
                for line in lines1[i1:i2]:
                    if self._is_code_line(line) or not self._has_similar_line(line, merged_lines):
                        merged_lines.append(line)
            elif tag == 'insert':
                # Keep inserted lines if they're code or unique
                for line in lines2[j1:j2]:
                    if self._is_code_line(line) or not self._has_similar_line(line, merged_lines):
                        merged_lines.append(line)
                        
        return '\n'.join(merged_lines)
        
    def _is_code_line(self, line: str) -> bool:
        """Check if a line appears to be code"""
        code_patterns = [
            r'^\s*(def|class|import|from|if|for|while|try|except|with|async|@)',
            r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=',
            r'^\s*return\s+',
            r'^\s*raise\s+',
            r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)',
            r'^\s*[{}[\]()=><+\-*/]',
        ]
        return any(re.match(pattern, line) for pattern in code_patterns)
        
    def _has_similar_line(self, line: str, existing_lines: List[str], threshold: float = 0.85) -> bool:
        """Check if a similar line already exists"""
        line = line.strip()
        if not line:
            return True
            
        for existing in existing_lines:
            existing = existing.strip()
            if existing and difflib.SequenceMatcher(None, line, existing).ratio() > threshold:
                return True
        return False
        
    def _verify_merged_content(self, original_chunks: List[str], merged_text: str) -> bool:
        """Verify that merged content preserves important information from original chunks"""
        # Extract all code blocks from original chunks
        original_code = []
        for chunk in original_chunks:
            lines = chunk.split('\n')
            for line in lines:
                if self._is_code_line(line.strip()):
                    original_code.append(line.strip())
        
        # Extract code blocks from merged text
        merged_lines = merged_text.split('\n')
        merged_code = [line.strip() for line in merged_lines if self._is_code_line(line.strip())]
        
        # Check if all original code blocks are preserved
        missing_code = [line for line in original_code if not any(
            difflib.SequenceMatcher(None, line, merged).ratio() > 0.9 
            for merged in merged_code
        )]
        
        if missing_code:
            logging.warning(f"Found {len(missing_code)} missing code blocks in merged content")
            return False
            
        return True

    def _frame_difference(self, prev_frame, current_frame):
        """Calculate the difference between two frames."""
        # Convert frames to grayscale
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        curr_gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        
        # Calculate absolute difference
        frame_diff = cv2.absdiff(prev_gray, curr_gray)
        
        # Calculate the percentage of changed pixels
        non_zero_count = np.count_nonzero(frame_diff)
        total_pixels = frame_diff.size
        change_percentage = non_zero_count / total_pixels
        
        return change_percentage

    def download_youtube_video(self, url):
        """Download a YouTube video using yt-dlp."""
        temp_dir = tempfile.mkdtemp()
        output_path = os.path.join(temp_dir, "video.mp4")
        
        try:
            # List formats command with more readable output
            list_command = [
                "yt-dlp",
                "-F",
                "--no-playlist",
                url
            ]
            result = subprocess.run(list_command, capture_output=True, text=True)
            
            # Print formats in a more readable way
            print("\nAvailable formats:")
            print("=" * 80)
            print(result.stdout)
            print("=" * 80)
            
            # Parse the output to get format IDs by resolution
            format_lines = result.stdout.split('\n')
            format_ids = {
                '720p': [],  # 1280x720
                '1080p': [], # 1920x1080
                '480p': [],  # 854x480
                'other': []
            }
            
            for line in format_lines:
                if line.strip() and line.split()[0].isdigit():
                    format_id = line.split()[0]
                    if '1280x720' in line:
                        format_ids['720p'].append(format_id)
                    elif '1920x1080' in line:
                        format_ids['1080p'].append(format_id)
                    elif '854x480' in line:
                        format_ids['480p'].append(format_id)
                    else:
                        format_ids['other'].append(format_id)
            
            print("\nFound formats by resolution:")
            for res, ids in format_ids.items():
                if ids:
                    print(f"{res}: {', '.join(ids)}")
            
            # Try formats in priority order: 720p -> 1080p -> 480p -> other
            resolution_order = ['720p', '1080p', '480p', 'other']
            for resolution in resolution_order:
                for format_id in format_ids[resolution]:
                    try:
                        print(f"\nTrying {resolution} format {format_id}...")
                        command = [
                            "yt-dlp",
                            "-f", format_id,
                            "--no-playlist",
                            "--merge-output-format", "mp4",
                            "-o", output_path,
                            url
                        ]
                        subprocess.run(command, check=True)
                        print(f"Successfully downloaded with {resolution} format {format_id}")
                        return output_path, temp_dir
                    except subprocess.CalledProcessError as e:
                        print(f"Format {format_id} failed: {e}")
                        continue
            
            # If we get here, all formats failed
            raise Exception("All format IDs failed to download")
            
        except Exception as e:
            logging.error(f"Error downloading video: {e}")
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            raise

    def capture_frames(self, video_path, save_frames=True, output_folder="frames", test_display=False):
        """Capture frames from video when significant changes occur."""
        # Validate video path
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
            
        # Create output folder if it doesn't exist and save_frames is True
        if save_frames:
            os.makedirs(output_folder, exist_ok=True)
            
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
            
        frames = []
        prev_frame = None
        frame_count = 0
        saved_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if total_frames == 0:
            raise ValueError(f"Video file appears to be empty: {video_path}")

        with tqdm(total=total_frames, desc="Capturing Frames") as pbar:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % self.check_interval == 0:
                    if prev_frame is None or self._frame_difference(prev_frame, frame) > self.change_threshold:
                        if save_frames:
                            # Change the frame naming pattern to match what MediaBatchProcessor expects
                            frame_path = os.path.join(output_folder, f"image{saved_count}.png")
                            cv2.imwrite(frame_path, frame)
                            saved_count += 1
                        frames.append(frame)
                        prev_frame = frame.copy()

                frame_count += 1
                pbar.update(1)
                pbar.set_description(f"Capturing Frames ({saved_count} saved)")

        cap.release()
        print(f"\nTotal frames captured: {len(frames)}")
        return frames

    def calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity ratio between two texts."""
        return difflib.SequenceMatcher(None, text1, text2).ratio()

    def process_text_batch(self, texts: List[str], similarity_threshold: float = 0.8) -> List[Tuple[str, float]]:
        """
        Process a batch of texts, removing ones that are too similar to previous texts.
        Returns: List of (text, similarity_to_previous) tuples
        """
        if not texts:
            return []
        
        processed_texts = [(texts[0], 0.0)]  # First text always included
        
        for current_text in texts[1:]:
            # Compare with the last accepted text
            similarity = self.calculate_text_similarity(processed_texts[-1][0], current_text)
            
            # Only add text if it's sufficiently different
            if similarity < similarity_threshold:
                processed_texts.append((current_text, similarity))
            
        return processed_texts

    def perform_ocr(self, frames):
        text_data = []
        total_frames = len(frames)
        
        if not frames:
            logging.warning("No frames provided for OCR processing")
            return text_data
        
        # Initialize code tracker
        code_tracker = CodeTracker()
        processed_chunks = []
        
        # Calculate time per frame based on check_interval
        seconds_per_frame = self.check_interval
        
        with tqdm(frames, desc="Performing OCR on frames", total=total_frames, unit="frame") as pbar:
            for idx, frame in enumerate(frames):
                try:
                    if frame is None:
                        logging.warning(f"Skipping frame {idx}: Frame is None")
                        continue
                        
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    text = pytesseract.image_to_string(Image.fromarray(gray))
                    
                    if not text.strip():
                        continue
                    
                    # Calculate timestamp
                    current_time = idx * seconds_per_frame
                    hours = int(current_time // 3600)
                    minutes = int((current_time % 3600) // 60)
                    seconds = int(current_time % 60)
                    timestamp = f"[{hours:02d}:{minutes:02d}:{seconds:02d}]"
                    
                    # Split text into chunks
                    chunks = self._chunk_text(text)
                    
                    for chunk in chunks:
                        # Find similar existing chunks
                        similar_chunks = self._grep_similar_content(chunk, processed_chunks)
                        
                        if similar_chunks:
                            # Merge with most similar chunk
                            most_similar = similar_chunks[0]
                            merged_chunk = self._diff_merge_chunks(most_similar[0], chunk)
                            processed_chunks[most_similar[2]] = merged_chunk
                        else:
                            # Add as new chunk
                            processed_chunks.append(chunk)
                    
                    # Update code tracker with new frame content
                    code_tracker.update_from_frame(text, timestamp)
                    pbar.update(1)
                    
                except Exception as e:
                    logging.error(f"Error processing frame {idx}: {str(e)}")
                    continue
        
        # Verify and merge all chunks
        merged_content = processed_chunks[0] if processed_chunks else ""
        for chunk in processed_chunks[1:]:
            merged_content = self._diff_merge_chunks(merged_content, chunk)
        
        # Verify merged content preserves important information
        if not self._verify_merged_content(processed_chunks, merged_content):
            logging.warning("Verification failed: Some content may have been lost during merging")
            # Fall back to code tracker's organized content
            merged_content = code_tracker.get_organized_content()
        
        if merged_content:
            text_data.append(merged_content)
        
        if not text_data:
            logging.warning("No text was extracted from any frames")
            
        return text_data

    @staticmethod
    def clean_text(text):
        if not text or not text.strip():
            return ""
        
        code_patterns = [
            r'(^|\n)[ \t]*(?:def|class|import|from|if|for|while).*:.*(?:\n[ \t]+.*)*',
            r'(^|\n).*[{}\[\]()=><].*(?:\n[ \t]+.*)*'
        ]
        
        preserved_blocks = []
        for pattern in code_patterns:
            code_matches = re.finditer(pattern, text, re.MULTILINE)
            for match in code_matches:
                preserved_blocks.append(match.group())
        
        text = ''.join(filter(lambda x: x in string.printable, text))
        text = re.sub(r'\\x[0-9a-fA-F]{2}', '', text)
        text = re.sub(r'\\n', '\n', text)
        text = re.sub(r'\s+', ' ', text)
        
        for block in preserved_blocks:
            if block.strip() not in text:
                text += f"\n\n{block}"
        
        return text.strip()

    @staticmethod
    def find_overlap(prev_text, current_text):
        prev_part = prev_text[-200:]
        current_part = current_text[:200]
        
        matcher = difflib.SequenceMatcher(None, prev_part, current_part)
        match = matcher.find_longest_match(0, len(prev_part), 0, len(current_part))
        
        if match.size > 50 and match.a + match.size == len(prev_part) and match.b == 0:
            return current_part[match.b:match.b + match.size]
        return ""

    @staticmethod
    def merge_texts_with_overlap(text_list):
        if not text_list:
            return ""
        
        merged_text = text_list[0]
        for current_text in text_list[1:]:
            overlap = VideoOCR.find_overlap(merged_text, current_text)
            if overlap:
                non_overlap_text = current_text[len(overlap):]
                merged_text += non_overlap_text
            else:
                merged_text += ' ' + current_text
        return merged_text

    @staticmethod
    def remove_duplicate_sentences(text):
        code_blocks = []
        text_blocks = []
        
        lines = text.split('\n')
        current_block = []
        in_code_block = False
        
        for line in lines:
            if line.strip().startswith(('def ', 'class ', 'import ', 'from ')):
                if current_block:
                    text_blocks.append('\n'.join(current_block))
                    current_block = []
                in_code_block = True
                current_block = [line]
            elif in_code_block and line.startswith((' ', '\t')):
                current_block.append(line)
            else:
                if in_code_block:
                    code_blocks.append('\n'.join(current_block))
                    current_block = []
                    in_code_block = False
                current_block.append(line)
        
        if current_block:
            if in_code_block:
                code_blocks.append('\n'.join(current_block))
            else:
                text_blocks.append('\n'.join(current_block))
        
        unique_sentences = set()
        processed_blocks = []
        
        for block in text_blocks:
            sentences = sent_tokenize(block)
            new_sentences = []
            for sentence in sentences:
                if sentence not in unique_sentences:
                    unique_sentences.add(sentence)
                    new_sentences.append(sentence)
            if new_sentences:
                processed_blocks.append(' '.join(new_sentences))
        
        final_text = '\n\n'.join(processed_blocks + code_blocks)
        return final_text

    def merge_text_data(self, text_data):
        cleaned_texts = [self.clean_text(text) for text in text_data if self.clean_text(text)]
        merged_text = self.merge_texts_with_overlap(cleaned_texts)
        final_text = self.remove_duplicate_sentences(merged_text)
        return final_text

    def process_video(self, video_path, save_frames=False, output_folder='frames', test_display=False):
        frames = self.capture_frames(video_path, save_frames, output_folder, test_display)
        text_data = self.perform_ocr(frames)
        merged_text = self.merge_text_data(text_data)
        return merged_text

    def correct_and_format_text(self, text):
        # Configure the language model
        turbo = dspy.LM("openai/gpt-4o-mini", max_tokens=8000)
        dspy.configure(lm=turbo)
        
        class CorrectionSignature(Signature):
            """
            Sort this text and make it more readable, correcting any code errors. 
            Treat and format like a medium article keeping all the unique 
            information, including code blocks, that deals with the 
            subject of the text while making sure to remove duplicate sentences and duplicate information unless it is for summary conclusion context.
            """
            text = dspy.InputField(desc="The input text to sort and format.")
            article = dspy.OutputField(desc="The medium article formatted text.")
        
        class CorrectionModule(Module):
            def __init__(self):
                super().__init__()
                self.prog = dspy.ChainOfThought(CorrectionSignature)
        
            def forward(self, text):
                response = self.prog(text=text)
                return response
        
        mcq_module = CorrectionModule()
        print(f"Correcting and formatting text: {text}")
        response = mcq_module.forward(text)
        print("Response")
        return response.article

def main():
    parser = argparse.ArgumentParser(description='Process a video file or YouTube URL and extract text.')
    parser.add_argument('--video', type=str, help='Path to the video file.')
    parser.add_argument('--youtube', type=str, help='YouTube video URL.')
    parser.add_argument('--change_threshold', type=float, default=0.4, help='Change threshold for frame capturing.')
    parser.add_argument('--check_interval', type=int, default=5, help='Interval in seconds to check frames.')
    parser.add_argument('--save_frames', action='store_true', help='Save captured frames to disk.')
    parser.add_argument('--output_folder', type=str, default='frames', help='Folder to save frames if --save_frames is used.')
    parser.add_argument('--test_display', action='store_true', help='Display a random captured frame for testing.')
    args = parser.parse_args()

    if not args.video and not args.youtube:
        print("You must provide either a video file path with --video or a YouTube URL with --youtube.")
        sys.exit(1)

    video_ocr = VideoOCR(change_threshold=args.change_threshold, check_interval=args.check_interval)

    temp_dir = None
    try:
        if args.youtube:
            video_path, temp_dir = video_ocr.download_youtube_video(args.youtube)
        else:
            video_path = args.video

        extracted_text = video_ocr.process_video(
            video_path,
            save_frames=args.save_frames,
            output_folder=args.output_folder,
            test_display=args.test_display
        )

        # Optionally correct and format the text
        final_text = video_ocr.correct_and_format_text(extracted_text)

        # Print or save the final text
        print(final_text)

    finally:
        # Clean up temporary files if a YouTube video was downloaded
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            print(f"Deleted temporary directory: {temp_dir}")

if __name__ == "__main__":
    main()
