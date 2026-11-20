---
name: memorial-drafting
description: Automated drafting, review, and compliance verification of moot court memorials (cover, jurisdiction, issues, summary, arguments advanced, prayer) under Indian High Court appellate rules.
---

# Memorial Drafting Skill

## Purpose & When to Use
Used by the `memorial_coach` agent to either generate structured moot court memorials or review a student's drafted memorial before oral rounds. It validates format structure, tests neutrality of facts, checks citation validity, verifies the jurisdiction invocation, and turns analytical flaws into the bench's first oral questions.

## Inputs
- `moot_problem`: Proposition facts, parties, forum, statutes, and issues.
- `student_memorial_text`: Raw text or JSON sections (cover, jurisdiction, statement of facts, issues raised, summary of arguments, arguments advanced, prayer).
- `side`: "Applicant / Petitioner" or "Respondent / State".

## Outputs (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "sections": {
      "type": "object",
      "properties": {
        "cover_page": { "type": "string" },
        "table_of_contents": { "type": "array", "items": { "type": "string" } },
        "index_of_authorities": { "type": "array", "items": { "type": "string" } },
        "statement_of_jurisdiction": { "type": "string" },
        "statement_of_facts": { "type": "string" },
        "statement_of_issues": { "type": "array", "items": { "type": "string" } },
        "summary_of_arguments": { "type": "string" },
        "arguments_advanced": { "type": "array", "items": { "type": "object", "properties": { "issue_title": { "type": "string" }, "content": { "type": "string" } } } },
        "prayer": { "type": "string" }
      }
    },
    "compliance_checks": {
      "type": "object",
      "properties": {
        "jurisdiction_valid": { "type": "boolean" },
        "facts_neutral": { "type": "boolean" },
        "authorities_verified_count": { "type": "integer" },
        "unverified_authorities": { "type": "array", "items": { "type": "string" } },
        "prayer_relief_correct": { "type": "boolean" }
      },
      "required": ["jurisdiction_valid", "facts_neutral", "authorities_verified_count", "prayer_relief_correct"]
    },
    "bench_first_questions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "score": { "type": "number", "minimum": 0, "maximum": 100 }
  },
  "required": ["compliance_checks", "bench_first_questions"]
}
```

## Rules
1. **Jurisdiction Verification:** Ensure petition invokes the exact provision (e.g. Section 482 BNSS before the High Court, or Article 32 / 136 of the Constitution of India).
2. **Neutral Statement of Facts:** The statement of facts must be objective and devoid of argumentative adjectives.
3. **Correct Prayer Relief:** The prayer must ask strictly for the relief available under the invoked section (e.g., directing release on bail in the event of arrest under Section 482 BNSS, not quashing charges unless Section 528 BNSS was joined).
4. **Feeds the Bench:** Structural loopholes discovered in the memorial must be synthesized into crisp questions for J1 or J2 to lead off the oral round.

## Worked Example
```json
{
  "compliance_checks": {
    "jurisdiction_valid": true,
    "facts_neutral": false,
    "authorities_verified_count": 4,
    "unverified_authorities": ["Ramesh v. State, (2019) 4 SCC 999"],
    "prayer_relief_correct": true
  },
  "bench_first_questions": [
    "Counsel, in Paragraph 4 of your Statement of Facts you claim the police 'fabricated' the audit trail. Where in the proposition record does the word 'fabricated' appear?",
    "Counsel, on page 8 you rely on Ramesh v. State, (2019) 4 SCC 999. Can you hand up a copy of this decision to the Bench?"
  ],
  "score": 78
}
```
