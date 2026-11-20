---
name: citation-checking
description: Two-tier citation extraction and live legal fact-checking pipeline using AlloyDB/local judgment library and Google Search grounding to verify existence, citation accuracy, facts, and ratio decidendi.
---

# Citation Checking Skill

## Purpose & When to Use
Used by the `citation_verifier` agent to extract every legal authority from student, judge, opposing counsel, and witness speech turns in real time. It performs rigorous multi-stage verification against the local/AlloyDB judgment index, falling back immediately to `live_case_search` with Google Search grounding across authorized judicial portals (`sci.gov.in`, High Court sites, `indiankanoon.org`, `indiacode.nic.in`).

## Inputs
- `text`: Transcript turn text from student counsel, opposing counsel, judge, or witness.
- `claimed_proposition`: Legal proposition asserted in context (optional, inferred from sentence).
- `speaker_role`: "counsel", "opposing_counsel", "bench", or "witness".

## Outputs (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "citation": { "type": "string" },
      "status": {
        "type": "string",
        "enum": ["verified", "exists_but_misquoted", "exists_but_wrong_proposition", "overruled_or_doubted", "not_found", "unconfirmed"]
      },
      "source_url": { "type": "string" },
      "holding_summary": { "type": "string" },
      "bench_response_hint": { "type": "string" },
      "note": { "type": "string" }
    },
    "required": ["name", "status"]
  }
}
```

## Multi-Tier Verification Pipeline
1. **Extraction:**
   - Scan for case patterns: `"X v. Y"`, `"(Year) Vol Reporter Page"`, landmark mononyms (*Sibbia*, *Antil*, *Arnesh Kumar*, *Mhetre*, *Chidambaram*).
   - Filter out generic legal terms (`State`, `Union`, `Police`, `Court`, `Bench`) that are not distinct party names.
2. **Tier 1 - AlloyDB / Local Index Search:**
   - Exact and fuzzy match on `data/judgments.json` or AlloyDB `judgments` table.
   - If matched with verified record, return `status: "verified"` with stored URL immediately (< 100ms).
3. **Tier 2 - Live Search Fact-Check (`live_case_search`):**
   - If not found in index, immediately run live search via Google Search grounding targeting trusted legal domains (`sci.gov.in`, `indiankanoon.org`).
   - Answer 4 strict tests:
     1. *Does the case exist?* If no, status is `not_found`.
     2. *Is the citation accurate?* If year/volume/reporter differs, status is `exists_but_misquoted`.
     3. *Do facts match?* Ensure the dispute subject matter aligns.
     4. *Does the holding support the claimed proposition?* If contrary, status is `exists_but_wrong_proposition`. If overruled by a larger bench, status is `overruled_or_doubted`.
   - Never mark `verified` without a direct source link confirming the holding. Ambiguous results return `unconfirmed`.
4. **Bench Challenge Integration:**
   - Produce a `bench_response_hint` so the presiding judge can challenge counsel live out loud:
     - `"Counsel, we find no report at (2019) 4 SCC 999. Do you have the physical copy?"`
     - `"Counsel, that decision concerned quashing of a civil suit, not anticipatory bail."`

## Worked Example
```json
[
  {
    "name": "Ramesh v. State",
    "citation": "(2019) 4 SCC 999",
    "status": "not_found",
    "source_url": null,
    "holding_summary": null,
    "bench_response_hint": "Counsel, the Bench finds no Supreme Court report at (2019) 4 SCC 999. Do you have a copy of this authority?",
    "note": "Planted fictional citation; no such report exists in Supreme Court records."
  },
  {
    "name": "Arnesh Kumar v. State of Bihar",
    "citation": "(2014) 8 SCC 273",
    "status": "verified",
    "source_url": "https://indiankanoon.org/doc/29826274/",
    "holding_summary": "Mandated strict compliance with Section 41 CrPC (now Section 35 BNSS) before arresting accused in offenses punishable with imprisonment up to 7 years.",
    "bench_response_hint": null,
    "note": "Verified landmark authority."
  }
]
```
