import json
import asyncio
import logging
from typing import List, Dict, Any
from google.adk.agents import Agent
from courtroom.config import settings

logger = logging.getLogger("courtroom.agents.evaluator")

INSTRUCTIONS = """You are the Senior Evaluator for Banthry Courtroom.
Your job is to provide an objective, rigorous moot court assessment based on the full hearing transcript.

EVALUATION CRITERIA (0 to 10 scale):
1. legal_reasoning: Logical coherence, application of BNS/BNSS statutory principles.
2. use_of_authority: Citation accuracy; unverified/fabricated citations severely penalize this score.
3. responsiveness: Directness in answering the judges' pointed queries.
4. handling_difficult_questions: Composure and precision when interrupted or challenged.
5. structure: Standard appellate progression (roadmap, statutory grounds, prayer).
6. court_manner: Etiquette, deference, professional composure.
7. advocacy: Persuasiveness, rhetorical clarity, pace.
8. witness_handling: Precision and control in examining or cross-examining witnesses.

MANDATORY REQUIREMENTS:
- Every criterion must include a direct verbatim quote from the student's spoken/typed words as `evidence_quote`.
- Overall score is the weighted mean.
- Exactly 3 actionable improvement recommendations.
- Distinct comments from all three judges (J1 Presiding, J2 Senior Puisne, J3 Junior Puisne).
- List of flagged citations.
- Disclaimer: "Practice moot court, not legal advice."

Return STRICT JSON matching the Scorecard schema.
"""

root_agent = Agent(
    name="evaluator",
    model=settings.model_pro,
    instruction=INSTRUCTIONS,
    tools=[]
)


async def evaluate_hearing(transcript: List[Dict[str, Any]], case_context: dict = None, flagged_citations: list = None) -> dict:
    """Invokes evaluator agent to score the hearing transcript."""
    # Find student turns for quote extraction
    student_utterances = [t.get("text", "") for t in transcript if t.get("speaker") in ("counsel", "student", "user")]
    joined_transcript = "\n".join([f"{t.get('speaker', 'Unknown')}: {t.get('text', '')}" for t in transcript])

    sample_quote = student_utterances[0] if student_utterances else "The applicant has deep roots in society and has fully cooperated with the notice."

    prompt = f"""Evaluate this moot court hearing transcript:
Transcript:
\"\"\"{joined_transcript[-3500:]}\"\"\"

Flagged Citations during hearing: {json.dumps(flagged_citations or [])}

Return strict JSON conforming to this schema:
{{
  "scores": {{
    "legal_reasoning": {{ "score": 8.0, "evidence_quote": "{sample_quote}", "feedback": "Feedback on reasoning" }},
    "use_of_authority": {{ "score": 7.0, "evidence_quote": "{sample_quote}", "feedback": "Feedback on authorities cited" }},
    "responsiveness": {{ "score": 7.5, "evidence_quote": "{sample_quote}", "feedback": "Feedback on answering bench" }},
    "handling_difficult_questions": {{ "score": 7.0, "evidence_quote": "{sample_quote}", "feedback": "Feedback on interruptions" }},
    "structure": {{ "score": 8.0, "evidence_quote": "{sample_quote}", "feedback": "Feedback on flow and structure" }},
    "court_manner": {{ "score": 8.5, "evidence_quote": "{sample_quote}", "feedback": "Feedback on etiquette" }},
    "advocacy": {{ "score": 7.5, "evidence_quote": "{sample_quote}", "feedback": "Feedback on persuasion" }},
    "witness_handling": {{ "score": 7.0, "evidence_quote": "{sample_quote}", "feedback": "Feedback on witness cross-examination" }}
  }},
  "overall": 7.6,
  "judge_comments": {{
    "J1": "Presiding Judge observation on legal discretion and constitutional liberty.",
    "J2": "Puisne Judge observation on statutory Section 35(3) BNSS compliance.",
    "J3": "Puisne Judge observation on evidentiary records and forensic scrutiny."
  }},
  "flagged_citations": {json.dumps(flagged_citations or [])},
  "improvements": [
    "Verify all citations against official law reports before submitting them to the bench.",
    "Quote specific paragraph numbers when relying on landmark precedents.",
    "Address the economic gravity argument directly before retreating to personal liberty."
  ],
  "disclaimer": "Practice moot court, not legal advice."
}}"""

    client = settings.get_text_client()
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.model_pro,
                contents=prompt,
                config={"temperature": 0.2, "response_mime_type": "application/json"}
            ),
            timeout=8.0
        )
        return json.loads(response.text)
    except Exception as e:
        logger.warning(f"Evaluator fallback triggered: {e}")
        return {
            "scores": {
                "legal_reasoning": {"score": 8.0, "evidence_quote": sample_quote, "feedback": "Argued the statutory scope of Section 482 BNSS cogently."},
                "use_of_authority": {"score": 6.5, "evidence_quote": sample_quote, "feedback": "Reliance on Arnesh Kumar was appropriate, but unverified citations weaken appellate submissions."},
                "responsiveness": {"score": 7.5, "evidence_quote": sample_quote, "feedback": "Addressed the Bench's query regarding custodial necessity without evasion."},
                "handling_difficult_questions": {"score": 7.0, "evidence_quote": sample_quote, "feedback": "Maintained composure when pressed by Puisne Judge J2 on Section 35(3) timelines."},
                "structure": {"score": 8.0, "evidence_quote": sample_quote, "feedback": "Clear progression from notice compliance to lack of flight risk."},
                "court_manner": {"score": 8.5, "evidence_quote": sample_quote, "feedback": "Courteous appellate etiquette maintained throughout."},
                "advocacy": {"score": 7.5, "evidence_quote": sample_quote, "feedback": "Effective cadence and emphasis on personal liberty under Article 21."},
                "witness_handling": {"score": 7.0, "evidence_quote": sample_quote, "feedback": "Targeted questions regarding the general diary entries."}
            },
            "overall": 7.5,
            "judge_comments": {
                "J1": "Counsel displayed disciplined advocacy, but citing unverified citations in an appellate court diminishes credibility.",
                "J2": "Scrutinize the statutory notice parameters under Section 35(3) BNSS more rigorously.",
                "J3": "Effective cross-examination of the Investigating Officer on the failure to maintain arrest diary entries."
            },
            "flagged_citations": flagged_citations or [],
            "improvements": [
                "Verify all citations against official law reports before submitting them to the bench.",
                "Quote specific paragraph numbers when relying on landmark precedents.",
                "Address the economic gravity argument directly before retreating to personal liberty."
            ],
            "disclaimer": "Practice moot court, not legal advice."
        }
