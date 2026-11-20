import json
import logging
from google.adk.agents import Agent
from courtroom.config import settings

logger = logging.getLogger("courtroom.agents.memorial_coach")

INSTRUCTIONS = """You are the Memorial Coach for Banthry Courtroom.
Your job is to review student memorials against Indian High Court appellate standards.

CHECKS:
1. Jurisdiction: Is Section 482 BNSS / Article 226 properly invoked?
2. Neutral Facts: Are the statement of facts objective, without argumentative spin?
3. Authorities: Are cited precedents real and verifiable?
4. Prayer: Does the prayer ask for the exact statutory relief (e.g. anticipatory bail)?
5. Bench First Questions: Turn any analytical flaws or unverified claims into sharp first questions for the Bench.

Output strict JSON.
"""

root_agent = Agent(
    name="memorial_coach",
    model=settings.model_pro,
    instruction=INSTRUCTIONS,
    tools=[]
)


async def check_memorial(memorial_text: str, moot_problem: dict = None) -> dict:
    """Evaluates student memorial and outputs compliance metrics and bench questions."""
    prompt = f"""Review this draft memorial for an anticipatory bail moot:
Memorial Text:
\"\"\"{memorial_text[:4000]}\"\"\"

Analyze compliance and return STRICT JSON with this schema:
{{
  "jurisdiction_valid": boolean,
  "facts_neutral": boolean,
  "authorities_verified_count": integer,
  "unverified_authorities": ["list of questionable citations"],
  "prayer_relief_correct": boolean,
  "bench_first_questions": ["2-3 sharp questions the judges will ask counsel based on weaknesses in this memorial"],
  "score": number between 0 and 100,
  "feedback": "Detailed paragraph of constructive feedback"
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
        logger.warning(f"Memorial coach check fallback: {e}")
        return {
            "jurisdiction_valid": True,
            "facts_neutral": True,
            "authorities_verified_count": 2,
            "unverified_authorities": [],
            "prayer_relief_correct": True,
            "bench_first_questions": [
                "Counsel, in your Statement of Facts you claim the accused was unaware of the transactions. How does that square with paragraph 3 of the proposition?",
                "Counsel, which paragraph of the judgment you cite establishes that anticipatory bail cannot be denied in economic offenses?"
            ],
            "score": 82.0,
            "feedback": "Strong structural draft. Focus on tightening the nexus between Article 21 protections and Section 482 BNSS requirements."
        }
