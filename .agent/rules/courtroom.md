# Banthry Courtroom Rules & Architecture Standards

## 0. Ground Rules
- **Stack:** Python 3.12 backend (FastAPI + Google ADK `google-adk` 2.x + `google-genai`), React + Vite frontend in `web/`. No LangChain or LlamaIndex. Deploy to Cloud Run (us-central1, port 8080).
- **Dual-Location / Dual-Client Model Routing (Non-Negotiable):**
  - **Text, Image & Embedding Client** on `GOOGLE_CLOUD_LOCATION=global`:
    - `GEMINI_ANALYSIS_MODEL=gemini-3.8-flash`
    - `GEMINI_PRO_MODEL=gemini-3.1-pro-preview`
    - `GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1`
    - Embeddings: `gemini-embedding-2`
  - **Live Speech-to-Speech Client** on `GEMINI_LIVE_LOCATION=us-central1`:
    - `GEMINI_LIVE_MODEL=gemini-3.8-live`
    - Fallback: `GEMINI_LIVE_FALLBACK_MODEL=gemini-live-2.5-flash-native-audio`
  - *Strict Rule:* Live does NOT work on `global`; text models do NOT work on `us-central1`. `gemini-2.5-flash` is retired and must NEVER be used.
  - Read EVERY model ID from environment variables; never hard-code model IDs.
- **Brand & Theme:**
  - "Banthry Courtroom", small "by Banthry Prep".
  - Palette: ink `#111318`, paper `#F5F4EF`, clay accent `#C2410C` (on dark `#FB8A4F`).
  - Typography: Serif (Georgia) for case propositions and memorials; Sans for courtroom UI.
  - Mobile-first, minimum 44px hit targets, live captions always enabled.

## 1. Legal Integrity
- **Never Invent Citations:** Never invent a case, citation, statute section, or quotation.
  - Every authority stated by any agent (judge, opposing counsel, witness, case architect) passes through the `citation_verifier` before presentation.
  - Unverified or unconfirmed authorities must be clearly labelled as "Citation not verified".
- **Fictionalized Moot Problems:**
  - All generated moot problems and exhibits are strictly FICTIONAL: names, places, dates, and vehicle/FIR numbers must be changed.
  - Legal issues and statutory principles remain faithful to Indian criminal law (BNS / BNSS / BSA numbering, with old IPC/CrPC in brackets only when helpful).
  - Every problem must be explicitly stamped: "Fictional moot problem" and every exhibit stamped "FICTIONAL EXHIBIT".
  - Never reproduce a real litigant's personal identifying data.
- **Role Anonymity & AI Vendor Shielding:**
  - Student-facing UI and transcripts refer only to "the bench" (Presiding Judge, Puisne Judge 1, Puisne Judge 2), "opposing counsel", and "witness".
  - Never mention AI vendors, Google, Gemini, LLMs, or model identifiers to the student.
- **Legal Aid Disclaimer:**
  - State clearly: "Practice moot court, not legal advice" on Legal Aid entry and the final scorecard.

## 2. Interaction & Fallback Mandates
- **Typed Fallback Always:** The hearing must never dead-end if microphone access is denied or live audio drops. A typed "Send answer" fallback must always remain active.
- **Bidi-Streaming Voice:** Speech-to-speech hearing runs over WebSocket `/ws/hearing/{session_id}` with ADK `Runner.run_live` and `LiveRequestQueue`.
- **Bench Conduct:**
  - Terse Indian High Court style ("Counsel,...").
  - Asks ONE sharp question after each submission.
  - Interrupts answers exceeding ~40 seconds.
  - Put opposing counsel's best point to counsel.
  - Demands paragraph references for cited authorities ("Which paragraph?").
