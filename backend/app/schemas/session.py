from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class MootRole(str, Enum):
    PETITIONER = "Petitioner"
    RESPONDENT = "Respondent"
    APPELLANT = "Appellant"
    DEFENDANT = "Defendant"


class CourtLevel(str, Enum):
    SUPREME_COURT_OF_INDIA = "Supreme Court of India"
    HIGH_COURT_OF_DELHI = "High Court of Delhi"
    HIGH_COURT_OF_BOMBAY = "High Court of Bombay"
    SESSIONS_COURT = "Sessions / District Court"


class MootCase(BaseModel):
    id: str
    title: str
    court: CourtLevel = CourtLevel.SUPREME_COURT_OF_INDIA
    bench_composition: str = "Division Bench (2 Judges)"
    summary: str
    facts: List[str]
    issues: List[str]
    statutory_provisions: List[str]
    key_precedents: List[str]


class TranscriptTurn(BaseModel):
    speaker: str = Field(..., description="Role of the speaker: Judge, Opposing Counsel, Student Advocate")
    speaker_name: Optional[str] = None
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_interjection: bool = False


class ObjectionType(str, Enum):
    RELEVANCE = "Relevance (Bharatiya Sakshya Adhiniyam / IEA)"
    LEADING_QUESTION = "Leading Question"
    HEARSAY = "Hearsay Evidence"
    SPECULATION = "Calling for Speculation"
    MISQUOTING_RECORD = "Misquoting the Moot Record / Facts"
    MISSTATING_LAW = "Misstating Statutory Provision or Precedent"
    ARGUMENTATIVE = "Argumentative / Harassing the Witness"


class ObjectionStatus(str, Enum):
    SUSTAINED = "Sustained"
    OVERRULED = "Overruled"
    NOTED = "Noted / Taken on Record"


class ObjectionEvent(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    raised_by: str
    objection_type: ObjectionType
    context_text: str
    ruling: ObjectionStatus
    judge_remark: str


class SessionCreateRequest(BaseModel):
    case_id: str
    user_role: MootRole = MootRole.PETITIONER
    student_name: str = "Learned Counsel"
    time_limit_minutes: int = 15
    difficulty_level: str = "standard"  # easy, standard, rigorous_senior_bench


class SessionResponse(BaseModel):
    session_id: str
    case: MootCase
    user_role: MootRole
    student_name: str
    time_limit_minutes: int
    created_at: datetime
    status: str  # active, completed, adjourned
    turns_count: int = 0
