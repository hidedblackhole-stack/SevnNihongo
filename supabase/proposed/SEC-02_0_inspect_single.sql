-- ============================================================================
-- SEC-02 · LANGKAH 0 · INSPEKSI "BEFORE"  (READ-ONLY · SATU STATEMENT · SATU HASIL)
--
-- Editor SQL Supabase hanya menampilkan hasil statement TERAKHIR, jadi semua
-- inspeksi dikumpulkan dalam SATU query yang mengembalikan SATU sel JSON.
-- Cara pakai: tempel SELURUH isi file ini (jangan hanya sebagian/blok terpilih),
-- Run, lalu salin isi sel "inspect" dan kirimkan. Tidak mengubah apa pun. Tanpa dollar-quote.
-- ============================================================================

select jsonb_pretty(jsonb_build_object(

  -- status RLS semua tabel/view public (tabel tanpa RLS = terbuka bagi API bila ada grant)
  'rls', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'object', c.relname, 'kind', c.relkind, 'rls_enabled', c.relrowsecurity,
             'rls_forced', c.relforcerowsecurity) order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p','v','m')),

  -- semua policy (nama ASLI production)
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', tablename, 'policy', policyname, 'permissive', permissive,
             'roles', roles, 'cmd', cmd, 'using', qual, 'with_check', with_check)
             order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'),

  -- grant tabel untuk peran API
  'table_grants', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', table_name, 'grantee', grantee, 'privilege', privilege_type)
             order by table_name, grantee, privilege_type), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon','authenticated','PUBLIC')),

  -- grant level kolom
  'column_grants', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', table_name, 'column', column_name, 'grantee', grantee, 'privilege', privilege_type)), '[]'::jsonb)
    from information_schema.role_column_grants
    where table_schema = 'public' and grantee in ('anon','authenticated','PUBLIC')
      and table_name in ('vocabulary','kanji','grammar')),

  -- JALUR ALTERNATIF: view (melewati RLS kecuali security_invoker), matview
  'views', (
    select coalesce(jsonb_agg(jsonb_build_object('view', viewname, 'definition', definition)), '[]'::jsonb)
    from pg_views where schemaname = 'public'),
  'view_options', (
    select coalesce(jsonb_agg(jsonb_build_object('view', c.relname, 'options', c.reloptions)), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'),
  'matviews', (
    select coalesce(jsonb_agg(matviewname), '[]'::jsonb)
    from pg_matviews where schemaname = 'public'),

  -- JALUR ALTERNATIF: fungsi/RPC yang menyentuh tabel target atau dapat dieksekusi anon
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', p.proname, 'args', pg_get_function_identity_arguments(p.oid),
             'security_definer', p.prosecdef,
             'anon_can_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
             'authenticated_can_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
             'touches_target_tables', (p.prosrc ~* '\y(vocabulary|kanji|grammar)\y'))
             order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.prosrc ~* '\y(vocabulary|kanji|grammar)\y'
           or has_function_privilege('anon', p.oid, 'EXECUTE'))),

  -- JALUR ALTERNATIF: realtime, storage, GraphQL
  'realtime_tables', (
    select coalesce(jsonb_agg(jsonb_build_object('publication', pubname, 'table', tablename)), '[]'::jsonb)
    from pg_publication_tables where schemaname = 'public'),
  'storage_buckets', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'public', public)), '[]'::jsonb)
    from storage.buckets),
  'extensions', (
    select coalesce(jsonb_agg(extname), '[]'::jsonb)
    from pg_extension where extname in ('pg_graphql','pg_net')),
  'authenticator_config', (
    select to_jsonb(rolconfig) from pg_roles where rolname = 'authenticator'),

  -- baris tabel target (untuk dibandingkan setelah migrasi)
  'row_counts', jsonb_build_object(
    'vocabulary', (select count(*) from public.vocabulary),
    'kanji',      (select count(*) from public.kanji),
    'grammar',    (select count(*) from public.grammar))

)) as inspect;
