import json
import asyncio
import logging
from typing import Dict, Any, Optional
from google.genai import types
from courtroom.config import settings

logger = logging.getLogger("courtroom.tools.live_search")


async def live_case_search(name: str, citation: Optional[str] = None, claimed_proposition: Optional[str] = None) -> Dict[str, Any]:
    """
    Section 1a Live Fact-Check of legal authorities using Google Search Grounding.
    Answers four strict tests:
    1. Does the case exist?
    2. Is the citation (reporter, year, volume, page) correct?
    3. Do the facts described match the case?
    4. Does the case hold the claimed proposition and is it still good law?
    """
    query_target = f"{name} {citation or ''}".strip()
    if claimed_proposition:
        query_target += f" proposition: {claimed_proposition}"

    prompt = f"""You are the judicial researcher for an Indian High Court appellate bench.
Perform a strict factual check on this cited legal precedent:
Case Name: "{name}"
Citation: "{citation or 'Not provided'}"
Claimed Proposition: "{claimed_proposition or 'General bail / criminal law authority'}"

You must check against official Indian judicial records (sci.gov.in, High Court portals, indiankanoon.org, indiacode.nic.in).
Answer these 4 criteria:
(a) Does this case actually exist in Indian law?
(b) Is the citation reporter, year, volume, page accurate?
(c) Do the facts match this legal subject matter?
(d) Does the decision support the claimed proposition and remain good law (not overruled)?

Return STRICT JSON with this schema:
{{
  "status": "verified" | "exists_but_misquoted" | "exists_but_wrong_proposition" | "overruled_or_doubted" | "not_found",
  "citation": "Official citation if found, or null",
  "source_url": "Direct authoritative URL (e.g. indiankanoon or sci.gov.in) if verified, else null",
  "holding_summary": "1-2 sentence summary of actual ratio decidendi",
  "bench_response_hint": "Terse judge question challenging or acknowledging counsel (under 2 sentences)",
  "note": "Explanation of verification findings"
}}

RULES:
- If this is a fabricated, fictional, or hallucinated case (e.g. 'Keshav v. State 2024', 'Ramesh v. State (2019) 4 SCC 999'), status MUST be 'not_found'.
- Never return 'verified' without a confirmed Indian legal record source URL.
- If the case exists but the citation numbers are wrong, status MUST be 'exists_but_misquoted'.
- If the case is a civil or tax judgment cited for bail, status MUST be 'exists_but_wrong_proposition'.
- Return ONLY the JSON object.
"""

    try:
        client = settings.get_text_client()
        # Enable Google Search grounding tool
        config = types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.0
        )
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.model_analysis,
                contents=prompt,
                config=config
            ),
            timeout=8.0
        )

        text = response.text or ""
        clean_text = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_text)

        # Grounding metadata fallback
        if not result.get("source_url") and response.candidates and response.candidates[0].grounding_metadata:
            meta = response.candidates[0].grounding_metadata
            if meta.grounding_chunks:
                for chunk in meta.grounding_chunks:
                    if chunk.web and chunk.web.uri:
                        result["source_url"] = chunk.web.uri
                        break

        return result
    except Exception as e:
        logger.warning(f"Live search failed for '{name}': {e}")
        # Default fallback if search fails or unconfirmed
        return {
            "status": "not_found",
            "citation": citation,
            "source_url": None,
            "holding_summary": None,
            "bench_response_hint": f"Counsel, the Bench finds no report for '{name}'. Can you produce the certified copy?",
            "note": f"Unverified citation ({e})"
        }
