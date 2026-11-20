import sys
import os
import json
import uuid
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

# Ensure backend root is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from courtroom.config import settings
from courtroom.schemas import (
    CaseProposition, CaseGenerationRequest, CitationVerifyRequest,
    CitationResult, EvaluationRequest, Scorecard, ExhibitRequest,
    ExhibitResponse, MemorialCheckRequest, MemorialCheckResponse
)
from courtroom.agents.case_architect.agent import generate_case_problem
from courtroom.agents.citation_verifier.agent import extract_and_verify
from courtroom.agents.evaluator.agent import evaluate_hearing
from courtroom.agents.memorial_coach.agent import check_memorial
from courtroom.agents.exhibit_maker.agent import create_stamped_exhibit
from courtroom.tools.citation_tool import load_judgments_data, check_local_citation
from courtroom.tools.case_fact_tool import register_case_context
from courtroom.tools.firestore_client import save_session, get_session, save_scorecard, get_scorecard
from courtroom.services.adk_live import ADKHearingSession

app = FastAPI(
    title="Banthry Courtroom API",
    description="Live AI moot court for Indian law students and legal-aid lawyers by Banthry Prep",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active live hearing sessions
active_sessions: Dict[str, ADKHearingSession] = {}


@app.get("/health")
async def health_check():
    """Health and model configuration status."""
    return {
        "status": "healthy",
        "app": "Banthry Courtroom",
        "project": settings.google_cloud_project,
        "location_text": settings.google_cloud_location,
        "location_live": settings.gemini_live_location,
        "models": {
            "analysis": settings.model_analysis,
            "pro": settings.model_pro,
            "live": settings.model_live,
            "image": settings.model_image
        },
        "disclaimer": "Practice moot court, not legal advice."
    }


# ==============================================================================
# Case Proposition Endpoints
# ==============================================================================

@app.post("/api/case", response_model=CaseProposition)
@app.post("/api/cases/from-judgment", response_model=CaseProposition)
async def generate_case_from_judgment(
    source_text: Optional[str] = Form(None),
    target_topic: Optional[str] = Form("Anticipatory Bail under Section 482 BNSS"),
    file: Optional[UploadFile] = File(None)
):
    """
    Generates a fictional Indian criminal law moot problem based on an uploaded judgment or text brief.
    Fictionalizes all identifying entities while preserving genuine legal issues under BNS/BNSS.
    """
    extracted_text = source_text or ""
    if file:
        try:
            content = await file.read()
            filename = (file.filename or "").lower()
            if filename.endswith(".pdf"):
                from pypdf import PdfReader
                import io
                reader = PdfReader(io.BytesIO(content))
                extracted_text = "\n".join([page.extract_text() or "" for page in reader.pages if page.extract_text()])
            elif filename.endswith(".docx"):
                import docx
                import io
                doc = docx.Document(io.BytesIO(content))
                extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text])
            else:
                extracted_text = content.decode("utf-8", errors="ignore")
        except Exception as e:
            print(f"Error reading judgment file: {e}")
            raise HTTPException(status_code=400, detail=f"Could not read uploaded judgment file: {e}")

    problem_data = await generate_case_problem(source_text=extracted_text, target_topic=target_topic)
    case_id = str(uuid.uuid4())
    register_case_context(case_id, problem_data)
    await save_session(case_id, {"case": problem_data})
    return problem_data


@app.post("/api/cases/from-library", response_model=CaseProposition)
async def generate_case_from_library(case_name: str = "Arnesh Kumar v. State of Bihar"):
    """Generates a moot problem seeded from a landmark judgment in the library."""
    judgment = check_local_citation(case_name)
    summary = judgment.get("holding", "") if judgment else ""
    problem_data = await generate_case_problem(
        source_text=f"Judgment: {case_name}. Ratio: {summary}",
        target_topic=f"Criminal Application based on {case_name}"
    )
    return problem_data


@app.get("/api/cases/{case_id}")
async def get_case_by_id(case_id: str):
    """Retrieves a saved moot problem session."""
    session = await get_session(case_id)
    if not session or "case" not in session:
        raise HTTPException(status_code=404, detail="Case session not found.")
    return session["case"]


# ==============================================================================
# Citation Verification Endpoints
# ==============================================================================

@app.post("/api/verify")
async def verify_citation_endpoint(req: CitationVerifyRequest):
    """
    Extracts citations from oral text and runs two-tier verification:
    Tier 1: AlloyDB / local seed library
    Tier 2: Google Search grounding with sci.gov.in / indiankanoon.org
    """
    results = await extract_and_verify(req.text, claimed_proposition=req.claimed_proposition)
    return results


@app.get("/api/judgments/search")
async def search_judgments(query: str = ""):
    """Searches the judicial database for citations and holdings."""
    judgments = load_judgments_data()
    if not query:
        return judgments[:10]
    q_low = query.lower()
    return [j for j in judgments if q_low in j.get("name", "").lower() or q_low in j.get("citation", "").lower()][:10]


# ==============================================================================
# Evaluation and Scorecard Endpoints
# ==============================================================================

@app.post("/api/evaluate", response_model=Scorecard)
async def evaluate_hearing_endpoint(req: EvaluationRequest):
    """
    Scores hearing transcript across 8 quantitative criteria (0-10) with mandatory student quotes,
    per-judge comments, 3 improvement recommendations, and flagged unverified citations.
    """
    transcript = req.transcript or []
    flagged = req.flagged_citations or []

    if not transcript and req.qa:
        transcript = []
        for turn in req.qa:
            if isinstance(turn, dict):
                if turn.get("q"):
                    transcript.append({"speaker": "J1", "text": turn.get("q")})
                if turn.get("a") or turn.get("answer"):
                    transcript.append({"speaker": "counsel", "text": turn.get("a") or turn.get("answer")})
                if turn.get("citations"):
                    for c in turn.get("citations"):
                        if isinstance(c, dict) and c.get("status") in ("not_found", "misquoted", "unconfirmed"):
                            flagged.append(c)

    scorecard = await evaluate_hearing(
        transcript=transcript,
        case_context=req.case_context,
        flagged_citations=flagged
    )
    session_id = str(uuid.uuid4())
    await save_scorecard(session_id, scorecard)
    return scorecard


# ==============================================================================
# Memorial Check Endpoint
# ==============================================================================

@app.post("/api/memorial/check", response_model=MemorialCheckResponse)
async def check_memorial_endpoint(req: MemorialCheckRequest):
    """Checks memorial compliance, authority verification, and drafts bench first questions."""
    result = await check_memorial(req.memorial_text, req.moot_problem)
    return result


# ==============================================================================
# Exhibit Generation Endpoint
# ==============================================================================

@app.post("/api/exhibit", response_model=ExhibitResponse)
@app.post("/api/exhibits", response_model=ExhibitResponse)
async def generate_exhibit_endpoint(req: ExhibitRequest):
    """Generates a stamped fictional legal exhibit (FIR, seizure memo, etc.)."""
    b64_img = create_stamped_exhibit(title=req.title, doc_type="FIR", case_id=req.id)
    return {
        "id": req.id,
        "title": req.title,
        "image_base64": b64_img,
        "watermark": "FICTIONAL EXHIBIT"
    }


# ==============================================================================
# Live WebSocket Hearing Endpoint
# ==============================================================================

@app.websocket("/ws/hearing")
@app.websocket("/ws/hearing/{session_id}")
async def websocket_hearing_endpoint(websocket: WebSocket, session_id: Optional[str] = None):
    """
    Bidirectional streaming live hearing over WebSocket.
    Client transmits 16 kHz PCM16 mono audio or JSON text turns.
    Server streams back judge transcripts, multi-judge audio, and instant citation flag chips.
    """
    await websocket.accept()
    sid = session_id or str(uuid.uuid4())
    side = websocket.query_params.get("side", "Petitioner")
    case_id = websocket.query_params.get("case_id", "default")
    hearing_session = ADKHearingSession(sid, side=side, case_id=case_id)
    await hearing_session.initialize()
    active_sessions[sid] = hearing_session

    async def event_sender():
        try:
            async for event in hearing_session.stream_events():
                await websocket.send_text(json.dumps(event))
        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"WebSocket sender error: {e}")

    sender_task = asyncio.create_task(event_sender())

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                await hearing_session.push_audio(message["bytes"])
            elif "text" in message and message["text"]:
                try:
                    payload = json.loads(message["text"])
                    msg_type = payload.get("type")
                    if msg_type == "text":
                        await hearing_session.push_text(payload.get("text", ""))
                    elif msg_type == "interrupt":
                        await hearing_session.push_interrupt(payload.get("text", "With the Court's leave, Counsel wishes to address that point directly."))
                    elif msg_type == "start":
                        if "side" in payload:
                            hearing_session.side = payload["side"]
                        if "case_id" in payload:
                            hearing_session.case_id = payload["case_id"]
                    elif msg_type == "audio" and payload.get("audio"):
                        raw_bytes = base64.b64decode(payload["audio"])
                        await hearing_session.push_audio(raw_bytes)
                    elif msg_type == "call_witness":
                        await hearing_session.call_witness(payload.get("name", "Inspector Vikrant Rane"))
                    else:
                        await hearing_session.push_text(payload.get("text", str(payload)))
                except json.JSONDecodeError:
                    await hearing_session.push_text(message["text"])
    except WebSocketDisconnect:
        pass
    finally:
        hearing_session.stop()
        sender_task.cancel()
        if sid in active_sessions:
            del active_sessions[sid]


# ==============================================================================
# SPA Static File Serving
# ==============================================================================

dist_path = settings.web_dist_dir
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target = dist_path / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(dist_path / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.host, port=settings.port, reload=True)
