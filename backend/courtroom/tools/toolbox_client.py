import json
import logging
from typing import List, Dict, Any, Optional
from courtroom.config import settings
from courtroom.tools.citation_tool import check_local_citation, load_judgments_data

logger = logging.getLogger("courtroom.tools.toolbox")


def find_judgment_by_citation(citation: str) -> Optional[Dict[str, Any]]:
    """Finds a judgment by its formal reporter citation (e.g. '(2014) 8 SCC 273')."""
    judgments = load_judgments_data()
    for item in judgments:
        if citation.lower() in item.get("citation", "").lower():
            return item
    return None


def find_judgment_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Finds a judgment by its title or mononym (e.g. 'Arnesh Kumar', 'Sibbia')."""
    return check_local_citation(name)


def similar_paragraphs(text: str, k: int = 3) -> List[Dict[str, Any]]:
    """
    Finds semantically similar paragraphs across judgments.
    In local json mode, performs keyword match across summaries and holdings.
    """
    judgments = load_judgments_data()
    results = []
    text_lower = text.lower()
    for j in judgments:
        ratio = j.get("holding", "") or j.get("summary", "")
        if any(w in ratio.lower() for w in text_lower.split() if len(w) > 3):
            results.append({
                "judgment_id": j.get("name"),
                "para_no": 1,
                "text": ratio,
                "citation": j.get("citation")
            })
            if len(results) >= k:
                break
    return results


def get_paragraph(judgment_id: str, para_no: int) -> Optional[str]:
    """Retrieves a specific paragraph from a judgment."""
    judgments = load_judgments_data()
    for j in judgments:
        if judgment_id.lower() in j.get("name", "").lower():
            return j.get("holding") or j.get("summary")
    return None
