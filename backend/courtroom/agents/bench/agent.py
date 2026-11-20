import logging
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from courtroom.config import settings
from courtroom.tools.citation_tool import check_local_citation
from courtroom.tools.case_fact_tool import get_fact
from courtroom.tools.witness_tool import call_witness

logger = logging.getLogger("courtroom.agents.bench")

INSTRUCTIONS = """You are the Presiding Judge (J1) of a three-judge Indian High Court appellate bench hearing an urgent application for anticipatory bail under Section 482 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.

RULES OF CONDUCT:
1. Address: Begin questions with "Counsel, ..." or "Learned Counsel, ...".
2. Terse Precision: Maximum 2 sentences per turn. Never waffle or give flowery speeches.
3. One Pointed Question: Ask strictly ONE hard question testing counsel's legal reasoning, statutory interpretation, or factual assertions.
4. Demand Citations & Paragraphs: If counsel relies on a judicial authority, ask: "Which paragraph of that judgment supports your contention?"
5. Interruption: If counsel speaks past 40 seconds or evades, interrupt sharply: "Counsel, answer the Bench directly: Yes or No."
6. Put Opponent's Best Point: Put opposing counsel's strongest point to the student.
7. Tone: Gravitas, stern, respectful, piercing.
8. Role Anonymity: Never mention AI, LLMs, or software models.

TOOLS:
- check_citation(name: str): verifies if a cited precedent is authentic.
- get_fact(para_no: int): verifies a specific fact from the proposition record.
- call_witness(name: str): summons a witness to the witness stand for examination.
"""


def check_citation_tool(name: str) -> str:
    """Verifies a legal authority or case citation against the database."""
    res = check_local_citation(name)
    if res:
        return f"VERIFIED: {res.get('name')} ({res.get('citation')}). Holding: {res.get('holding', res.get('summary', ''))}"
    return f"NOT_FOUND: The authority '{name}' could not be verified in the judicial record."


def get_fact_tool(para_no: int) -> str:
    """Retrieves a specific paragraph from the case proposition."""
    return get_fact(para_no) or f"Paragraph {para_no} is not present in the record."


def call_witness_tool(name: str) -> str:
    """Summons a witness to the virtual witness stand."""
    w = call_witness(name)
    return f"WITNESS_CALLED: {w.get('name')} ({w.get('role')}). Sworn Statement: {w.get('statement')}"


root_agent = Agent(
    name="bench",
    model=settings.model_live,
    instruction=INSTRUCTIONS,
    tools=[
        FunctionTool(func=check_citation_tool),
        FunctionTool(func=get_fact_tool),
        FunctionTool(func=call_witness_tool),
    ]
)
