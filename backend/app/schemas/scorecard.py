from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CitationStatus(str, Enum):
    VERIFIED_ACCURATE = "VERIFIED_ACCURATE"
    OVERRULED_OR_SUPERSEDED = "OVERRULED_OR_SUPERSEDED"
    DISTINGUISHABLE = "DISTINGUISHABLE"
    MISQUOTED_RATIO = "MISQUOTED_RATIO"
    UNVERIFIED_OR_HALLUCINATED = "UNVERIFIED_OR_HALLUCINATED"


class CitationAudit(BaseModel):
    case_citation: str
    context_quoted: str
    status: CitationStatus
    court: Optional[str] = None
    ratio_summary: Optional[str] = None
    audit_notes: str
    grounding_source_url: Optional[str] = None


class RubricCategoryScore(BaseModel):
    category_name: str
    score: float
    max_score: float
    summary_feedback: str
    key_strengths: List[str]
    areas_for_improvement: List[str]


class IRACAnalysis(BaseModel):
    issue_identification: str
    rule_articulation: str
    analysis_and_application: str
    conclusion_clarity: str


class Scorecard(BaseModel):
    session_id: str
    student_name: str
    case_id: str
    case_title: str
    user_role: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Scoring
    overall_score: float
    max_possible_score: float = 100.0
    percentage: float

    # BCI / National Moot Rubric breakdown
    categories: List[RubricCategoryScore]
    irac: IRACAnalysis

    # Grounded Citation Audit
    citations_audited: List[CitationAudit]

    # Bench Observations
    presiding_judge_opinion: str
    opposing_counsel_notes: str
    recommended_reading: List[str]
