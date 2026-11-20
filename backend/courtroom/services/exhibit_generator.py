from courtroom.agents.exhibit_maker.agent import create_stamped_exhibit


def generate_exhibit_image(title: str, doc_type: str = "FIR", case_id: str = "EX-01") -> str:
    """Returns base64 data URI of the stamped exhibit."""
    return create_stamped_exhibit(title, doc_type, case_id)
