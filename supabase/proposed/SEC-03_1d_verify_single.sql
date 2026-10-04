-- ============================================================================
-- SEC-03 · VERIFIKASI setelah 1a+1b+1c (READ-ONLY · satu statement · satu hasil JSON · tanpa dollar-quote)
-- EXPECTED:
--   exp_credit_at_column            = true
--   score_event_log.rls             = true ; score_event_log_api_grants = 0
--   functions: 5 fungsi ada, security_definer = true (kecuali helper tier/level), config berisi search_path=public
--   anon_can_execute                = false untuk SEMUA fungsi baru
--   authenticated_can_execute       = true untuk upsert_leaderboard_entry, submit_score_event_v2, nq_reset_my_leaderboard
--   legacy_submit_score_event       = anon masih true (SENGAJA; baru dicabut di SEC-03_2_lock)
--   level_formula_check / tier_check: nilai sama dengan klien (lihat kunci di bawah)
-- ============================================================================

select jsonb_pretty(jsonb_build_object(
  'exp_credit_at_column', (
    select count(*) = 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leaderboard' and column_name = 'exp_credit_at'),
  'score_event_log', jsonb_build_object(
    'exists', (select count(*) = 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relname = 'score_event_log'),
    'rls', (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relname = 'score_event_log'),
    'api_grants', (select count(*) from information_schema.role_table_grants
                   where table_schema = 'public' and table_name = 'score_event_log'
                     and grantee in ('anon','authenticated','PUBLIC'))),
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', p.proname, 'security_definer', p.prosecdef, 'config', p.proconfig,
             'anon_can_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
             'authenticated_can_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'))
             order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('upsert_leaderboard_entry','submit_score_event_v2','nq_reset_my_leaderboard',
                        'nq_tier_for_exp','nq_level_for_exp','submit_score_event')),
  -- harus sama dengan klien: level(0)=1, level(1200)=floor((-1+sqrt(201))/2)=6 (klien: 6), tier(1199)=0, tier(1200)=1, tier(320000)=9
  'level_formula_check', jsonb_build_object(
    'exp_0', public.nq_level_for_exp(0), 'exp_1200', public.nq_level_for_exp(1200),
    'exp_100000', public.nq_level_for_exp(100000)),  -- expected: 1 / 6 / 62
  'tier_check', jsonb_build_object(
    'exp_1199', public.nq_tier_for_exp(1199), 'exp_1200', public.nq_tier_for_exp(1200),
    'exp_320000', public.nq_tier_for_exp(320000))
)) as verify_sec03_functions;
