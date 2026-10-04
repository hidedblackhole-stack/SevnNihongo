-- ============================================================================
-- SEC-02 · VERIFIKASI "AFTER" (READ-ONLY · SATU STATEMENT · SATU HASIL)
-- Jalankan SETELAH SEC-02_1 (dan opsional SEC-02_2). Tempel seluruh file, Run, kirim isi sel "verify".
--
-- EXPECTED:
--   table_grants_remaining      = 0
--   read_policies_remaining     = 0   (setelah SEC-02_2; sebelum itu boleh > 0 dan tidak berbahaya karena grant sudah dicabut)
--   rls_enabled                 = true untuk ketiga tabel
--   anon_select / authenticated_select = false ; service_role_select = true
--   row_counts                  = sama dengan sebelum migrasi (vocabulary 8635, kanji 2306, grammar 915 pada probe audit)
--   backup_exists               = true
-- ============================================================================

select jsonb_pretty(jsonb_build_object(
  'table_grants_remaining', (
    select count(*) from information_schema.role_table_grants
    where table_schema = 'public' and table_name in ('vocabulary','kanji','grammar')
      and grantee in ('anon','authenticated','PUBLIC')),
  'read_policies_remaining', (
    select count(*) from pg_policies
    where schemaname = 'public' and tablename in ('vocabulary','kanji','grammar')
      and cmd in ('SELECT','ALL') and roles && array['public','anon','authenticated']::name[]),
  'rls_enabled', (
    select jsonb_object_agg(c.relname::text, c.relrowsecurity)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('vocabulary','kanji','grammar')),
  'privileges', jsonb_build_object(
    'vocabulary', jsonb_build_object(
       'anon_select', has_table_privilege('anon', 'public.vocabulary', 'SELECT'),
       'authenticated_select', has_table_privilege('authenticated', 'public.vocabulary', 'SELECT'),
       'service_role_select', has_table_privilege('service_role', 'public.vocabulary', 'SELECT')),
    'kanji', jsonb_build_object(
       'anon_select', has_table_privilege('anon', 'public.kanji', 'SELECT'),
       'authenticated_select', has_table_privilege('authenticated', 'public.kanji', 'SELECT'),
       'service_role_select', has_table_privilege('service_role', 'public.kanji', 'SELECT')),
    'grammar', jsonb_build_object(
       'anon_select', has_table_privilege('anon', 'public.grammar', 'SELECT'),
       'authenticated_select', has_table_privilege('authenticated', 'public.grammar', 'SELECT'),
       'service_role_select', has_table_privilege('service_role', 'public.grammar', 'SELECT'))),
  'row_counts', jsonb_build_object(
    'vocabulary', (select count(*) from public.vocabulary),
    'kanji',      (select count(*) from public.kanji),
    'grammar',    (select count(*) from public.grammar)),
  'backup_exists', (select count(*) > 0 from pg_namespace where nspname = 'sec_backup')
)) as verify;
