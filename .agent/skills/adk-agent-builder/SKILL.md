---
name: adk-agent-builder
description: Standardized guide for defining Google ADK agents, declaring FunctionTools, wiring dual-region Vertex AI clients, running adk web, and authoring unit tests in Banthry Courtroom.
---

# ADK Agent Builder Skill

## Purpose & When to Use
Used whenever defining, extending, or testing a Google ADK agent within the Banthry Courtroom architecture. Enforces architectural consistency across the 9 specialized agents in `backend/courtroom/agents/`.

## Directory Standard
Every ADK agent in this repository resides in its own package subdirectory:
```
backend/courtroom/agents/
├── <agent_name>/
│   ├── __init__.py
│   └── agent.py      <-- Defines and exports `root_agent = Agent(...)`
```

## Agent Definition Pattern
Each `agent.py` must follow this structure:
```python
from google.adk.agents import Agent
from google.adk.tools import FunctionTool
import os

# 1. Read model name from environment (NEVER hard-code)
# Text/Image: GEMINI_PRO_MODEL or GEMINI_ANALYSIS_MODEL
# Live: GEMINI_LIVE_MODEL
MODEL_NAME = os.getenv("GEMINI_PRO_MODEL", "gemini-3.1-pro-preview")

# 2. Define tools
def my_tool_function(param: str) -> str:
    """Tool docstring describing parameters."""
    return f"Result for {param}"

my_tool = FunctionTool(fn=my_tool_function)

# 3. Create root_agent (required by adk web)
root_agent = Agent(
    name="<agent_name>",
    model=MODEL_NAME,
    instructions="""System prompt matching SKILL.md rules...""",
    tools=[my_tool]
)
```

## Two-Client Architecture Pattern
- **Text & Embedding Operations:**
  - Location: `GOOGLE_CLOUD_LOCATION=global`
  - Model: `GEMINI_ANALYSIS_MODEL` (`gemini-3.8-flash`) or `GEMINI_PRO_MODEL` (`gemini-3.1-pro-preview`)
- **Live Bidirectional Audio Operations:**
  - Location: `GEMINI_LIVE_LOCATION=us-central1`
  - Model: `GEMINI_LIVE_MODEL` (`gemini-3.8-live`), fallback `GEMINI_LIVE_FALLBACK_MODEL` (`gemini-live-2.5-flash-native-audio`)

## Running `adk web`
To test and inspect agents individually through the Google ADK Web UI:
```bash
# From workspace root:
./backend/.venv/bin/adk web --port 8081 backend/courtroom/agents
```
`adk web` discovers all subdirectories with `agent.py` exposing `root_agent` and displays interactive chat and tool inspection interfaces.

## Unit Testing Agents
Each agent has a corresponding unit test in `backend/tests/`:
```python
import pytest
from backend.courtroom.agents.<agent_name>.agent import root_agent

def test_agent_initialization():
    assert root_agent.name == "<agent_name>"
    assert root_agent.model is not None
```
