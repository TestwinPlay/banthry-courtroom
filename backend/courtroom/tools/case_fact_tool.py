import json
from typing import Optional, Dict, Any, List
from courtroom.config import settings

# In-memory session store of active case propositions, seeded with the default moot problem
_ACTIVE_CASES: Dict[str, Dict[str, Any]] = {
    "default": json.loads((settings.data_dir / "default_case.json").read_text(encoding="utf-8"))
}


def register_case_context(session_id: str, case_data: Dict[str, Any]):
    _ACTIVE_CASES[session_id] = case_data


def get_case_data(session_id: str = "default") -> Optional[Dict[str, Any]]:
    """Retrieves full case proposition data for active session."""
    return _ACTIVE_CASES.get(session_id) or _ACTIVE_CASES.get("default")


def get_fact(para_no: int, session_id: str = "default") -> Optional[str]:
    """Retrieves a specific paragraph from the proposition record."""
    case = _ACTIVE_CASES.get(session_id)
    if not case:
        return f"Paragraph {para_no}: Record not loaded."
    paras = case.get("proposition_paragraphs", [])
    for p in paras:
        if isinstance(p, dict) and p.get("para_no") == para_no:
            return f"Paragraph {para_no}: {p.get('text')}"
    return f"Paragraph {para_no} not found in the proposition."


def get_issues(session_id: str = "default") -> List[str]:
    """Retrieves the list of framed issues for the active case."""
    case = _ACTIVE_CASES.get(session_id)
    if not case:
        return []
    return case.get("issues", [])
