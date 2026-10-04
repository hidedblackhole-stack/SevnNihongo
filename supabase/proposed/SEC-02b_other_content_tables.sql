-- ============================================================================
-- SEC-02b · Tutup tabel konten LAINNYA (USULAN. BELUM DIJALANKAN. Butuh persetujuan.)
--
-- Dasar (hasil inspeksi production Anda, 2026-10-04):
--   * Semua tabel ini RLS aktif, tetapi anon/authenticated punya GRANT penuh, dan 5 di antaranya
--     (map, question, sentence, stage, stage_content) punya policy "Public read ... USING (true)".
--   * Saat ini hampir semuanya kosong, jadi risikonya muncul begitu terisi (mis. saat seed konten).
--   * Klien SevnQuest tidak memakai satu pun tabel ini (audit kode: 0 query).
-- Pola sama dengan SEC-02_1: tanpa blok DO / dollar-quote, tanpa BEGIN/COMMIT, satu permintaan = atomik.
-- Backup ke sec_backup (sudah ada dari SEC-02_1). Guard alami: CREATE TABLE gagal bila sudah pernah dijalankan.
-- TIDAK menyentuh: user_mastery, user_srs, user_activity (dipakai klien, RLS per-user),
--                  leaderboard, weekly_scores (lihat SEC-03).
-- ============================================================================

create table sec_backup.sec02b_policies as
  select now() as captured_at, schemaname, tablename, policyname, permissive,
         roles::text[] as roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename in (
    'content_version','curriculum','entity_source','entity_tag','kanji_writing','listening','map',
    'question','reading','relation','sentence','sentence_grammar','sentence_vocabulary','source',
    'stage','stage_content','tag','vocabulary_audio','vocabulary_relation','vocabulary_writing');

create table sec_backup.sec02b_grants as
  select now() as captured_at, table_schema, table_name, grantee, privilege_type, is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (
    'content_version','curriculum','entity_source','entity_tag','kanji_writing','listening','map',
    'question','reading','relation','sentence','sentence_grammar','sentence_vocabulary','source',
    'stage','stage_content','tag','vocabulary_audio','vocabulary_relation','vocabulary_writing');

revoke all on table sec_backup.sec02b_policies, sec_backup.sec02b_grants from public, anon, authenticated;

revoke all on table
  public.content_version, public.curriculum, public.entity_source, public.entity_tag,
  public.kanji_writing, public.listening, public.map, public.question, public.reading,
  public.relation, public.sentence, public.sentence_grammar, public.sentence_vocabulary,
  public.source, public.stage, public.stage_content, public.tag, public.vocabulary_audio,
  public.vocabulary_relation, public.vocabulary_writing
from public, anon, authenticated;

notify pgrst, 'reload schema';

-- Rollback (darurat; default Supabase memberi ALL ke anon/authenticated). Backup lengkap ada di sec_backup.sec02b_grants:
--   grant all on table public.map, public.question, public.sentence, public.stage, public.stage_content to anon, authenticated;
