import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Banthry Courtroom Backend Configuration Settings."""
    
    # GCP / Vertex AI
    google_cloud_project: str = os.getenv("GOOGLE_CLOUD_PROJECT", "banthry-courtroom")
    google_cloud_location: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    google_genai_use_enterprise: bool = True

    # Models
    gemini_live_model: str = "gemini-2.0-flash-exp"
    gemini_analysis_model: str = "gemini-2.5-flash"

    # Firestore
    firestore_database: str = "(default)"
    firestore_collection_sessions: str = "courtroom_sessions"
    firestore_collection_scorecards: str = "courtroom_scorecards"

    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    environment: str = "development"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
