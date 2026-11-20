-- ==============================================================================
-- Banthry Courtroom - AlloyDB Schema Initialization
-- Extensions: pgvector, google_ml_integration
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS google_ml_integration;

-- Judgments Master Table
CREATE TABLE IF NOT EXISTS judgments (
    id VARCHAR(64) PRIMARY KEY,
    title TEXT NOT NULL,
    citation VARCHAR(128) NOT NULL,
    court VARCHAR(128) DEFAULT 'Supreme Court of India',
    decision_date DATE,
    source_url TEXT,
    full_text TEXT,
    summary TEXT,
    embedding vector(768)
);

CREATE INDEX IF NOT EXISTS idx_judgments_citation ON judgments(citation);
CREATE INDEX IF NOT EXISTS idx_judgments_title ON judgments USING gin (to_tsvector('english', title));

-- Judgment Paragraph Chunks for Semantic Search
CREATE TABLE IF NOT EXISTS judgment_chunks (
    id SERIAL PRIMARY KEY,
    judgment_id VARCHAR(64) REFERENCES judgments(id) ON DELETE CASCADE,
    para_no INT NOT NULL,
    text TEXT NOT NULL,
    embedding vector(768)
);

CREATE INDEX IF NOT EXISTS idx_judgment_chunks_embedding ON judgment_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Fictional Generated Moot Problems
CREATE TABLE IF NOT EXISTS moot_problems (
    id VARCHAR(64) PRIMARY KEY,
    judgment_id VARCHAR(64) REFERENCES judgments(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    problem_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
