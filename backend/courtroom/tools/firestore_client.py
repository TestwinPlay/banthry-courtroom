import logging
from typing import Dict, Any, Optional
from courtroom.config import settings

logger = logging.getLogger("courtroom.tools.firestore")

_MEMORY_SESSIONS: Dict[str, Dict[str, Any]] = {}
_MEMORY_SCORECARDS: Dict[str, Dict[str, Any]] = {}

_firestore_db = None


def get_firestore_client():
    global _firestore_db
    if _firestore_db is not None:
        return _firestore_db
    try:
        from google.cloud import firestore
        _firestore_db = firestore.AsyncClient(
            project=settings.google_cloud_project,
            database=settings.firestore_database
        )
        return _firestore_db
    except Exception as e:
        logger.info(f"Using in-memory store (Firestore client init: {e})")
        return None


async def save_session(session_id: str, data: Dict[str, Any]) -> bool:
    _MEMORY_SESSIONS[session_id] = data
    client = get_firestore_client()
    if client:
        try:
            doc_ref = client.collection(settings.firestore_collection_sessions).document(session_id)
            await doc_ref.set(data)
            return True
        except Exception as e:
            logger.warning(f"Firestore session write failed: {e}")
    return True


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    client = get_firestore_client()
    if client:
        try:
            doc_ref = client.collection(settings.firestore_collection_sessions).document(session_id)
            doc = await doc_ref.get()
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            logger.warning(f"Firestore session read failed: {e}")
    return _MEMORY_SESSIONS.get(session_id)


async def save_scorecard(session_id: str, data: Dict[str, Any]) -> bool:
    _MEMORY_SCORECARDS[session_id] = data
    client = get_firestore_client()
    if client:
        try:
            doc_ref = client.collection(settings.firestore_collection_scorecards).document(session_id)
            await doc_ref.set(data)
            return True
        except Exception as e:
            logger.warning(f"Firestore scorecard write failed: {e}")
    return True


async def get_scorecard(session_id: str) -> Optional[Dict[str, Any]]:
    client = get_firestore_client()
    if client:
        try:
            doc_ref = client.collection(settings.firestore_collection_scorecards).document(session_id)
            doc = await doc_ref.get()
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            logger.warning(f"Firestore scorecard read failed: {e}")
    return _MEMORY_SCORECARDS.get(session_id)
