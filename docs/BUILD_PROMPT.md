# Banthry Courtroom: build prompt for Antigravity

Paste everything below the line into the Antigravity Agent Manager as one task. It is ordered so that a working demo
exists after Phase 1, and each later phase adds one feature without breaking the earlier ones.

---

You are building **Banthry Courtroom** (subtitle "by Banthry Prep"): a live AI moot court for Indian law students and
legal-aid lawyers. The student argues by voice against an AI opposing counsel, before an AI bench, with AI witnesses,
on a moot problem generated from a real judgment, and is scored like a real bench would. Repo root is this folder.

## 0. Ground rules (apply to every phase)

- **Stack:** Python 3.12 backend (FastAPI + Google ADK `google-adk` 2.x + `google-genai`), React + Vite frontend in
  `web/`. No LangChain or LlamaIndex. Deploy to Cloud Run. Firestore for sessions and scorecards. AlloyDB for
  PostgreSQL (AlloyDB AI, pgvector) for the judgments library, accessed through MCP Toolbox for Databases.
- **Environment is ready and tested** (`backend/.env`; never commit it, never print secrets). Use TWO google-genai
  clients:
  - text and image models on `GOOGLE_CLOUD_LOCATION` (= `global`): `GEMINI_ANALYSIS_MODEL=gemini-3.8-flash`,
    `GEMINI_PRO_MODEL=gemini-3.1-pro-preview`, `GEMINI_IMAGE_MODEL=gemini-nano-banana-2.1`, embeddings
    `gemini-embedding-2`;
  - Live speech-to-speech on `GEMINI_LIVE_LOCATION` (= `us-central1`): `GEMINI_LIVE_MODEL=gemini-3.8-live`, fallback
    `GEMINI_LIVE_FALLBACK_MODEL=gemini-live-2.5-flash-native-audio`. Live does NOT work on `global`; text models do
    NOT work on `us-central1`. `gemini-2.5-flash` is retired: never use it.
  - `GOOGLE_GENAI_USE_VERTEXAI=TRUE`, project `banthry-courtroom-2026`. Read every model name from env.
- **Existing code to reuse:** `web/src/moot/` holds Banthry Prep's moot screens (stages, LiveHearing, OralRound,
  Scorecard, MemorialCheck, mootData, mootAuthorities, mootLogic, hearingController). Reuse their layout and logic;
  remove Banthry Prep navigation, owls, capability switches, `sarvamSpeech`/`deviceSpeech` and every banthry.in API
  call. `data/judgments.json` holds 6 checked authorities (Arnesh Kumar, Sibbia, Antil, Chidambaram, Sushila
  Aggarwal [unverified], s. 482 BNSS) as the seed citation index.
- **Brand:** "Banthry Courtroom", small "by Banthry Prep". Theme: ink `#111318`, paper `#F5F4EF`, clay accent
  `#C2410C` (on dark use `#FB8A4F`), serif (Georgia) for the moot problem and memorial, sans for UI. Mobile-first,
  44 px hit targets, captions always on.
- **Legal integrity (non-negotiable):**
  - Never invent a case, citation, statute section or quotation. Every authority any agent states (judge, counsel,
    witness, case architect) passes through the Citation Verifier before it is shown or spoken as fact. Unverified
    authorities are shown as "Citation not verified".
  - Generated moot problems are FICTIONAL: change names, places and dates, keep the legal issues. Label every
    problem and exhibit "Fictional moot problem" / "FICTIONAL EXHIBIT". Never reproduce a real litigant's personal data.
  - Use BNS/BNSS/BSA numbering, with the old IPC/CrPC/Evidence Act number in brackets only where it helps.
  - Student-facing copy says "the bench", "opposing counsel", "witness"; it does not name AI vendors or models.
  - It is practice, not legal advice: show that line on the Legal Aid entry and the scorecard.
- **Quality bar:** every endpoint has a test; run the app in the browser after each phase and check the flow end to
  end with typed input before voice. Keep a typed "Send answer" fallback everywhere so the demo never dead-ends.

## 1. Agents (Google ADK) and Agent Skills

Create `.agent/skills/<name>/SKILL.md` for each skill below (what it is, when to use it, inputs, outputs, rules,
an example). The same skill text is loaded into the matching ADK agent's instructions, so build-time and run-time
behaviour stay identical.

| Agent (ADK) | Model | Job | Skill |
|---|---|---|---|
| `case_architect` | PRO | Turns a judgment (uploaded PDF/DOCX/text, or one picked from the AlloyDB library) into a fictional moot problem: proposition paragraphs ¶1..¶n, parties, forum, key facts (marked), 4-6 issues, statutes, both sides' strongest points, a witness list with statements, and exhibit prompts. Keeps legal issues faithful to the source judgment; fictionalises everything identifying. | `case-file-drafting` |
| `exhibit_maker` | IMAGE | Renders 2-4 exhibits per case (FIR, contract page, notice, scene photo, medical report), each stamped "FICTIONAL EXHIBIT", consistent with the facts. | `exhibit-drafting` |
| `bench` (presiding + 2 puisne judges) | LIVE | Speech-to-speech hearing. Terse Indian High Court judges ("Counsel, ..."). Ask one hard question at a time, interrupt answers that wander past ~40 seconds, put the opponent's best point to the student, test every authority ("Which paragraph?"), escalate difficulty when the student does well. Three distinct voices. Calls tools `check_citation`, `get_fact(paragraph)`, `call_witness(name)`. | `bench-questioning` |
| `opposing_counsel` | LIVE (or FLASH + TTS fallback) | Argues the other side in real time: short rebuttals after each student submission, raises objections, relies only on verified authorities, can concede a point when the student is right. Difficulty set by the student (Calm / Hot / Very hot). | `opposing-counsel` |
| `witness` | LIVE | Plays a witness from the case file during examination / cross-examination. Stays consistent with the witness statement, can be evasive or hostile as the case file specifies, never invents new facts outside the statement unless marked "may be pressed". | `witness-roleplay` |
| `hearing_director` | FLASH | Drives the hearing (ADK root/sequential agent): opening, submissions, rebuttal, witness examination, bench questions, closing; decides who speaks next; keeps the clock; can introduce a twist ("A new document has been filed") from the case file to test the student. | `hearing-direction` |
| `citation_verifier` | FLASH + Google Search grounding + AlloyDB tools | Extracts every authority from any transcript turn, checks it against the AlloyDB judgments library first, then Google Search grounding; returns `{name, citation, status: verified | not_found | misquoted | wrong_proposition, source_url, note}` within ~2 s. Runs on student, judge, counsel and witness turns. | `citation-checking` |
| `memorial_coach` | PRO | Drafts or checks the student's memorial (cover, index of authorities, jurisdiction, facts, issues, summary, arguments, prayer): format checks, neutral facts, authorities verified, prayer asks for the right relief. Findings become the bench's first questions. | `memorial-drafting` |
| `evaluator` | PRO (structured JSON) | Scores the full transcript: legal reasoning, use of authority (citation accuracy), responsiveness to the bench, handling of difficult questions, structure, court manner/etiquette, advocacy (persuasion, clarity, pace), witness handling. Each 0-10 with a quote from the student's own words as evidence; overall = weighted mean; per-judge comment; three things to practise next; flagged citations list. Same output shape every time. | `rubric-scoring` |

### 1a. Bench live fact-check of authorities not in the library

When opposing counsel (or the student, or a witness) relies on a case that is NOT in the AlloyDB library, the bench
checks it live, during the hearing, instead of accepting or ignoring it:

1. `citation_verifier` misses in AlloyDB -> immediately runs a **live search** tool `live_case_search(name, citation,
   claimed_proposition)` using Google Search grounding (prefer official sources: sci.gov.in, High Court sites,
   indiankanoon.org, indiacode.nic.in, egazette.gov.in). It must answer four questions, each with a source URL:
   (a) does the case exist; (b) is the citation (reporter, year, volume, page) correct; (c) are the facts counsel
   described the facts of that case; (d) does the case actually hold the proposition counsel claimed (and is it still
   good law: not overruled, not a dissent, not obiter).
2. Result: `verified` / `exists_but_misquoted` / `exists_but_wrong_proposition` / `overruled_or_doubted` /
   `not_found`, with the supporting snippet and link. Never mark `verified` without a source page that shows it.
   Ambiguous search results are `unconfirmed`, never `verified`.
3. The bench uses the result in character, out loud: "Counsel, we find no report at (2019) 4 SCC 999. Do you have
   the copy?" / "That judgment was on a different point; it concerned a commercial dispute, not bail." The judge
   puts it to whoever cited it and lets them respond.
4. The courtroom screen shows a live "Bench is checking the authority..." chip, then the result with its source
   link. The check runs in parallel so the hearing does not stall (target under 5 s; if slower, the bench says
   "We will check that authority" and raises it at the next turn).
5. A case confirmed by live search is cached (Firestore, and queued for AlloyDB ingestion with its source) so the
   next hearing finds it in the library. A `not_found` or misquoted authority counts against the citing side in the
   scorecard (student: "use of authority"; counsel: shown in the transcript) and appears in the flagged-citations list.
6. Opposing counsel is instructed to cite only verified authorities, but the live check exists precisely because a
   model can still slip: it applies to counsel's citations exactly as to the student's.

Acceptance: opposing counsel cites a real case not in the library (e.g. "Siddharam Satlingappa Mhetre v. State of
Maharashtra, (2011) 1 SCC 694") -> bench checks live, confirms with a link; counsel cites a fabricated case -> bench
says it cannot be found and presses counsel, and the scorecard records it.

Implement them as ADK agents with tools (FunctionTool and the MCP Toolbox toolset). Wire `hearing_director` as the
root of the live hearing. Expose `adk web` for testing each agent alone.

## 2. Real-time live audio (speech to speech)

- FastAPI WebSocket `/ws/hearing/{session_id}` using ADK bidi streaming: `Runner.run_live()` with a
  `LiveRequestQueue`; follow the official ADK bidi-streaming sample. Browser sends 16 kHz PCM16 mono mic audio and
  text; server streams back 24 kHz PCM audio, input and output transcriptions, speaker id (judge 1/2/3, counsel,
  witness) and tool events (citation flags).
- Voice activity detection on, barge-in on (the judge can interrupt the student, the student can interrupt the
  judge). Distinct prebuilt voices per role. Captions word by word.
- Languages: English and Hindi at launch (student picks; bench answers in the same language).
- Fallbacks in order: `gemini-3.8-live` -> `GEMINI_LIVE_FALLBACK_MODEL` -> text turns with FLASH + browser TTS.
  Mic denied -> typed mode with a visible note, never a dead end.
- Session limits: resume a dropped Live session (session resumption) and cap a hearing at 15 minutes.

## 3. Judgments library on AlloyDB (+ MCP Toolbox)

- AlloyDB for PostgreSQL cluster in the project (smallest instance; region with the cluster's private network),
  extensions `vector` and `google_ml_integration`. Tables:
  `judgments(id, title, citation, court, decision_date, source_url, full_text, summary, embedding vector)`,
  `judgment_chunks(id, judgment_id, para_no, text, embedding vector)`,
  `moot_problems(id, judgment_id, title, problem_json, created_at)`.
- Ingest: script `scripts/ingest_judgments.py` loads PDFs/text (start with the 6 in `data/judgments.json` plus any
  files dropped in `data/judgments/`), splits by paragraph, embeds (`gemini-embedding-2`), stores.
- MCP Toolbox for Databases (`tools.yaml`) deployed on Cloud Run as a private service, with tools:
  `find_judgment_by_citation`, `find_judgment_by_name`, `similar_paragraphs(text, k)`, `get_paragraph(judgment_id, para_no)`.
  ADK agents load it as a toolset. Use the official codelab pattern (AlloyDB + Toolbox on Cloud Run + ADK).
- If AlloyDB is not ready yet, the same tool interface reads `data/judgments.json` locally, so nothing else changes.

## 4. Product flow (screens)

1. **Home:** "Start a moot" with three paths: (a) Pick a ready case, (b) Upload a judgment -> generate a fictional
   moot problem, (c) Choose from the judgments library (search by name/citation/topic).
2. **Case file:** proposition (serif, numbered ¶), mark key facts, issues (suggested + own), research board
   (authorities with FOR/AGAINST tags and verification status), exhibits gallery, witness list with statements.
3. **Memorial:** section editor with format checks and "Check my memorial" (memorial_coach); export DOCX.
4. **Courtroom (live):** dark panel with three judges (speaking judge highlighted), opposing counsel seat, witness
   box when a witness is called, live captions, "You" waveform, clock, live issue tracker (ticks issues as the
   student covers them), live assessment bars, citation flags appearing instantly ("Citation not found:
   Ramesh v. State, (2019) 4 SCC 999"). Controls: Rise and begin, Done speaking, Object, Call witness, Repeat the
   question, End hearing. Student chooses side (Appellant/Respondent), bench temper (Calm/Hot/Very hot), language.
5. **Scorecard:** overall /10, criteria bars with evidence quotes, per-judge comments, flagged citations, three
   things to practise, "Argue again" and "Switch sides and argue". Saved to Firestore.
6. **Faculty view (stretch):** list of a cohort's hearings with scores.

## 5. Backend API

`POST /api/cases/from-judgment` (file or text) · `POST /api/cases/from-library` · `GET /api/cases/{id}` ·
`POST /api/exhibits` · `POST /api/memorial/check` · `POST /api/verify` · `POST /api/evaluate` ·
`GET /api/judgments/search` · `WS /ws/hearing/{session_id}` · `GET /health`.
Auth: Firebase Auth (Google sign-in) on the web app; the API verifies the ID token. Rate-limit generation and live
minutes per user.

## 6. Build order (one day; demo must work after Phase 1)

1. **Phase 1, text MVP (2 h):** ready case from `web/src/moot/mootData.js` -> typed hearing with bench +
   opposing counsel (FLASH) -> citation_verifier on every turn (local JSON + Search grounding) -> evaluator scorecard.
2. **Phase 2, live voice (2-3 h):** ADK bidi WebSocket, bench speaking and listening, barge-in, captions; counsel
   live; typed fallback kept.
3. **Phase 3, judgment -> moot problem (1-2 h):** upload a judgment, case_architect, exhibits, witness statements.
4. **Phase 4, witnesses + hearing director (1 h):** call and examine a witness live.
5. **Phase 5, AlloyDB library + MCP Toolbox (1-2 h):** ingest, search, verifier reads AlloyDB.
6. **Phase 6, deploy (1 h):** Cloud Run (`gcloud run deploy --source .`, region us-central1 so Live works),
   Firebase Auth authorised domain, phone test.
7. **Phase 7, polish:** Hindi hearing, memorial coach, faculty view.

## 7. Acceptance tests (run before calling a phase done)

- A planted wrong citation ("Ramesh v. State, (2019) 4 SCC 999") is flagged within 3 s and the judge asks about it.
- A real one (Arnesh Kumar v. State of Bihar, (2014) 8 SCC 273) shows verified with a source link.
- The judge interrupts a 60-second answer.
- Opposing counsel rebuts the student's last point, not a generic one.
- An uploaded judgment becomes a fictional problem with changed names and the same issues; exhibits are stamped.
- The scorecard quotes the student's own words for every criterion and lists flagged citations.
- Mic denied -> typed hearing still completes and scores.
- Nothing in the UI names an AI vendor or model; every generated case is labelled fictional.

## 9. Configure the tooling (do this first, before Phase 1)

Do each step, confirm it worked, and stop and ask the owner before creating anything that costs money
(AlloyDB, Cloud Run min-instances, extra regions). Never print, log or commit keys or tokens; never put them in
`.agent/` files. Use the owner's `gcloud` login (Application Default Credentials); no service-account key files.

### 9.1 Antigravity itself
- Use a Gemini model for the build agents (Antigravity settings → model). Prefer the newest Gemini Pro for planning
  and review, Gemini Flash for routine edits.
- Create a project rules file `.agent/rules/courtroom.md` with: the ground rules in section 0, the tested model and
  location table, "never invent citations", "every generated case is fictional", "typed fallback always", and
  "read env, never hard-code model IDs".
- Create the Agent Skills in `.agent/skills/` (section 1): `case-file-drafting`, `exhibit-drafting`,
  `bench-questioning`, `opposing-counsel`, `witness-roleplay`, `hearing-direction`, `citation-checking`
  (including the live fact-check in 1a), `memorial-drafting`, `rubric-scoring`. Each SKILL.md: name, description,
  when to use, inputs, outputs (JSON schema), rules, one worked example. Add `scripts/` or `examples/` beside a skill
  only when it needs them.
- Add one skill for the build itself, `adk-agent-builder`: how this repo defines an ADK agent, its tools, how to run
  `adk web`, and how to test it, so every new agent follows the same pattern.

### 9.2 Google ADK
- Python 3.12 venv in `.venv` (already created; `google-adk` 2.14.1, `google-genai` 2.34.0 installed). Add
  `requirements.txt` pinning these plus FastAPI, uvicorn, python-dotenv, google-cloud-firestore,
  firebase-admin, asyncpg or psycopg, and `toolbox-core` (MCP Toolbox client).
- Layout: `backend/courtroom/agents/<agent>/agent.py` (one ADK agent each, with `root_agent` for `adk web`),
  `backend/courtroom/tools/` (citation, live_case_search, AlloyDB toolbox loader, firestore), `backend/main.py`
  (FastAPI + WebSocket). Two genai clients as in section 0 (text on `global`, Live on `us-central1`).
- Verify: `adk web backend/courtroom/agents` opens each agent; one test per agent in `backend/tests/`.

### 9.3 Google Cloud project `banthry-courtroom-2026` (billing: buildathon credits, already linked)
Already done by the owner: project created, billing linked, APIs aiplatform, run, firestore, cloudbuild,
artifactregistry enabled, Firestore `(default)` database exists. Then:
1. Enable the rest: `gcloud services enable alloydb.googleapis.com compute.googleapis.com servicenetworking.googleapis.com secretmanager.googleapis.com iam.googleapis.com`.
2. Service account for the app: `courtroom-run@banthry-courtroom-2026.iam.gserviceaccount.com` with roles
   `roles/aiplatform.user`, `roles/datastore.user`, `roles/alloydb.client`, `roles/secretmanager.secretAccessor`,
   `roles/run.invoker` (for calling the Toolbox service). Cloud Run services run as this account.
3. Firebase: add Firebase to the project (console), enable Google sign-in, add the Cloud Run URL to authorised
   domains. Web config values go in `web/.env` (they are public identifiers, not secrets).

### 9.4 AlloyDB (ask the owner before creating: it is billed while running)
- Network: AlloyDB needs Private Service Access on the `default` VPC. Allocate an IP range and connect
  `servicenetworking.googleapis.com` (follow the AlloyDB quickstart; check every flag with `--help` before running).
- Cluster + primary instance in **us-central1** (same region as the Cloud Run service and Live model), smallest
  machine (2 vCPU). Prefer the AlloyDB free trial cluster if the console offers it. Store the database password in
  Secret Manager (`alloydb-courtroom-password`); the owner types it, the agent never sees it.
- Database `courtroom`; extensions `CREATE EXTENSION IF NOT EXISTS vector;` and `google_ml_integration;`; grant
  the AlloyDB service agent Vertex AI user so in-database embeddings work. Create the tables in section 3 with a
  migration script `backend/db/001_init.sql`.
- Load data with `scripts/ingest_judgments.py` (run from Cloud Shell or a Cloud Run job inside the VPC, or through
  the AlloyDB Auth Proxy on the Mac).
- MCP Toolbox for Databases: `toolbox/tools.yaml` with the AlloyDB source (via the AlloyDB connector, IAM or
  Secret Manager password) and the four tools in section 3; deploy as a private Cloud Run service
  `courtroom-toolbox` (ingress internal, `--no-allow-unauthenticated`), with Direct VPC egress to reach AlloyDB.
  The backend calls it with an ID token for its service account.
- Until AlloyDB is up, the same tool interface reads `data/judgments.json` (feature flag `JUDGMENTS_BACKEND=json|alloydb`).
- Teardown note in README: `gcloud alloydb clusters delete ... --force` after the buildathon, unless kept on credits.

### 9.5 Cloud Run deploy
- One Dockerfile: build `web/` (Vite) and serve `web/dist` from FastAPI; port 8080.
- `gcloud run deploy banthry-courtroom --source . --region us-central1 --service-account courtroom-run@... --allow-unauthenticated --timeout 3600 --session-affinity`
  (long timeout and session affinity for the hearing WebSocket). Environment from `backend/.env` values set as
  Cloud Run env vars; secrets from Secret Manager references.
- Smoke test after deploy: `/health` 200, a typed hearing round, one live voice turn, a citation flag.

### 9.6 Verification checklist (report each line)
Antigravity model set · rules file and all SKILL.md files present · `adk web` lists every agent · Gemini text call on
`global` OK · Live call on `us-central1` OK · Firestore write/read OK · (after approval) AlloyDB reachable, tables
created, 6 seed judgments loaded, Toolbox tools return rows · Cloud Run URL serves the app · Firebase sign-in works.

## 8. Demo script (5 minutes)

Juror picks the bail case -> student argues 2 minutes live -> judge interrupts with a hard question -> student cites a
wrong case -> red flag appears and the judge presses it -> opposing counsel rebuts -> student calls the witness for 30
seconds -> End hearing -> scorecard with evidence quotes and an improvement plan.

Write a README with setup, run (`adk web`, `uvicorn`, `npm run dev`), deploy and architecture diagram. Report after
each phase what was built, what was tested, and what is not done.
