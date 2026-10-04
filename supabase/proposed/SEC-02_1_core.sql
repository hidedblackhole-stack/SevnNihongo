-- ============================================================================
-- SEC-02 · LANGKAH 1 · INTI MIGRASI  (USULAN. BELUM DIJALANKAN. Butuh persetujuan eksplisit.)
--
-- Tujuan: anon & authenticated TIDAK dapat membaca/menulis public.vocabulary, public.kanji,
--         public.grammar. service_role/postgres tidak disentuh.
--
-- DIRANCANG ULANG setelah percobaan pertama gagal di editor Supabase:
--   * TANPA blok DO atau dollar-quote (editor memotong blok itu), TANPA BEGIN/COMMIT.
--   * Statement biasa saja. Dikirim sebagai satu permintaan multi-statement, jadi atomik: bila ada
--     statement yang gagal, TIDAK ADA yang berubah. (Pastikan menjalankan SELURUH file, tanpa seleksi.)
--   * Guard alami: "create schema sec_backup" gagal bila sudah pernah dijalankan -> backup asli tak tertimpa.
--   * Kebocoran ditutup oleh REVOKE (permission ditolak SEBELUM RLS dievaluasi), jadi nama policy
--     tidak perlu ditebak. Penghapusan policy lama dilakukan terpisah di SEC-02_2 (nama dari katalog).
--   * Tidak ada UPDATE/DELETE tanpa WHERE (ekstensi 'safeupdate' aktif di production).
-- ============================================================================

-- 1) Backup kondisi ASLI (policy, grant, status RLS) ke schema privat
create schema sec_backup;
revoke all on schema sec_backup from public, anon, authenticated;

create table sec_backup.sec02_policies as
  select now() as captured_at, schemaname, tablename, policyname, permissive,
         roles::text[] as roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename in ('vocabulary','kanji','grammar');

create table sec_backup.sec02_grants as
  select now() as captured_at, table_schema, table_name, grantee, privilege_type, is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in ('vocabulary','kanji','grammar');

create table sec_backup.sec02_rls as
  select now() as captured_at, c.relname as table_name,
         c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('vocabulary','kanji','grammar');

revoke all on table sec_backup.sec02_policies, sec_backup.sec02_grants, sec_backup.sec02_rls
  from public, anon, authenticated;

-- 2) RLS aktif (defense in depth: tanpa policy = tertutup, bila grant tak sengaja kembali)
alter table public.vocabulary enable row level security;
alter table public.kanji      enable row level security;
alter table public.grammar    enable row level security;

-- 3) Cabut hak tabel dari peran API
revoke all on table public.vocabulary, public.kanji, public.grammar from public, anon, authenticated;

-- 4) Muat ulang schema cache PostgREST
notify pgrst, 'reload schema';

-- Catatan: editor Supabase mungkin menambahkan "ALTER TABLE sec_backup.* ENABLE ROW LEVEL SECURITY"
-- otomatis setelah CREATE TABLE. Itu tidak berbahaya (tabel backup tetap tertutup untuk API).
