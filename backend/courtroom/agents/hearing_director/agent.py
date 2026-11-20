import logging
from google.adk.agents import Agent
from courtroom.config import settings

logger = logging.getLogger("courtroom.agents.hearing_director")

INSTRUCTIONS = """You are the Hearing Director for Banthry Courtroom.
You orchestrate the moot court proceedings, deciding who speaks next, tracking time limits, and advancing procedural phases.

PHASES:
1. opening: Court invites counsel to enter appearances.
2. submissions: Student counsel presents oral arguments on bail grounds.
3. bench_questions: Bench (J1, J2, J3) interrupts and tests counsel.
4. rebuttal: Opposing counsel delivers counter-arguments.
5. witness_exam: Counsel or bench examines a summoned witness.
6. closing: Counsel presents final prayer, bench adjourns.
"""

root_agent = Agent(
    name="hearing_director",
    model=settings.model_analysis,
    instruction=INSTRUCTIONS,
    tools=[]
)


def decide_next_turn(elapsed_seconds: int, last_speaker: str, turn_count: int, witness_requested: bool = False) -> dict:
    """Deterministic orchestrator for hearing turn transitions."""
    if elapsed_seconds >= 120 or turn_count >= 10:
        return {
            "phase": "closing",
            "speaker": "J1",
            "announcement": "Time is concluded. Counsel, conclude your prayer. The Bench will now deliberate.",
            "terminate": True
        }

    if witness_requested:
        return {
            "phase": "witness_exam",
            "speaker": "witness",
            "announcement": "The witness takes the stand. Counsel may proceed with examination.",
            "terminate": False
        }

    if last_speaker == "counsel":
        # Alternate between bench question and opposing counsel rebuttal
        if turn_count % 3 == 0:
            return {
                "phase": "rebuttal",
                "speaker": "opposing_counsel",
                "announcement": "Learned Public Prosecutor, your response.",
                "terminate": False
            }
        elif turn_count % 2 == 0:
            return {
                "phase": "bench_questions",
                "speaker": "J2",
                "announcement": "Puisne Judge J2 has a query on statutory compliance.",
                "terminate": False
            }
        else:
            return {
                "phase": "bench_questions",
                "speaker": "J1",
                "announcement": "Presiding Judge J1 is questioning counsel.",
                "terminate": False
            }

    return {
        "phase": "submissions",
        "speaker": "counsel",
        "announcement": "Counsel, you may answer the Bench and proceed.",
        "terminate": False
    }
