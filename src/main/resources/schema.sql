CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    source_url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    context TEXT NOT NULL DEFAULT '',
    keywords_json TEXT NOT NULL DEFAULT '[]',
    effort_score INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    topic TEXT NOT NULL,
    study_method TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL,
    analyzed_at TEXT,
    analysis_status TEXT NOT NULL,
    key_learnings_json TEXT NOT NULL,
    concepts_json TEXT NOT NULL,
    next_steps_json TEXT NOT NULL,
    transcript TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_imported_at ON conversations(imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_topic ON conversations(topic);
