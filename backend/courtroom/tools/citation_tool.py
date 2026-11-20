import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from courtroom.config import settings

# Generic legal tokens to exclude from single-word or fuzzy matching
GENERIC_LEGAL_TOKENS = {
    "state", "union", "india", "v.", "vs", "versus", "and", "anr", "ors",
    "others", "another", "the", "of", "in", "re", "govt", "government",
    "police", "superintendent", "inspector", "station", "station house officer"
}


def load_judgments_data() -> List[Dict[str, Any]]:
    path = settings.judgments_path
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading judgments library: {e}")
        return []


def normalize(s: str) -> str:
    return re.sub(r'[^a-z0-9 ]', '', s.lower()).strip()


def extract_distinctive_tokens(name: str) -> set:
    norm = normalize(name)
    tokens = set(norm.split())
    return {t for t in tokens if len(t) > 2 and t not in GENERIC_LEGAL_TOKENS}


def check_local_citation(name_or_query: str) -> Optional[Dict[str, Any]]:
    """
    Checks if a case citation exists in the local database or seed judgments.
    Requires distinctive non-generic token match across parties.
    """
    judgments = load_judgments_data()
    q_norm = normalize(name_or_query)
    q_tokens = extract_distinctive_tokens(name_or_query)

    if not q_tokens:
        return None

    for item in judgments:
        j_name = item.get("name", "")
        j_norm = normalize(j_name)
        j_tokens = extract_distinctive_tokens(j_name)

        # Exact substring match
        if q_norm and (q_norm in j_norm or j_norm in q_norm):
            return item

        # Match on distinctive tokens (e.g. 'arnesh', 'sibbia', 'antil', 'mhetre', 'chidambaram')
        common = q_tokens.intersection(j_tokens)
        if common:
            # Check if party structure matches 'X v. Y'
            if " v " in q_norm or " vs " in q_norm:
                q_parts = re.split(r'\s+v[s]?\s+', q_norm)
                j_parts = re.split(r'\s+v[s]?\s+', j_norm)
                if len(q_parts) == 2 and len(j_parts) == 2:
                    p1_match = any(t in j_parts[0] for t in extract_distinctive_tokens(q_parts[0]))
                    p2_match = any(t in j_parts[1] for t in extract_distinctive_tokens(q_parts[1]))
                    if p1_match and (p2_match or "state" in q_parts[1] and "state" in j_parts[1]):
                        return item
            else:
                return item

    return None
