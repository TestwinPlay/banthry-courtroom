import io
import base64
import logging
from PIL import Image, ImageDraw, ImageFont
from google.adk.agents import Agent
from courtroom.config import settings

logger = logging.getLogger("courtroom.agents.exhibit_maker")

INSTRUCTIONS = """You are the Exhibit Maker for Banthry Courtroom.
Your job is to generate fictional documentary exhibits (FIRs, seizure memos, audit certificates, medical reports).
Every exhibit must be stamped prominently with 'FICTIONAL EXHIBIT'."""

root_agent = Agent(
    name="exhibit_maker",
    model=settings.model_image,
    instruction=INSTRUCTIONS,
    tools=[]
)


def create_stamped_exhibit(title: str, doc_type: str = "FIR", case_id: str = "EX-01") -> str:
    """Generates an authentic looking Indian legal document image stamped with FICTIONAL EXHIBIT."""
    width, height = 750, 950
    # Aged paper parchment color
    img = Image.new("RGB", (width, height), color="#FBF8EE")
    draw = ImageDraw.Draw(img)

    # Document border
    draw.rectangle([(25, 25), (width - 25, height - 25)], outline="#2D3748", width=2)
    draw.rectangle([(32, 32), (width - 32, height - 32)], outline="#718096", width=1)

    # Header
    draw.text((60, 55), "GOVERNMENT OF MAHARASHTRA / POLICE DEPARTMENT", fill="#1A202C")
    draw.text((60, 80), f"FIRST INFORMATION REPORT (Under Section 173 BNSS, 2023) - [{case_id}]", fill="#2D3748")
    draw.line([(60, 105), (width - 60, 105)], fill="#CBD5E0", width=2)

    # Content rows
    content = [
        f"1. District: Pune City | Police Station: Shivajinagar | Year: 2025 | FIR No: 0412/2025",
        f"2. Acts & Sections: Sections 316(2), 318(4) Bharatiya Nyaya Sanhita, 2023",
        f"3. Occurrence of Offense: Day: Monday | Date: 12-08-2025 | Time: 11:30 Hrs",
        f"4. Type of Information: Written Complaint received from Director of Agriculture Audit",
        f"5. Place of Occurrence: Nexus Agro Solutions Headquarters, Shivajinagar, Pune",
        f"6. Complainant / Informant: State Subsidy Oversight Wing, Govt. of Maharashtra",
        f"7. Details of Known / Suspected / Accused: Karan Singhania, Chief Financial Officer",
        f"8. Brief Description of Offense: Diverting subsidy tranches into unlisted vendor accounts.",
        f"9. Notice under Section 35(3) BNSS: Issued on 20-08-2025.",
        f"10. Investigating Officer: Inspector Vikrant Rane, Badge No. MH-PN-4912"
    ]

    y = 135
    for line in content:
        draw.text((60, y), line, fill="#2D3748")
        y += 38

    # Diagonal Watermark "FICTIONAL EXHIBIT"
    watermark_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    watermark_draw = ImageDraw.Draw(watermark_layer)

    watermark_text = "FICTIONAL EXHIBIT"
    # Stamp diagonally across document
    for offset_y in (350, 600):
        watermark_draw.text((120, offset_y), watermark_text, fill=(194, 65, 12, 110))

    watermark_draw.text((60, height - 60), "PRACTICE MOOT ARTIFACT - FICTIONAL EXHIBIT - NOT A GENUINE LEGAL RECORD", fill=(194, 65, 12, 220))

    # Composite
    img = img.convert("RGBA")
    final_img = Image.alpha_composite(img, watermark_layer).convert("RGB")

    buf = io.BytesIO()
    final_img.save(buf, format="PNG")
    b64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"
