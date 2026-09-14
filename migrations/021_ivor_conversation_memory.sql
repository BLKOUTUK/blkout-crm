-- ============================================
-- IVOR Conversation Memory
-- Cross-session personalisation store. Matches the payload already written by
-- ConversationService.storeConversationMemory() (ivor-core/src/conversationService.ts:260-295),
-- which has been failing silently on every call because this table never existed.
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ivor_conversation_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value JSONB NOT NULL,
    importance_score NUMERIC DEFAULT 0.5,
    embedding VECTOR(1536),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, session_id, memory_key)
);

CREATE INDEX idx_ivor_conversation_memory_user_session
    ON ivor_conversation_memory(user_id, session_id);
CREATE INDEX idx_ivor_conversation_memory_importance
    ON ivor_conversation_memory(importance_score DESC, last_accessed DESC);

ALTER TABLE ivor_conversation_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON ivor_conversation_memory
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
