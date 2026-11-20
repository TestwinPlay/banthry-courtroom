import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from google.cloud import firestore
from backend.app.config import settings
from backend.app.schemas.session import SessionResponse, TranscriptTurn, ObjectionEvent
from backend.app.schemas.scorecard import Scorecard

logger = logging.getLogger(__name__)


class FirestoreService:
    """Handles persistence of moot sessions, transcripts, and scorecards in Google Cloud Firestore."""

    def __init__(self):
        self.project = settings.google_cloud_project
        self.database = settings.firestore_database
        self.sessions_col = settings.firestore_collection_sessions
        self.scorecards_col = settings.firestore_collection_scorecards
        
        self._client: Optional[firestore.AsyncClient] = None
        # Fallback local in-memory store for local testing without GCP credentials
        self._local_sessions: Dict[str, Dict[str, Any]] = {}
        self._local_scorecards: Dict[str, Dict[str, Any]] = {}
        self._local_transcripts: Dict[str, List[Dict[str, Any]]] = {}
        self._local_objections: Dict[str, List[Dict[str, Any]]] = {}

    def _get_client(self) -> Optional[firestore.AsyncClient]:
        if self._client is None:
            try:
                # Try initializing async Firestore client
                self._client = firestore.AsyncClient(
                    project=self.project,
                    database=self.database
                )
                logger.info("Connected to Google Cloud Firestore.")
            except Exception as e:
                logger.warning(
                    f"Firestore connection failed (falling back to in-memory store for local dev): {e}"
                )
                self._client = None
        return self._client

    async def save_session(self, session_data: Dict[str, Any]) -> str:
        session_id = session_data["session_id"]
        client = self._get_client()
        if client:
            try:
                doc_ref = client.collection(self.sessions_col).document(session_id)
                await doc_ref.set(session_data)
                return session_id
            except Exception as e:
                logger.error(f"Error saving session to Firestore: {e}")
        
        # Local fallback
        self._local_sessions[session_id] = session_data
        return session_id

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        client = self._get_client()
        if client:
            try:
                doc_ref = client.collection(self.sessions_col).document(session_id)
                doc = await doc_ref.get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Error fetching session from Firestore: {e}")

        return self._local_sessions.get(session_id)

    async def append_transcript_turn(self, session_id: str, turn: TranscriptTurn) -> None:
        client = self._get_client()
        turn_dict = turn.model_dump(mode="json")
        if client:
            try:
                col_ref = (
                    client.collection(self.sessions_col)
                    .document(session_id)
                    .collection("transcripts")
                )
                await col_ref.add(turn_dict)
            except Exception as e:
                logger.error(f"Error appending transcript to Firestore: {e}")

        # Local fallback
        if session_id not in self._local_transcripts:
            self._local_transcripts[session_id] = []
        self._local_transcripts[session_id].append(turn_dict)

    async def get_transcripts(self, session_id: str) -> List[Dict[str, Any]]:
        client = self._get_client()
        if client:
            try:
                col_ref = (
                    client.collection(self.sessions_col)
                    .document(session_id)
                    .collection("transcripts")
                    .order_by("timestamp")
                )
                docs = await col_ref.get()
                return [d.to_dict() for d in docs]
            except Exception as e:
                logger.error(f"Error retrieving transcripts from Firestore: {e}")

        return self._local_transcripts.get(session_id, [])

    async def record_objection(self, session_id: str, objection: ObjectionEvent) -> None:
        client = self._get_client()
        obj_dict = objection.model_dump(mode="json")
        if client:
            try:
                col_ref = (
                    client.collection(self.sessions_col)
                    .document(session_id)
                    .collection("objections")
                )
                await col_ref.document(objection.id).set(obj_dict)
            except Exception as e:
                logger.error(f"Error saving objection to Firestore: {e}")

        if session_id not in self._local_objections:
            self._local_objections[session_id] = []
        self._local_objections[session_id].append(obj_dict)

    async def get_objections(self, session_id: str) -> List[Dict[str, Any]]:
        client = self._get_client()
        if client:
            try:
                col_ref = (
                    client.collection(self.sessions_col)
                    .document(session_id)
                    .collection("objections")
                )
                docs = await col_ref.get()
                return [d.to_dict() for d in docs]
            except Exception as e:
                logger.error(f"Error retrieving objections from Firestore: {e}")

        return self._local_objections.get(session_id, [])

    async def save_scorecard(self, scorecard: Scorecard) -> None:
        sc_dict = scorecard.model_dump(mode="json")
        client = self._get_client()
        if client:
            try:
                doc_ref = client.collection(self.scorecards_col).document(scorecard.session_id)
                await doc_ref.set(sc_dict)
                return
            except Exception as e:
                logger.error(f"Error saving scorecard to Firestore: {e}")

        self._local_scorecards[scorecard.session_id] = sc_dict

    async def get_scorecard(self, session_id: str) -> Optional[Dict[str, Any]]:
        client = self._get_client()
        if client:
            try:
                doc_ref = client.collection(self.scorecards_col).document(session_id)
                doc = await doc_ref.get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                logger.error(f"Error fetching scorecard from Firestore: {e}")

        return self._local_scorecards.get(session_id)


firestore_service = FirestoreService()
