import os
from pathlib import Path
import mimetypes
import tempfile
import atexit
import logging
import time
from typing import Union, Optional

import google.generativeai as genai
from PIL import Image
import argparse
from rich.console import Console
from rich.prompt import Prompt
from rich.panel import Panel




from dotenv import load_dotenv

class GeminiMultimedia:
    """
    A comprehensive wrapper for handling multimedia interactions with Gemini API using the new Google Gen AI SDK.
    Supports images, audio, and video files with automatic cleanup.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the GeminiMultimedia wrapper.
        
        Args:
            api_key (str, optional): Gemini API key. If not provided, will look for GOOGLE_GENERATIVE_AI_API_KEY in env.
        """
        # Load environment variables from workspace root
        load_dotenv(dotenv_path='/home/gyasis/Documents/code/Applied_AI/.env')
        
        # Configure Gemini
        self.api_key = api_key or os.getenv('GOOGLE_GENERATIVE_AI_API_KEY')
        if not self.api_key:
            raise ValueError(
                "Gemini API key not found. Please provide it or set GOOGLE_GENERATIVE_AI_API_KEY environment variable."
            )

        # Configure the GenAI client
        genai.configure(api_key=self.api_key)

        self.uploaded_files = []
        self.temp_files = []
        
        # Register cleanup on exit
        atexit.register(self.cleanup)
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

        self.models = {
            'vision': 'gemini-pro-vision',
            'text': 'gemini-pro',
            'audio': 'gemini-1.5-pro',
            'video': 'gemini-1.5-pro'
        }

    def process_media(
        self,
        file_path: Union[str, Path],
        prompt: str,
        model_name: Optional[str] = None,
        max_tokens: int = 8192,
        temperature: float = 0.7
    ) -> str:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
            
        mime_type = mimetypes.guess_type(file_path)[0]
        if not mime_type:
            raise ValueError(f"Could not determine mime type for file: {file_path}")
            
        media_type = mime_type.split('/')[0]
        self.logger.info(f"Processing {media_type} file: {file_path}")

        if media_type == 'image':
            return self._process_image(file_path, prompt, model_name, max_tokens, temperature)
        elif media_type in ('audio', 'video'):
            return self._process_av_media(file_path, prompt, model_name, max_tokens, temperature, mime_type)
        else:
            raise ValueError(f"Unsupported media type: {media_type}")

    def _process_image(
        self,
        image_path: Path,
        prompt: str,
        model_name: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        image = Image.open(image_path)
        response = self.client.models.generate_content(
            model=model_name or self.models['vision'],
            contents=[prompt, image],
            config=GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=temperature
            )
        )
        return response.text

    def _process_av_media(
        self,
        file_path: Path,
        prompt: str,
        model_name: str,
        max_tokens: int,
        temperature: float,
        mime_type: str
    ) -> str:
        file_size = file_path.stat().st_size / (1024 * 1024)
        self.logger.info(f"Processing media file of size: {file_size:.2f} MB")

        use_file_api = file_size > 20
        if use_file_api:
            # Upload file
            file_ref = self.client.files.upload(file=str(file_path))
            self.uploaded_files.append(file_ref)

            # Poll until ACTIVE or FAIL
            max_retries = 30
            for attempt in range(max_retries):
                file_ref = self.client.files.get(name=file_ref.name)
                state = file_ref.state
                state_name = getattr(state, 'name', str(state))
                self.logger.info(f"[{attempt+1}/{max_retries}] File {file_ref.name} state: {state_name}")

                if state == FileState.ACTIVE:
                    break
                if state == FileState.FAILED:
                    raise RuntimeError(f"File {file_ref.name} failed to process.")
                time.sleep(10)
            else:
                raise TimeoutError(f"File {file_ref.name} did not become ACTIVE in time.")

            contents = [prompt, file_ref]
        else:
            # Inline data for small files
            with open(file_path, 'rb') as f:
                data = f.read()
            part = Part.from_bytes(data=data, mime_type=mime_type)
            contents = [prompt, part]

        response = self.client.models.generate_content(
            model=model_name or self.models['video'],
            contents=contents,
            config=GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=temperature
            )
        )
        return response.text

    def cleanup(self):
        """Clean up uploaded files and temporary files."""
        # Clean up uploaded files
        for file_ref in self.uploaded_files:
            try:
                self.client.files.delete(name=file_ref.name)
                self.logger.info(f"Deleted file: {file_ref.name}")
            except Exception as e:
                self.logger.warning(f"Could not delete file {file_ref.name}: {e}")

    def generate_text(
        self,
        prompt: str,
        model_name: Optional[str] = None,
        max_tokens: int = 8192, 
        temperature: float = 0.7
    ) -> str:
        """
        Generates text content using the Gemini API based on a prompt.
        """
        model_to_use = model_name
        # Ensure self.models is accessible or use a direct default string
        # Assuming self.models is a dict like {'text': 'gemini-pro'}
        if not model_to_use:
            model_to_use = self.models.get('text') or "gemini-1.5-flash" 
            self.logger.info(f"No model_name provided for generate_text, defaulting to {model_to_use}")

        self.logger.info(f"Generating text with model {model_to_use} (prompt length: {len(prompt)} chars)")

        try:
            response = self.client.models.generate_content(
                model=model_to_use,
                contents=[prompt], 
                config=GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=temperature
                )
            )
            # Check response.text first as it's the most common attribute for simple text
            if hasattr(response, 'text') and response.text:
                return response.text
            # Fallback to checking parts if .text is empty or not present
            elif hasattr(response, 'parts') and response.parts:
                # Concatenate text from all parts that have a text attribute
                full_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
                if full_text:
                    return full_text
            
            # If neither .text nor .parts yields content, log and return error string
            self.logger.error(f"Failed to get valid text response from Gemini. Response object: {response}")
            return "[Error: No content in Gemini text response]"
        except Exception as e:
            self.logger.error(f"Error in Gemini text generation (model: {model_to_use}): {e}", exc_info=True)
            raise

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process media files with Gemini API")
    parser.add_argument("--model", type=str, default="gemini-1.5-pro")
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--max-tokens", type=int, default=8192)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    console = Console()
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    with GeminiMultimedia() as gm:
        console.print(Panel(
            f"[bold green]Gemini Multimedia Processor[/bold green]\n"
            f"[cyan]Model:[/cyan] {args.model}\n"
            f"[cyan]Temperature:[/cyan] {args.temperature}\n"
            f"[cyan]Max Tokens:[/cyan] {args.max_tokens}\n"
            f"[cyan]Debug Mode:[/cyan] {'Enabled' if args.debug else 'Disabled'}",
            title="Configuration",
            border_style="blue"
        ))

        while True:
            file_path = Prompt.ask("\n[bold yellow]Enter path to media file[/bold yellow]")
            if file_path.lower() in ['exit', 'quit']:
                break
            if not Path(file_path).exists():
                console.print(f"[red]File not found: {file_path}[/red]")
                continue
            prompt = Prompt.ask("[bold yellow]Enter your prompt/question about the media[/bold yellow]")
            if prompt.lower() in ['exit', 'quit']:
                break
            console.print("\n[bold blue]Processing media...[/bold blue]")
            try:
                response = gm.process_media(
                    file_path,
                    prompt,
                    model_name=args.model,
                    temperature=args.temperature,
                    max_tokens=args.max_tokens
                )
                console.print(Panel(response, title="[bold green]Response[/bold green]", border_style="green"))
            except Exception as e:
                console.print(f"[red]Error processing media: {e}[/red]")
            if Prompt.ask("\n[yellow]Process another file?[/yellow]", choices=["y","n"], default="y") != "y":
                break
        console.print("\n[bold green]Session ended. Goodbye![/bold green]")
