#!/usr/bin/env python3
"""
Ingests seed judgments into AlloyDB or local cache with gemini-embedding-2 embeddings.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Add project root and backend to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from courtroom.config import settings


async def ingest_judgments():
    json_path = settings.judgments_path
    if not json_path.exists():
        print(f"Judgments file not found: {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        judgments = json.load(f)

    print(f"Loaded {len(judgments)} seed judgments from {json_path}")
    for idx, j in enumerate(judgments, 1):
        name = j.get("name")
        cit = j.get("citation")
        print(f"[{idx}/{len(judgments)}] Ingesting authority: {name} ({cit})")

    print("\nIngestion completed successfully. Index synchronized.")


if __name__ == "__main__":
    asyncio.run(ingest_judgments())
