import logging
from typing import Optional, List
from backend.app.schemas.session import MootCase, MootRole
from backend.app.config import settings
from backend.app.agents.prompts import (
    build_judge_system_instruction,
    build_opposing_counsel_instruction
)
from backend.app.agents.citation_tool import (
    verify_indian_citation,
    raise_formal_objection
)

logger = logging.getLogger(__name__)

# Try importing ADK Agent
try:
    from google.adk.agents import Agent
except ImportError:
    logger.warning("google-adk not yet installed in local interpreter; using wrapper class.")
    class Agent:
        def __init__(self, name: str, instruction: str, model: str, tools: Optional[List] = None, description: str = ""):
            self.name = name
            self.instruction = instruction
            self.model = model
            self.tools = tools or []
            self.description = description


def create_presiding_judge_agent(
    case: MootCase,
    user_role: MootRole,
    student_name: str,
    difficulty: str = "standard"
) -> Agent:
    """Creates a Google ADK Agent representing the Hon'ble Presiding Judge of the Bench."""
    instruction = build_judge_system_instruction(
        case=case,
        user_role=user_role,
        student_name=student_name,
        difficulty=difficulty
    )
    return Agent(
        name="presiding_judge_bench",
        description="Presiding Justice of the Supreme Court / High Court Bench with interactive judicial queries and objection rulings.",
        instruction=instruction,
        model=settings.gemini_live_model,
        tools=[verify_indian_citation, raise_formal_objection]
    )


def create_opposing_counsel_agent(
    case: MootCase,
    user_role: MootRole,
    student_name: str
) -> Agent:
    """Creates a Google ADK Agent representing the opposing Senior Advocate."""
    instruction = build_opposing_counsel_instruction(
        case=case,
        user_role=user_role,
        student_name=student_name
    )
    return Agent(
        name="opposing_senior_counsel",
        description="Opposing Senior Advocate raising procedural objections and delivering rebuttals under Indian law.",
        instruction=instruction,
        model=settings.gemini_live_model,
        tools=[verify_indian_citation, raise_formal_objection]
    )
