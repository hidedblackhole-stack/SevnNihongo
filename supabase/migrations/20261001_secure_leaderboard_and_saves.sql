-- ==============================================================================
-- NIHONGO QUEST: SECURE LEADERBOARD + user_saves   (DRAFT - REVIEW SEBELUM DIJALANKAN)
-- Migration: 20261001_secure_leaderboard_and_saves.sql
--
-- Ditulis dari audit (AUDIT_REPORT.md: S-01, S-03). Skema tabel `leaderboard` dan
-- `weekly_scores` TIDAK ada di repo; kolom di bawah diturunkan dari antarmuka TypeScript
-- (src/lib/supabase.ts: LeaderboardEntry, WeeklyLeaderboardEntry). Bandingkan dengan skema
-- asli di dashboard SEBELUM menjalankan. Tidak ada staging => jalankan bagian per bagian,
-- semua pernyataan idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE)
-- dan TIDAK menghapus kolom/tabel lama.
--
-- URUTAN ROLLOUT AMAN
--   1. Jalankan BAGIAN A (user_saves)   -> klien otomatis memakai tabel ini (dual-read/lazy migration).
--   2. Jalankan BAGIAN B.1 + B.2 (fungsi baru, belum mengunci apa pun).
--   3. Deploy klien dengan VITE_SECURE_LEADERBOARD=true, uji login + belajar + leaderboard.
--   4. Baru jalankan BAGIAN B.3 (kunci tulis langsung) dan B.4 (cabut fungsi lama).
-- ==============================================================================

-- ==============================================================================
-- BAGIAN A. user_saves  (menggantikan auth.users.user_metadata.cloud_save)
-- user_metadata ikut masuk klaim JWT; save besar => header terlalu besar (HTTP 431/494).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_saves (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    payload    JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_saves select own" ON user_saves;
DROP POLICY IF EXISTS "user_saves insert own" ON user_saves;
DROP POLICY IF EXISTS "user_saves update own" ON user_saves;
DROP POLICY IF EXISTS "user_saves delete own" ON user_saves;

CREATE POLICY "user_saves select own" ON user_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_saves insert own" ON user_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_saves update own" ON user_saves FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_saves delete own" ON user_saves FOR DELETE USING (auth.uid() = user_id);

-- Batasi ukuran payload (mencegah penyalahgunaan penyimpanan): 2 MB
ALTER TABLE user_saves DROP CONSTRAINT IF EXISTS user_saves_payload_size;
ALTER TABLE user_saves ADD CONSTRAINT user_saves_payload_size CHECK (pg_column_size(payload) < 2097152);

-- ==============================================================================
-- BAGIAN B. LEADERBOARD
-- ==============================================================================

-- B.1 Log laju event (anti-spam)
CREATE TABLE IF NOT EXISTS score_event_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL,
    event_type TEXT NOT NULL,
    ref_id     TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_score_event_log_user_time ON score_event_log (user_id, created_at DESC);
ALTER TABLE score_event_log ENABLE ROW LEVEL SECURITY;  -- tanpa policy => hanya fungsi SECURITY DEFINER yang bisa menyentuh

-- Hitung tier dari total EXP di server (ambang sama dengan komentar migrasi 20260911, bagian 25)
CREATE OR REPLACE FUNCTION nq_tier_for_exp(p_exp BIGINT) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN p_exp >= 320000 THEN 9 WHEN p_exp >= 210000 THEN 8 WHEN p_exp >= 135000 THEN 7
        WHEN p_exp >= 80000  THEN 6 WHEN p_exp >= 45000  THEN 5 WHEN p_exp >= 22000  THEN 4
        WHEN p_exp >= 10000  THEN 3 WHEN p_exp >= 4000   THEN 2 WHEN p_exp >= 1200   THEN 1
        ELSE 0 END
$$;

-- B.2a Sinkron profil/EXP ke leaderboard: identitas dari auth.uid(), BUKAN dari parameter klien.
-- EXP dihitung di klien (aplikasi offline-first), jadi server memberi batas kelayakan:
--   * tidak boleh turun (kecuali reset eksplisit lewat nq_reset_my_leaderboard)
--   * kenaikan dibatasi laju (maks 400 EXP/menit sejak pembaruan terakhir + 2.000 EXP buffer awal)
CREATE OR REPLACE FUNCTION upsert_leaderboard_entry(
    p_player_name TEXT,
    p_level INTEGER,
    p_total_exp BIGINT,
    p_avatar_url TEXT DEFAULT NULL,
    p_stat_tryout INTEGER DEFAULT 0,
    p_stat_flashcard INTEGER DEFAULT 0,
    p_stat_kanji INTEGER DEFAULT 0,
    p_stat_boss INTEGER DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    uid UUID := auth.uid();
    prev RECORD;
    minutes_since NUMERIC;
    max_allowed BIGINT;
    new_exp BIGINT;
BEGIN
    IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
    IF p_total_exp < 0 OR p_level < 1 OR p_level > 1000 THEN RAISE EXCEPTION 'invalid payload'; END IF;

    SELECT total_exp, last_updated INTO prev FROM leaderboard WHERE user_id = uid;

    IF FOUND THEN
        minutes_since := GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(prev.last_updated, NOW() - INTERVAL '1 day'))) / 60.0);
        max_allowed := prev.total_exp + 2000 + (LEAST(minutes_since, 1440) * 400)::BIGINT;
        new_exp := GREATEST(prev.total_exp, LEAST(p_total_exp, max_allowed));  -- tidak turun, dibatasi laju
    ELSE
        new_exp := LEAST(p_total_exp, 5000);  -- baris baru: awal dibatasi, naik bertahap lewat sinkron berikutnya
    END IF;

    INSERT INTO leaderboard (user_id, player_name, level, total_exp, tier_index, avatar_url,
                             stat_tryout, stat_flashcard, stat_kanji, stat_boss, last_updated)
    VALUES (uid, LEFT(COALESCE(NULLIF(TRIM(p_player_name), ''), 'Unknown Player'), 30), p_level, new_exp,
            nq_tier_for_exp(new_exp), p_avatar_url,
            GREATEST(0, p_stat_tryout), GREATEST(0, p_stat_flashcard), GREATEST(0, p_stat_kanji), GREATEST(0, p_stat_boss), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        player_name = EXCLUDED.player_name,
        level       = EXCLUDED.level,
        total_exp   = EXCLUDED.total_exp,
        tier_index  = EXCLUDED.tier_index,
        avatar_url  = EXCLUDED.avatar_url,
        stat_tryout = GREATEST(leaderboard.stat_tryout, EXCLUDED.stat_tryout),
        stat_flashcard = GREATEST(leaderboard.stat_flashcard, EXCLUDED.stat_flashcard),
        stat_kanji  = GREATEST(leaderboard.stat_kanji, EXCLUDED.stat_kanji),
        stat_boss   = GREATEST(leaderboard.stat_boss, EXCLUDED.stat_boss),
        last_updated = NOW();
END $$;

-- B.2b Reset eksplisit milik sendiri (tombol "Reset Data" di aplikasi)
CREATE OR REPLACE FUNCTION nq_reset_my_leaderboard() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
    UPDATE leaderboard SET total_exp = 0, level = 1, tier_index = 0, last_updated = NOW() WHERE user_id = auth.uid();
END $$;

-- B.2c Event skor: user_id dari auth.uid(); anti-spam; idempotensi per (user, ref, hari).
-- ASUMSI (sesuaikan dengan fungsi lama sebelum mengaktifkan): jawaban benar = +10 skor mingguan,
-- dan weekly_scores memiliki UNIQUE (user_id, week_id) (dibutuhkan ON CONFLICT di bawah; cek dulu).
-- Fungsi lama `submit_score_event(...)` TIDAK diubah di sini karena badan fungsinya tidak ada di repo.
CREATE OR REPLACE FUNCTION submit_score_event_v2(
    p_event_type TEXT,
    p_ref_id TEXT,
    p_is_correct BOOLEAN,
    p_player_name TEXT DEFAULT NULL,
    p_tier_index INTEGER DEFAULT 0
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    uid UUID := auth.uid();
    recent INTEGER;
    dup INTEGER;
    wk TEXT := to_char(NOW(), 'IYYY-"W"IW');
BEGIN
    IF uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
    IF p_event_type NOT IN ('quiz_answer', 'kanji_write') THEN RAISE EXCEPTION 'invalid event'; END IF;

    SELECT COUNT(*) INTO recent FROM score_event_log WHERE user_id = uid AND created_at > NOW() - INTERVAL '1 minute';
    IF recent >= 120 THEN RETURN; END IF;   -- anti-spam: abaikan diam-diam

    SELECT COUNT(*) INTO dup FROM score_event_log
      WHERE user_id = uid AND event_type = p_event_type AND ref_id = p_ref_id AND created_at > NOW() - INTERVAL '10 seconds';
    IF dup > 0 THEN RETURN; END IF;

    INSERT INTO score_event_log (user_id, event_type, ref_id) VALUES (uid, p_event_type, LEFT(p_ref_id, 200));

    IF p_is_correct THEN
        INSERT INTO weekly_scores (user_id, week_id, player_name, tier_index, score, updated_at)
        VALUES (uid, wk, LEFT(COALESCE(NULLIF(TRIM(p_player_name), ''), 'Unknown Player'), 30), GREATEST(0, p_tier_index), 10, NOW())
        ON CONFLICT (user_id, week_id) DO UPDATE SET
            score = weekly_scores.score + 10,
            player_name = EXCLUDED.player_name,
            tier_index = EXCLUDED.tier_index,
            updated_at = NOW();
    END IF;
END $$;

-- Bersihkan log lama secara berkala (jalankan via pg_cron bila tersedia):
--   DELETE FROM score_event_log WHERE created_at < NOW() - INTERVAL '2 days';

REVOKE ALL ON FUNCTION upsert_leaderboard_entry(TEXT, INTEGER, BIGINT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION upsert_leaderboard_entry(TEXT, INTEGER, BIGINT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION nq_reset_my_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION nq_reset_my_leaderboard() TO authenticated;
REVOKE ALL ON FUNCTION submit_score_event_v2(TEXT, TEXT, BOOLEAN, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_score_event_v2(TEXT, TEXT, BOOLEAN, TEXT, INTEGER) TO authenticated;

-- ==============================================================================
-- B.3 KUNCI TULIS LANGSUNG  (JALANKAN HANYA SETELAH klien memakai VITE_SECURE_LEADERBOARD=true)
-- Setelah ini hanya fungsi SECURITY DEFINER di atas yang bisa menulis leaderboard/weekly_scores.
-- Catatan perilaku: pemain tamu (tanpa login) tidak lagi muncul di leaderboard.
-- ==============================================================================
-- ALTER TABLE leaderboard    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE weekly_scores  ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "lb read all" ON leaderboard;
-- DROP POLICY IF EXISTS "weekly read all" ON weekly_scores;
-- CREATE POLICY "lb read all"     ON leaderboard   FOR SELECT USING (true);
-- CREATE POLICY "weekly read all" ON weekly_scores FOR SELECT USING (true);
-- -- Tidak membuat policy INSERT/UPDATE/DELETE => anon & authenticated tidak bisa menulis langsung.
-- -- PERIKSA dulu policy lama:  SELECT * FROM pg_policies WHERE tablename IN ('leaderboard','weekly_scores');
-- -- dan hapus policy tulis lama yang terlalu longgar dengan DROP POLICY "<nama>" ON <tabel>;

-- B.4 CABUT FUNGSI LAMA (verifikasi signature dengan:  \df submit_score_event )
-- REVOKE EXECUTE ON FUNCTION submit_score_event(UUID, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) FROM anon, authenticated;
