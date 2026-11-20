from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PropositionParagraph(BaseModel):
    para_no: int
    text: str
    is_key_fact: bool = False


class Parties(BaseModel):
    applicant: str
    respondent: str


class WitnessProfile(BaseModel):
    name: str
    role: str
    statement: str
    temperament: str = "neutral"
    may_be_pressed_on: Optional[str] = None


class ExhibitPrompt(BaseModel):
    id: str
    title: str
    prompt: str
    type: str = "FIR"


class CaseProposition(BaseModel):
    id: Optional[str] = None
    title: str
    forum: str = "High Court of Judicature"
    parties: Parties
    disclaimer: str = "Fictional moot problem. Practice moot court, not legal advice."
    proposition_paragraphs: List[PropositionParagraph]
    issues: List[str]
    statutes: List[str]
    strongest_arguments: Dict[str, List[str]] = Field(default_factory=dict)
    witnesses: List[WitnessProfile] = Field(default_factory=list)
    exhibit_prompts: List[ExhibitPrompt] = Field(default_factory=list)


class CaseGenerationRequest(BaseModel):
    source_text: Optional[str] = None
    target_topic: Optional[str] = "Anticipatory Bail under Section 482 BNSS"
    difficulty: Optional[str] = "Intermediate"


class CitationVerifyRequest(BaseModel):
    text: str
    claimed_proposition: Optional[str] = None
    speaker_role: Optional[str] = "counsel"


class CitationResult(BaseModel):
    name: str
    citation: Optional[str] = None
    status: str  # verified | exists_but_misquoted | exists_but_wrong_proposition | overruled_or_doubted | not_found | unconfirmed
    source_url: Optional[str] = None
    holding_summary: Optional[str] = None
    bench_response_hint: Optional[str] = None
    note: Optional[str] = None


class CriterionScore(BaseModel):
    score: float = Field(ge=0, le=10)
    evidence_quote: str = ""
    feedback: str = ""


class ScoresDict(BaseModel):
    legal_reasoning: CriterionScore
    use_of_authority: CriterionScore
    responsiveness: CriterionScore
    handling_difficult_questions: CriterionScore
    structure: CriterionScore
    court_manner: CriterionScore
    advocacy: CriterionScore
    witness_handling: Optional[CriterionScore] = None


class FlaggedCitation(BaseModel):
    name: str
    citation: Optional[str] = None
    status: str
    reason: str


class EvaluationRequest(BaseModel):
    transcript: Optional[List[Dict[str, Any]]] = None
    qa: Optional[List[Dict[str, Any]]] = None
    side: Optional[str] = "App"
    case_context: Optional[Dict[str, Any]] = None
    flagged_citations: Optional[List[Dict[str, Any]]] = None


class Scorecard(BaseModel):
    scores: ScoresDict
    overall: float = Field(ge=0, le=10)
    judge_comments: Dict[str, str]
    flagged_citations: List[FlaggedCitation] = Field(default_factory=list)
    improvements: List[str] = Field(..., min_length=3, max_length=3)
    disclaimer: str = "Practice moot court, not legal advice."


class ExhibitRequest(BaseModel):
    id: str = "EX-01"
    title: str = "FIR No. 0412/2025"
    prompt: Optional[str] = None
    case_title: Optional[str] = None


class ExhibitResponse(BaseModel):
    id: str
    title: str
    image_base64: str
    watermark: str = "FICTIONAL EXHIBIT"


class MemorialCheckRequest(BaseModel):
    moot_problem: Optional[Dict[str, Any]] = None
    memorial_text: str
    side: Optional[str] = "Applicant"


class MemorialCheckResponse(BaseModel):
    jurisdiction_valid: bool
    facts_neutral: bool
    authorities_verified_count: int
    unverified_authorities: List[str] = Field(default_factory=list)
    prayer_relief_correct: bool
    bench_first_questions: List[str] = Field(default_factory=list)
    score: float
    feedback: str
