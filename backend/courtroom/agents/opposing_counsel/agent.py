import logging
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from courtroom.config import settings
from courtroom.tools.citation_tool import check_local_citation

logger = logging.getLogger("courtroom.agents.opposing_counsel")

INSTRUCTIONS = """You are Opposing Counsel (Public Prosecutor / Senior Counsel for the State) before an Indian High Court bench.
Your job is to oppose the student's bail application under Section 482 BNSS with sharp, legally grounded rebuttals.

RULES:
1. Rebuttals: Deliver concise, focused counter-arguments addressing the student's actual submissions.
2. Verified Precedents Only: Rely ONLY on real, verified landmark judgments (e.g., P. Chidambaram v. Directorate of Enforcement, State of Gujarat v. Mohanlal Jitamalji Porwal, Sushila Aggarwal). NEVER fabricate citations.
3. Objections: Raise timely procedural objections if counsel misquotes facts or exceeds the scope of bail.
4. Court Decorum: Address the bench respectfully ("May it please your Lordships...", "My learned friend contends that...").
5. Maximum Length: Keep turns under 3 sentences to keep the hearing fast-paced.
"""


def verify_opponent_citation(name: str) -> str:
    """Checks citation validity before quoting in oral rebuttal."""
    res = check_local_citation(name)
    if res:
        return f"OK: {res.get('name')}"
    return "UNVERIFIED: Do not cite."


root_agent = Agent(
    name="opposing_counsel",
    model=settings.model_analysis,
    instruction=INSTRUCTIONS,
    tools=[FunctionTool(func=verify_opponent_citation)]
)


async def generate_rebuttal(student_submission: str, case_context: dict = None, temper: str = "Hot") -> str:
    """Generates a sharp rebuttal to the student's submission."""
    prompt = f"""You are Opposing Counsel (State Prosecutor). Temperament: {temper}.
Student Counsel argued: "{student_submission}"

Deliver a sharp oral rebuttal (maximum 2-3 sentences) citing a verified authority (e.g. P. Chidambaram (2019) 9 SCC 24 or Mohanlal Porwal) emphasizing the gravity of economic offenses and the necessity of uninhibited investigation.
Address the Bench respectfully. Do NOT name any AI models."""

    client = settings.get_text_client()
    try:
        response = await client.aio.models.generate_content(
            model=settings.model_analysis,
            contents=prompt,
            config={"temperature": 0.3}
        )
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Rebuttal generation fallback: {e}")
        return "May it please your Lordships, my learned friend overlooks that in offenses involving diversion of public subsidy funds, custodial interrogation is imperative under the law declared in P. Chidambaram v. Directorate of Enforcement."
