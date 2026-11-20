from typing import Dict, List, Optional
from backend.app.schemas.session import MootCase, CourtLevel

PRESET_CASES: Dict[str, MootCase] = {
    "case-bns-privacy-01": MootCase(
        id="case-bns-privacy-01",
        title="State of Bharat v. NetFreedom Consortium & Anr.",
        court=CourtLevel.SUPREME_COURT_OF_INDIA,
        bench_composition="Constitution Bench (5 Judges)",
        summary=(
            "Writ Petition under Article 32 of the Constitution of India challenging "
            "the constitutional validity of automated facial recognition surveillance "
            "and geo-fencing deployments by state law enforcement under provisions of the "
            "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 and the Bharatiya Nyaya Sanhita (BNS), 2023."
        ),
        facts=[
            "In January 2025, the State Law Enforcement Agency deployed autonomous biometric surveillance and predictive policing towers across major public squares without prior judicial warrants.",
            "Petitioners, an alliance of investigative journalists and human rights advocates, were flagged by algorithmic pattern matching and subjected to preemptive detention under Section 172 of the BNSS, 2023.",
            "The State contends that mass predictive surveillance is a legitimate state aim for public order and terrorism deterrence under Section 152 of the BNS, 2023.",
            "Petitioners argue that continuous automated tracking violates the fundamental right to privacy and bodily autonomy under Article 21 and chills free speech under Article 19(1)(a)."
        ],
        issues=[
            "Whether continuous warrantless facial recognition surveillance meets the four-prong proportionality standard laid down in K.S. Puttaswamy v. Union of India (2017)?",
            "Whether preventive detention under Section 172 of the BNSS based solely on automated algorithmic suspicion constitutes an arbitrary deprivation of liberty under Article 21?",
            "Whether Section 152 of the Bharatiya Nyaya Sanhita (BNS), 2023 provides sufficient statutory safeguards to prevent overbroad chilling of dissent under Article 19(1)(a)?"
        ],
        statutory_provisions=[
            "Constitution of India: Article 14 (Equality), Article 19(1)(a) (Freedom of Speech), Article 21 (Right to Life & Personal Liberty), Article 32 (Constitutional Remedies)",
            "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023: Section 172 (Preventive Arrest by Police), Section 106 (Search and Seizure of Electronic Devices)",
            "Bharatiya Nyaya Sanhita (BNS), 2023: Section 152 (Acts Endangering Sovereignty, Unity and Integrity of India)",
            "Bharatiya Sakshya Adhiniyam (BSA), 2023: Section 61, 62 & 63 (Admissibility of Electronic and Digital Records)"
        ],
        key_precedents=[
            "Justice K.S. Puttaswamy (Retd.) v. Union of India (2017) 10 SCC 1 (Nine-Judge Bench on Right to Privacy & Proportionality)",
            "Maneka Gandhi v. Union of India (1978) 1 SCC 248 (Procedure Established by Law must be Just, Fair, and Reasonable)",
            "Shreya Singhal v. Union of India (2015) 5 SCC 1 (Vagueness, Overbreadth, and Chilling Effect on Digital Free Expression)",
            "Anuradha Bhasin v. Union of India (2020) 3 SCC 637 (Application of Proportionality to State Surveillance and Internet Restrictions)",
            "State of Punjab v. Baldev Singh (1999) 6 SCC 172 (Procedural Safeguards in Search and Seizure)"
        ]
    ),
    "case-bsa-evidence-02": MootCase(
        id="case-bsa-evidence-02",
        title="Vikramaditya Rao v. Central Bureau of Investigation",
        court=CourtLevel.HIGH_COURT_OF_DELHI,
        bench_composition="Criminal Appellate Bench (Division Bench)",
        summary=(
            "Criminal Appeal challenging conviction based entirely on uncertified, "
            "AI-enhanced metadata and encrypted cloud backups under Sections 61-63 of the "
            "Bharatiya Sakshya Adhiniyam (BSA), 2023."
        ),
        facts=[
            "The Appellant was convicted under Section 316 (Criminal Breach of Trust) of the Bharatiya Nyaya Sanhita, 2023 for alleged diversion of institutional funds.",
            "The primary evidence submitted was a compressed WhatsApp database and server log retrieved from a third-party foreign cloud server without a bilateral mutual legal assistance treaty (MLAT) warrant.",
            "The forensic hash value generated during seizure did not match the hash value produced before the trial court due to intermediate operating system updates.",
            "The trial court admitted the secondary digital record relying on an affidavit under Section 63 of the BSA, 2023 signed by an investigating officer who was not the system administrator."
        ],
        issues=[
            "Whether secondary digital records can be admitted under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 without contemporaneous cryptographic hash chain-of-custody verification?",
            "Whether the rule in Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) regarding mandatory certification applies strictly to electronic evidence under BSA Section 63?",
            "Whether the failure to produce the original cloud server or its custodian invalidates the presumption of integrity under Section 62 of the BSA, 2023?"
        ],
        statutory_provisions=[
            "Bharatiya Sakshya Adhiniyam (BSA), 2023: Section 61 (Admissibility of Electronic Records), Section 62 (Primary Evidence of Electronic Form), Section 63 (Conditions for Admissibility of Electronic Records)",
            "Bharatiya Nyaya Sanhita (BNS), 2023: Section 316 (Criminal Breach of Trust)",
            "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023: Section 94 & 106 (Summons to Produce and Power of Police to Seize)"
        ],
        key_precedents=[
            "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1 (Three-Judge Bench on Mandatory Electronic Certification)",
            "Anvar P.V. v. P.K. Basheer (2014) 10 SCC 473 (Inadmissibility of Secondary Electronic Evidence without Certificate)",
            "State (NCT of Delhi) v. Navjot Sandhu (2005) 11 SCC 600 (Chain of Custody for Telecommunication Records)"
        ]
    )
}


def get_case_by_id(case_id: str) -> Optional[MootCase]:
    return PRESET_CASES.get(case_id)


def list_all_cases() -> List[MootCase]:
    return list(PRESET_CASES.values())
