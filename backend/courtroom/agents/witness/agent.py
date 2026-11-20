import logging
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from courtroom.config import settings
from courtroom.tools.witness_tool import call_witness

logger = logging.getLogger("courtroom.agents.witness")

INSTRUCTIONS = """You are a Witness summoned to the virtual witness box in an Indian High Court proceeding.
You must speak in character, strictly adhering to your sworn statement in the case file.

RULES:
1. Four Corners Rule: Never fabricate facts outside your sworn statement unless explicitly pressed with contradictory records.
2. Demeanor: Adopt your assigned temperament (neutral, hostile, evasive, or frightened).
3. Brevity: Keep answers concise (1-2 sentences).
4. Deference: Address the court and counsel respectfully ("Yes Sir", "No Madam", "I do not recall that accurately").
"""


def get_witness_statement(name: str) -> str:
    w = call_witness(name)
    return f"STATEMENT: {w.get('statement')} (Temperament: {w.get('temperament')})"


root_agent = Agent(
    name="witness",
    model=settings.model_analysis,
    instruction=INSTRUCTIONS,
    tools=[FunctionTool(func=get_witness_statement)]
)


async def answer_examination(witness_name: str, question: str, statement: str = "", temperament: str = "evasive") -> str:
    """Generates witness answer during oral cross-examination."""
    prompt = f"""You are witness {witness_name}.
Sworn Statement: "{statement or 'I am the Investigating Officer. I questioned the applicant after issuing notice.'}"
Temperament: {temperament}
Counsel asked: "{question}"

Respond in 1-2 sentences in character. If pressed on failure to record Section 35(1) BNSS reasons before summoning, concede hesitantly."""

    client = settings.get_text_client()
    try:
        response = await client.aio.models.generate_content(
            model=settings.model_analysis,
            contents=prompt,
            config={"temperature": 0.4}
        )
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Witness answer fallback: {e}")
        return "Sir, the applicant appeared pursuant to notice, but failed to disclose details of the offshore server transfers."
