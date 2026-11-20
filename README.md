# Banthry Courtroom (by Banthry Prep)

A live AI moot court simulator for Indian law students and legal-aid lawyers. Argue by voice against an AI opposing counsel, before an AI High Court bench, with AI witnesses, on a moot problem generated from a real judgment, evaluated against authentic judicial advocacy standards.

---

## 🏛️ System Architecture

```
                             [ Student Advocate / Counsel ]
                                           │
                    🎙️ 16 kHz PCM16 Mono Streaming & Typed Submissions
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            Vite + React Frontend             │
                    │   - Proposition Screen (Fictional Problem)   │
                    │   - Courtroom Hearing Screen:                │
                    │     • Division Bench (J1, J2, J3)            │
                    │     • Opposing Counsel Seat                  │
                    │     • Virtual Witness Box                    │
                    │     • Live Captions & Waveforms              │
                    │     • Real-time Citation Auditing            │
                    │   - Scorecard (0-10 Rubric + Evidence Quotes)│
                    │   - Typed fallback always available          │
                    └──────────────────────┬───────────────────────┘
                                           │ WebSocket (/ws/hearing/{session_id})
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │       backend/ (FastAPI + Google ADK)        │
                    │                                              │
                    │   ┌──────────────────────────────────────┐   │
                    │   │       ADK Bidi Live Streaming        │   │
                    │   │  - LiveRequestQueue (16 kHz PCM In)  │   │
                    │   │  - Runner.run_live (24 kHz PCM Out)  │   │
                    │   └──────────────────┬───────────────────┘   │
                    │                      │                       │
                    │   ┌──────────────────▼───────────────────┐   │
                    │   │      Dual-Location Model Routing     │   │
                    │   │  • global: GEMINI_PRO_MODEL          │   │
                    │   │            GEMINI_ANALYSIS_MODEL     │   │
                    │   │            GEMINI_IMAGE_MODEL        │   │
                    │   │            gemini-embedding-2        │   │
                    │   │  • us-central1: GEMINI_LIVE_MODEL    │   │
                    │   └──────────────────┬───────────────────┘   │
                    │                      │                       │
                    │   ┌──────────────────▼───────────────────┐   │
                    │   │      9 Modular ADK Agents            │   │
                    │   │  1. case_architect   (PRO)           │   │
                    │   │  2. bench            (LIVE)          │   │
                    │   │  3. opposing_counsel (FLASH/LIVE)    │   │
                    │   │  4. witness          (FLASH/LIVE)    │   │
                    │   │  5. hearing_director (FLASH)         │   │
                    │   │  6. citation_verifier(FLASH+Ground)  │   │
                    │   │  7. memorial_coach   (PRO)           │   │
                    │   │  8. evaluator        (PRO)           │   │
                    │   │  9. exhibit_maker    (IMAGE)         │   │
                    │   └──────────────────┬───────────────────┘   │
                    │                      │                       │
                    │   ┌──────────────────▼───────────────────┐   │
                    │   │   Judgments & Grounding Pipeline     │   │
                    │   │  - data/judgments.json (20 SC Cases) │   │
                    │   │  - AlloyDB AI (pgvector) + Toolbox   │   │
                    │   │  - Section 1a Live Search Check      │   │
                    │   │  - Stamped "FICTIONAL EXHIBIT" PNGs  │   │
                    │   └──────────────────────────────────────┘   │
                    └──────────────────────┬───────────────────────┘
                                           ▼
                                [ Google Cloud Run ]
                                (us-central1, Port 8080)
```

---

## 🤖 The 9 Google ADK Agents & Model Routing

| Agent | Location | Model Env Var | Default Model | Job & Skill |
|---|---|---|---|---|
| `case_architect` | `global` | `GEMINI_PRO_MODEL` | `gemini-3.1-pro-preview` | Turns judgments into fictional moot problems under BNS/BNSS. (`case-file-drafting`) |
| `bench` | `us-central1` | `GEMINI_LIVE_MODEL` | `gemini-3.8-live` | Terse 3-judge Indian High Court bench (max 2 sentences, 1 hard question). (`bench-questioning`) |
| `opposing_counsel`| `global`/`us-central1` | `GEMINI_ANALYSIS_MODEL` | `gemini-3.8-flash` | Real-time rebuttals and objections based on verified precedents. (`opposing-counsel`) |
| `witness` | `global`/`us-central1` | `GEMINI_ANALYSIS_MODEL` | `gemini-3.8-flash` | Roleplays witness from the case file during examination. (`witness-roleplay`) |
| `hearing_director`| `global` | `GEMINI_ANALYSIS_MODEL` | `gemini-3.8-flash` | Master orchestrator driving turns, clock, and procedural twists. (`hearing-direction`) |
| `citation_verifier`| `global` | `GEMINI_ANALYSIS_MODEL` | `gemini-3.8-flash` | 2-tier citation checker: AlloyDB index + Google Search grounding. (`citation-checking`) |
| `memorial_coach` | `global` | `GEMINI_PRO_MODEL` | `gemini-3.1-pro-preview` | Audits memorials; findings feed the bench's first questions. (`memorial-drafting`) |
| `evaluator` | `global` | `GEMINI_PRO_MODEL` | `gemini-3.1-pro-preview` | Scores 0-10 with direct student quotes as evidence. (`rubric-scoring`) |
| `exhibit_maker` | `global` | `GEMINI_IMAGE_MODEL` | `gemini-nano-banana-2.1` | Generates exhibits stamped with bold "FICTIONAL EXHIBIT". (`exhibit-drafting`) |

---

## 📂 Repository Layout

```
Banthry Courtroom/
├── backend/
│   ├── courtroom/
│   │   ├── config.py                 # Dual-client Vertex AI configuration
│   │   ├── schemas.py                # Pydantic schemas
│   │   ├── agents/                   # 9 ADK Agents (each with agent.py & root_agent)
│   │   │   ├── case_architect/
│   │   │   ├── bench/
│   │   │   ├── opposing_counsel/
│   │   │   ├── witness/
│   │   │   ├── hearing_director/
│   │   │   ├── citation_verifier/
│   │   │   ├── memorial_coach/
│   │   │   ├── evaluator/
│   │   │   └── exhibit_maker/
│   │   ├── tools/                    # Citation verifier, live search, firestore, toolbox
│   │   └── services/                 # Live bidi runner & exhibit generation
│   ├── main.py                       # FastAPI server, REST API, WebSocket & SPA serving
│   ├── db/
│   │   └── 001_init.sql              # AlloyDB pgvector schema
│   ├── tests/                        # Pytest suite for agents, tools, and endpoints
│   └── requirements.txt
├── .agent/
│   ├── rules/
│   │   └── courtroom.md              # Project rules & architecture constraints
│   └── skills/                       # 10 SKILL.md specs matching ADK agents
├── toolbox/
│   └── tools.yaml                    # MCP Toolbox for Databases definition
├── scripts/
│   └── ingest_judgments.py           # Embeds and ingests judgments via gemini-embedding-2
├── data/
│   └── judgments.json                # Seed database of 20 Supreme Court bail judgments
├── web/                              # React + Vite frontend SPA
│   ├── src/moot/                     # Hearing components, audio hooks, and scorecard
│   └── dist/                         # Production build served by FastAPI at /
├── Dockerfile                        # Multi-stage Cloud Run Dockerfile
└── README.md
```

---

## 🚀 Running Locally

### 1. Prerequisites
- Python 3.12+
- Node.js 20+

### 2. Setup Virtual Environment
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

### 3. Build Frontend
```bash
cd web
npm install
npm run build
cd ..
```

### 4. Run `adk web` (Inspect and Test All Agents)
```bash
./backend/.venv/bin/adk web --port 8089 backend/courtroom/agents
```
Open [http://127.0.0.1:8089](http://127.0.0.1:8089) to interact with each of the 9 ADK agents individually.

### 5. Start Banthry Courtroom Server
```bash
./backend/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```
Open [http://127.0.0.1:8080](http://127.0.0.1:8080) to experience the full courtroom moot hearing flow.

### 6. Run Unit Tests
```bash
./backend/.venv/bin/pytest backend/tests/ -v
```

---

## ☁️ Cloud Run Deployment

Deploy directly using the root Dockerfile:
```bash
gcloud run deploy banthry-courtroom \
  --source . \
  --region us-central1 \
  --service-account courtroom-run@banthry-courtroom-2026.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --timeout 3600 \
  --session-affinity \
  --port 8080
```

---

## ⚖️ Legal Disclaimer
**Practice moot court, not legal advice.** All generated moot problems and documentary exhibits are fictional educational artifacts created for Indian law students and advocates.
