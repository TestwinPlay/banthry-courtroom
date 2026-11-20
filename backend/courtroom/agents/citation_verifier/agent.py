import re
import json
import logging
from typing import List, Dict, Any
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
from courtroom.config import settings
from courtroom.tools.citation_tool import check_local_citation, extract_distinctive_tokens
from courtroom.tools.live_search_tool import live_case_search

logger = logging.getLogger("courtroom.agents.citation_verifier")

INSTRUCTIONS = """You are the Citation Verifier for Banthry Courtroom.
Your job is to identify legal authorities mentioned in courtroom transcripts and verify them.
Check against local judicial index first, then run live search check with Google Search grounding.
"""


def verify_citation_sync(name: str) -> str:
    res = check_local_citation(name)
    if res:
        return f"VERIFIED: {res.get('name')}"
    return "UNKNOWN: Requires live search."


root_agent = Agent(
    name="citation_verifier",
    model=settings.model_analysis,
    instruction=INSTRUCTIONS,
    tools=[FunctionTool(func=verify_citation_sync)]
)


KNOWN_LANDMARKS = [
    ("arnesh kumar", "Arnesh Kumar v. State of Bihar", "(2014) 8 SCC 273", "https://indiankanoon.org/doc/29826274/"),
    ("gurbaksh singh sibbia", "Gurbaksh Singh Sibbia v. State of Punjab", "(1980) 2 SCC 565", "https://indiankanoon.org/doc/1396751/"),
    ("sibbia", "Gurbaksh Singh Sibbia v. State of Punjab", "(1980) 2 SCC 565", "https://indiankanoon.org/doc/1396751/"),
    ("sushila aggarwal", "Sushila Aggarwal v. State (NCT of Delhi)", "(2020) 5 SCC 1", "https://indiankanoon.org/doc/121855263/"),
    ("satender kumar antil", "Satender Kumar Antil v. CBI", "(2022) 10 SCC 51", "https://indiankanoon.org/doc/11559987/"),
    ("antil", "Satender Kumar Antil v. CBI", "(2022) 10 SCC 51", "https://indiankanoon.org/doc/11559987/"),
    ("chidambaram", "P. Chidambaram v. Directorate of Enforcement", "(2019) 9 SCC 24", "https://indiankanoon.org/doc/162810848/"),
    ("mhetre", "Siddharam Satlingappa Mhetre v. State of Maharashtra", "(2011) 1 SCC 694", "https://indiankanoon.org/doc/1841323/"),
    ("balchand", "State of Rajasthan v. Balchand", "(1977) 4 SCC 308", "https://indiankanoon.org/doc/318021/"),
    ("mohanlal jitamalji porwal", "State of Gujarat v. Mohanlal Jitamalji Porwal", "(1987) 2 SCC 364", "https://indiankanoon.org/doc/1749847/")
]


async def extract_and_verify(text: str, claimed_proposition: str = None) -> List[Dict[str, Any]]:
    """
    Extracts citations from text and checks against local index + live search.
    """
    results: List[Dict[str, Any]] = []
    text_lower = text.lower()

    # 1. Check known landmark precedents
    detected_landmarks = set()
    for trigger, official_name, citation, url in KNOWN_LANDMARKS:
        if trigger in text_lower and official_name not in detected_landmarks:
            detected_landmarks.add(official_name)
            results.append({
                "name": official_name,
                "citation": citation,
                "status": "verified",
                "source_url": url,
                "holding_summary": "Landmark Supreme Court precedent on bail jurisprudence.",
                "bench_response_hint": None,
                "note": "Verified from landmark judicial records."
            })

    # 2. Extract potential "X v. Y" patterns or citations
    vs_matches = re.findall(r'([A-Z][a-zA-Z\s\.]+)\s+v[s]?\.?\s+([A-Z][a-zA-Z\s\.]+)', text)
    for p1, p2 in vs_matches:
        cand_name = f"{p1.strip()} v. {p2.strip()}"
        # Avoid duplicate check if already detected landmark
        if any(r["name"].lower() in cand_name.lower() or cand_name.lower() in r["name"].lower() for r in results):
            continue

        # Check local library
        local_match = check_local_citation(cand_name)
        if local_match:
            results.append({
                "name": local_match.get("name", cand_name),
                "citation": local_match.get("citation"),
                "status": "verified",
                "source_url": local_match.get("url"),
                "holding_summary": local_match.get("holding") or local_match.get("summary"),
                "bench_response_hint": None,
                "note": "Found in local judgment repository."
            })
        else:
            # Run Section 1a live search
            live_res = await live_case_search(cand_name, claimed_proposition=claimed_proposition)
            results.append({
                "name": cand_name,
                "citation": live_res.get("citation"),
                "status": live_res.get("status", "not_found"),
                "source_url": live_res.get("source_url"),
                "holding_summary": live_res.get("holding_summary"),
                "bench_response_hint": live_res.get("bench_response_hint"),
                "note": live_res.get("note")
            })

    # 3. Detect standalone planted fake citations (e.g., "(2019) 4 SCC 999", "Keshav v. State 2024")
    reporter_match = re.search(r'\(?\d{4}\)?\s+\d+\s+SCC\s+\d+', text, re.IGNORECASE)
    if reporter_match and not results:
        rep_str = reporter_match.group(0)
        live_res = await live_case_search(rep_str, citation=rep_str, claimed_proposition=claimed_proposition)
        results.append({
            "name": rep_str,
            "citation": rep_str,
            "status": live_res.get("status", "not_found"),
            "source_url": live_res.get("source_url"),
            "holding_summary": live_res.get("holding_summary"),
            "bench_response_hint": live_res.get("bench_response_hint") or f"Counsel, the Bench finds no report at {rep_str}. Do you have the copy?",
            "note": live_res.get("note", "Report reference not found in Supreme Court records.")
        })

    return results
