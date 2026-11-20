from typing import Dict, Any
from backend.app.services.citation_grounding import citation_service


async def verify_indian_citation(citation_name: str, argument_point: str) -> Dict[str, Any]:
    """ADK Tool: Verifies an Indian case citation or statutory provision against official records using Google Search grounding.
    
    Args:
        citation_name: The name and citation of the case (e.g. 'K.S. Puttaswamy v. Union of India (2017) 10 SCC 1').
        argument_point: The specific point of law or factual assertion the advocate claims is supported by this citation.
    """
    audit = await citation_service.verify_citation(citation_name, argument_point)
    return audit.model_dump(mode="json")


async def raise_formal_objection(objection_type: str, grounds: str, offending_statement: str) -> Dict[str, Any]:
    """ADK Tool: Raises a formal evidentiary or procedural objection under Indian court rules (Bharatiya Sakshya Adhiniyam / CPC / BNSS).
    
    Args:
        objection_type: One of 'Relevance', 'Hearsay', 'Leading Question', 'Misquoting Record', 'Misstating Law'.
        grounds: The specific legal reason why the argument or question is objectionable.
        offending_statement: The statement made by the advocate that provoked the objection.
    """
    return {
        "status": "OBJECTION_RAISED",
        "objection_type": objection_type,
        "grounds": grounds,
        "offending_statement": offending_statement
    }
