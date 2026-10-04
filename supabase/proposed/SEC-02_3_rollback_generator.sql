-- ============================================================================
-- SEC-02 · ROLLBACK — GENERATOR. Hanya berguna SETELAH SEC-02_1 dijalankan
-- (butuh schema sec_backup). Bila migrasi belum dijalankan, query ini wajar gagal:
-- "relation sec_backup.sec02_* does not exist" = tidak ada yang perlu di-rollback.
--
-- PERINGATAN: rollback MEMBUKA KEMBALI baca publik pada vocabulary/kanji/grammar.
--
-- Cara pakai: jalankan query di bawah (satu hasil), salin isi sel "rollback_script",
-- periksa, lalu tempel dan jalankan sebagai skrip baru.
-- ============================================================================

select
  '-- 1) grant asli' || E'\n' ||
  coalesce((select string_agg(
      format('grant %s on table %I.%I to %s%s;',
             privilege_type, table_schema, table_name,
             case when grantee = 'PUBLIC' then 'public' else quote_ident(grantee) end,
             case when is_grantable = 'YES' then ' with grant option' else '' end),
      E'\n' order by table_name, grantee, privilege_type)
    from sec_backup.sec02_grants), '-- (tidak ada grant tercatat)')
  || E'\n\n-- 2) policy asli\n' ||
  coalesce((select string_agg(
      format('create policy %I on %I.%I as %s for %s to %s%s%s;',
             policyname, schemaname, tablename, lower(permissive), cmd,
             (select string_agg(case when x = 'public' then 'public' else quote_ident(x) end, ', ')
                from unnest(roles) as x),
             case when qual is not null then ' using (' || qual || ')' else '' end,
             case when with_check is not null then ' with check (' || with_check || ')' else '' end),
      E'\n' order by tablename, policyname)
    from sec_backup.sec02_policies), '-- (tidak ada policy tercatat)')
  || E'\n\n-- 3) status RLS asli (hanya yang dulunya NONAKTIF perlu dikembalikan)\n' ||
  coalesce((select string_agg(
      format('alter table public.%I disable row level security;', table_name), E'\n' order by table_name)
    from sec_backup.sec02_rls where not rls_enabled), '-- (RLS dulunya sudah aktif; tidak ada yang diubah)')
  || E'\n\nnotify pgrst, ''reload schema'';'
  as rollback_script;

-- Alternatif darurat tanpa backup (default Supabase memberi ALL ke anon/authenticated/service_role):
--   grant all on table public.vocabulary, public.kanji, public.grammar to anon, authenticated;
