---
name: case-file-drafting
description: Converts Indian criminal judgments or factual matrices into fictional moot court problems with proposition paragraphs, issues, witness statements, and exhibit prompts under BNS, BNSS, and BSA.
---

# Case File Drafting Skill

## Purpose & When to Use
Used by the `case_architect` agent to generate rigorous, authentic moot court propositions based on real judgments (uploaded PDF/DOCX/text, or selected from the judgment library). It transforms real dispute dynamics into a fully fictionalized problem while maintaining pristine legal questions under the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA).

## Inputs
- `source_text`: Full judgment text, excerpt, or factual brief.
- `target_topic`: Legal topic (e.g., Anticipatory Bail under s. 482 BNSS, quashing under s. 528 BNSS).
- `difficulty`: Level of nuance (Intermediate / Advanced / National Moot).

## Outputs (JSON Schema)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "forum": { "type": "string" },
    "parties": {
      "type": "object",
      "properties": {
        "applicant": { "type": "string" },
        "respondent": { "type": "string" }
      },
      "required": ["applicant", "respondent"]
    },
    "disclaimer": { "type": "string", "enum": ["Fictional moot problem. Practice moot court, not legal advice."] },
    "proposition_paragraphs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "para_no": { "type": "integer" },
          "text": { "type": "string" },
          "is_key_fact": { "type": "boolean" }
        },
        "required": ["para_no", "text", "is_key_fact"]
      }
    },
    "issues": {
      "type": "array",
      "items": { "type": "string" }
    },
    "statutes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "strongest_arguments": {
      "type": "object",
      "properties": {
        "applicant": { "type": "array", "items": { "type": "string" } },
        "respondent": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["applicant", "respondent"]
    },
    "witnesses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "role": { "type": "string" },
          "statement": { "type": "string" },
          "temperament": { "type": "string", "enum": ["neutral", "hostile", "evasive", "frightened"] },
          "may_be_pressed_on": { "type": "string" }
        },
        "required": ["name", "role", "statement", "temperament"]
      }
    },
    "exhibit_prompts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "prompt": { "type": "string" },
          "type": { "type": "string", "enum": ["FIR", "seizure_memo", "medical_report", "contract_extract", "forensic_audit"] }
        },
        "required": ["id", "title", "prompt", "type"]
      }
    }
  },
  "required": ["title", "forum", "parties", "disclaimer", "proposition_paragraphs", "issues", "statutes", "strongest_arguments", "witnesses", "exhibit_prompts"]
}
```

## Rules
1. **Strict Fictionalization:** Anonymize all real individuals, corporations, FIR numbers, dates, and locations. Never expose real litigant PII.
2. **Statutory Fidelity:** Use new criminal code numbering:
   - Anticipatory Bail: Section 482 BNSS (formerly s. 438 CrPC).
   - Regular Bail: Section 480 / 483 BNSS (formerly s. 437 / 439 CrPC).
   - Notice of Appearance: Section 35(3) BNSS (formerly s. 41A CrPC).
   - Inherent Powers: Section 528 BNSS (formerly s. 482 CrPC).
   - Penal Offenses: Bharatiya Nyaya Sanhita (BNS) 2023.
   - Evidence: Bharatiya Sakshya Adhiniyam (BSA) 2023.
3. **Never Fabricate Precedents:** Never cite imaginary decisions or fictional law reporters. Rely strictly on established real precedents (e.g. *Arnesh Kumar*, *Gurbaksh Singh Sibbia*, *Sushila Aggarwal*, *Satender Kumar Antil*).
4. **Stamp Requirements:** Explicitly mark the problem as `"Fictional moot problem"`.

## Worked Example
```json
{
  "title": "Karan Singhania v. State of Maharashtra",
  "forum": "High Court of Judicature at Bombay (Criminal Appellate Jurisdiction)",
  "parties": {
    "applicant": "Karan Singhania",
    "respondent": "State of Maharashtra"
  },
  "disclaimer": "Fictional moot problem. Practice moot court, not legal advice.",
  "proposition_paragraphs": [
    {
      "para_no": 1,
      "text": "The Applicant, Karan Singhania, aged 34 years, is the Chief Financial Officer of Nexus Agro Solutions Pvt. Ltd., headquartered in Pune.",
      "is_key_fact": false
    },
    {
      "para_no": 2,
      "text": "On 14th August 2025, an FIR bearing No. 0412/2025 was registered at Shivajinagar Police Station under Sections 316(2) (Criminal Breach of Trust) and 318(4) (Cheating) of the Bharatiya Nyaya Sanhita, 2023, alleging diversion of Rs. 4.8 Crores from state subsidy accounts.",
      "is_key_fact": true
    },
    {
      "para_no": 3,
      "text": "The Investigating Officer issued a notice under Section 35(3) of the BNSS, 2023 on 20th August 2025 requiring the Applicant to appear within 12 hours. Upon appearing, the Applicant was interrogated for 14 continuous hours and threatened with imminent arrest unless confessional statements were signed.",
      "is_key_fact": true
    }
  ],
  "issues": [
    "Whether an application for anticipatory bail under Section 482 BNSS is maintainable when notice under Section 35(3) BNSS has been served.",
    "Whether custodial interrogation is indispensable in an offense resting predominantly on electronic and banking records."
  ],
  "statutes": [
    "Section 482, Bharatiya Nagarik Suraksha Sanhita, 2023",
    "Section 35(3), Bharatiya Nagarik Suraksha Sanhita, 2023",
    "Section 316(2) and Section 318(4), Bharatiya Nyaya Sanhita, 2023"
  ],
  "strongest_arguments": {
    "applicant": [
      "Arnesh Kumar and Satender Kumar Antil mandate that custodial arrest cannot be routinely effected for offenses punishable with up to 7 years imprisonment without recorded satisfaction of Section 35(1) BNSS.",
      "Applicant is a roots-in-the-soil professional with no flight risk, and all financial ledgers have been submitted."
    ],
    "respondent": [
      "Economic offenses constitute a class apart requiring deep tracing of siphoned public subsidies where pre-arrest bail paralyzes recovery.",
      "Applicant attempted to format company server backups prior to police notice."
    ]
  },
  "witnesses": [
    {
      "name": "Inspector Vikrant Rane",
      "role": "Investigating Officer, Shivajinagar Police Station",
      "statement": "The applicant was uncooperative during notice interrogation and gave evasive replies regarding offshore entity payments.",
      "temperament": "evasive",
      "may_be_pressed_on": "Whether arrest memo or arrest diary reasons under Section 35(1) were recorded prior to summoning."
    }
  ],
  "exhibit_prompts": [
    {
      "id": "EX-01",
      "title": "FIR No. 0412/2025",
      "prompt": "Official police First Information Report sheet of Maharashtra Police with seal, case details, sections 316(2) and 318(4) BNS.",
      "type": "FIR"
    }
  ]
}
```
