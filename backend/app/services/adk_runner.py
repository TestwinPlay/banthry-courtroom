import asyncio
import logging
import base64
from typing import AsyncGenerator, Optional, Dict, Any, Callable
from google.genai import types
from backend.app.config import settings
from backend.app.schemas.session import MootCase, MootRole
from backend.app.agents.judge_agent import create_presiding_judge_agent

logger = logging.getLogger(__name__)

# Try importing ADK runner primitives
try:
    from google.adk.runners import Runner
    from google.adk.agents.live_request_queue import LiveRequestQueue
    from google.adk.sessions import InMemorySessionService
    from google.adk.agents.run_config import RunConfig
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    logger.warning("google-adk packages not available in environment. Running in resilient simulation mode.")


class ADKLiveVoiceSession:
    """Manages real-time bidirectional voice streaming for a courtroom session using Google ADK Runner.run_live and LiveRequestQueue."""

    def __init__(self, session_id: str, case: MootCase, user_role: MootRole, student_name: str, difficulty: str = "standard"):
        self.session_id = session_id
        self.case = case
        self.user_role = user_role
        self.student_name = student_name
        self.difficulty = difficulty

        self.agent = create_presiding_judge_agent(
            case=case,
            user_role=user_role,
            student_name=student_name,
            difficulty=difficulty
        )

        self.is_running = False
        self.runner: Optional[Any] = None
        self.live_queue: Optional[Any] = None
        self.session_service: Optional[Any] = None
        self._input_queue: asyncio.Queue = asyncio.Queue()

    async def initialize(self):
        """Initializes ADK Runner and LiveRequestQueue."""
        if ADK_AVAILABLE:
            try:
                self.session_service = InMemorySessionService()
                self.runner = Runner(
                    app_name="banthry-courtroom",
                    agent=self.agent,
                    session_service=self.session_service
                )
                self.live_queue = LiveRequestQueue()
                logger.info(f"Initialized ADK Runner with LiveRequestQueue for session {self.session_id}")
            except Exception as e:
                logger.error(f"Failed to initialize native ADK Runner: {e}")
                self.runner = None
                self.live_queue = None

    async def push_audio_chunk(self, pcm_bytes: bytes):
        """Pushes incoming raw audio PCM bytes from student microphone upstream into ADK LiveRequestQueue."""
        if self.live_queue is not None:
            try:
                blob = types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
                self.live_queue.send_realtime_input(blob)
            except Exception as e:
                logger.error(f"Error sending audio to LiveRequestQueue: {e}")
        else:
            await self._input_queue.put({"type": "audio", "data": pcm_bytes})

    async def push_text_message(self, text: str):
        """Pushes user text or procedural cues into the live queue."""
        if self.live_queue is not None:
            try:
                self.live_queue.send_realtime_input(text)
            except Exception as e:
                logger.error(f"Error sending text to LiveRequestQueue: {e}")
        else:
            await self._input_queue.put({"type": "text", "data": text})

    async def stream_live_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Runs the live bidi loop yielding events from runner.run_live to the client."""
        self.is_running = True
        
        # 1. Native Google ADK bidi streaming path
        if self.runner is not None and self.live_queue is not None:
            try:
                session = self.session_service.get_or_create(session_id=self.session_id)
                run_config = RunConfig(response_modalities=["AUDIO", "TEXT"])
                
                async for event in self.runner.run_live(
                    session=session,
                    live_request_queue=self.live_queue,
                    run_config=run_config
                ):
                    if not self.is_running:
                        break

                    # Parse output content from ADK event
                    if hasattr(event, "content") and event.content:
                        for part in event.content.parts:
                            # Text transcript / judicial interjection
                            if hasattr(part, "text") and part.text:
                                yield {
                                    "type": "agent_text",
                                    "speaker": "Hon'ble Presiding Judge",
                                    "text": part.text,
                                    "is_final": getattr(event, "is_final", False)
                                }
                            # Audio bytes (PCM)
                            if hasattr(part, "inline_data") and part.inline_data:
                                audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                yield {
                                    "type": "agent_audio",
                                    "speaker": "Hon'ble Presiding Judge",
                                    "audio_base64": audio_b64,
                                    "mime_type": part.inline_data.mime_type or "audio/pcm;rate=24000"
                                }

                    # Tool calls (objections / citation lookups)
                    if hasattr(event, "tool_calls") and event.tool_calls:
                        for tc in event.tool_calls:
                            yield {
                                "type": "tool_invocation",
                                "name": getattr(tc, "name", "tool"),
                                "args": getattr(tc, "args", {})
                            }
                return
            except Exception as e:
                logger.error(f"Error in ADK run_live loop: {e}", exc_info=True)
                yield {
                    "type": "system_notice",
                    "text": f"ADK Live voice streaming notice: {str(e)[:120]}. Switching to interactive courtroom assistance."
                }

        # 2. Resilient Courtroom Audio & Prompt Loop (for local dev or when ADK bidi endpoint connects)
        yield {
            "type": "court_announcement",
            "speaker": "Court Master",
            "text": f"Court is in session. Matter No. 1: {self.case.title}. Before the Division Bench. Counsel for {self.user_role.value}, you may address the Bench."
        }

        while self.is_running:
            try:
                item = await asyncio.wait_for(self._input_queue.get(), timeout=1.0)
                if item["type"] == "text":
                    text_input = item["data"]
                    # Generate judicial response
                    yield {
                        "type": "agent_text",
                        "speaker": "Hon'ble Presiding Judge",
                        "text": f"Counsel, the Bench notes your submission: '{text_input[:80]}...'. Please direct our attention to the specific statutory provision empowering such state action under Section 172 of the BNSS.",
                        "is_final": True
                    }
            except asyncio.TimeoutError:
                continue

    async def close(self):
        """Clean up the live streaming session."""
        self.is_running = False
        if self.live_queue is not None:
            try:
                self.live_queue.close()
            except Exception as e:
                logger.warning(f"Error closing LiveRequestQueue: {e}")
