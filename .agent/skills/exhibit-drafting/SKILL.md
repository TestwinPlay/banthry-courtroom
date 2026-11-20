---
name: exhibit-drafting
description: Generates realistic Indian judicial exhibits (FIR, seizure memo, contract page, medical report) stamped with "FICTIONAL EXHIBIT" watermarks.
---

# Exhibit Drafting Skill

## Purpose & When to Use
Used by the `exhibit_maker` agent to draft visual prompts or generate documentary and photographic exhibits corresponding to a fictional moot problem. It ensures every exhibit is authentically styled (Indian police/court document conventions) while prominently and indelibly bearing the watermark "FICTIONAL EXHIBIT".

## Inputs
- `case_title`: Name of the fictional case.
- `exhibit_id`: Identifier (e.g. "EX-01", "Annexure P-1").
- `exhibit_type`: FIR, seizure memo, contract excerpt, forensic report, scene photo.
- `key_details`: Dates, parties, police station, forensic findings.

## Outputs (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "exhibit_id": { "type": "string" },
    "title": { "type": "string" },
    "watermark_text": { "type": "string", "enum": ["FICTIONAL EXHIBIT"] },
    "document_header": { "type": "string" },
    "document_body": { "type": "string" },
    "image_generation_prompt": { "type": "string" },
    "image_url_or_data": { "type": "string" }
  },
  "required": ["exhibit_id", "title", "watermark_text", "image_generation_prompt"]
}
```

## Rules
1. **Prominent Watermark:** Every visual artifact must feature a diagonal semi-transparent red watermark reading `FICTIONAL EXHIBIT` across the center, as well as a footer watermark.
2. **Indian Legal Realism:** Incorporate authentic jurisdictional headers (e.g., "Government of NCT of Delhi / Delhi Police First Information Report Form", "State Forensic Science Laboratory, Forensic Audit Report").
3. **Fictional Data Only:** Never use real telephone numbers, real Aadhaar/PAN numbers, real bank account numbers, or real active FIR numbers.

## Worked Example
```json
{
  "exhibit_id": "EX-01",
  "title": "First Information Report No. 0412/2025",
  "watermark_text": "FICTIONAL EXHIBIT",
  "document_header": "FORM NO. II - FIRST INFORMATION REPORT (Under Section 173 BNSS, 2023)",
  "document_body": "Police Station: Shivajinagar, District: Pune City. Date & Time of FIR: 14/08/2025 at 16:30 hrs. Acts & Sections: Section 316(2), 318(4) Bharatiya Nyaya Sanhita, 2023. Complainant: State Agricultural Development Board through Director. Brief: Accused diversion of government subsidy funds into private capital equipment vendor.",
  "image_generation_prompt": "An aged, typewriter-styled official Indian police First Information Report on aged stamp paper, ink stamps in purple reading 'Police Station Shivajinagar Pune', prominent red bold watermark diagonally across saying 'FICTIONAL EXHIBIT', high resolution legal document.",
  "image_url_or_data": "/api/exhibit?id=EX-01"
}
```
