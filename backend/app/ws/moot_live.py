import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from backend.app.services.adk_runner import ADKLiveVoiceSession
from backend.app.services.firestore_service import firestore_service
from backend.app.services.citation_grounding import citation_service
from backend.app.moot.cases import get_case_by_id
from backend.app.schemas.session import (
    MootRole,
    MootCase,
    TranscriptTurn,
    ObjectionEvent,
    ObjectionType,
    ObjectionStatus
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Active live sessions cache
ACTIVE_SESSIONS: Dict[str, ADKLiveVoiceSession] = {}


@router.websocket("/ws/courtroom/{session_id}")
async def courtroom_websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    role: str = Query("Petitioner"),
    student_name: str = Query("Learned Counsel")
):
    await websocket.accept()
    logger.info(f"WebSocket client connected for courtroom session {session_id}")

    # Fetch or retrieve session data from Firestore
    session_data = await firestore_service.get_session(session_id)
    if not session_data:
        # Default fallback case if session not pre-created
        case_id = "case-bns-privacy-01"
        case = get_case_by_id(case_id)
    else:
        case = get_case_by_id(session_data.get("case_id", "case-bns-privacy-01"))

    if not case:
        case = get_case_by_id("case-bns-privacy-01")

    user_role = MootRole.PETITIONER if role.lower() == "petitioner" else MootRole.RESPONDENT

    # Initialize ADK Live voice session
    live_session = ADKLiveVoiceSession(
        session_id=session_id,
        case=case,
        user_role=user_role,
        student_name=student_name
    )
    await live_session.initialize()
    ACTIVE_SESSIONS[session_id] = live_session

    async def outgoing_stream_task():
        """Reads events from ADK Runner and forwards them down the WebSocket."""
        try:
            async for event in live_session.stream_live_events():
                event_type = event.get("type")
                
                # If it is agent text transcript, persist turn
                if event_type in ["agent_text", "court_announcement"]:
                    speaker = event.get("speaker", "Hon'ble Presiding Judge")
                    text = event.get("text", "")
                    if text.strip():
                        turn = TranscriptTurn(
                            speaker=speaker,
                            text=text,
                            is_interjection=event_type == "agent_text"
                        )
                        await firestore_service.append_transcript_turn(session_id, turn)

                await websocket.send_json(event)
        except WebSocketDisconnect:
            logger.info(f"Client disconnected from outgoing stream for {session_id}")
        except Exception as e:
            logger.error(f"Error streaming ADK events to WebSocket: {e}", exc_info=True)

    stream_task = asyncio.create_task(outgoing_stream_task())

    try:
        while True:
            # Receive raw PCM audio (binary) or JSON commands
            message = await websocket.receive()
            
            if "bytes" in message and message["bytes"]:
                # Raw audio chunk (PCM) from microphone
                pcm_bytes = message["bytes"]
                await live_session.push_audio_chunk(pcm_bytes)
                
            elif "text" in message and message["text"]:
                payload = json.loads(message["text"])
                msg_type = payload.get("type")

                if msg_type == "user_transcript":
                    # User speech transcribed
                    user_text = payload.get("text", "")
                    if user_text:
                        turn = TranscriptTurn(
                            speaker=f"Counsel for {user_role.value} ({student_name})",
                            text=user_text,
                            is_interjection=False
                        )
                        await firestore_service.append_transcript_turn(session_id, turn)
                        await live_session.push_text_message(user_text)

                elif msg_type == "raise_objection":
                    # Student raises objection
                    obj_type_str = payload.get("objection_type", ObjectionType.RELEVANCE.value)
                    grounds = payload.get("grounds", "Beyond moot record")
                    
                    # Judge rules on objection
                    ruling = ObjectionStatus.SUSTAINED if "relevance" in obj_type_str.lower() else ObjectionStatus.OVERRULED
                    remark = (
                        "Objection Sustained. Opposing counsel, refrain from traveling beyond the moot proposition."
                        if ruling == ObjectionStatus.SUSTAINED
                        else "Objection Overruled. The Bench will allow counsel some latitude to build the factual foundation."
                    )

                    objection_event = ObjectionEvent(
                        id=str(uuid.uuid4())[:8],
                        raised_by=f"Counsel for {user_role.value}",
                        objection_type=ObjectionType.RELEVANCE,
                        context_text=grounds,
                        ruling=ruling,
                        judge_remark=remark
                    )
                    await firestore_service.record_objection(session_id, objection_event)

                    # Broadcast objection event to client
                    await websocket.send_json({
                        "type": "objection_ruled",
                        "objection": objection_event.model_dump(mode="json")
                    })

                elif msg_type == "verify_citation":
                    # Real-time citation check request
                    cit_query = payload.get("citation", "")
                    context = payload.get("context", "")
                    audit = await citation_service.verify_citation(cit_query, context)
                    await websocket.send_json({
                        "type": "citation_audit_result",
                        "audit": audit.model_dump(mode="json")
                    })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error in courtroom session: {e}", exc_info=True)
    finally:
        stream_task.cancel()
        await live_session.close()
        if session_id in ACTIVE_SESSIONS:
            del ACTIVE_SESSIONS[session_id]
