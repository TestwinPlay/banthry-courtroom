---
name: hearing-direction
description: Master orchestration protocols for directing the moot court hearing phases, managing turns between bench, counsel, and witnesses, tracking the clock, and introducing procedural twists.
---

# Hearing Direction Skill

## Purpose & When to Use
Used by the `hearing_director` agent (the root coordinator in the Google ADK workflow) to manage the entire oral proceedings lifecycle: from opening appearances through submissions, bench questioning, opposing rebuttal, witness examination, to closing prayer and session adjournment.

## Inputs
- `current_phase`: "opening", "submissions", "bench_questions", "rebuttal", "witness_exam", "closing", "adjourned".
- `elapsed_seconds`: Time elapsed in current hearing.
- `hearing_limit_seconds`: Max allowed hearing duration (default 120s in fast demo, up to 900s / 15m in full round).
- `recent_speaker`: "counsel", "J1", "J2", "J3", "opposing_counsel", "witness".
- `transcript_history`: Transcript turns accumulated.
- `twist_introduced`: Boolean indicating if a procedural twist was triggered.

## Outputs (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "next_speaker": { "type": "string", "enum": ["counsel", "J1", "J2", "J3", "opposing_counsel", "witness", "clerk"] },
    "next_phase": { "type": "string", "enum": ["opening", "submissions", "bench_questions", "rebuttal", "witness_exam", "closing", "adjourned"] },
    "director_announcement": { "type": "string" },
    "trigger_twist": {
      "type": "object",
      "properties": {
        "event_type": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "terminate_hearing": { "type": "boolean" }
  },
  "required": ["next_speaker", "next_phase", "terminate_hearing"]
}
```

## Rules
1. **Pacing and Transitions:**
   - Opening: Bench invites counsel to state appearances ("Counsel, you may open your submissions on bail").
   - Submissions & Bench Questioning: After counsel speaks, assign next turn to J1, J2, J3, or opposing counsel.
   - If counsel addresses Issue 1, transition to Issue 2 or invite opposing counsel for rebuttal.
2. **Procedural Twists (Optional Challenge):**
   - At midway point (e.g. at 60s in a 120s hearing), hearing director may introduce a twist from the case file:
     *"The Court Master announces: A supplementary status report has just been filed by the State via email."*
3. **Time Capping:** When elapsed seconds hit limit, direct proceedings to closing prayer, then adjourn for scorecard generation.

## Worked Example
```json
{
  "next_speaker": "opposing_counsel",
  "next_phase": "rebuttal",
  "director_announcement": "The Bench calls upon the Learned Public Prosecutor to address the applicability of Section 35(3) BNSS.",
  "trigger_twist": null,
  "terminate_hearing": false
}
```
