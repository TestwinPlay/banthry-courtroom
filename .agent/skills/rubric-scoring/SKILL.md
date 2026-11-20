---
name: rubric-scoring
description: Quantitative 0-10 multi-criteria evaluation with student quote evidence, per-judge comments, improvement roadmap, and flagged citation auditing for moot court hearings.
---

# Rubric Scoring Skill

## Purpose & When to Use
Used by the `evaluator` agent after a hearing adjourns. It analyzes the full hearing transcript and produces a structured scorecard containing quantitative scores (0-10), exact quotes from the student as evidence, individual comments from each of the three judges, a list of any flagged/unverified citations, and three high-impact practice drills.

## Inputs
- `transcript`: Array of turn objects `{speaker, text, timestamp}`.
- `case_context`: Fictional moot problem details, statutory issues, and key facts.
- `flagged_citations`: Citations flagged as unverified, misquoted, or not found during the hearing.

## Outputs (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "scores": {
      "type": "object",
      "properties": {
        "legal_reasoning": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "use_of_authority": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "responsiveness": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "handling_difficult_questions": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "structure": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "court_manner": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "advocacy": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        },
        "witness_handling": {
          "type": "object",
          "properties": { "score": { "type": "number", "minimum": 0, "maximum": 10 }, "evidence_quote": { "type": "string" }, "feedback": { "type": "string" } },
          "required": ["score", "evidence_quote", "feedback"]
        }
      },
      "required": ["legal_reasoning", "use_of_authority", "responsiveness", "handling_difficult_questions", "structure", "court_manner", "advocacy"]
    },
    "overall": { "type": "number", "minimum": 0, "maximum": 10 },
    "judge_comments": {
      "type": "object",
      "properties": {
        "J1": { "type": "string" },
        "J2": { "type": "string" },
        "J3": { "type": "string" }
      },
      "required": ["J1", "J2", "J3"]
    },
    "flagged_citations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "citation": { "type": "string" },
          "status": { "type": "string" },
          "reason": { "type": "string" }
        },
        "required": ["name", "status", "reason"]
      }
    },
    "improvements": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 3,
      "maxItems": 3
    },
    "disclaimer": { "type": "string", "enum": ["Practice moot court, not legal advice."] }
  },
  "required": ["scores", "overall", "judge_comments", "flagged_citations", "improvements", "disclaimer"]
}
```

## Rules
1. **Mandatory Student Quotes as Evidence:** For each evaluation criterion, provide a direct quote from the student's spoken/typed words demonstrating where the score was earned or lost.
2. **Citation Accountability:** Every unverified citation flagged during the hearing reduces `use_of_authority` and is listed in `flagged_citations`.
3. **Actionable Improvement Points:** Output exactly three high-impact, concrete action items for the advocate's next round.
4. **Distinct Judicial Voices:**
   - J1 evaluates broad constitutional framing and discretion.
   - J2 evaluates statutory precision and procedural adherence.
   - J3 evaluates forensic evidence scrutiny and factual grounding.

## Worked Example
```json
{
  "scores": {
    "legal_reasoning": { "score": 8.0, "evidence_quote": "Arrest cannot be a routine tool of intimidation when documents are already seized.", "feedback": "Well-articulated argument linking liberty under Article 21 with Section 482 BNSS." },
    "use_of_authority": { "score": 6.5, "evidence_quote": "We rely on Arnesh Kumar v. State of Bihar and Ramesh v. State (2019).", "feedback": "Arnesh Kumar was appropriately invoked, but Ramesh v. State was an unverified citation." },
    "responsiveness": { "score": 7.5, "evidence_quote": "My Lords, the IO has all bank records; custodial interrogation is redundant.", "feedback": "Directly answered J1's challenge regarding the scope of recovery." },
    "handling_difficult_questions": { "score": 7.0, "evidence_quote": "Yes, notice under 35(3) was served, but applicant complied within 24 hours.", "feedback": "Kept composure under hostile bench inquiry." },
    "structure": { "score": 8.0, "evidence_quote": "I have three submissions: maintainability, absence of flight risk, and willingness to join probe.", "feedback": "Clear roadmap presented at opening." },
    "court_manner": { "score": 8.5, "evidence_quote": "May it please your Lordships...", "feedback": "Respectful appellate etiquette and tone." },
    "advocacy": { "score": 7.5, "evidence_quote": "Liberty once lost cannot be restored by eventual acquittal.", "feedback": "Persuasive rhetorical impact." },
    "witness_handling": { "score": 7.0, "evidence_quote": "Officer, did you enter reasons in the general diary prior to interrogation?", "feedback": "Pinned down IO on lack of Section 35(1) entry." }
  },
  "overall": 7.5,
  "judge_comments": {
    "J1": "Counsel, your opening was disciplined, but citing unverified case citations damages credibility in an appellate court.",
    "J2": "Pay greater attention to Section 35(3) BNSS procedural timelines before alleging police misconduct.",
    "J3": "Good cross-examination of the Investigating Officer on the failure to maintain arrest diary entries."
  },
  "flagged_citations": [
    { "name": "Ramesh v. State", "citation": "(2019) 4 SCC 999", "status": "not_found", "reason": "No Supreme Court report exists under this citation." }
  ],
  "improvements": [
    "Verify all citations against official law reports before submitting them to the bench.",
    "Quote the specific paragraph numbers when relying on landmark Constitution Bench rulings.",
    "Address opposing counsel's argument on economic gravity more directly before moving to personal liberty."
  ],
  "disclaimer": "Practice moot court, not legal advice."
}
```
