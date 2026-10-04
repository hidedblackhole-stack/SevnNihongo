-- ============================================================================
-- SEC-03 · INSPEKSI tabel leaderboard & weekly_scores (READ-ONLY · satu statement · satu hasil JSON · tanpa dollar-quote)
-- Dibutuhkan untuk menulis SQL SEC-03 yang cocok dengan skema production (tipe user_id, constraint, trigger).
-- Tempel SELURUH file, Run, salin isi sel "inspect_sec03".
-- ============================================================================

select jsonb_pretty(jsonb_build_object(

  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', table_name, 'column', column_name, 'type', data_type, 'udt', udt_name,
             'nullable', is_nullable, 'default', column_default)
             order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public' and table_name in ('leaderboard','weekly_scores')),

  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', conrelid::regclass::text, 'name', conname, 'type', contype,
             'definition', pg_get_constraintdef(oid))), '[]'::jsonb)
    from pg_constraint
    where conrelid in ('public.leaderboard'::regclass, 'public.weekly_scores'::regclass)),

  'indexes', (
    select coalesce(jsonb_agg(jsonb_build_object('table', tablename, 'name', indexname, 'definition', indexdef)), '[]'::jsonb)
    from pg_indexes
    where schemaname = 'public' and tablename in ('leaderboard','weekly_scores')),

  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table', tgrelid::regclass::text, 'name', tgname, 'definition', pg_get_triggerdef(oid))), '[]'::jsonb)
    from pg_trigger
    where tgrelid in ('public.leaderboard'::regclass, 'public.weekly_scores'::regclass) and not tgisinternal),

  -- siapa saja yang ada di papan peringkat: pemain login vs tamu (user_id lokal yang bukan akun)
  'leaderboard_population', jsonb_build_object(
    'rows_total', (select count(*) from public.leaderboard),
    'rows_with_auth_account', (select count(*) from public.leaderboard l
                               where exists (select 1 from auth.users u where u.id::text = l.user_id::text)),
    'auth_users_total', (select count(*) from auth.users),
    'max_total_exp', (select max(total_exp) from public.leaderboard),
    'rows_total_exp_over_100000', (select count(*) from public.leaderboard where total_exp > 100000),
    'weekly_scores_rows', (select count(*) from public.weekly_scores)),

  -- badan SEMUA fungsi di schema public (untuk memeriksa fungsi lain selain submit_score_event)
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', p.proname, 'security_definer', p.prosecdef,
             'config', p.proconfig, 'definition', pg_get_functiondef(p.oid))
             order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f')

)) as inspect_sec03;
