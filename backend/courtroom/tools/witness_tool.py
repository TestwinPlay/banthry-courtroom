from typing import Optional, Dict, Any
from courtroom.tools.case_fact_tool import _ACTIVE_CASES


def call_witness(name: str, session_id: str = "default") -> Dict[str, Any]:
    """
    Summons a witness to the virtual witness stand.
    Returns their profile, role, and sworn statement.
    """
    case = _ACTIVE_CASES.get(session_id)
    if not case:
        return {
            "name": name,
            "role": "Witness",
            "statement": "No witness statement available on record.",
            "temperament": "neutral"
        }

    witnesses = case.get("witnesses", [])
    for w in witnesses:
        if isinstance(w, dict) and name.lower() in w.get("name", "").lower():
            return w

    # Return default generic profile if name is not specifically indexed
    return {
        "name": name,
        "role": "Witness called by counsel",
        "statement": f"Witness {name} stands before the court for examination.",
        "temperament": "neutral"
    }
