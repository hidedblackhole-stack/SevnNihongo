-- ==============================================================================
-- NIHONGO QUEST: IDENTITY & RELATIONAL ARCHITECTURE MIGRATION
-- Migration: 20260911_identity_architecture.sql
-- Description: Sets up production-grade normalized entities, knowledge graph,
--              curriculum-content junction, 4D user mastery, SRS, and activity stream.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. 🧱 CORE KNOWLEDGE: KANJI
-- ==============================================================================
CREATE TABLE IF NOT EXISTS kanji (
    id TEXT PRIMARY KEY,                       -- e.g. 'kanji_001' or permanent UUID
    character VARCHAR(10) NOT NULL UNIQUE,     -- e.g. '学'
    unicode VARCHAR(10),                       -- e.g. 'U+5B66'
    jlpt_level VARCHAR(5),                     -- e.g. 'N5', 'N4', 'N3', 'N2', 'N1'
    grade INTEGER,                             -- School grade 1-6, junior high
    joyo BOOLEAN DEFAULT TRUE,
    jinmeiyo BOOLEAN DEFAULT FALSE,
    kanken_level VARCHAR(10),
    stroke_count INTEGER NOT NULL DEFAULT 1,
    onyomi JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of onyomi strings
    kunyomi JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of kunyomi strings
    nanori JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Name readings
    meanings JSONB NOT NULL DEFAULT '[]'::jsonb,-- Indonesian & English meanings
    meaning_id TEXT,                           -- Indonesian translation summary
    meaning_en TEXT,                           -- English translation summary
    radical VARCHAR(50),
    radical_name VARCHAR(100),
    frequency INTEGER,                         -- Newspaper frequency rank
    commonness NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'published',    -- draft, published, archived
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanji_character ON kanji (character);
CREATE INDEX IF NOT EXISTS idx_kanji_jlpt ON kanji (jlpt_level);

-- ==============================================================================
-- 2. ✍️ KANJI WRITING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS kanji_writing (
    id TEXT PRIMARY KEY DEFAULT ('kw_' || gen_random_uuid()),
    kanji_id TEXT NOT NULL REFERENCES kanji(id) ON DELETE CASCADE,
    stroke_count INTEGER NOT NULL,
    stroke_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    stroke_paths JSONB NOT NULL DEFAULT '[]'::jsonb,       -- SVG stroke paths
    stroke_direction JSONB NOT NULL DEFAULT '[]'::jsonb,
    stroke_start_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    stroke_end_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    bounding_box JSONB,
    recognition_model VARCHAR(50) DEFAULT 'hanzi_writer_svg',
    tolerance NUMERIC(4,2) DEFAULT 0.80,
    source VARCHAR(100) DEFAULT 'hanzi-writer-data-jp',
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanji_writing_kanji ON kanji_writing (kanji_id);

-- ==============================================================================
-- 3. 📖 VOCABULARY (KOTOBA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vocabulary (
    id TEXT PRIMARY KEY,                       -- e.g. 'kotoba_0001' or permanent UUID
    word TEXT NOT NULL,                        -- e.g. '毎朝'
    normalized_word TEXT,
    reading TEXT NOT NULL,                     -- e.g. 'まいあさ'
    pitch_accent VARCHAR(20),                  -- e.g. '[1]', 'atamadaka'
    meaning_id TEXT,                           -- Indonesian primary meaning
    meaning_en TEXT,                           -- English primary meaning
    meaning_ja TEXT,                           -- Japanese dictionary definition
    meanings JSONB NOT NULL DEFAULT '[]'::jsonb,
    part_of_speech JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["noun", "suru_verb"]
    jlpt_level VARCHAR(5),
    frequency INTEGER,
    commonness NUMERIC(5,2),
    kanji_ids JSONB NOT NULL DEFAULT '[]'::jsonb,      -- Foreign refs to kanji(id)
    kana_only BOOLEAN DEFAULT FALSE,
    transitivity VARCHAR(20),                  -- intransitive (jidoushi), transitive (tadoushi)
    conjugation_type VARCHAR(30),              -- godan, ichidan, suru, kuru
    register VARCHAR(30),                      -- polite, casual, formal, keigo
    domain VARCHAR(50),                        -- kaigo, business, daily, it
    collocations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'published',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary (word);
CREATE INDEX IF NOT EXISTS idx_vocab_reading ON vocabulary (reading);
CREATE INDEX IF NOT EXISTS idx_vocab_jlpt ON vocabulary (jlpt_level);

-- ==============================================================================
-- 4. 🔊 VOCABULARY AUDIO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vocabulary_audio (
    id TEXT PRIMARY KEY DEFAULT ('va_' || gen_random_uuid()),
    vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    speaker VARCHAR(100),
    gender VARCHAR(10),                        -- 'male', 'female', 'neutral'
    accent_region VARCHAR(50) DEFAULT 'tokyo',
    speed NUMERIC(3,2) DEFAULT 1.0,            -- 0.8, 1.0, 1.2
    duration NUMERIC(6,2),                     -- seconds
    source VARCHAR(50) DEFAULT 'native_recording', -- native_recording, ai_generated
    quality VARCHAR(20) DEFAULT 'high',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_audio_vocab ON vocabulary_audio (vocabulary_id);

-- ==============================================================================
-- 5. ✍️ VOCABULARY WRITING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vocabulary_writing (
    id TEXT PRIMARY KEY DEFAULT ('vw_' || gen_random_uuid()),
    vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    writing_system VARCHAR(20) DEFAULT 'kanji_kana_mixed',
    kana_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
    kanji_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
    stroke_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    recognition_rules JSONB,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. 🧩 VOCABULARY RELATION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vocabulary_relation (
    id TEXT PRIMARY KEY DEFAULT ('vr_' || gen_random_uuid()),
    source_vocab_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    target_vocab_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL,        -- synonym, antonym, similar, confusable, compound, formal, casual
    strength NUMERIC(3,2) DEFAULT 1.0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_relation_src ON vocabulary_relation (source_vocab_id);
CREATE INDEX IF NOT EXISTS idx_vocab_relation_tgt ON vocabulary_relation (target_vocab_id);

-- ==============================================================================
-- 7. 📐 GRAMMAR (BUNPOU)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS grammar (
    id TEXT PRIMARY KEY,                       -- e.g. 'bp_001' or permanent UUID
    pattern TEXT NOT NULL,                     -- e.g. '〜ている'
    name TEXT NOT NULL,                        -- e.g. '書かれている (受身形)'
    formula TEXT NOT NULL,                     -- e.g. 'Vれる（受身形）'
    meaning_id TEXT NOT NULL,                  -- Indonesian explanation
    meaning_en TEXT NOT NULL,                  -- English explanation
    explanation_note TEXT,
    jlpt_level VARCHAR(5) NOT NULL,            -- 'N5', 'N4', 'N3', 'N2', 'N1'
    category VARCHAR(50),
    functions JSONB NOT NULL DEFAULT '[]'::jsonb,
    nuance TEXT,
    register VARCHAR(30),
    restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
    sub_formulas JSONB NOT NULL DEFAULT '[]'::jsonb,
    comparison_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'published',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grammar_jlpt ON grammar (jlpt_level);
CREATE INDEX IF NOT EXISTS idx_grammar_pattern ON grammar (pattern);

-- ==============================================================================
-- 8. 📝 EXAMPLE SENTENCES (FIRST-CLASS CITIZEN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sentence (
    id TEXT PRIMARY KEY DEFAULT ('sen_' || gen_random_uuid()),
    japanese TEXT NOT NULL,
    furigana TEXT,
    reading TEXT,
    translation_id TEXT NOT NULL,              -- Indonesian translation
    translation_en TEXT,                       -- English translation
    difficulty VARCHAR(10) DEFAULT 'medium',
    audio_id TEXT,
    source VARCHAR(100),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sentence_vocabulary (
    sentence_id TEXT NOT NULL REFERENCES sentence(id) ON DELETE CASCADE,
    vocabulary_id TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    role VARCHAR(30) DEFAULT 'target_word',
    PRIMARY KEY (sentence_id, vocabulary_id)
);

CREATE TABLE IF NOT EXISTS sentence_grammar (
    sentence_id TEXT NOT NULL REFERENCES sentence(id) ON DELETE CASCADE,
    grammar_id TEXT NOT NULL REFERENCES grammar(id) ON DELETE CASCADE,
    usage VARCHAR(50) DEFAULT 'core_pattern',
    PRIMARY KEY (sentence_id, grammar_id)
);

CREATE INDEX IF NOT EXISTS idx_sen_vocab ON sentence_vocabulary (vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_sen_grammar ON sentence_grammar (grammar_id);

-- ==============================================================================
-- 9 & 10. 📚 READING (DOKKAI) & 🎧 LISTENING (CHOUKAI)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS reading (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    furigana TEXT,
    translation TEXT,
    jlpt_level VARCHAR(5),
    genre VARCHAR(50),
    word_count INTEGER,
    character_count INTEGER,
    difficulty VARCHAR(20),
    source VARCHAR(100),
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listening (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    audio_url TEXT,
    audio_text TEXT,                           -- TTS Japanese prompt text
    dialogue_speaker VARCHAR(100),
    transcript TEXT NOT NULL,
    translation TEXT,
    jlpt_level VARCHAR(5),
    difficulty VARCHAR(20),
    duration NUMERIC(6,2),
    speech_rate NUMERIC(3,2) DEFAULT 0.95,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11 & 12. ❓ QUESTION & QUESTION TYPES (CENTRALIZED QUESTION POOL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS question (
    id TEXT PRIMARY KEY,
    question_type VARCHAR(50) NOT NULL DEFAULT 'multiple_choice',
    -- Types: multiple_choice, fill_blank, listening, reading, translation,
    -- word_order, kanji_recognition, kanji_writing, sentence_completion, matching
    difficulty_level INTEGER DEFAULT 1,        -- 1 to 5 (MasteryDifficultyLevel)
    skill VARCHAR(50),                         -- recognition, production, nuance, conjugation
    prompt TEXT NOT NULL,
    ruby TEXT,                                 -- Furigana hint
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INTEGER NOT NULL DEFAULT 0,
    accepted_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    explanation TEXT NOT NULL,
    hint TEXT,
    error_type_map JSONB,                      -- Choice-to-ErrorType mapping
    context_tag VARCHAR(50),
    knowledge_refs JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["kanji_001"] or ["kotoba_0002"]
    grammar_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    vocabulary_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    kanji_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    audio_ref TEXT,
    reading_ref TEXT,
    scramble_words JSONB,
    ordered_target JSONB,
    star_index INTEGER,
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_type ON question (question_type);
CREATE INDEX IF NOT EXISTS idx_question_diff ON question (difficulty_level);

-- ==============================================================================
-- 13. 🏷️ TAG SYSTEM
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tag (
    id TEXT PRIMARY KEY,                       -- e.g. 'daily_life', 'workplace', 'kaigo'
    name TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT
);

CREATE TABLE IF NOT EXISTS entity_tag (
    entity_id TEXT NOT NULL,
    entity_type VARCHAR(30) NOT NULL,          -- 'kanji', 'vocabulary', 'grammar', 'reading'
    tag_id TEXT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (entity_id, entity_type, tag_id)
);

-- ==============================================================================
-- 14, 15, 16. 🗂️ CURRICULUM, MAP, STAGE & STAGE CONTENT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS curriculum (
    id TEXT PRIMARY KEY,                       -- e.g. 'curriculum_jlpt', 'curriculum_kaigo'
    name TEXT NOT NULL,
    description TEXT,
    target_jlpt VARCHAR(5),
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS map (
    id TEXT PRIMARY KEY,                       -- e.g. 'map_n5_w1', 'map_kana_hiragana'
    curriculum_id TEXT REFERENCES curriculum(id) ON DELETE SET NULL,
    world_id TEXT,                             -- e.g. 'world_n5'
    map_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    japanese_name TEXT NOT NULL,
    description TEXT,
    theme VARCHAR(100),
    banner_bg VARCHAR(100),
    accent_color VARCHAR(100),
    min_level INTEGER DEFAULT 1,
    unlock_rule JSONB,
    icon VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS stage (
    id TEXT PRIMARY KEY,                       -- e.g. 'stage_kana_hira_1', 'stage_bunpou_w1d1'
    map_id TEXT NOT NULL REFERENCES map(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_boss BOOLEAN DEFAULT FALSE,
    boss_name VARCHAR(100),
    boss_title VARCHAR(100),
    boss_hp INTEGER,
    boss_avatar VARCHAR(50),
    reward_exp INTEGER DEFAULT 100,
    reward_gold INTEGER DEFAULT 150,
    reward_item TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- StageContent: Stage holds NO raw content, only references!
CREATE TABLE IF NOT EXISTS stage_content (
    id TEXT PRIMARY KEY DEFAULT ('sc_' || gen_random_uuid()),
    stage_id TEXT NOT NULL REFERENCES stage(id) ON DELETE CASCADE,
    entity_type VARCHAR(30) NOT NULL,          -- 'kanji', 'kotoba', 'bunpou', 'dokkai', 'choukai'
    entity_id TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    role VARCHAR(30) DEFAULT 'core',           -- 'core', 'preview', 'review', 'challenge'
    weight NUMERIC(3,2) DEFAULT 1.0,
    UNIQUE (stage_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_content_stage ON stage_content (stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_content_entity ON stage_content (entity_type, entity_id);

-- ==============================================================================
-- 18. 📈 USER MASTERY (4D: KNOWLEDGE, RECOGNITION, APPLICATION, RETENTION)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_mastery (
    id TEXT PRIMARY KEY DEFAULT ('um_' || gen_random_uuid()),
    user_id UUID NOT NULL,
    entity_type VARCHAR(30) NOT NULL,          -- 'kanji', 'kotoba', 'bunpou', 'dokkai', 'choukai'
    entity_id TEXT NOT NULL,
    mastery_state VARCHAR(30) DEFAULT 'LEARNING', -- LOCKED, AVAILABLE, LEARNING, COMPLETED, MASTERED, PERFECTED
    knowledge_score NUMERIC(5,2) DEFAULT 0,    -- 0 - 100%
    recognition_score NUMERIC(5,2) DEFAULT 0,  -- 0 - 100%
    application_score NUMERIC(5,2) DEFAULT 0,  -- 0 - 100%
    retention_score NUMERIC(5,2) DEFAULT 0,    -- 0 - 100%
    true_mastery_percentage NUMERIC(5,2) DEFAULT 0, -- Weighted composite score
    mastery_level INTEGER DEFAULT 1,           -- 1 to 5
    attempts_count INTEGER DEFAULT 0,
    practice_count_writing INTEGER DEFAULT 0,
    practice_count_flashcard INTEGER DEFAULT 0,
    practice_count_quiz INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    consecutive_perfects INTEGER DEFAULT 0,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_due TIMESTAMPTZ,
    weakness_flags JSONB DEFAULT '[]'::jsonb,
    error_patterns JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mastery_user ON user_mastery (user_id);
CREATE INDEX IF NOT EXISTS idx_user_mastery_due ON user_mastery (user_id, next_review_due);

-- ==============================================================================
-- 19. 🧠 SRS (SPACED REPETITION SYSTEM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_srs (
    id TEXT PRIMARY KEY DEFAULT ('srs_' || gen_random_uuid()),
    user_id UUID NOT NULL,
    entity_id TEXT NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    interval_days NUMERIC(7,2) DEFAULT 1.0,
    ease_factor NUMERIC(4,2) DEFAULT 2.50,
    repetitions INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    decay_factor NUMERIC(3,2) DEFAULT 1.0,
    due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    algorithm_version VARCHAR(20) DEFAULT 'sm2_extended_v1',
    UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_srs_due ON user_srs (user_id, due_at);

-- ==============================================================================
-- 20. 🏆 USER ACTIVITY (EVENT STREAM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_activity (
    id TEXT PRIMARY KEY DEFAULT ('act_' || gen_random_uuid()),
    user_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL,        -- 'quiz_answer', 'kanji_write', 'stage_clear', 'boss_defeat'
    entity_type VARCHAR(30),                   -- 'kanji', 'kotoba', 'bunpou', 'question'
    entity_id TEXT,
    result VARCHAR(20) NOT NULL,               -- 'correct', 'wrong', 'partial', 'cleared'
    score INTEGER DEFAULT 0,
    xp_gained INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_time ON user_activity (user_id, created_at DESC);

-- ==============================================================================
-- 22. 🔗 KNOWLEDGE GRAPH: RELATION ENGINE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS relation (
    id TEXT PRIMARY KEY DEFAULT ('rel_' || gen_random_uuid()),
    source_type VARCHAR(30) NOT NULL,          -- 'kanji', 'vocabulary', 'grammar', 'stage', 'question'
    source_id TEXT NOT NULL,
    relation_type VARCHAR(50) NOT NULL,        -- 'composed_of', 'appears_in', 'synonym_of', 'tests', 'prerequisite_of'
    target_type VARCHAR(30) NOT NULL,
    target_id TEXT NOT NULL,
    weight NUMERIC(3,2) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_type, source_id, relation_type, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_relation_source ON relation (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_relation_target ON relation (target_type, target_id);

-- ==============================================================================
-- 23 & 24. 📦 CONTENT VERSION & 🛡️ SOURCE PROVENANCE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS content_version (
    id TEXT PRIMARY KEY DEFAULT ('cv_' || gen_random_uuid()),
    entity_type VARCHAR(30) NOT NULL,
    entity_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    changes TEXT NOT NULL,
    author TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source (
    id TEXT PRIMARY KEY,                       -- e.g. 'shin_kanzen_n3', 'soumatome_n4'
    name TEXT NOT NULL,
    type VARCHAR(50),                          -- textbook, past_exam, dictionary
    url TEXT,
    license TEXT,
    attribution TEXT,
    retrieved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_source (
    entity_type VARCHAR(30) NOT NULL,
    entity_id TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES source(id) ON DELETE CASCADE,
    confidence NUMERIC(3,2) DEFAULT 1.0,
    PRIMARY KEY (entity_type, entity_id, source_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE user_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_srs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Knowledge content is public read
ALTER TABLE kanji ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence ENABLE ROW LEVEL SECURITY;
ALTER TABLE question ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE map ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read for kanji" ON kanji FOR SELECT USING (true);
CREATE POLICY "Public read for vocabulary" ON vocabulary FOR SELECT USING (true);
CREATE POLICY "Public read for grammar" ON grammar FOR SELECT USING (true);
CREATE POLICY "Public read for sentence" ON sentence FOR SELECT USING (true);
CREATE POLICY "Public read for question" ON question FOR SELECT USING (true);
CREATE POLICY "Public read for stage" ON stage FOR SELECT USING (true);
CREATE POLICY "Public read for map" ON map FOR SELECT USING (true);
CREATE POLICY "Public read for stage_content" ON stage_content FOR SELECT USING (true);

-- User data is owned by authenticated user
CREATE POLICY "Users can manage their own mastery" ON user_mastery
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own SRS" ON user_srs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert and view their activity" ON user_activity
    FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 25. 🛠️ IDEMPOTENT PATCHES & LEADERBOARD REBALANCE SYNC
-- ==============================================================================
-- Run these if user_mastery table was already created earlier:
ALTER TABLE user_mastery ADD COLUMN IF NOT EXISTS practice_count_writing INTEGER DEFAULT 0;
ALTER TABLE user_mastery ADD COLUMN IF NOT EXISTS practice_count_flashcard INTEGER DEFAULT 0;
ALTER TABLE user_mastery ADD COLUMN IF NOT EXISTS practice_count_quiz INTEGER DEFAULT 0;

-- Sync existing leaderboard records to the rebalanced N5-N1 EXP thresholds:
-- UPDATE leaderboard
-- SET tier_index = CASE
--     WHEN total_exp >= 320000 THEN 9 -- Mythic Deity (N1)
--     WHEN total_exp >= 210000 THEN 8 -- Champion (N1)
--     WHEN total_exp >= 135000 THEN 7 -- Hero (N2)
--     WHEN total_exp >= 80000 THEN 6  -- Paladin (N2)
--     WHEN total_exp >= 45000 THEN 5  -- Elite Knight (N3)
--     WHEN total_exp >= 22000 THEN 4  -- Knight (N3)
--     WHEN total_exp >= 10000 THEN 3  -- Squire (N4)
--     WHEN total_exp >= 4000 THEN 2   -- Apprentice (N4)
--     WHEN total_exp >= 1200 THEN 1   -- Novice (N5)
--     ELSE 0                          -- Villager (N5)
-- END;

