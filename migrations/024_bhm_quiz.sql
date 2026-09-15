-- ============================================
-- BHM AIvor Icons Quiz — October 2026 only
-- Spec: blkout/projects/bhm-2026/docs/aivor-quiz-spec.md
-- Deliberately separate from ivor_conversation_memory: this is structured
-- game state for a time-boxed promotion, not general AI session recall.
-- Drop both tables after the 31 Oct draw.
-- ============================================

CREATE TABLE bhm_quiz_progress (
    session_id TEXT PRIMARY KEY,
    letters_collected TEXT[] NOT NULL DEFAULT '{}',
    word_solved BOOLEAN NOT NULL DEFAULT false,
    entered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bhm_quiz_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    email TEXT NOT NULL,
    submitted_word TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bhm_quiz_entries_email ON bhm_quiz_entries(email);

ALTER TABLE bhm_quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bhm_quiz_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON bhm_quiz_progress
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all" ON bhm_quiz_entries
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
