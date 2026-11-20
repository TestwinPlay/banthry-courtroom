import json
import asyncio
import logging
from google.adk.agents import Agent
from courtroom.config import settings

logger = logging.getLogger("courtroom.agents.case_architect")

INSTRUCTIONS = """You are the Case Architect for Banthry Courtroom.
Your job is to draft realistic, legally accurate Indian criminal moot court problems centered on anticipatory bail (Section 482 BNSS, formerly Section 438 CrPC) and penal offenses under Bharatiya Nyaya Sanhita (BNS), 2023.

RULES:
1. Strict Fictionalization: All names of individuals, companies, dates, vehicle numbers, and FIR numbers must be completely fictional. Never reproduce real litigant data.
2. Statutory Fidelity: Use accurate BNS / BNSS / BSA numbering.
3. Precedents: Never invent fictional Supreme Court or High Court cases. If authorities are mentioned in arguments, use only established landmarks (e.g., Gurbaksh Singh Sibbia, Arnesh Kumar, Sushila Aggarwal, Satender Kumar Antil).
4. Disclaimer: Include "Fictional moot problem. Practice moot court, not legal advice."
5. Structure: Provide proposition_paragraphs (¶1..¶n with is_key_fact), 4-6 sharp legal issues, statutes, strongest arguments for applicant and respondent, 2-3 witnesses with sworn statements and temperaments, and 2-4 exhibit prompts (stamped FICTIONAL EXHIBIT).

Output MUST be strict JSON matching the schema from the case-file-drafting skill.
"""

root_agent = Agent(
    name="case_architect",
    model=settings.model_pro,
    instruction=INSTRUCTIONS,
    tools=[]
)


async def generate_case_problem(source_text: str = None, target_topic: str = "Anticipatory Bail under Section 482 BNSS") -> dict:
    """Invokes case architect to produce a complete fictional moot problem."""
    prompt = f"""Draft a complete fictional moot problem on topic: {target_topic}.
Source material context: {source_text or 'Anticipatory bail in an alleged corporate subsidy diversion involving Section 316(2) and Section 318(4) BNS, where IO served Section 35(3) BNSS notice and threatens custodial arrest.'}

Return ONLY strict valid JSON matching the CaseProposition schema."""

    client = settings.get_text_client()
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.model_pro,
                contents=prompt,
                config={"temperature": 0.2, "response_mime_type": "application/json"}
            ),
            timeout=8.0
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Case Architect generation failed: {e}")
        # Default fallback proposition
        return {
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
                    "is_key_fact": False
                },
                {
                    "para_no": 2,
                    "text": "On 14th August 2025, FIR No. 0412/2025 was registered at Shivajinagar Police Station under Sections 316(2) (Criminal Breach of Trust) and 318(4) (Cheating) of the Bharatiya Nyaya Sanhita, 2023, alleging diversion of Rs. 4.8 Crores from state subsidy accounts.",
                    "is_key_fact": True
                },
                {
                    "para_no": 3,
                    "text": "The Investigating Officer issued a notice under Section 35(3) of the BNSS, 2023 on 20th August 2025 requiring the Applicant to appear within 12 hours. Upon appearing, the Applicant was interrogated for 14 continuous hours and threatened with imminent custodial arrest unless confessional statements were signed.",
                    "is_key_fact": True
                },
                {
                    "para_no": 4,
                    "text": "Apprehending arrest on frivolous grounds where all transaction vouchers and bank ledgers have been submitted, the Applicant approached the Sessions Court for anticipatory bail under Section 482 BNSS, which was rejected on 28th August 2025 citing economic offense gravity.",
                    "is_key_fact": True
                }
            ],
            "issues": [
                "Whether an application for anticipatory bail under Section 482 BNSS is maintainable after compliance with notice under Section 35(3) BNSS.",
                "Whether the bar on routine arrest in offenses punishable up to 7 years under Satender Kumar Antil and Arnesh Kumar applies to commercial disputes with penal allegations.",
                "Whether custodial interrogation is indispensable when all documentary financial records are in police possession."
            ],
            "statutes": [
                "Section 482, Bharatiya Nagarik Suraksha Sanhita, 2023",
                "Section 35(3), Bharatiya Nagarik Suraksha Sanhita, 2023",
                "Section 316(2) & Section 318(4), Bharatiya Nyaya Sanhita, 2023"
            ],
            "strongest_arguments": {
                "applicant": [
                    "Arnesh Kumar and Satender Kumar Antil mandate that custodial arrest cannot be routinely effected without recorded satisfaction of Section 35(1) BNSS.",
                    "Applicant is a roots-in-the-soil professional with no flight risk, and all financial ledgers have been submitted to the IO."
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
