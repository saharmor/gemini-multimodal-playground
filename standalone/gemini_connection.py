import asyncio
import os
import json
import base64
import pyaudio
from websockets import connect
from concurrent.futures import CancelledError

from google.genai.types import (GoogleSearch,Tool, GenerateContentConfig)

from voice_activity_detector import VoiceActivityDetector

google_search_tool = Tool(google_search=GoogleSearch())

class GeminiConnection:
    def __init__(self, config=None, cleanup_event=None, on_connect=None):
        # Your Gemini API key. Must be set as an environment variable or replace here with a string.
        self.api_key = os.environ.get("GEMINI_API_KEY")
        # The Gemini 2.0 (flash) model name
        self.model = "gemini-2.0-flash-exp"
        self.config = config or {
            "system_prompt": "You are a friendly Gemini 2.0 model. Respond verbally in a casual, helpful tone.",
            "voice": "Puck",
            "google_search": True
        }
        
        # WebSocket endpoint for Gemini's BidiGenerateContent API
        # Format: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=API_KEY
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.vad = VoiceActivityDetector()
        self.equalizer = None

        # Audio settings
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.INPUT_RATE = 16000   # Gemini expects 16 kHz for input
        self.OUTPUT_RATE = 24000  # Gemini outputs audio at 24 kHz
        self.CHUNK = 512

        # An asyncio.Queue to buffer server audio data
        self.audio_queue = asyncio.Queue()

        self.is_playing = False
        self.running = True
        self.cleanup_event = cleanup_event
        self.on_connect = on_connect
        self.allow_interruptions = config.get("allow_interruptions", False)

    def set_equalizer(self, equalizer):
        self.equalizer = equalizer

    async def cleanup(self):
        """Clean up resources when stopping."""
        self.running = False
        if self.ws:
            try:
                await self.ws.close()
            except Exception as e:
                print(f"Error closing websocket: {e}")

    async def start(self):
        """Create a WebSocket connection and run the capture, streaming, and playback tasks concurrently."""
        try:
            self.ws = await connect(self.uri, additional_headers={"Content-Type": "application/json"})
            
            generation_config = {} if not self.config["google_search"] else GenerateContentConfig(tools=[google_search_tool])

            generation_config = {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": self.config["voice"]
                        }
                    }
                }
            }
            
            setup_message = {
                "setup": {
                    "model": f"models/{self.model}",
                    "generation_config": generation_config,
                    "system_instruction": {
                        "parts": [
                            {
                                "text": self.config["system_prompt"]
                            }
                        ]
                    }
                }
            }
            
            await self.ws.send(json.dumps(setup_message))

            await self.ws.recv()
            print("Connected to Gemini. Speak into your microphone.")
            
            # Signal successful connection
            if self.on_connect:
                asyncio.get_event_loop().call_soon_threadsafe(self.on_connect)
            
            async with asyncio.TaskGroup() as tg:
                tg.create_task(self.capture_audio())
                tg.create_task(self.receive_server_messages())
                tg.create_task(self.play_responses())
                tg.create_task(self.watch_cleanup())

        except Exception as e:
            print(f"Error in Gemini connection: {e}")
        finally:
            await self.cleanup()

    async def capture_audio(self):
        """Capture audio from your Mac's microphone and send to Gemini in realtime."""
        audio = pyaudio.PyAudio()
        stream = None
        try:
            stream = audio.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.INPUT_RATE,
                input=True,
                frames_per_buffer=self.CHUNK
            )

            while self.running:
                try:
                    data = await asyncio.to_thread(stream.read, self.CHUNK, exception_on_overflow=False)
                    
                    # Update equalizer with audio data
                    if self.equalizer:
                        self.equalizer.update_levels(data)
                    
                    # Check if we should process input based on interruption settings
                    should_process = (not self.is_playing) or (self.is_playing and self.allow_interruptions)

                    if should_process:
                        if not self.vad.is_speech(data):
                            if not hasattr(self, '_printed_no_speech'):
                                print("No speech detected")
                                self._printed_no_speech = True
                            data = b'\x00' * len(data)
                        else:
                            self._printed_no_speech = False
                        
                        encoded_data = base64.b64encode(data).decode("utf-8")
                        realtime_input_msg = {
                            "realtime_input": {
                                "media_chunks": [
                                    {
                                        "data": encoded_data,
                                        "mime_type": "audio/pcm"
                                    }
                                ]
                            }
                        }
                        await self.ws.send(json.dumps(realtime_input_msg))
                    else:
                        if not hasattr(self, '_printed_skip_message'):
                            print("Skipping input while Gemini is speaking")
                            self._printed_skip_message = True
                        # Reset the flag when we're not playing anymore
                        elif not self.is_playing:
                            self._printed_skip_message = False

                except OSError as e:
                    print(f"Audio capture error: {e}")
                    await asyncio.sleep(0.1)  # Add small delay before retrying
                    continue

        except CancelledError:
            print("Audio capture cancelled")
        except Exception as e:
            print(f"Unexpected error in capture_audio: {e}")
        finally:
            if stream is not None and stream.is_active():
                try:
                    stream.stop_stream()
                    stream.close()
                except OSError:
                    pass  # Ignore errors during cleanup
            try:
                audio.terminate()
            except Exception:
                pass  # Ignore errors during cleanup

    async def receive_server_messages(self):
        async for msg in self.ws:
            response = json.loads(msg)
            
            # If the server gave us audio data, store it for playback
            try:
                parts = response["serverContent"]["modelTurn"]["parts"]
                for p in parts:
                    if "inlineData" in p:
                        # This indicates audio data
                        audio_data_b64 = p["inlineData"]["data"]
                        audio_bytes = base64.b64decode(audio_data_b64)
                        self.audio_queue.put_nowait(audio_bytes)
                    elif "text" in p:
                        # If the model also responds with text, you can process it here
                        print("Gemini text response:", p["text"])
            except KeyError:
                pass

            # Check if the model ended its turn
            try:
                turn_complete = response["serverContent"]["turnComplete"]
                if turn_complete:
                    # If the user interrupts or the turn is done, any leftover audio is ignored or cleared.
                    while not self.audio_queue.empty():
                        self.audio_queue.get_nowait()
            except KeyError:
                pass

    async def play_responses(self):
        """Pull audio data from the queue and play it through speakers."""
        audio = pyaudio.PyAudio()
        stream = audio.open(
            format=self.FORMAT,
            channels=self.CHANNELS,
            rate=self.OUTPUT_RATE,
            output=True
        )

        try:
            while self.running:
                audio_chunk = await self.audio_queue.get()
                self.is_playing = True  # Set flag before playing
                await asyncio.to_thread(stream.write, audio_chunk)
                self.is_playing = False  # Clear flag after playing
        except CancelledError:
            print("Playback cancelled")
        except Exception as e:
            print(f"Unexpected error in play_responses: {e}")
        finally:
            stream.stop_stream()
            stream.close()
            audio.terminate()

    async def watch_cleanup(self):
        """Watch for cleanup event from main thread"""
        while self.running:
            if self.cleanup_event.is_set():
                self.running = False
                break
            await asyncio.sleep(0.1)