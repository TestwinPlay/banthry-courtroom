# ==============================================================================
# Banthry Courtroom - Multi-Stage Dockerfile for Google Cloud Run
# ==============================================================================

# Stage 1: Build React SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Python 3.12 Backend with Google ADK
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    PYTHONPATH=/app/backend:/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source, data, skills and configuration
COPY backend/ ./backend/
COPY data/ ./data/
COPY .agent/ ./.agent/

# Copy built frontend assets to web/dist for static serving
COPY --from=frontend-builder /web/dist ./web/dist

EXPOSE 8080

CMD exec uvicorn backend.main:app --host 0.0.0.0 --port ${PORT} --workers 1 --ws websockets
