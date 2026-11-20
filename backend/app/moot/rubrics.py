from typing import List, Dict, Any

BCI_MOOT_RUBRIC_CATEGORIES = [
    {
        "category_name": "Knowledge of Law and Statutory Provisions",
        "max_score": 25.0,
        "description": (
            "Grasp of substantive and procedural Indian law (BNS, BNSS, BSA, CPC, Constitution). "
            "Accurate citation of sections, jurisdictional competence, and legal definitions."
        )
    },
    {
        "category_name": "Application of Law to Facts & IRAC Analysis",
        "max_score": 25.0,
        "description": (
            "Ability to weave relevant facts into statutory elements. Logical progression "
            "using Issue, Rule, Application, and Conclusion. Handling of adverse facts."
        )
    },
    {
        "category_name": "Response to Judicial Queries & Proactive Advocacy",
        "max_score": 20.0,
        "description": (
            "Composure when interrupted by the Bench. Direct answers without evasiveness "
            "('Yes, My Lord' / 'No, Your Ladyship') before explaining the distinction. Flexibility under pressure."
        )
    },
    {
        "category_name": "Citation Accuracy & Precedent Ratio Analysis",
        "max_score": 15.0,
        "description": (
            "Accuracy of Supreme Court / High Court citations, understanding of ratio decidendi "
            "vs obiter dicta, and proper distinguishing of adverse precedents."
        )
    },
    {
        "category_name": "Courtroom Decorum, Etiquette & Demeanor",
        "max_score": 15.0,
        "description": (
            "Formal Indian courtroom etiquette ('May it please this Hon'ble Court', 'Much obliged', "
            "'I submit before your Lordships'), modulation of voice, deference without servility, and time management."
        )
    }
]


def calculate_percentage(total_score: float, max_score: float = 100.0) -> float:
    if max_score <= 0:
        return 0.0
    return round((total_score / max_score) * 100.0, 1)
