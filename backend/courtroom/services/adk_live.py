import asyncio
import base64
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional, List
from google.genai import types
from courtroom.config import settings
from courtroom.agents.citation_verifier.agent import extract_and_verify
from courtroom.agents.opposing_counsel.agent import generate_rebuttal
from courtroom.agents.witness.agent import answer_examination
from courtroom.tools.case_fact_tool import get_case_data

logger = logging.getLogger("courtroom.services.adk_live")


def build_bench_instructions(side: str, case_data: Optional[Dict[str, Any]] = None) -> str:
    """Builds a dynamic, authentic Indian High Court appellate bench instruction based on case facts and counsel side."""
    is_petitioner = "petitioner" in side.lower() or "applicant" in side.lower() or "appellant" in side.lower()
    counsel_role = "COUNSEL FOR THE PETITIONER / APPLICANT" if is_petitioner else "COUNSEL FOR THE RESPONDENT / STATE"
    opponent_role = "LEARNED PUBLIC PROSECUTOR (STATE COUNSEL)" if is_petitioner else "LEARNED SENIOR ADVOCATE (FOR PETITIONER)"
    
    title = case_data.get("title", "Arjun Mehra v. State of Rajasthan") if case_data else "Arjun Mehra v. State of Rajasthan"
    forum = case_data.get("forum", "High Court of Judicature (Appellate Criminal Jurisdiction)") if case_data else "High Court of Judicature"
    parties = case_data.get("parties", {}) if case_data else {}
    applicant = parties.get("applicant", "Arjun Mehra")
    respondent = parties.get("respondent", "State of Rajasthan")
    
    # Extract agreed facts
    facts = []
    if case_data:
        if "facts" in case_data and isinstance(case_data["facts"], list):
            facts = case_data["facts"][:5]
        elif "proposition_paragraphs" in case_data:
            facts = [p.get("text", "") for p in case_data["proposition_paragraphs"] if isinstance(p, dict)][:5]
    if not facts:
        facts = [
            "FIR registered under Section 316(2) and Section 318(4) Bharatiya Nyaya Sanhita (BNS), 2023.",
            "Investigating Officer issued notice under Section 35(3) BNSS requiring appearance within 48 hours.",
            "Applicant hospitalized in Delhi with respiratory ailment; request for deferral was refused.",
            "Non-Bailable Warrant (NBW) issued under Section 73 BNSS; anticipatory bail moved under Section 482 BNSS."
        ]
    facts_text = "\n".join([f"  - ¶{i+1}: {f}" for i, f in enumerate(facts)])
    
    # Extract issues
    issues = case_data.get("issues", []) if case_data else []
    if not issues:
        issues = [
            "Whether anticipatory bail under Section 482 BNSS is maintainable following medical non-compliance with Section 35(3) BNSS notice.",
            "Whether custodial interrogation is indispensable in an offense founded on banking and electronic documentary records."
        ]
    issues_text = "\n".join([f"  - Issue {i+1}: {iss}" for i, iss in enumerate(issues)])

    return f"""You are the appellate division bench and opposing counsel of the {forum} hearing the criminal matter:
"{title}" (Applicant: {applicant} vs. Respondent: {respondent}).

PARTICIPANTS & ROLES:
1. Student Advocate: {counsel_role}
2. [J1] Hon'ble Presiding Judge: Commanding, authoritative, stern. Leads the bench on statutory requirements under BNSS/BNS and judicial procedure.
3. [J2] Hon'ble Senior Puisne Judge: Piercing on the factual record and financial accounting. Probes diversion of funds and evidence tampering.
4. [J3] Hon'ble Junior Puisne Judge: Relentless on legal authorities and precedents. Demands exact citations and specific paragraph numbers.
5. [OC] {opponent_role}: Raises sharp objections, counters submissions, and zealously defends the opposing position.

CASE RECORD (AGREED FACTS):
{facts_text}

SUBSTANTIVE ISSUES FRAMED:
{issues_text}

STUDENT ADVOCATE ALIGNMENT:
The advocate is appearing as {counsel_role}.
{"- Since student argues for PETITIONER: The Bench tests why anticipatory bail should be granted despite statutory non-compliance. [OC] opposes pre-arrest protection under P. Chidambaram." if is_petitioner else "- Since student argues for STATE / RESPONDENT: The Bench tests why custodial interrogation is needed when documents are already seized, putting Arnesh Kumar and Satender Antil to the State. [OC] argues for liberty under Article 21 and Gurbaksh Singh Sibbia."}

RULES OF ADVOCACY & TWO-WAY INTERRUPTIONS:
1. Terse & Piercing: 1 to 2 sharp sentences max per judicial turn. Always ask strictly ONE question.
2. Tag Every Turn: Begin with "[J1] Counsel, ...", "[J2] Counsel, ...", "[J3] Counsel, ...", or "[OC] My Lords, ...".
3. Judicial Interruption: If counsel wanders, speaks past 35 seconds, or evades, interrupt sharply: "[J1] Counsel, let us stop you there. Answer the Bench directly: Yes or No."
4. Advocate Interruption: If counsel interrupts with the Court's leave ("With respect, my Lords..."), acknowledge it immediately: "[J1] Very well, Counsel. Be brief. What is your clarification?"
5. Citation Auditing: If counsel cites an unverified, fake, or misquoted precedent, challenge them instantly: "[J3] Counsel, which law report records that proposition? Cite the paragraph."
6. Decorum: Maintain Indian High Court appellate solemnity at all times. Never mention AI, LLMs, or software models.
"""


class ADKHearingSession:
    """
    Manages a live oral advocacy moot court hearing session powered by Gemini Live
    (gemini-3.8-live / us-central1) with real-time speech-to-speech bidi streaming,
    live captions, side selection (Petitioner/Respondent), and two-way interruptions.
    """

    def __init__(self, session_id: str, side: str = "Petitioner", case_id: str = "default"):
        self.session_id = session_id
        self.side = side or "Petitioner"
        self.case_id = case_id or "default"
        self.is_running = False
        self._input_queue: asyncio.Queue = asyncio.Queue()
        self._output_queue: asyncio.Queue = asyncio.Queue()
        self.turn_count = 0
        self.flagged_citations: List[Dict[str, Any]] = []
        self.witness_mode = False
        self.witness_name = "Inspector Vikrant Rane"
        self._client = None
        self._live_session = None
        self._worker_task: Optional[asyncio.Task] = None

    async def initialize(self):
        """Initializes the live client."""
        try:
            self._client = settings.get_live_client()
            logger.info(f"Initialized Gemini Live client for session {self.session_id} (Side: {self.side})")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Live client: {e}")
            self._client = None

    async def push_audio(self, pcm16_bytes: bytes):
        """Pushes 16 kHz PCM16 mono audio bytes from client microphone."""
        await self._input_queue.put({"type": "audio", "bytes": pcm16_bytes})

    async def push_text(self, text: str):
        """Pushes typed counsel submission into the session queue."""
        await self._input_queue.put({"type": "text", "text": text})

    async def push_interrupt(self, text: str):
        """Pushes counsel interjection / interruption to the bench."""
        await self._input_queue.put({"type": "interrupt", "text": text})

    async def call_witness(self, witness_name: str = "Inspector Vikrant Rane"):
        """Switches session into witness examination mode."""
        self.witness_mode = True
        self.witness_name = witness_name
        await self._input_queue.put({"type": "system", "action": "call_witness", "name": witness_name})

    def _determine_speaker(self, text: str) -> tuple[str, str]:
        """Maps turn prefix to UI participant avatar and label."""
        cleaned = text.strip()
        is_petitioner = "petitioner" in self.side.lower() or "applicant" in self.side.lower()
        opponent_label = "Learned Public Prosecutor" if is_petitioner else "Counsel for Petitioner"

        if cleaned.startswith("[J1]") or "Presiding" in cleaned[:30]:
            return "J1", "Hon'ble Presiding Judge"
        elif cleaned.startswith("[J2]"):
            return "J2", "Hon'ble Senior Puisne Judge"
        elif cleaned.startswith("[J3]"):
            return "J3", "Hon'ble Junior Puisne Judge"
        elif cleaned.startswith("[OC]") or cleaned.startswith("OC") or "Prosecutor" in cleaned[:30] or "Opposing" in cleaned[:30]:
            return "opposing_counsel", opponent_label
        elif cleaned.startswith("[W]") or "Witness" in cleaned[:30]:
            return "witness", f"Witness ({self.witness_name})"

        # Fallback rotation
        speakers = [
            ("J1", "Hon'ble Presiding Judge"),
            ("J2", "Hon'ble Senior Puisne Judge"),
            ("opposing_counsel", opponent_label),
            ("J3", "Hon'ble Junior Puisne Judge")
        ]
        return speakers[self.turn_count % len(speakers)]

    def _strip_prefix(self, text: str) -> str:
        """Strips bracketed speaker tag from user-facing text."""
        t = text.strip()
        for prefix in ("[J1]", "[J2]", "[J3]", "[OC]", "[W]"):
            if t.startswith(prefix):
                t = t[len(prefix):].strip()
        return t

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Async generator yielding real-time WebSocket events:
        - Audio chunks (PCM 24kHz base64)
        - Streaming captions
        - Turn transcripts
        - Citation verification flags
        """
        self.is_running = True
        self._worker_task = asyncio.create_task(self._run_live_pipeline())

        while self.is_running:
            try:
                event = await asyncio.wait_for(self._output_queue.get(), timeout=0.5)
                yield event
            except asyncio.TimeoutError:
                if self._worker_task and self._worker_task.done():
                    while not self._output_queue.empty():
                        yield self._output_queue.get_nowait()
                    break
                continue
            except Exception as e:
                logger.error(f"Error in stream_events queue dispatch: {e}")
                break

    async def _run_live_pipeline(self):
        """Orchestrates the bidirectional Gemini Live session with resilient fallback."""
        try:
            case_data = get_case_data(self.case_id)
            system_instruction_text = build_bench_instructions(self.side, case_data)

            live_config = types.LiveConnectConfig(
                response_modalities=['AUDIO'],
                output_audio_transcription=types.AudioTranscriptionConfig(),
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Fenrir")
                    )
                ),
                system_instruction=types.Content(parts=[types.Part.from_text(text=system_instruction_text)])
            )

            client = self._client or settings.get_live_client()
            live_model = settings.model_live

            logger.info(f"Connecting to Gemini Live with model {live_model} for side '{self.side}'...")
            async with client.aio.live.connect(model=live_model, config=live_config) as session:
                self._live_session = session
                logger.info("Successfully established Gemini Live bidi connection.")

                # Prompt opening question based on student's side
                is_petitioner = "petitioner" in self.side.lower() or "applicant" in self.side.lower()
                opening_cue = (
                    f"The court is in session. The advocate appears as Counsel for the Petitioner. Deliver your opening judicial interrogation as [J1] Presiding Judge, testing non-compliance with the Section 35(3) notice and maintainability under Section 482 BNSS."
                    if is_petitioner else
                    f"The court is in session. The advocate appears as Counsel for the State/Respondent. Deliver your opening judicial interrogation as [J1] Presiding Judge, demanding why custodial interrogation is needed when records are already seized, challenging the State under Arnesh Kumar."
                )

                await session.send_client_content(
                    turns=[types.Content(parts=[types.Part.from_text(text=opening_cue)])],
                    turn_complete=True
                )

                # Process first turn from Gemini
                await self._collect_gemini_turn(session)

                # Event loop for advocate input & interruptions
                while self.is_running:
                    item = await self._input_queue.get()
                    item_type = item.get("type")

                    if item_type == "audio":
                        raw_bytes = item.get("bytes")
                        if raw_bytes:
                            await session.send_realtime_input(
                                audio=types.Blob(data=raw_bytes, mime_type="audio/pcm;rate=16000")
                            )

                    elif item_type == "text":
                        user_text = item.get("text", "")
                        self.turn_count += 1
                        asyncio.create_task(self._verify_and_emit_citations(user_text))

                        if self.witness_mode:
                            prompt = f"[Counsel cross-examines {self.witness_name}]: {user_text}\nRespond as [W] {self.witness_name} consistently with your statement."
                        else:
                            prompt = f"[Counsel ({self.side}) argues]: {user_text}\nEvaluate this submission from the advocate for the {self.side}, challenge its flaws, and formulate the next sharp judicial interruption or question."

                        await session.send_client_content(
                            turns=[types.Content(parts=[types.Part.from_text(text=prompt)])],
                            turn_complete=True
                        )
                        await self._collect_gemini_turn(session)

                    elif item_type == "interrupt":
                        user_text = item.get("text", "With the Court's leave, Counsel wishes to address that point directly.")
                        prompt = f"[Counsel ({self.side}) interjects with the Court's permission]: '{user_text}'\nAcknowledge the advocate's interjection immediately as [J1] or [J2], evaluate their clarification, and challenge it pointedly."
                        await session.send_client_content(
                            turns=[types.Content(parts=[types.Part.from_text(text=prompt)])],
                            turn_complete=True
                        )
                        await self._collect_gemini_turn(session)

                    elif item_type == "system" and item.get("action") == "call_witness":
                        w_name = item.get("name", "Inspector Vikrant Rane")
                        await self._output_queue.put({
                            "type": "transcript",
                            "speaker": "Court Master",
                            "who": "clerk",
                            "text": f"Witness {w_name} takes the virtual witness stand. Counsel may proceed with examination."
                        })
                        await session.send_client_content(
                            turns=[types.Content(parts=[types.Part.from_text(
                                text=f"The court calls {w_name} to the witness stand. Acknowledge as [W] that you are sworn in."
                            )])],
                            turn_complete=True
                        )
                        await self._collect_gemini_turn(session)

        except Exception as e:
            logger.warning(f"Gemini Live session interrupted: {e}. Falling back to resilient mode.")
            await self._run_fallback_loop()

    async def _collect_gemini_turn(self, session):
        """Streams audio chunks and captions from Gemini Live until turn completion."""
        current_text_parts = []
        current_who = "J1"
        current_speaker = "Hon'ble Presiding Judge"

        async for resp in session.receive():
            sc = resp.server_content
            if not sc:
                continue

            # 1. Output audio transcription (real-time captions)
            if sc.output_transcription and sc.output_transcription.text:
                chunk_text = sc.output_transcription.text
                current_text_parts.append(chunk_text)
                accumulated = "".join(current_text_parts)

                who, speaker = self._determine_speaker(accumulated)
                current_who = who
                current_speaker = speaker

                await self._output_queue.put({
                    "type": "caption",
                    "who": current_who,
                    "speaker": current_speaker,
                    "text": self._strip_prefix(accumulated)
                })

            # 2. Audio chunks (PCM 24kHz)
            if sc.model_turn:
                for part in sc.model_turn.parts:
                    if part.inline_data and part.inline_data.data:
                        raw_audio = part.inline_data.data
                        if len(raw_audio) % 2 != 0:
                            raw_audio = raw_audio[:-1]
                        b64_audio = base64.b64encode(raw_audio).decode("utf-8")
                        await self._output_queue.put({
                            "type": "audio",
                            "audio": b64_audio
                        })

            # 3. Turn complete
            if sc.turn_complete:
                full_raw = "".join(current_text_parts)
                final_text = self._strip_prefix(full_raw) or f"Counsel for the {self.side}, state your grounds under Section 482 BNSS."
                who, speaker = self._determine_speaker(full_raw)

                await self._output_queue.put({
                    "type": "transcript",
                    "who": who,
                    "speaker": speaker,
                    "text": final_text
                })
                await self._output_queue.put({
                    "type": "turn_complete",
                    "who": who,
                    "text": final_text
                })
                break

    async def _verify_and_emit_citations(self, text: str):
        """Extracts and verifies authorities mentioned in counsel submission."""
        try:
            cites = await extract_and_verify(text)
            for c in cites:
                await self._output_queue.put({
                    "type": "citation_flag",
                    "name": c.get("name"),
                    "citation": c.get("citation"),
                    "status": c.get("status"),
                    "source_url": c.get("source_url"),
                    "bench_response_hint": c.get("bench_response_hint"),
                    "note": c.get("note")
                })
                if c.get("status") in ("not_found", "misquoted", "unconfirmed"):
                    self.flagged_citations.append(c)
        except Exception as e:
            logger.warning(f"Background citation check exception: {e}")

    async def _run_fallback_loop(self):
        """Resilient fallback loop using Gemini Analysis model if Live socket drops."""
        logger.info(f"Executing resilient Gemini hearing loop for side '{self.side}'...")
        is_petitioner = "petitioner" in self.side.lower() or "applicant" in self.side.lower()

        fallback_turns = [
            ("J1", f"Counsel for the {self.side}, address the Bench on the maintainability of this application under Section 482 BNSS."),
            ("J2", "Paragraph 4 of the FIR details ₹4.8 Crores diverted subsidy funds. How do you address custodial interrogation?"),
            ("opposing_counsel", "May it please your Lordships, in economic offenses involving public funds, anticipatory bail at threshold hampers investigation as held in P. Chidambaram."),
            ("J3", "Under Sushila Aggarwal, anticipatory bail is not granted mechanically. What condition prevents tampering with cloud servers?"),
            ("J1", "Counsel, answer the Bench directly: Has your client surrendered his passport to the Investigating Officer?")
        ] if is_petitioner else [
            ("J1", "Counsel for the State, why is custodial interrogation indispensable when all banking vouchers are already seized?"),
            ("J2", "Does Arnesh Kumar not prohibit routine arrest in offenses punishable up to 7 years? How do you justify seeking police custody?"),
            ("opposing_counsel", "May it please your Lordships, the applicant has roots in society and has submitted all transaction ledgers; custodial remand would violate Article 21."),
            ("J3", "Under Satender Kumar Antil, personal liberty cannot be curtailed on vague apprehensions. Where is the recorded justification?"),
            ("J1", "Counsel for the State, has the IO recorded reasons under Section 35(1) BNSS prior to summoning?")
        ]

        # Opening question if needed
        if self.turn_count == 0:
            who, text = fallback_turns[0]
            await self._output_queue.put({
                "type": "transcript",
                "who": who,
                "speaker": "Hon'ble Presiding Judge",
                "text": text
            })
            await self._output_queue.put({"type": "turn_complete", "who": who, "text": text})

        while self.is_running:
            item = await self._input_queue.get()
            item_type = item.get("type")

            if item_type in ("text", "interrupt"):
                user_text = item.get("text", "")
                self.turn_count += 1
                asyncio.create_task(self._verify_and_emit_citations(user_text))

                try:
                    text_client = settings.get_text_client()
                    prompt = f"Indian High Court judge hearing Section 482 BNSS bail. Advocate argues for {self.side}: '{user_text}'. Respond in max 2 sentences with ONE sharp question or objection. Begin with '[J1] Counsel, ' or '[J2] Counsel, ' or '[OC] My Lords, '."
                    resp = await asyncio.to_thread(
                        text_client.models.generate_content,
                        model=settings.model_analysis,
                        contents=prompt
                    )
                    gen_text = resp.text.strip()
                    who, speaker = self._determine_speaker(gen_text)
                    clean_text = self._strip_prefix(gen_text)
                except Exception as e:
                    logger.warning(f"Fallback generation error: {e}")
                    who, clean_text = fallback_turns[self.turn_count % len(fallback_turns)]
                    speaker = "Hon'ble Bench" if who.startswith("J") else "Opposing Counsel"

                await self._output_queue.put({
                    "type": "transcript",
                    "who": who,
                    "speaker": speaker,
                    "text": clean_text
                })
                await self._output_queue.put({
                    "type": "turn_complete",
                    "who": who,
                    "text": clean_text
                })

    def stop(self):
        """Stops the hearing session and cancels active tasks."""
        self.is_running = False
        if self._worker_task:
            self._worker_task.cancel()
        if self._live_session:
            try:
                asyncio.create_task(self._live_session.close())
            except Exception:
                pass
