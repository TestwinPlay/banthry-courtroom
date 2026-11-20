import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.moot.cases import list_all_cases, get_case_by_id
from backend.app.moot.rubrics import BCI_MOOT_RUBRIC_CATEGORIES
from backend.app.schemas.session import (
    MootCase,
    SessionCreateRequest,
    SessionResponse,
    TranscriptTurn,
    ObjectionEvent
)
from backend.app.schemas.scorecard import Scorecard
from backend.app.services.firestore_service import firestore_service
from backend.app.services.citation_grounding import citation_service
from backend.app.agents.evaluator import moot_evaluator
from backend.app.ws.moot_live import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("banthry-courtroom")

app = FastAPI(
    title="Banthry Courtroom API",
    description="AI Moot Court & Trial Advocacy Simulator for Lawyers & Law Students powered by Google ADK on Gemini via Vertex AI.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Live Voice WebSocket router
app.include_router(ws_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Banthry Courtroom",
        "jurisdiction": "India (Supreme Court & High Courts)",
        "adk_gemini_model": settings.gemini_live_model,
        "vertex_project": settings.google_cloud_project
    }


@app.get("/api/cases", response_model=List[MootCase])
async def get_all_moot_cases():
    """Returns curated Indian moot propositions (Constitutional, Criminal under BNS/BNSS/BSA, Evidence)."""
    return list_all_cases()


@app.get("/api/cases/{case_id}", response_model=MootCase)
async def get_moot_case(case_id: str):
    case = get_case_by_id(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Moot case proposition not found.")
    return case


@app.get("/api/rubrics")
async def get_moot_rubric_standards():
    """Returns the Bar Council of India / National Moot Competition 100-point evaluation criteria."""
    return {
        "title": "Bar Council of India National Moot Court Competition Evaluation Standard",
        "total_marks": 100,
        "categories": BCI_MOOT_RUBRIC_CATEGORIES
    }


@app.post("/api/sessions", response_model=SessionResponse)
async def create_courtroom_session(request: SessionCreateRequest):
    """Initializes a new courtroom oral argument session and saves to Firestore."""
    case = get_case_by_id(request.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Selected case proposition not found.")

    session_id = f"court-{uuid.uuid4().hex[:10]}"
    session_data = {
        "session_id": session_id,
        "case_id": case.id,
        "case_title": case.title,
        "user_role": request.user_role.value,
        "student_name": request.student_name,
        "time_limit_minutes": request.time_limit_minutes,
        "difficulty_level": request.difficulty_level,
        "status": "active",
        "created_at": datetime.utcnow().isoformat(),
    }

    await firestore_service.save_session(session_data)

    return SessionResponse(
        session_id=session_id,
        case=case,
        user_role=request.user_role,
        student_name=request.student_name,
        time_limit_minutes=request.time_limit_minutes,
        created_at=datetime.utcnow(),
        status="active"
    )


@app.get("/api/sessions/{session_id}")
async def get_courtroom_session(session_id: str):
    session_data = await firestore_service.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    case = get_case_by_id(session_data.get("case_id", "case-bns-privacy-01"))
    return {
        **session_data,
        "case": case
    }


@app.get("/api/sessions/{session_id}/transcripts")
async def get_session_transcripts(session_id: str):
    transcripts = await firestore_service.get_transcripts(session_id)
    return {"session_id": session_id, "turns": transcripts}


@app.get("/api/sessions/{session_id}/objections")
async def get_session_objections(session_id: str):
    objections = await firestore_service.get_objections(session_id)
    return {"session_id": session_id, "objections": objections}


@app.post("/api/sessions/{session_id}/evaluate", response_model=Scorecard)
async def evaluate_courtroom_session(session_id: str):
    """Adjourns the courtroom hearing and runs Gemini evaluation with Google Search grounding."""
    session_data = await firestore_service.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found.")

    case = get_case_by_id(session_data.get("case_id", "case-bns-privacy-01"))
    raw_transcripts = await firestore_service.get_transcripts(session_id)
    
    turns = [
        TranscriptTurn(
            speaker=t.get("speaker", "Counsel"),
            text=t.get("text", ""),
            timestamp=datetime.fromisoformat(t["timestamp"]) if "timestamp" in t and isinstance(t["timestamp"], str) else datetime.utcnow(),
            is_interjection=t.get("is_interjection", False)
        )
        for t in raw_transcripts
    ]

    # Generate Scorecard via Gemini Vertex AI
    scorecard = await moot_evaluator.evaluate_session(
        session_id=session_id,
        case=case,
        user_role=session_data.get("user_role", "Petitioner"),
        student_name=session_data.get("student_name", "Learned Counsel"),
        transcripts=turns
    )

    # Persist scorecard in Firestore
    await firestore_service.save_scorecard(scorecard)

    return scorecard


@app.get("/api/sessions/{session_id}/scorecard", response_model=Scorecard)
async def get_session_scorecard(session_id: str):
    scorecard_data = await firestore_service.get_scorecard(session_id)
    if not scorecard_data:
        raise HTTPException(status_code=404, detail="Scorecard has not been generated for this session yet.")
    return scorecard_data


@app.post("/api/citations/verify")
async def verify_citation_endpoint(payload: Dict[str, str]):
    """Stand-alone citation check endpoint with Google Search grounding."""
    citation = payload.get("citation", "")
    context = payload.get("context", "")
    if not citation:
        raise HTTPException(status_code=400, detail="Citation query is required.")
    
    audit = await citation_service.verify_citation(citation, context)
    return audit.model_dump(mode="json")
