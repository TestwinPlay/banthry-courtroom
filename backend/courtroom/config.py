import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from google import genai

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Google Cloud & Vertex AI settings
    google_cloud_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "banthry-courtroom-2026")
    google_cloud_location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
    gemini_live_location: str = os.getenv("GEMINI_LIVE_LOCATION", "us-central1")
    google_genai_use_vertexai: bool = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "TRUE").upper() == "TRUE"

    # Models (read from environment, never hard-code)
    model_analysis: str = os.getenv("GEMINI_ANALYSIS_MODEL", "gemini-3.8-flash")
    model_pro: str = os.getenv("GEMINI_PRO_MODEL", "gemini-3.1-pro-preview")
    model_image: str = os.getenv("GEMINI_IMAGE_MODEL", "gemini-nano-banana-2.1")
    model_live: str = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.8-live")
    model_live_fallback: str = os.getenv("GEMINI_LIVE_FALLBACK_MODEL", "gemini-live-2.5-flash-native-audio")
    model_embedding: str = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")

    # Backend database flag
    judgments_backend: str = os.getenv("JUDGMENTS_BACKEND", "json")

    # Firestore
    firestore_database: str = os.getenv("FIRESTORE_DATABASE", "(default)")
    firestore_collection_sessions: str = os.getenv("FIRESTORE_COLLECTION_SESSIONS", "courtroom_sessions")
    firestore_collection_scorecards: str = os.getenv("FIRESTORE_COLLECTION_SCORECARDS", "courtroom_scorecards")

    # Server settings
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", 8080))
    environment: str = os.getenv("ENVIRONMENT", "development")

    # Paths
    data_dir: Path = BASE_DIR / "data"
    judgments_path: Path = BASE_DIR / "data" / "judgments.json"
    web_dist_dir: Path = BASE_DIR / "web" / "dist"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_text_client(self) -> genai.Client:
        """Returns google-genai Client configured for global location (Text, Pro, Flash, Image, Embeddings)."""
        return genai.Client(
            vertexai=self.google_genai_use_vertexai,
            project=self.google_cloud_project,
            location=self.google_cloud_location
        )

    def get_live_client(self) -> genai.Client:
        """Returns google-genai Client configured for us-central1 location (Live speech-to-speech)."""
        return genai.Client(
            vertexai=self.google_genai_use_vertexai,
            project=self.google_cloud_project,
            location=self.gemini_live_location
        )


settings = Settings()
